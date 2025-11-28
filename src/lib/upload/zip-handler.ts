// src/lib/upload/zip-handler.ts
import JSZip from 'jszip';
import { put } from '@vercel/blob';
import { parseCsvContent, validateQuestionsAgainstDb, type ParseResult, type ParsedQuestion } from './csv-parser';
import { parseExcelContent } from './excel-parser';

export interface ZipProcessResult {
  success: boolean;
  parseResult: ParseResult | null;
  uploadedImages: Map<string, string>; // filename -> URL mapping
  errors: string[];
}

/**
 * Process a ZIP file containing CSV/Excel and images
 */
export async function processZipFile(
  buffer: Buffer,
  prisma: any
): Promise<ZipProcessResult> {
  const errors: string[] = [];
  const uploadedImages = new Map<string, string>();

  try {
    // Load ZIP file
    const zip = await JSZip.loadAsync(buffer);

    // Find the data file (CSV or Excel)
    let dataFile: JSZip.JSZipObject | null = null;
    let dataFileName: string | null = null;
    let isExcel = false;

    for (const [filename, file] of Object.entries(zip.files)) {
      if (file.dir) continue; // Skip directories

      const lowerName = filename.toLowerCase();
      const baseName = filename.split('/').pop() || ''; // Get filename without path

      // Check if it's a CSV or Excel file at root level or one level deep
      if (
        (lowerName.endsWith('.csv') || lowerName.endsWith('.xlsx')) &&
        filename.split('/').length <= 2
      ) {
        dataFile = file;
        dataFileName = baseName;
        isExcel = lowerName.endsWith('.xlsx');
        break;
      }
    }

    if (!dataFile || !dataFileName) {
      return {
        success: false,
        parseResult: null,
        uploadedImages,
        errors: ['No CSV or Excel file found in ZIP. Please include a .csv or .xlsx file at the root level.'],
      };
    }

    console.log(`[ZIP] Found data file: ${dataFileName}`);

    // Extract data file content
    const dataBuffer = await dataFile.async('nodebuffer');

    // Parse the data file
    let parseResult: ParseResult;
    if (isExcel) {
      parseResult = parseExcelContent(dataBuffer);
    } else {
      const csvContent = dataBuffer.toString('utf-8');
      parseResult = parseCsvContent(csvContent);
    }

    if (!parseResult.success) {
      return {
        success: false,
        parseResult,
        uploadedImages,
        errors: [`Failed to parse ${dataFileName}. Check the errors in parseResult.`],
      };
    }

    console.log(`[ZIP] Successfully parsed ${parseResult.questions.length} questions from ${dataFileName}`);

    // Validate against database
    const dbErrors = await validateQuestionsAgainstDb(parseResult.questions, prisma);
    if (dbErrors.length > 0) {
      parseResult.errors.push(...dbErrors);
      parseResult.success = false;
    }

    // Find images folder
    const imagesFolder = 'images/';
    const imageFiles = Object.entries(zip.files).filter(
      ([filename, file]) =>
        !file.dir &&
        filename.startsWith(imagesFolder) &&
        isImageFile(filename)
    );

    console.log(`[ZIP] Found ${imageFiles.length} image files`);

    // Get list of image filenames referenced in questions
    const referencedImages = new Set<string>();
    for (const question of parseResult.questions) {
      if (question.imageFilename) {
        referencedImages.add(question.imageFilename.toLowerCase());
      }
    }

    console.log(`[ZIP] ${referencedImages.size} images referenced in questions`);

    // Upload referenced images to Vercel Blob
    for (const [filename, file] of imageFiles) {
      const imageName = filename.split('/').pop();
      if (!imageName) continue;

      // Only upload images that are referenced in questions
      if (!referencedImages.has(imageName.toLowerCase())) {
        console.log(`[ZIP] Skipping unreferenced image: ${imageName}`);
        continue;
      }

      try {
        const imageBuffer = await file.async('nodebuffer');
        const contentType = getContentType(imageName);

        // Upload to Vercel Blob
        // The blob will be stored with a unique name to avoid collisions
        const blob = await put(`questions/${Date.now()}-${imageName}`, imageBuffer, {
          access: 'public',
          contentType,
        });

        uploadedImages.set(imageName.toLowerCase(), blob.url);
        console.log(`[ZIP] Uploaded image: ${imageName} -> ${blob.url}`);
      } catch (error) {
        const errorMsg = `Failed to upload image ${imageName}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(`[ZIP] ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    // Check for referenced images that weren't found
    for (const question of parseResult.questions) {
      if (question.imageFilename) {
        const lowerFilename = question.imageFilename.toLowerCase();
        if (!uploadedImages.has(lowerFilename)) {
          const warning = `Row ${question.rowNumber}: Referenced image "${question.imageFilename}" not found in images/ folder`;
          parseResult.warnings.push(warning);
        }
      }
    }

    // Update questions with uploaded image URLs
    for (const question of parseResult.questions) {
      if (question.imageFilename) {
        const imageUrl = uploadedImages.get(question.imageFilename.toLowerCase());
        if (imageUrl) {
          // Replace filename with URL
          (question as any).imageUrl = imageUrl;
        }
      }
    }

    return {
      success: parseResult.success && errors.length === 0,
      parseResult,
      uploadedImages,
      errors,
    };
  } catch (error) {
    return {
      success: false,
      parseResult: null,
      uploadedImages,
      errors: [`Failed to process ZIP file: ${error instanceof Error ? error.message : 'Unknown error'}`],
    };
  }
}

/**
 * Check if filename is an image file
 */
function isImageFile(filename: string): boolean {
  const lowerName = filename.toLowerCase();
  return (
    lowerName.endsWith('.png') ||
    lowerName.endsWith('.jpg') ||
    lowerName.endsWith('.jpeg') ||
    lowerName.endsWith('.gif')
  );
}

/**
 * Get MIME content type from filename
 */
function getContentType(filename: string): string {
  const lowerName = filename.toLowerCase();
  if (lowerName.endsWith('.png')) return 'image/png';
  if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) return 'image/jpeg';
  if (lowerName.endsWith('.gif')) return 'image/gif';
  return 'application/octet-stream';
}

/**
 * Process a standalone CSV file (no ZIP)
 */
export async function processCsvFile(
  csvContent: string,
  prisma: any
): Promise<ParseResult> {
  const parseResult = parseCsvContent(csvContent);

  if (parseResult.success) {
    const dbErrors = await validateQuestionsAgainstDb(parseResult.questions, prisma);
    if (dbErrors.length > 0) {
      parseResult.errors.push(...dbErrors);
      parseResult.success = false;
    }
  }

  return parseResult;
}

/**
 * Process a standalone Excel file (no ZIP)
 */
export async function processExcelFile(
  buffer: Buffer,
  prisma: any
): Promise<ParseResult> {
  const parseResult = parseExcelContent(buffer);

  if (parseResult.success) {
    const dbErrors = await validateQuestionsAgainstDb(parseResult.questions, prisma);
    if (dbErrors.length > 0) {
      parseResult.errors.push(...dbErrors);
      parseResult.success = false;
    }
  }

  return parseResult;
}
