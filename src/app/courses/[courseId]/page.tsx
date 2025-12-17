// src/app/courses/[courseId]/page.tsx
// Course overview page with authorization

import { requireCourseAccess } from '@/lib/course-authorization';
import prisma from '@/lib/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { BookOpen, Users, FileQuestion, Settings, Award } from 'lucide-react';

interface CoursePageProps {
  params: { courseId: string };
}

export default async function CoursePage({ params }: CoursePageProps) {
  // Require course access - redirects to 403 if unauthorized
  const authResult = await requireCourseAccess(params.courseId);

  // Fetch course details with stats
  const course = await prisma.course.findUnique({
    where: { id: params.courseId },
    include: {
      instructor: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      _count: {
        select: {
          cells: true,
          questions: true,
          quizzes: true,
          enrollments: true,
        },
      },
    },
  });

  if (!course) {
    notFound();
  }

  const isInstructor = authResult.role === 'INSTRUCTOR' || authResult.role === 'ADMIN';

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
              <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>Instructor: {course.instructor.name || course.instructor.email}</span>
                </div>
                {isInstructor && (
                  <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-medium">
                    {authResult.role}
                  </div>
                )}
                {authResult.role === 'STUDENT' && (
                  <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full font-medium">
                    STUDENT
                  </div>
                )}
              </div>
            </div>
            {isInstructor && (
              <Link
                href={`/courses/${params.courseId}/settings`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                <Settings className="h-4 w-4" />
                Settings
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={<BookOpen className="h-6 w-6" />}
            label="Topics"
            value={course._count.cells}
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
            label="Quizzes"
            value={course._count.quizzes}
            color="purple"
          />
          <StatCard
            icon={<Users className="h-6 w-6" />}
            label="Students"
            value={course._count.enrollments}
            color="orange"
          />
        </div>

        {/* Join Code (Instructor Only) */}
        {isInstructor && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">Course Join Code</h3>
            <p className="text-blue-700 mb-4">
              Share this code with students to allow them to enroll in your course:
            </p>
            <div className="flex items-center gap-4">
              <div className="bg-white px-6 py-3 rounded-lg border-2 border-blue-300">
                <span className="text-2xl font-bold text-blue-900 tracking-widest">
                  {course.joinCode}
                </span>
              </div>
              <button
                onClick={() => navigator.clipboard.writeText(course.joinCode)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Copy Code
              </button>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <ActionCard
              title="Take Quiz"
              description="Start an adaptive quiz to test your knowledge"
              href={`/courses/${params.courseId}/quiz/start`}
              color="blue"
            />
            <ActionCard
              title="View Topics"
              description="Explore course topics and learning materials"
              href={`/courses/${params.courseId}/topics`}
              color="green"
            />
            <ActionCard
              title="My Progress"
              description="View your quiz history and performance"
              href={`/courses/${params.courseId}/progress`}
              color="purple"
            />
            {isInstructor && (
              <>
                <ActionCard
                  title="Manage Questions"
                  description="Add, edit, or remove course questions"
                  href={`/courses/${params.courseId}/questions`}
                  color="orange"
                />
                <ActionCard
                  title="View Students"
                  description="See enrolled students and their progress"
                  href={`/courses/${params.courseId}/students`}
                  color="pink"
                />
                <ActionCard
                  title="Analytics"
                  description="View course analytics and insights"
                  href={`/courses/${params.courseId}/analytics`}
                  color="indigo"
                />
              </>
            )}
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
      </div>
    </div>
  );
}

function ActionCard({
  title,
  description,
  href,
  color,
}: {
  title: string;
  description: string;
  href: string;
  color: string;
}) {
  const colorClasses = {
    blue: 'hover:bg-blue-50 hover:border-blue-300',
    green: 'hover:bg-green-50 hover:border-green-300',
    purple: 'hover:bg-purple-50 hover:border-purple-300',
    orange: 'hover:bg-orange-50 hover:border-orange-300',
    pink: 'hover:bg-pink-50 hover:border-pink-300',
    indigo: 'hover:bg-indigo-50 hover:border-indigo-300',
  };

  return (
    <Link
      href={href}
      className={`block p-4 rounded-lg border-2 border-gray-200 transition-colors ${
        colorClasses[color as keyof typeof colorClasses]
      }`}
    >
      <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </Link>
  );
}
