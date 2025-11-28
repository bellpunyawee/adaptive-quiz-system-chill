// src/lib/upload/excel-parser.ts
import * as XLSX from 'xlsx';
import type { ParsedQuestion, ValidationError, ParseResult } from './csv-parser';

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
 * Parse Excel file buffer into structured question data
 */
export function parseExcelContent(buffer: Buffer): ParseResult {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];
  const questions: ParsedQuestion[] = [];

  try {
    // Read the workbook
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    // Find the "Questions" sheet (or use first sheet if not found)
    let sheetName = 'Questions';
    if (!workbook.SheetNames.includes(sheetName)) {
      sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        return {
          success: false,
          questions: [],
          errors: [
            {
              row: 0,
              field: 'file',
              message: 'No sheets found in Excel file',
            },
          ],
          warnings: [],
        };
      }
    }

    const worksheet = workbook.Sheets[sheetName];

    // Convert sheet to JSON (array of objects with headers as keys)
    const records: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, {
      raw: false, // Return formatted strings
      defval: '', // Default value for empty cells
    });

    if (records.length === 0) {
      return {
        success: false,
        questions: [],
        errors: [
          {
            row: 0,
            field: 'file',
            message: `No data found in sheet "${sheetName}"`,
          },
        ],
        warnings: [],
      };
    }

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
        message: 'No valid questions found in Excel file',
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
          message: `Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
      warnings: [],
    };
  }
}

/**
 * Check if a row is empty
 */
function isEmptyRow(row: Record<string, any>): boolean {
  return Object.values(row).every(
    (value) => value === undefined || value === null || value === '' || String(value).trim() === ''
  );
}

/**
 * Parse and validate a single question row
 */
function parseQuestionRow(
  row: Record<string, any>,
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
    correctOption = parseInt(String(correctOptionStr), 10);
    if (isNaN(correctOption) || correctOption < 1 || correctOption > 5) {
      errors.push({
        row: rowNumber,
        field: 'correct_option',
        message: 'Correct option must be a number between 1 and 5',
        value: String(correctOptionStr),
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
    tags = String(tagsStr)
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
      value: String(correctOptionStr),
    });
  }

  // Warnings
  if (!bloomTaxonomy) {
    warnings.push(`Row ${rowNumber}: No Bloom's Taxonomy level specified`);
  }

  if (!tagsStr) {
    warnings.push(
      `Row ${rowNumber}: No tags specified. Consider adding tags like "baseline" for assessment eligibility`
    );
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
function getField(row: Record<string, any>, possibleNames: string[]): string {
  for (const name of possibleNames) {
    const value = row[name];
    if (value !== undefined && value !== null && value !== '') {
      return String(value).trim();
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
