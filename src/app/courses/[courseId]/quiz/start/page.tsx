// src/app/courses/[courseId]/quiz/start/page.tsx
// Quiz start page with course-scoped quiz configuration

import { requireCourseAccess } from '@/lib/course-authorization';
import prisma from '@/lib/db';
import { auth } from '@/auth';
import { notFound, redirect } from 'next/navigation';
import { QuizStartForm } from '@/components/quiz/QuizStartForm';

interface QuizStartPageProps {
  params: { courseId: string };
}

export default async function CourseQuizStartPage({ params }: QuizStartPageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  // Require course access
  const authResult = await requireCourseAccess(params.courseId);

  // Fetch course details
  const course = await prisma.course.findUnique({
    where: { id: params.courseId },
    select: {
      id: true,
      title: true,
      description: true,
    },
  });

  if (!course) {
    notFound();
  }

  // Get available topics in this course
  const topics = await prisma.cell.findMany({
    where: { courseId: params.courseId },
    select: {
      id: true,
      name: true,
      _count: {
        select: {
          questions: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  // Get user's mastery status for topics
  const userMastery = await prisma.userCellMastery.findMany({
    where: {
      userId: session.user.id,
      cellId: {
        in: topics.map((t) => t.id),
      },
    },
    select: {
      cellId: true,
      mastery_status: true,
      ability_theta: true,
    },
  });

  // Create mastery map
  const masteryMap = new Map(
    userMastery.map((m) => [m.cellId, m])
  );

  // Enrich topics with mastery data
  const topicsWithMastery = topics.map((topic) => ({
    ...topic,
    mastery: masteryMap.get(topic.id),
  }));

  // Check if user has completed baseline
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      baselineCompleted: true,
      baselineCompletedAt: true,
    },
  });

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 text-sm text-gray-600 mb-3">
            <a href={`/courses/${params.courseId}/dashboard`} className="hover:text-gray-900">
              {course.title}
            </a>
            <span>/</span>
            <span className="text-gray-900">Start Quiz</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Start New Quiz</h1>
          <p className="mt-2 text-gray-600">
            Configure your adaptive quiz settings below
          </p>
        </div>

        {/* Baseline Alert */}
        {!user?.baselineCompleted && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-blue-900">Baseline Assessment Recommended</h3>
                <p className="text-sm text-blue-800 mt-1">
                  We recommend completing a baseline assessment first to calibrate the adaptive system to your skill level.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Quiz Start Form */}
        <QuizStartForm
          courseId={params.courseId}
          courseName={course.title}
          topics={topicsWithMastery}
          userId={session.user.id}
          baselineCompleted={user?.baselineCompleted || false}
        />
      </div>
    </div>
  );
}
