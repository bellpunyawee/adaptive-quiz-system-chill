import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import prisma from '@/lib/db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Users, BookOpen, Settings, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export default async function InstructorDashboard() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/api/auth/signin');
  }

  // Check if user is instructor or admin
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (user?.role !== 'instructor' && user?.role !== 'admin') {
    redirect('/403?reason=instructor_access_required');
  }

  // Fetch instructor's courses
  const courses = await prisma.course.findMany({
    where: {
      instructorId: session.user.id,
    },
    include: {
      _count: {
        select: {
          enrollments: true,
          questions: true,
          quizzes: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Get total stats
  const totalStudents = await prisma.enrollment.count({
    where: {
      course: {
        instructorId: session.user.id,
      },
    },
  });

  const totalQuestions = await prisma.question.count({
    where: {
      course: {
        instructorId: session.user.id,
      },
    },
  });

  const totalQuizzes = await prisma.quiz.count({
    where: {
      course: {
        instructorId: session.user.id,
      },
    },
  });

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Instructor Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Manage your courses, students, and content
          </p>
        </div>
        <Link href="/instructor/courses/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create New Course
          </Button>
        </Link>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{courses.length}</div>
            <p className="text-xs text-muted-foreground">
              Active teaching courses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStudents}</div>
            <p className="text-xs text-muted-foreground">
              Enrolled across all courses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Questions</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalQuestions}</div>
            <p className="text-xs text-muted-foreground">
              In your question bank
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Quizzes</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalQuizzes}</div>
            <p className="text-xs text-muted-foreground">
              Completed by students
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Courses List */}
      <Card>
        <CardHeader>
          <CardTitle>My Courses</CardTitle>
          <CardDescription>
            Manage your courses, questions, and student enrollments
          </CardDescription>
        </CardHeader>
        <CardContent>
          {courses.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No courses yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first course to start teaching
              </p>
              <Link href="/instructor/courses/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Course
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {courses.map((course) => (
                <div
                  key={course.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{course.title}</h3>
                    {course.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {course.description}
                      </p>
                    )}
                    <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {course._count.enrollments} students
                      </span>
                      <span className="flex items-center gap-1">
                        <Settings className="h-3 w-3" />
                        {course._count.questions} questions
                      </span>
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {course._count.quizzes} quizzes
                      </span>
                    </div>
                    <div className="mt-2">
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-mono bg-muted">
                        Join Code: {course.joinCode}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/courses/${course.id}/questions`}>
                      <Button variant="outline" size="sm">
                        <Settings className="h-4 w-4 mr-2" />
                        Manage Questions
                      </Button>
                    </Link>
                    <Link href={`/instructor/courses/${course.id}/students`}>
                      <Button variant="outline" size="sm">
                        <Users className="h-4 w-4 mr-2" />
                        View Students
                      </Button>
                    </Link>
                    <Link href={`/instructor/courses/${course.id}/edit`}>
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
