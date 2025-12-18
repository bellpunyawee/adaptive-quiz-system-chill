import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import prisma from '@/lib/db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Users, Mail, Calendar, TrendingUp, FileText } from 'lucide-react';
import Link from 'next/link';

export default async function CourseStudentsPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/api/auth/signin');
  }

  // Fetch course and verify instructor ownership
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      title: true,
      joinCode: true,
      instructorId: true,
    },
  });

  if (!course) {
    redirect('/instructor');
  }

  if (course.instructorId !== session.user.id) {
    redirect('/403?reason=not_course_instructor');
  }

  // Fetch enrolled students with their quiz stats
  const enrollments = await prisma.enrollment.findMany({
    where: {
      courseId: course.id,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          quizzes: {
            where: {
              courseId: course.id,
            },
            select: {
              id: true,
              isCompleted: true,
              finalScore: true,
              completedAt: true,
            },
          },
        },
      },
    },
    orderBy: {
      enrolledAt: 'desc',
    },
  });

  // Calculate stats for each student
  const studentsWithStats = enrollments.map((enrollment) => {
    const quizzes = enrollment.user.quizzes;
    const completedQuizzes = quizzes.filter((q) => q.isCompleted);
    const averageScore =
      completedQuizzes.length > 0
        ? completedQuizzes.reduce((sum, q) => sum + (q.finalScore || 0), 0) /
          completedQuizzes.length
        : 0;

    return {
      ...enrollment,
      stats: {
        totalQuizzes: quizzes.length,
        completedQuizzes: completedQuizzes.length,
        averageScore: Math.round(averageScore * 100),
      },
    };
  });

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/instructor">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{course.title}</h1>
            <p className="text-muted-foreground mt-1">Student Enrollments</p>
          </div>
        </div>
        <Link href={`/instructor/courses/${course.id}/reports`}>
          <Button>
            <FileText className="h-4 w-4 mr-2" />
            View Reports & Export
          </Button>
        </Link>
      </div>

      {/* Course Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Course Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Join Code:</span>
              <span className="inline-flex items-center px-3 py-1 rounded text-sm font-mono bg-primary text-primary-foreground">
                {course.joinCode}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Share this code with students so they can enroll in your course
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Students List */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Enrolled Students ({enrollments.length})</CardTitle>
              <CardDescription>
                View student progress and performance
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {studentsWithStats.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No students yet</h3>
              <p className="text-muted-foreground mb-4">
                Share your join code <span className="font-mono font-bold">{course.joinCode}</span> with students to get started
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {studentsWithStats.map((enrollment) => (
                <div
                  key={enrollment.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">
                          {enrollment.user.name || 'Unknown Student'}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {enrollment.user.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {enrollment.user.email}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Enrolled {new Date(enrollment.enrolledAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-6 mt-3 ml-13">
                      <div className="text-sm">
                        <span className="text-muted-foreground">Quizzes:</span>
                        <span className="ml-1 font-medium">
                          {enrollment.stats.completedQuizzes} / {enrollment.stats.totalQuizzes}
                        </span>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Average Score:</span>
                        <span className="ml-1 font-medium">
                          {enrollment.stats.averageScore}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/instructor/courses/${courseId}/students/${enrollment.user.id}`}>
                        <TrendingUp className="h-4 w-4 mr-2" />
                        View Progress
                      </Link>
                    </Button>
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
