// src/lib/upload/csv-parser.ts
import { parse } from 'csv-parse/sync';

export interface ParsedQuestion {
  questionText: string;
  topicName: string;
  options: string[];
  correctOption: number;
  explanation: string;
  bloomTaxonomy?: string;
  tags?: string[];
  imageFilename?: string;
  rowNumber: number; // For error reporting
}

export interface ValidationError {
  row: number;
  field: string;
  message: string;
  value?: string;
}

export interface ParseResult {
  success: boolean;
  questions: ParsedQuestion[];
  errors: ValidationError[];
  warnings: string[];
}

/**
 * Valid Bloom's Taxonomy levels
 */
const VALID_BLOOM_LEVELS = [
  'Remember',
  'Understand',
  'Apply',
  'Analyze',
  'Evaluate',
  'Create',
];

/**
 * Parse CSV content into structured question data
 */
export function parseCsvContent(csvContent: string): ParseResult {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];
  const questions: ParsedQuestion[] = [];

  try {
    // Parse CSV with csv-parse library
    const records = parse(csvContent, {
      columns: true, // Use first row as headers
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true, // Allow rows with different column counts
      comment: '#', // Skip comment lines
    });

    // Process each row
    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const rowNumber = i + 2; // +2 because: 1-indexed + header row

      // Skip empty rows
      if (isEmptyRow(row)) {
        continue;
      }

      // Validate and parse the row
      const result = parseQuestionRow(row, rowNumber);

      if (result.errors.length > 0) {
        errors.push(...result.errors);
      }

      if (result.warnings.length > 0) {
        warnings.push(...result.warnings);
      }

      if (result.question) {
        questions.push(result.question);
      }
    }

    // Overall validation
    if (questions.length === 0 && errors.length === 0) {
      errors.push({
        row: 0,
        field: 'file',
        message: 'No valid questions found in CSV file',
      });
    }

    return {
      success: errors.length === 0,
      questions,
      errors,
      warnings,
    };
  } catch (error) {
    return {
      success: false,
      questions: [],
      errors: [
        {
          row: 0,
          field: 'file',
          message: `Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
      warnings: [],
    };
  }
}

/**
 * Check if a row is empty
 */
function isEmptyRow(row: Record<string, string>): boolean {
  return Object.values(row).every((value) => !value || value.trim() === '');
}

/**
 * Parse and validate a single question row
 */
function parseQuestionRow(
  row: Record<string, string>,
  rowNumber: number
): {
  question: ParsedQuestion | null;
  errors: ValidationError[];
  warnings: string[];
} {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];

  // Extract fields (handle various header formats)
  const questionText = getField(row, ['question_text', 'question_text*', 'question']);
  const topicName = getField(row, ['topic_name', 'topic_name*', 'topic']);
  const option1 = getField(row, ['option_1', 'option_1*', 'option1']);
  const option2 = getField(row, ['option_2', 'option_2*', 'option2']);
  const option3 = getField(row, ['option_3', 'option_3*', 'option3']);
  const option4 = getField(row, ['option_4', 'option_4*', 'option4']);
  const option5 = getField(row, ['option_5', 'option5']);
  const correctOptionStr = getField(row, ['correct_option', 'correct_option*', 'correct']);
  const explanation = getField(row, ['explanation', 'explanation*']);
  const bloomTaxonomy = getField(row, ['bloom_taxonomy', 'bloom']);
  const tagsStr = getField(row, ['tags']);
  const imageFilename = getField(row, ['image_filename', 'image']);

  // Validate required fields
  if (!questionText) {
    errors.push({
      row: rowNumber,
      field: 'question_text',
      message: 'Question text is required',
    });
  }

  if (!topicName) {
    errors.push({
      row: rowNumber,
      field: 'topic_name',
      message: 'Topic name is required',
    });
  }

  if (!option1) {
    errors.push({
      row: rowNumber,
      field: 'option_1',
      message: 'Option 1 is required',
    });
  }

  if (!option2) {
    errors.push({
      row: rowNumber,
      field: 'option_2',
      message: 'Option 2 is required',
    });
  }

  if (!option3) {
    errors.push({
      row: rowNumber,
      field: 'option_3',
      message: 'Option 3 is required',
    });
  }

  if (!option4) {
    errors.push({
      row: rowNumber,
      field: 'option_4',
      message: 'Option 4 is required',
    });
  }

  if (!correctOptionStr) {
    errors.push({
      row: rowNumber,
      field: 'correct_option',
      message: 'Correct option is required',
    });
  }

  if (!explanation) {
    errors.push({
      row: rowNumber,
      field: 'explanation',
      message: 'Explanation is required',
    });
  }

  // Validate correct_option format
  let correctOption = 0;
  if (correctOptionStr) {
    correctOption = parseInt(correctOptionStr, 10);
    if (isNaN(correctOption) || correctOption < 1 || correctOption > 5) {
      errors.push({
        row: rowNumber,
        field: 'correct_option',
        message: 'Correct option must be a number between 1 and 5',
        value: correctOptionStr,
      });
    }
  }

  // Validate Bloom's Taxonomy if provided
  if (bloomTaxonomy && !VALID_BLOOM_LEVELS.includes(bloomTaxonomy)) {
    errors.push({
      row: rowNumber,
      field: 'bloom_taxonomy',
      message: `Invalid Bloom's Taxonomy level. Must be one of: ${VALID_BLOOM_LEVELS.join(', ')}`,
      value: bloomTaxonomy,
    });
  }

  // Parse tags
  let tags: string[] | undefined;
  if (tagsStr) {
    tags = tagsStr
      .split(',')
      .map((tag) => tag.trim().toLowerCase())
      .filter((tag) => tag.length > 0);

    if (tags.length === 0) {
      tags = undefined;
    }
  }

  // Build options array
  const options: string[] = [option1, option2, option3, option4];
  if (option5) {
    options.push(option5);
  }

  // Check if correct option index is valid for the number of options
  if (correctOption > options.length) {
    errors.push({
      row: rowNumber,
      field: 'correct_option',
      message: `Correct option ${correctOption} is out of range. Only ${options.length} options provided.`,
      value: correctOptionStr,
    });
  }

  // Warnings
  if (!bloomTaxonomy) {
    warnings.push(`Row ${rowNumber}: No Bloom's Taxonomy level specified`);
  }

  if (!tagsStr) {
    warnings.push(`Row ${rowNumber}: No tags specified. Consider adding tags like "baseline" for assessment eligibility`);
  }

  if (imageFilename && !isValidImageFilename(imageFilename)) {
    warnings.push(
      `Row ${rowNumber}: Image filename "${imageFilename}" may not be valid. Supported formats: PNG, JPG, JPEG, GIF`
    );
  }

  // If there are errors, don't create the question object
  if (errors.length > 0) {
    return { question: null, errors, warnings };
  }

  // Create the parsed question object
  const question: ParsedQuestion = {
    questionText,
    topicName,
    options,
    correctOption,
    explanation,
    bloomTaxonomy: bloomTaxonomy || undefined,
    tags,
    imageFilename: imageFilename || undefined,
    rowNumber,
  };

  return { question, errors, warnings };
}

