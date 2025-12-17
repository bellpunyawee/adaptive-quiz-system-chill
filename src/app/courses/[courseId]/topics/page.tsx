// src/app/courses/[courseId]/topics/page.tsx
// Browse and track progress across course topics

import { requireCourseAccess } from '@/lib/course-authorization';
import prisma from '@/lib/db';
import { auth } from '@/auth';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { BookOpen, TrendingUp, Award, Target, ChevronRight } from 'lucide-react';

interface TopicsPageProps {
  params: { courseId: string };
}

export default async function CourseTopicsPage({ params }: TopicsPageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    notFound();
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

  // Get all topics in this course with question counts
  const topics = await prisma.cell.findMany({
    where: { courseId: params.courseId },
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

  // Get user's mastery for these topics
  const userMastery = await prisma.userCellMastery.findMany({
    where: {
      userId: session.user.id,
      cellId: {
        in: topics.map((t) => t.id),
      },
    },
    select: {
      cellId: true,
      ability_theta: true,
      mastery_status: true,
      selection_count: true,
      confidence: true,
      responseCount: true,
    },
  });

  // Create mastery map
  const masteryMap = new Map(
    userMastery.map((m) => [m.cellId, m])
  );

  // Enrich topics with mastery data
  const topicsWithMastery = topics.map((topic) => {
    const mastery = masteryMap.get(topic.id);
    return {
      ...topic,
      mastery: mastery || null,
    };
  });

  // Calculate statistics
  const totalTopics = topics.length;
  const masteredCount = topicsWithMastery.filter((t) => t.mastery?.mastery_status === 1).length;
  const inProgressCount = topicsWithMastery.filter(
    (t) => t.mastery && t.mastery.mastery_status === 0
  ).length;
  const notStartedCount = totalTopics - masteredCount - inProgressCount;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 text-sm text-gray-600 mb-3">
            <Link
              href={`/courses/${params.courseId}/dashboard`}
              className="hover:text-gray-900"
            >
              {course.title}
            </Link>
            <span>/</span>
            <span className="text-gray-900">Topics</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Course Topics</h1>
          <p className="mt-2 text-gray-600">
            Track your progress across {totalTopics} topics in this course
          </p>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={<BookOpen className="h-5 w-5" />}
            label="Total Topics"
            value={totalTopics}
            color="blue"
          />
          <StatCard
            icon={<Award className="h-5 w-5" />}
            label="Mastered"
            value={masteredCount}
            color="green"
          />
          <StatCard
            icon={<TrendingUp className="h-5 w-5" />}
            label="In Progress"
            value={inProgressCount}
            color="purple"
          />
          <StatCard
            icon={<Target className="h-5 w-5" />}
            label="Not Started"
            value={notStartedCount}
            color="gray"
          />
        </div>

        {/* Topics Grid */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="p-6 border-b bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">All Topics</h2>
          </div>
          <div className="divide-y">
            {topicsWithMastery.map((topic) => {
              const mastery = topic.mastery;
              const isMastered = mastery?.mastery_status === 1;
              const isInProgress = mastery && mastery.mastery_status === 0;

              // Calculate progress percentage (ability scaled from -3 to +3)
              const progressPercentage = mastery
                ? Math.min(100, Math.max(0, ((mastery.ability_theta + 3) / 6) * 100))
                : 0;

              return (
                <div key={topic.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {topic.name}
                        </h3>
                        {isMastered && (
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                            Mastered
                          </span>
                        )}
                        {isInProgress && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                            In Progress
                          </span>
                        )}
                        {!mastery && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded">
                            Not Started
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-6 text-sm text-gray-600 mb-3">
                        <span>{topic._count.questions} questions</span>
                        {mastery && (
                          <>
                            <span>•</span>
                            <span>{mastery.responseCount} responses</span>
                            <span>•</span>
                            <span>
                              Ability: {mastery.ability_theta.toFixed(2)}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Progress Bar */}
                      {mastery && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>Progress</span>
                            <span>{progressPercentage.toFixed(0)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                isMastered ? 'bg-green-500' : 'bg-blue-500'
                              }`}
                              style={{ width: `${progressPercentage}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <Link
                      href={`/courses/${params.courseId}/quiz/start?topic=${topic.id}`}
                      className="ml-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      Practice
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              );
            })}

            {topicsWithMastery.length === 0 && (
              <div className="p-12 text-center text-gray-500">
                <BookOpen className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p className="text-lg font-medium text-gray-700 mb-1">
                  No topics available
                </p>
                <p className="text-sm">
                  This course doesn't have any topics yet. Check back later or contact your instructor.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 flex items-center justify-between">
          <Link
            href={`/courses/${params.courseId}/dashboard`}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Back to Dashboard
          </Link>
          <Link
            href={`/courses/${params.courseId}/quiz/start`}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Start Quiz
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    gray: 'bg-gray-100 text-gray-600',
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className={`inline-flex p-2 rounded-lg ${colorClasses[color as keyof typeof colorClasses]}`}>
        {icon}
      </div>
      <div className="mt-3">
        <p className="text-sm text-gray-600">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}
