// src/app/api/courses/[courseId]/import-questions/route.ts
// API endpoint for importing questions from master question bank

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { canManageCourse } from '@/lib/course-authorization';
import {
  importQuestions,
  getImportableCourses,
  getSourceCourseTopics,
  previewImportQuestions,
} from '@/lib/question-import';

/**
 * GET /api/courses/[courseId]/import-questions
 * Get available source courses and topics for importing
 */
export async function GET(
  req: Request,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user can manage this course
    const canManage = await canManageCourse(session.user.id, params.courseId);
    if (!canManage) {
      return NextResponse.json(
        { error: 'Forbidden - Instructor access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const sourceCourseId = searchParams.get('sourceCourseId');

    // Get available source courses
    if (action === 'list-sources') {
      const courses = await getImportableCourses(params.courseId);
      return NextResponse.json({
        success: true,
        courses,
      });
    }

    // Get topics from a source course
    if (action === 'list-topics' && sourceCourseId) {
      const topics = await getSourceCourseTopics(sourceCourseId);
      return NextResponse.json({
        success: true,
        topics,
      });
    }

    // Preview questions from source course
    if (action === 'preview' && sourceCourseId) {
      const topicIdsParam = searchParams.get('topicIds');
      const topicIds = topicIdsParam ? topicIdsParam.split(',') : undefined;

      const questions = await previewImportQuestions(sourceCourseId, topicIds);
      return NextResponse.json({
        success: true,
        questions,
        count: questions.length,
      });
    }

    return NextResponse.json(
      { error: 'Invalid action or missing parameters' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[Import Questions GET] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch import data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/courses/[courseId]/import-questions
 * Import questions from a source course
 */
export async function POST(
  req: Request,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user can manage this course
    const canManage = await canManageCourse(session.user.id, params.courseId);
    if (!canManage) {
      return NextResponse.json(
        { error: 'Forbidden - Instructor access required' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      sourceCourseId,
      topicIds,
      questionIds,
      includeInactive = false,
      resetCalibration = true,
    } = body;

    // Validate required parameters
    if (!sourceCourseId) {
      return NextResponse.json(
        { error: 'sourceCourseId is required' },
        { status: 400 }
      );
    }

    // Validate that source and target are different
    if (sourceCourseId === params.courseId) {
      return NextResponse.json(
        { error: 'Cannot import from the same course' },
        { status: 400 }
      );
    }

    console.log(
      `[Import API] Starting import from ${sourceCourseId} to ${params.courseId}`
    );

    // Perform the import
    const result = await importQuestions({
      sourceCourseId,
      targetCourseId: params.courseId,
      topicIds,
      questionIds,
      includeInactive,
      resetCalibration,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Import failed',
          details: result.errors,
        },
        { status: 400 }
      );
    }

    console.log(
      `[Import API] Import complete: ${result.imported} questions imported`
    );

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${result.imported} question(s)`,
      imported: result.imported,
      failed: result.failed,
      topicsCreated: result.topicsCreated,
      errors: result.errors,
      questionMapping: result.questionMapping,
      topicMapping: result.topicMapping,
    });
  } catch (error) {
    console.error('[Import Questions POST] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to import questions',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
