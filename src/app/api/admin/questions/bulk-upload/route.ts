// src/app/api/admin/questions/bulk-upload/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db';
import { processZipFile, processCsvFile, processExcelFile } from '@/lib/upload/zip-handler';
import type { ParsedQuestion } from '@/lib/upload/csv-parser';

/**
 * POST /api/admin/questions/bulk-upload
 * Upload questions in bulk via CSV, Excel, or ZIP file
 */
export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user role (admin or instructor)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user || (user.role !== 'admin' && user.role !== 'instructor')) {
      return NextResponse.json(
        { error: 'Forbidden - Admin or instructor access required' },
        { status: 403 }
      );
    }

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const filename = file.name.toLowerCase();
    console.log(`[Bulk Upload] Processing file: ${file.name} (${file.size} bytes)`);

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Determine file type and process accordingly
    let parseResult;
    let uploadedImages: Map<string, string> | undefined;

    if (filename.endsWith('.zip')) {
      console.log('[Bulk Upload] Processing as ZIP file');
      const zipResult = await processZipFile(buffer, prisma);

      if (!zipResult.success) {
        return NextResponse.json(
          {
            error: 'Failed to process ZIP file',
            details: zipResult.errors,
            parseErrors: zipResult.parseResult?.errors || [],
            warnings: zipResult.parseResult?.warnings || [],
          },
          { status: 400 }
        );
      }

      parseResult = zipResult.parseResult!;
      uploadedImages = zipResult.uploadedImages;
    } else if (filename.endsWith('.csv')) {
      console.log('[Bulk Upload] Processing as CSV file');
      const csvContent = buffer.toString('utf-8');
      parseResult = await processCsvFile(csvContent, prisma);
    } else if (filename.endsWith('.xlsx')) {
      console.log('[Bulk Upload] Processing as Excel file');
      parseResult = await processExcelFile(buffer, prisma);
    } else {
      return NextResponse.json(
        {
          error: 'Invalid file type',
          message: 'Please upload a CSV (.csv), Excel (.xlsx), or ZIP (.zip) file',
        },
        { status: 400 }
      );
    }

    // Check for parsing errors
    if (!parseResult.success || parseResult.errors.length > 0) {
      return NextResponse.json(
        {
          error: 'Failed to parse file',
          errors: parseResult.errors,
          warnings: parseResult.warnings,
          questionsFound: parseResult.questions.length,
        },
        { status: 400 }
      );
    }

    console.log(`[Bulk Upload] Successfully parsed ${parseResult.questions.length} questions`);

    // Create questions in database
    const createdQuestions = [];
    const failedQuestions = [];

    for (const parsedQuestion of parseResult.questions) {
      try {
        // Find the cell/topic
        const cell = await prisma.cell.findFirst({
          where: { name: parsedQuestion.topicName },
        });

        if (!cell) {
          failedQuestions.push({
            row: parsedQuestion.rowNumber,
            error: `Topic "${parsedQuestion.topicName}" not found`,
          });
          continue;
        }

        // Get image URL if available
        const imageUrl = uploadedImages && parsedQuestion.imageFilename
          ? uploadedImages.get(parsedQuestion.imageFilename.toLowerCase())
          : undefined;

        // Create question with answer options
        const question = await prisma.question.create({
          data: {
            text: parsedQuestion.questionText,
            explanation: parsedQuestion.explanation,
            cellId: cell.id,
            bloomTaxonomy: parsedQuestion.bloomTaxonomy || null,
            imageUrl: imageUrl || null,
            isActive: true,
            difficulty_b: 0, // Default difficulty (will be calibrated)
            discrimination_a: 1.0, // Default discrimination (will be calibrated)
            guessing_c: 0.0, // Default guessing parameter
            irtModel: '2PL', // Default IRT model
            answerOptions: {
              create: parsedQuestion.options.map((optionText, index) => ({
                text: optionText,
                isCorrect: index + 1 === parsedQuestion.correctOption, // correctOption is 1-indexed
              })),
            },
          },
        });

        // Assign tags if provided
        if (parsedQuestion.tags && parsedQuestion.tags.length > 0) {
          // Find tag IDs
          const tags = await prisma.tag.findMany({
            where: { name: { in: parsedQuestion.tags } },
            select: { id: true },
          });

          if (tags.length > 0) {
            await prisma.questionTag.createMany({
              data: tags.map((tag) => ({
                questionId: question.id,
                tagId: tag.id,
              })),
            });
          }
        }

        createdQuestions.push({
          id: question.id,
          row: parsedQuestion.rowNumber,
          text: parsedQuestion.questionText.substring(0, 100),
        });

        console.log(`[Bulk Upload] Created question ${question.id} from row ${parsedQuestion.rowNumber}`);
      } catch (error) {
        console.error(`[Bulk Upload] Failed to create question from row ${parsedQuestion.rowNumber}:`, error);
        failedQuestions.push({
          row: parsedQuestion.rowNumber,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    console.log(
      `[Bulk Upload] Completed: ${createdQuestions.length} created, ${failedQuestions.length} failed`
    );

    // Return results
    return NextResponse.json({
      success: true,
      summary: {
        totalRows: parseResult.questions.length,
        created: createdQuestions.length,
        failed: failedQuestions.length,
        imagesUploaded: uploadedImages?.size || 0,
      },
      createdQuestions,
      failedQuestions,
      warnings: parseResult.warnings,
    });
  } catch (error) {
    console.error('[Bulk Upload API Error]:', error);
    return NextResponse.json(
      {
        error: 'Failed to process bulk upload',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/questions/bulk-upload
 * Get bulk upload statistics or template info
 */
export async function GET(req: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Return info about templates and upload capabilities
    return NextResponse.json({
      templates: {
        csv: '/templates/question_upload_template.csv',
        excel: '/templates/question_upload_template.xlsx',
        readme: '/templates/README.md',
      },
      supportedFormats: ['CSV (.csv)', 'Excel (.xlsx)', 'ZIP (.zip with images)'],
      maxFileSize: '50MB',
      imageFormats: ['PNG', 'JPG', 'JPEG', 'GIF'],
      requiredFields: [
        'question_text',
        'topic_name',
        'option_1',
        'option_2',
        'option_3',
        'option_4',
        'correct_option',
        'explanation',
      ],
      optionalFields: ['option_5', 'bloom_taxonomy', 'tags', 'image_filename'],
    });
  } catch (error) {
    console.error('[Bulk Upload GET Error]:', error);
    return NextResponse.json(
      { error: 'Failed to get upload info' },
      { status: 500 }
    );
  }
}
