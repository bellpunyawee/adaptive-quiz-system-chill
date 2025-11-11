// src/app/dashboard/page.tsx
import { auth } from "@/auth";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { handleSignOut } from "@/app/actions";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { PerformanceChart, ChartData } from "@/app/dashboard/PerformanceChart";
import { QuizStartDialog } from "@/components/QuizStartDialog";
import { HowItWorksDialog } from "@/components/HowItWorksDialog";
import { BaselineAssessmentCTA, BaselineCompletedCard } from "@/components/BaselineAssessmentCTA";
import { Settings, Home, ChevronRight, TrendingUp } from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();
  if (!session || !session.user) {
    redirect("/");
  }

  // Check baseline status
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      baselineCompleted: true,
      baselineQuizId: true,
    },
  });

  const completedQuizzes = await prisma.quiz.findMany({
    where: { 
      userId: session.user.id,
      status: 'completed' 
    },
    include: {
      userAnswers: {
        include: {
          question: {
            include: {
              cell: true,
            }
          }
        }
      }
    },
    orderBy: {
      completedAt: 'desc'
    }
  });

  const cellPerformance: { [key: string]: { correct: number; total: number } } = {};

  completedQuizzes.forEach(quiz => {
    quiz.userAnswers.forEach(answer => {
      const cellName = answer.question.cell.name;
      if (!cellPerformance[cellName]) {
        cellPerformance[cellName] = { correct: 0, total: 0 };
      }
      if (answer.isCorrect) {
        cellPerformance[cellName].correct++;
      }
      cellPerformance[cellName].total++;
    });
  });

  const chartData: ChartData[] = Object.entries(cellPerformance).map(([name, data]) => ({
    name: name.split(' ')[0],
    score: Math.round((data.correct / data.total) * 100),
  }));

  const totalCorrect = Object.values(cellPerformance).reduce((sum, cell) => sum + cell.correct, 0);
  const totalAnswered = Object.values(cellPerformance).reduce((sum, cell) => sum + cell.total, 0);
  const overallScore = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

  // Pagination for recent quizzes
  const QUIZZES_PER_PAGE = 5;
  const recentQuizzes = completedQuizzes.slice(0, QUIZZES_PER_PAGE);
  const hasMoreQuizzes = completedQuizzes.length > QUIZZES_PER_PAGE;

  return (
    <div className="min-h-screen animate-in fade-in duration-300">
      <div className="container mx-auto p-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Home className="h-4 w-4" />
          <ChevronRight className="h-4 w-4" />
          <span className="font-medium text-foreground">Dashboard</span>
        </nav>

        {/* Top Bar - Sign Out & Help */}
        <div className="flex justify-between items-center mb-4">
          <HowItWorksDialog />
          <form action={handleSignOut}>
            <Button variant="ghost" size="sm">Sign Out</Button>
          </form>
        </div>

        {/* Header Section */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Welcome back, {session.user.name || 'User'}</h1>
            <p className="text-muted-foreground mt-1">
              Track your learning progress with personalized quizzes that adapt to your skill level.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Quick Actions */}
            <QuizStartDialog />

            <Link href="/dashboard/learner-model">
              <Button variant="outline" size="lg">
                <TrendingUp className="w-4 h-4 mr-2" />
                Learner Model
              </Button>
            </Link>

            <Link href="/quiz/settings">
              <Button variant="outline" size="lg">
                <Settings className="w-4 h-4 mr-2" />
                Quiz Settings
              </Button>
            </Link>
          </div>
        </div>

        {/* Baseline Assessment CTA */}
        {!user?.baselineCompleted ? (
          <div className="mb-8">
            <BaselineAssessmentCTA />
          </div>
        ) : user?.baselineQuizId ? (
          <div className="mb-8">
            <BaselineCompletedCard baselineQuizId={user.baselineQuizId} />
          </div>
        ) : null}

        {/* Performance and Progress Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2 transition-all hover:shadow-md">
            <CardHeader>
              <CardTitle>Performance by Topic</CardTitle>
              <CardDescription>
                Quiz accuracy across different topics.{' '}
                <Link href="/dashboard/learner-model" className="text-primary hover:underline">
                  View detailed ability analysis →
                </Link>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <PerformanceChart data={chartData} />
              ) : (
                <div className="text-center py-12 space-y-4">
                  <p className="text-muted-foreground text-lg">No quiz data yet</p>
                  <div className="text-sm text-muted-foreground space-y-2 max-w-md mx-auto">
                    <p className="font-medium">After completing quizzes, you'll see:</p>
                    <ul className="text-left space-y-1 pl-6">
                      <li>• Which topics you're strongest in</li>
                      <li>• Where you need more practice</li>
                      <li>• Your progress over time</li>
                    </ul>
                  </div>
                  <div className="pt-4">
                    <QuizStartDialog />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="transition-all hover:shadow-md">
            <CardHeader>
              <CardTitle>Overall Progress</CardTitle>
              <CardDescription>Your cumulative performance.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <p className="text-5xl font-bold mb-2">{overallScore}%</p>
                <p className="text-sm text-muted-foreground">Average Score</p>
                <p className="text-sm text-muted-foreground mt-4">{totalCorrect} / {totalAnswered} questions correct</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Quizzes */}
        <Card className="mt-6 transition-all hover:shadow-md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Quizzes</CardTitle>
                <CardDescription>Your quiz history and results.</CardDescription>
              </div>
              {hasMoreQuizzes && (
                <span className="text-sm text-muted-foreground">
                  Showing {recentQuizzes.length} of {completedQuizzes.length}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {recentQuizzes.length > 0 ? (
              <>
                <ul className="space-y-3">
                  {recentQuizzes.map(quiz => {
                    const total = quiz.userAnswers.length;
                    const correct = quiz.userAnswers.filter(a => a.isCorrect).length;
                    const score = total > 0 ? Math.round((correct / total) * 100) : 0;
                    return (
                      <li key={quiz.id} className="flex justify-between items-center p-3 border rounded-md transition-all hover:bg-accent">
                        <div>
                          <p className="font-semibold">Quiz on {new Date(quiz.createdAt).toLocaleDateString()}</p>
                          <p className="text-sm text-muted-foreground">Score: {score}% ({correct}/{total})</p>
                        </div>
                        <Button asChild variant="secondary" size="sm">
                          <Link href={`/quiz/results/${quiz.id}`}>View Details</Link>
                        </Button>
                      </li>
                    );
                  })}
                </ul>
                {hasMoreQuizzes && (
                  <div className="mt-4 text-center">
                    <Button variant="outline" asChild>
                      <Link href="/quiz/history">View All Quiz History</Link>
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <p className="text-center text-muted-foreground">You have not completed any quizzes yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}