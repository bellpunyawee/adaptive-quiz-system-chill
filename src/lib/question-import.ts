// src/lib/question-import.ts
// Utilities for importing questions from source courses with deep copy

import prisma from '@/lib/db';

export interface ImportQuestionsOptions {
  sourceCourseId: string;
  targetCourseId: string;
  topicIds?: string[];        // Optional: filter by specific topics
  questionIds?: string[];     // Optional: filter by specific questions
  includeInactive?: boolean;  // Whether to include inactive questions
  resetCalibration?: boolean; // Whether to reset IRT calibration data
}

export interface ImportResult {
  success: boolean;
  imported: number;
  failed: number;
  topicsCreated: number;
  errors: string[];
  questionMapping: Record<string, string>; // old ID -> new ID
  topicMapping: Record<string, string>;    // old ID -> new ID
}

/**
 * Import questions from a source course to a target course with deep copy
 * This creates completely independent copies that can be edited without affecting the source
 */
export async function importQuestions(
  options: ImportQuestionsOptions
): Promise<ImportResult> {
  const {
    sourceCourseId,
    targetCourseId,
    topicIds,
    questionIds,
    includeInactive = false,
    resetCalibration = true,
  } = options;

  const result: ImportResult = {
    success: false,
    imported: 0,
    failed: 0,
    topicsCreated: 0,
    errors: [],
    questionMapping: {},
    topicMapping: {},
  };

  try {
    // 1. Validate courses exist
    const [sourceCourse, targetCourse] = await Promise.all([
      prisma.course.findUnique({ where: { id: sourceCourseId } }),
      prisma.course.findUnique({ where: { id: targetCourseId } }),
    ]);

    if (!sourceCourse) {
      result.errors.push(`Source course ${sourceCourseId} not found`);
      return result;
    }

    if (!targetCourse) {
      result.errors.push(`Target course ${targetCourseId} not found`);
      return result;
    }

    // 2. Build query filters
    const questionFilters: any = {
      courseId: sourceCourseId,
    };

    if (questionIds && questionIds.length > 0) {
      questionFilters.id = { in: questionIds };
    }

    if (topicIds && topicIds.length > 0) {
      questionFilters.cellId = { in: topicIds };
    }

    if (!includeInactive) {
      questionFilters.isActive = true;
    }

    // 3. Fetch questions with all related data
    const sourceQuestions = await prisma.question.findMany({
      where: questionFilters,
      include: {
        answerOptions: true,
        cell: true,
        tags: {
          include: {
            tag: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (sourceQuestions.length === 0) {
      result.errors.push('No questions found matching the criteria');
      return result;
    }

    console.log(`[Import] Found ${sourceQuestions.length} questions to import`);

    // 4. Get or create topics (cells) in target course
    const uniqueTopics = new Map<string, typeof sourceQuestions[0]['cell']>();
    sourceQuestions.forEach((q) => {
      if (!uniqueTopics.has(q.cell.id)) {
        uniqueTopics.set(q.cell.id, q.cell);
      }
    });

    console.log(`[Import] Processing ${uniqueTopics.size} unique topics`);

    // Map old topic IDs to new topic IDs
    for (const [oldTopicId, sourceTopic] of uniqueTopics) {
      // Check if topic with same name already exists in target course
      let targetTopic = await prisma.cell.findFirst({
        where: {
          courseId: targetCourseId,
          name: sourceTopic.name,
        },
      });

      // Create topic if it doesn't exist
      if (!targetTopic) {
        targetTopic = await prisma.cell.create({
          data: {
            name: sourceTopic.name,
            courseId: targetCourseId,
            difficulty_b: sourceTopic.difficulty_b,
            discrimination_a: sourceTopic.discrimination_a,
          },
        });
        result.topicsCreated++;
        console.log(`[Import] Created topic: ${targetTopic.name}`);
      }

      result.topicMapping[oldTopicId] = targetTopic.id;
    }

    // 5. Get or create tags in target course
    const tagMapping = new Map<string, string>(); // old tag ID -> new tag ID

    const uniqueTags = new Set<string>();
    sourceQuestions.forEach((q) => {
      q.tags.forEach((qt) => uniqueTags.add(qt.tag.id));
    });

    if (uniqueTags.size > 0) {
      const sourceTags = await prisma.tag.findMany({
        where: { id: { in: Array.from(uniqueTags) } },
      });

      for (const sourceTag of sourceTags) {
        // Check if tag exists in target course
        let targetTag = await prisma.tag.findFirst({
          where: {
            courseId: targetCourseId,
            name: sourceTag.name,
          },
        });

        // Create tag if it doesn't exist
        if (!targetTag) {
          targetTag = await prisma.tag.create({
            data: {
              name: sourceTag.name,
              description: sourceTag.description,
              color: sourceTag.color,
              category: sourceTag.category,
              courseId: targetCourseId,
            },
          });
        }

        tagMapping.set(sourceTag.id, targetTag.id);
      }
    }

    console.log(`[Import] Processed ${tagMapping.size} tags`);

    // 6. Import questions with deep copy
    for (const sourceQuestion of sourceQuestions) {
      try {
        // Prepare question data with course scoping
        const questionData: any = {
          text: sourceQuestion.text,
          explanation: sourceQuestion.explanation,
          imageUrl: sourceQuestion.imageUrl,
          datasetUrl: sourceQuestion.datasetUrl,
          datasetFilename: sourceQuestion.datasetFilename,
          bloomTaxonomy: sourceQuestion.bloomTaxonomy,
          courseId: targetCourseId,
          cellId: result.topicMapping[sourceQuestion.cellId],
          isActive: sourceQuestion.isActive,
          irtModel: sourceQuestion.irtModel,
        };

        // Handle calibration data
        if (resetCalibration) {
          // Reset to defaults for new course
          questionData.difficulty_b = 0;
          questionData.discrimination_a = 1.0;
          questionData.guessing_c = 0.0;
          questionData.exposureCount = 0;
          questionData.responseCount = 0;
          questionData.correctRate = null;
          questionData.lastCalibrated = null;
          questionData.calibrationSampleSize = null;
          questionData.calibrationDate = null;
          questionData.lastUsed = null;
        } else {
          // Copy calibration data from source
          questionData.difficulty_b = sourceQuestion.difficulty_b;
          questionData.discrimination_a = sourceQuestion.discrimination_a;
          questionData.guessing_c = sourceQuestion.guessing_c;
          // Don't copy usage stats (exposureCount, lastUsed, etc.)
          questionData.exposureCount = 0;
          questionData.responseCount = 0;
          questionData.lastUsed = null;
        }

        // Create new question with answer options (deep copy)
        const newQuestion = await prisma.question.create({
          data: {
            ...questionData,
            answerOptions: {
              create: sourceQuestion.answerOptions.map((option) => ({
                text: option.text,
                isCorrect: option.isCorrect,
              })),
            },
          },
        });

        // Copy tags
        if (sourceQuestion.tags.length > 0) {
          const tagConnections = sourceQuestion.tags
            .map((qt) => {
              const newTagId = tagMapping.get(qt.tag.id);
              if (newTagId) {
                return {
                  questionId: newQuestion.id,
                  tagId: newTagId,
                };
              }
              return null;
            })
            .filter(Boolean);

          if (tagConnections.length > 0) {
            await prisma.questionTag.createMany({
              data: tagConnections as any,
            });
          }
        }

        result.questionMapping[sourceQuestion.id] = newQuestion.id;
        result.imported++;

        console.log(
          `[Import] Copied question ${result.imported}/${sourceQuestions.length}: ${newQuestion.text.substring(0, 50)}...`
        );
      } catch (error) {
        result.failed++;
        const errorMsg = `Failed to import question "${sourceQuestion.text.substring(0, 50)}...": ${
          error instanceof Error ? error.message : 'Unknown error'
        }`;
        result.errors.push(errorMsg);
        console.error(`[Import] ${errorMsg}`);
      }
    }

    result.success = result.imported > 0;

    console.log(
      `[Import] Complete: ${result.imported} imported, ${result.failed} failed, ${result.topicsCreated} topics created`
    );

    return result;
  } catch (error) {
    result.errors.push(
      `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    console.error('[Import] Fatal error:', error);
    return result;
  }
}

/**
 * Get available source courses for importing (master question banks)
 * These are courses marked as question banks or have importable questions
 */
export async function getImportableCourses(excludeCourseId?: string) {
  const where: any = {
    isActive: true,
  };

  if (excludeCourseId) {
    where.id = { not: excludeCourseId };
  }

  const courses = await prisma.course.findMany({
    where,
    select: {
      id: true,
      title: true,
      description: true,
      instructor: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      _count: {
        select: {
          questions: true,
          cells: true,
        },
      },
    },
    orderBy: { title: 'asc' },
  });

  return courses.filter((c) => c._count.questions > 0);
}

/**
 * Get topics (cells) from a source course for selection
 */
export async function getSourceCourseTopics(courseId: string) {
  const topics = await prisma.cell.findMany({
    where: { courseId },
    select: {
      id: true,
      name: true,
      difficulty_b: true,
      discrimination_a: true,
      _count: {
        select: {
          questions: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  return topics;
}

/**
 * Get preview of questions from source course
 */
export async function previewImportQuestions(
  courseId: string,
  topicIds?: string[]
) {
  const where: any = {
    courseId,
    isActive: true,
  };

  if (topicIds && topicIds.length > 0) {
    where.cellId = { in: topicIds };
  }

  const questions = await prisma.question.findMany({
    where,
    select: {
      id: true,
      text: true,
      bloomTaxonomy: true,
      difficulty_b: true,
      cell: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          answerOptions: true,
          tags: true,
        },
      },
    },
    take: 100, // Limit preview
    orderBy: { createdAt: 'asc' },
  });

  return questions;
}
