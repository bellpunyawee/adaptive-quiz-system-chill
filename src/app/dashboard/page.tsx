// src/app/dashboard/page.tsx
import { auth } from "@/auth";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { handleSignOut, startNewQuiz } from "@/app/actions";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { PerformanceChart, ChartData } from "@/app/dashboard/PerformanceChart";
import { Settings, Zap, Home, ChevronRight } from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();
  if (!session || !session.user) {
    redirect("/");
  }

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

        {/* Sign Out Button - Top Right */}
        <div className="flex justify-end mb-4">
          <form action={handleSignOut}>
            <Button variant="ghost" size="sm">Sign Out</Button>
          </form>
        </div>

        {/* Header Section */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Welcome back, {session.user.name || 'User'}</h1>
            <p className="text-muted-foreground mt-1">Here is an overview of your progress and performance.</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Quick Actions */}
            <form action={startNewQuiz}>
              <Button type="submit" size="lg">
                <Zap className="w-4 h-4 mr-2" />
                Start Quiz
              </Button>
            </form>
            
            <Link href="/quiz/settings">
              <Button variant="outline" size="lg">
                <Settings className="w-4 h-4 mr-2" />
                Quiz Settings
              </Button>
            </Link>
          </div>
        </div>

        {/* Performance and Progress Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2 transition-all hover:shadow-md">
            <CardHeader>
              <CardTitle>Performance by Topic</CardTitle>
              <CardDescription>Your average scores across different topics.</CardDescription>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <PerformanceChart data={chartData} />
              ) : (
                <p className="text-center text-muted-foreground py-8">No performance data yet. Start a quiz to see your progress!</p>
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