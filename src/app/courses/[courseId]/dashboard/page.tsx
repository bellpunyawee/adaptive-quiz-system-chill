// src/app/courses/[courseId]/dashboard/page.tsx
// Course dashboard with student progress and course overview

import { requireCourseAccess } from '@/lib/course-authorization';
import prisma from '@/lib/db';
import { auth } from '@/auth';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  BookOpen,
  Award,
  TrendingUp,
  Clock,
  Target,
  ChevronRight,
  Users,
  FileQuestion
} from 'lucide-react';

interface DashboardPageProps {
  params: { courseId: string };
}

export default async function CourseDashboardPage({ params }: DashboardPageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    return notFound();
  }

  // Require course access - redirects if unauthorized
  const authResult = await requireCourseAccess(params.courseId);

  // Fetch course details
  const course = await prisma.course.findUnique({
    where: { id: params.courseId },
    include: {
      instructor: {
        select: {
          name: true,
          email: true,
        },
      },
      _count: {
        select: {
          cells: true,
          questions: true,
          enrollments: true,
        },
      },
    },
  });

  if (!course) {
    notFound();
  }

  const isInstructor = authResult.role === 'INSTRUCTOR' || authResult.role === 'ADMIN';

  // Get user's quiz history for this course
  const quizHistory = await prisma.quiz.findMany({
    where: {
      userId: session.user.id,
      courseId: params.courseId,
      status: 'completed',
    },
    include: {
      userAnswers: {
        select: {
          isCorrect: true,
          wasSkipped: true,
        },
      },
    },
    orderBy: {
      completedAt: 'desc',
    },
    take: 5,
  });

  // Calculate overall statistics
  const totalQuizzes = quizHistory.length;
  const totalQuestions = quizHistory.reduce((sum, quiz) => sum + quiz.userAnswers.length, 0);
  const correctAnswers = quizHistory.reduce(
    (sum, quiz) => sum + quiz.userAnswers.filter((a) => a.isCorrect).length,
    0
  );
  const overallAccuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

  // Get topic mastery
  const topicMastery = await prisma.userCellMastery.findMany({
    where: {
      userId: session.user.id,
      cell: {
        courseId: params.courseId,
      },
    },
    include: {
      cell: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      ability_theta: 'desc',
    },
    take: 10,
  });

  const masteredTopics = topicMastery.filter((m) => m.mastery_status === 1).length;
  const inProgressTopics = topicMastery.filter((m) => m.mastery_status === 0).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{course.title}</h1>
              {course.description && (
                <p className="mt-2 text-gray-600">{course.description}</p>
              )}
              <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
                <Users className="h-4 w-4" />
                <span>Instructor: {course.instructor.name || course.instructor.email}</span>
              </div>
            </div>
            {isInstructor && (
              <Link
                href={`/courses/${params.courseId}/manage`}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Manage Course
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={<BookOpen className="h-6 w-6" />}
            label="Topics"
            value={course._count.cells}
            subtext={`${masteredTopics} mastered`}
            color="blue"
          />
          <StatCard
            icon={<FileQuestion className="h-6 w-6" />}
            label="Questions"
            value={course._count.questions}
            color="green"
          />
          <StatCard
            icon={<Award className="h-6 w-6" />}
            label="Quizzes Taken"
            value={totalQuizzes}
            color="purple"
          />
          <StatCard
            icon={<Target className="h-6 w-6" />}
            label="Accuracy"
            value={`${overallAccuracy.toFixed(1)}%`}
            color="orange"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ActionButton
                  href={`/courses/${params.courseId}/quiz/start`}
                  icon={<Award />}
                  title="Start New Quiz"
                  description="Begin an adaptive quiz"
                  color="blue"
                />
                <ActionButton
                  href={`/courses/${params.courseId}/topics`}
                  icon={<BookOpen />}
                  title="Browse Topics"
                  description="Explore course topics"
                  color="green"
                />
                <ActionButton
                  href={`/courses/${params.courseId}/progress`}
                  icon={<TrendingUp />}
                  title="View Progress"
                  description="See your performance"
                  color="purple"
                />
                <ActionButton
                  href={`/courses/${params.courseId}/history`}
                  icon={<Clock />}
                  title="Quiz History"
                  description="Review past quizzes"
                  color="orange"
                />
              </div>
            </div>

            {/* Recent Quizzes */}
            {quizHistory.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">Recent Quizzes</h2>
                  <Link
                    href={`/courses/${params.courseId}/history`}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    View All
                  </Link>
                </div>
                <div className="space-y-3">
                  {quizHistory.map((quiz) => {
                    const correct = quiz.userAnswers.filter((a) => a.isCorrect).length;
                    const total = quiz.userAnswers.length;
                    const accuracy = total > 0 ? (correct / total) * 100 : 0;

                    return (
                      <Link
                        key={quiz.id}
                        href={`/quiz/results/${quiz.id}`}
                        className="block p-4 border rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <Award className="h-5 w-5 text-gray-400" />
                              <div>
                                <div className="font-medium text-gray-900">
                                  {quiz.quizType === 'baseline' ? 'Baseline Assessment' : 'Adaptive Quiz'}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {quiz.completedAt?.toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-semibold text-gray-900">
                              {accuracy.toFixed(0)}%
                            </div>
                            <div className="text-sm text-gray-500">
                              {correct}/{total}
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-gray-400 ml-3" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Topic Mastery */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Topic Mastery</h3>
              <div className="space-y-3">
                {topicMastery.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    Start a quiz to track your topic mastery
                  </p>
                ) : (
                  topicMastery.slice(0, 5).map((mastery) => (
                    <div key={mastery.id} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-700">
                          {mastery.cell.name}
                        </span>
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            mastery.mastery_status === 1
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {mastery.mastery_status === 1 ? 'Mastered' : 'In Progress'}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            mastery.mastery_status === 1 ? 'bg-green-500' : 'bg-blue-500'
                          }`}
                          style={{
                            width: `${Math.min(
                              100,
                              Math.max(0, ((mastery.ability_theta + 3) / 6) * 100)
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
              {topicMastery.length > 5 && (
                <Link
                  href={`/courses/${params.courseId}/topics`}
                  className="mt-4 block text-center text-sm text-blue-600 hover:text-blue-700"
                >
                  View All Topics
                </Link>
              )}
            </div>

            {/* Course Info */}
            <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">Course Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-700">Total Topics</span>
                  <span className="font-semibold text-blue-900">{course._count.cells}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Total Questions</span>
                  <span className="font-semibold text-blue-900">{course._count.questions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Students Enrolled</span>
                  <span className="font-semibold text-blue-900">{course._count.enrollments}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Your Quizzes</span>
                  <span className="font-semibold text-blue-900">{totalQuizzes}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  subtext,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtext?: string;
  color: string;
}) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className={`inline-flex p-3 rounded-lg ${colorClasses[color as keyof typeof colorClasses]}`}>
        {icon}
      </div>
      <div className="mt-4">
        <p className="text-sm text-gray-600">{label}</p>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        {subtext && <p className="text-xs text-gray-500 mt-1">{subtext}</p>}
      </div>
    </div>
  );
}

function ActionButton({
  href,
  icon,
  title,
  description,
  color,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}) {
  const colorClasses = {
    blue: 'hover:bg-blue-50 hover:border-blue-300',
    green: 'hover:bg-green-50 hover:border-green-300',
    purple: 'hover:bg-purple-50 hover:border-purple-300',
    orange: 'hover:bg-orange-50 hover:border-orange-300',
  };

  return (
    <Link
      href={href}
      className={`block p-4 border-2 border-gray-200 rounded-lg transition-colors ${
        colorClasses[color as keyof typeof colorClasses]
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{icon}</div>
        <div>
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-600 mt-0.5">{description}</p>
        </div>
      </div>
    </Link>
  );
}
