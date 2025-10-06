// src/app/dashboard/page.tsx
// Complete Updated Version with Custom Quiz Settings Button

import { auth } from "@/auth";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { handleSignOut, startNewQuiz } from "@/app/actions";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { PerformanceChart, ChartData } from "@/app/dashboard/PerformanceChart";
import { Settings, Zap } from "lucide-react"; // Import icons

export default async function DashboardPage() {
  const session = await auth();
  if (!session || !session.user) {
    redirect("/");
  }

  // --- 1. Fetch All Necessary Data in One Go ---
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
              cell: true, // We need the cell (topic) name
            }
          }
        }
      }
    },
    orderBy: {
      completedAt: 'desc'
    }
  });

  // --- 2. Process Data for the UI Components ---

  // For the Performance Chart
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
    name: name.split(' ')[0], // Use a shorter name for the chart axis
    score: Math.round((data.correct / data.total) * 100),
  }));

  // For the Overall Progress
  const totalCorrect = Object.values(cellPerformance).reduce((sum, cell) => sum + cell.correct, 0);
  const totalAnswered = Object.values(cellPerformance).reduce((sum, cell) => sum + cell.total, 0);
  const overallScore = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

  
  // --- 3. Render the Dashboard ---
  return (
    <div className="container mx-auto p-8">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Welcome back, {session.user.name || 'User'}</h1>
          <p className="text-muted-foreground">Here is an overview of your progress and performance.</p>
        </div>
        <div className="flex items-center gap-3">
          <form action={handleSignOut}>
            <Button variant="outline" type="submit">Sign Out</Button>
          </form>
        </div>
      </div>

      {/* Start Quiz Section - UPDATED WITH TWO BUTTONS */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Start a New Quiz</CardTitle>
          <CardDescription>
            Choose quick start or customize your quiz settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Quick Start Button */}
            <form action={startNewQuiz} className="flex-1">
              <Button type="submit" className="w-full h-12" size="lg">
                <Zap className="w-5 h-5 mr-2" />
                Quick Start Quiz
              </Button>
            </form>
            
            {/* Custom Settings Button */}
            <Link href="/quiz/settings" className="flex-1">
              <Button variant="outline" className="w-full h-12" size="lg">
                <Settings className="w-5 h-5 mr-2" />
                Custom Quiz Settings
              </Button>
            </Link>
          </div>
          <p className="text-xs text-muted-foreground mt-3 text-center">
            Quick start uses default settings. Custom settings let you configure exploration, timer, max questions, and topics.
          </p>
        </CardContent>
      </Card>

      {/* Performance and Progress Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Performance Chart */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Performance by Topic</CardTitle>
            <CardDescription>Your average scores across different topics.</CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <PerformanceChart data={chartData} />
            ) : (
              <div className="h-60 bg-secondary rounded-md flex items-center justify-center">
                <p className="text-muted-foreground">Complete a quiz to see your performance data.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Overall Progress */}
        <Card>
          <CardHeader>
            <CardTitle>Overall Progress</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center">
            <div className="w-40 h-40 bg-secondary rounded-full flex items-center justify-center text-4xl font-bold mb-4">
              {overallScore}%
            </div>
            <h3 className="text-xl font-semibold">Keep it going!</h3>
            <p className="text-muted-foreground text-center">
              Based on {completedQuizzes.length} completed quiz attempt{completedQuizzes.length !== 1 ? 's' : ''}.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quiz History */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Quiz History</CardTitle>
          <CardDescription>Review your past attempts.</CardDescription>
        </CardHeader>
        <CardContent>
          {completedQuizzes.length > 0 ? (
            <ul className="space-y-3">
              {completedQuizzes.map(quiz => {
                const total = quiz.userAnswers.length;
                const correct = quiz.userAnswers.filter(a => a.isCorrect).length;
                const score = total > 0 ? Math.round((correct / total) * 100) : 0;
                return (
                  <li key={quiz.id} className="flex justify-between items-center p-3 border rounded-md">
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
          ) : (
            <p className="text-center text-muted-foreground">You have not completed any quizzes yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}