/**
 * Get field value from row, checking multiple possible header names
 */
function getField(row: Record<string, string>, possibleNames: string[]): string {
  for (const name of possibleNames) {
    if (row[name]) {
      return row[name].trim();
    }
  }
  return '';
}

/**
 * Validate image filename format
 */
function isValidImageFilename(filename: string): boolean {
  const validExtensions = ['.png', '.jpg', '.jpeg', '.gif'];
  const lowerFilename = filename.toLowerCase();
  return validExtensions.some((ext) => lowerFilename.endsWith(ext));
}

/**
 * Validate parsed questions against database (topics and tags)
 */
export async function validateQuestionsAgainstDb(
  questions: ParsedQuestion[],
  prisma: any
): Promise<ValidationError[]> {
  const errors: ValidationError[] = [];

  // Get all valid topic names
  const cells = await prisma.cell.findMany({
    select: { name: true },
  });
  const validTopicNames = new Set(cells.map((c: { name: string }) => c.name));

  // Get all valid tag names
  const tags = await prisma.tag.findMany({
    select: { name: true },
  });
  const validTagNames = new Set(tags.map((t: { name: string }) => t.name));

  // Validate each question
  for (const question of questions) {
    // Check topic exists
    if (!validTopicNames.has(question.topicName)) {
      errors.push({
        row: question.rowNumber,
        field: 'topic_name',
        message: `Topic "${question.topicName}" does not exist in the system. Available topics: ${Array.from(validTopicNames).join(', ')}`,
        value: question.topicName,
      });
    }

    // Check tags exist
    if (question.tags) {
      for (const tag of question.tags) {
        if (!validTagNames.has(tag)) {
          errors.push({
            row: question.rowNumber,
            field: 'tags',
            message: `Tag "${tag}" does not exist in the system. Available tags: ${Array.from(validTagNames).join(', ')}`,
            value: tag,
          });
        }
      }
    }
  }

  return errors;
}
