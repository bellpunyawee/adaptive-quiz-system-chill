// src/app/quiz/history/page.tsx
import { auth } from "@/auth";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Home, ChevronRight, ArrowLeft } from "lucide-react";

export default async function QuizHistoryPage() {
  const session = await auth();
  if (!session || !session.user) {
    redirect("/");
  }

  // Fetch all completed quizzes
  const completedQuizzes = await prisma.quiz.findMany({
    where: { 
      userId: session.user.id,
      status: 'completed' 
    },
    include: {
      userAnswers: true
    },
    orderBy: {
      completedAt: 'desc'
    }
  });

  return (
    <div className="min-h-screen animate-in fade-in duration-300">
      <div className="container mx-auto p-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Home className="h-4 w-4" />
          <ChevronRight className="h-4 w-4" />
          <Link href="/dashboard" className="hover:text-foreground transition-colors">
            Dashboard
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="font-medium text-foreground">Quiz History</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Quiz History</h1>
            <p className="text-muted-foreground mt-1">
              Complete history of all your quiz attempts ({completedQuizzes.length} total)
            </p>
          </div>
        </div>

        {/* Quiz History List */}
        <Card className="transition-all hover:shadow-md">
          <CardHeader>
            <CardTitle>All Completed Quizzes</CardTitle>
            <CardDescription>
              View detailed results for any quiz you've completed
            </CardDescription>
          </CardHeader>
          <CardContent>
            {completedQuizzes.length > 0 ? (
              <div className="space-y-3">
                {completedQuizzes.map((quiz, index) => {
                  const total = quiz.userAnswers.length;
                  const correct = quiz.userAnswers.filter(a => a.isCorrect).length;
                  const score = total > 0 ? Math.round((correct / total) * 100) : 0;
                  const date = new Date(quiz.completedAt || quiz.createdAt);
                  
                  return (
                    <div
                      key={quiz.id}
                      className="flex justify-between items-center p-4 border rounded-lg transition-all hover:bg-accent group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary font-bold">
                          #{completedQuizzes.length - index}
                        </div>
                        <div>
                          <p className="font-semibold">
                            Quiz on {date.toLocaleDateString('en-US', { 
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {date.toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Score</p>
                          <p className={`text-2xl font-bold ${
                            score >= 80 ? 'text-green-600' :
                            score >= 60 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {score}%
                          </p>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Questions</p>
                          <p className="text-lg font-semibold">
                            {correct}/{total}
                          </p>
                        </div>
                        
                        <Button asChild variant="secondary" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link href={`/quiz/results/${quiz.id}`}>
                            View Details
                          </Link>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">You haven't completed any quizzes yet.</p>
                <Button asChild>
                  <Link href="/dashboard">Start Your First Quiz</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Statistics Summary */}
        {completedQuizzes.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Quizzes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{completedQuizzes.length}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Questions Answered
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {completedQuizzes.reduce((sum, quiz) => sum + quiz.userAnswers.length, 0)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Average Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {Math.round(
                    completedQuizzes.reduce((sum, quiz) => {
                      const total = quiz.userAnswers.length;
                      const correct = quiz.userAnswers.filter(a => a.isCorrect).length;
                      return sum + (total > 0 ? (correct / total) * 100 : 0);
                    }, 0) / completedQuizzes.length
                  )}%
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}