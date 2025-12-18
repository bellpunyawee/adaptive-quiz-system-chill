import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import prisma from '@/lib/db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, BookOpen, Users, Settings } from 'lucide-react';
import Link from 'next/link';

export default async function CourseSetupPage({
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
    include: {
      _count: {
        select: {
          cells: true,
          questions: true,
        },
      },
    },
  });

  if (!course) {
    redirect('/instructor');
  }

  if (course.instructorId !== session.user.id) {
    redirect('/403?reason=not_course_instructor');
  }

  const hasTopics = course._count.cells > 0;
  const hasQuestions = course._count.questions > 0;

  return (
    <div className="container mx-auto py-8 max-w-4xl space-y-6">
      {/* Success Message */}
      <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
            <CardTitle className="text-green-900 dark:text-green-100">
              Course Created Successfully!
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-green-900 dark:text-green-100">
            Your course <strong>{course.title}</strong> has been created.
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm text-green-800 dark:text-green-200">Join Code:</span>
            <span className="inline-flex items-center px-3 py-1 rounded text-sm font-mono bg-green-600 text-white">
              {course.joinCode}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Setup Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Next Steps</CardTitle>
          <CardDescription>
            Complete these steps to get your course ready for students
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Step 1: Add Topics */}
          <div className="flex items-start gap-4 p-4 border rounded-lg">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center ${hasTopics ? 'bg-green-100 dark:bg-green-900' : 'bg-muted'}`}>
              {hasTopics ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <span className="text-sm font-medium">1</span>
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Add Topics (Optional)</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Organize your questions into topics or learning modules
              </p>
              <Link href={`/courses/${courseId}/questions`}>
                <Button size="sm" variant={hasTopics ? 'outline' : 'default'}>
                  <Settings className="h-4 w-4 mr-2" />
                  {hasTopics ? 'Manage Topics' : 'Add Topics'}
                </Button>
              </Link>
            </div>
          </div>

          {/* Step 2: Add Questions */}
          <div className="flex items-start gap-4 p-4 border rounded-lg">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center ${hasQuestions ? 'bg-green-100 dark:bg-green-900' : 'bg-muted'}`}>
              {hasQuestions ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <span className="text-sm font-medium">2</span>
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Add Questions</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Create or import questions for your course
              </p>
              <Link href={`/courses/${courseId}/questions`}>
                <Button size="sm" variant={hasQuestions ? 'outline' : 'default'}>
                  <BookOpen className="h-4 w-4 mr-2" />
                  {hasQuestions ? `Manage ${course._count.questions} Questions` : 'Add Questions'}
                </Button>
              </Link>
            </div>
          </div>

          {/* Step 3: Share Join Code */}
          <div className="flex items-start gap-4 p-4 border rounded-lg">
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
              <span className="text-sm font-medium">3</span>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Share Join Code with Students</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Give students your join code so they can enroll in the course
              </p>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-3 py-2 rounded text-base font-mono bg-primary text-primary-foreground">
                  {course.joinCode}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(course.joinCode);
                    alert('Join code copied to clipboard!');
                  }}
                >
                  Copy
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-4">
        <Link href="/instructor" className="flex-1">
          <Button variant="outline" className="w-full">
            Go to Dashboard
          </Button>
        </Link>
        <Link href={`/instructor/courses/${courseId}/students`} className="flex-1">
          <Button className="w-full">
            <Users className="h-4 w-4 mr-2" />
            View Students
          </Button>
        </Link>
      </div>
    </div>
  );
}
