// src/app/quiz/results/[quizId]/page.tsx
import { auth } from "@/auth";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, Home, ChevronRight, Award } from "lucide-react";
import { formatDuration } from "@/lib/utils";

type PageProps = {
  params: {
    quizId: string;
  };
};

type AnswerDetails = {
    questionText: string;
    isCorrect: boolean;
    userAnswerText: string | null;
    correctAnswerText: string | null;
    explanation: string | null;
}

export default async function ResultsPage({ params: { quizId } }: PageProps) {
    const session = await auth();
    if (!session?.user) {
        redirect("/");
    }
    
    const userAnswers = await prisma.userAnswer.findMany({
        where: {
            quizId: quizId,
            userId: session.user.id,
        },
        include: {
            question: {
                include: {
                    answerOptions: true
                }
            },
        }
    });

    const quiz = await prisma.quiz.findUnique({
        where: {
            id: quizId,
        },
        select: {
            startedAt: true,
            completedAt: true,
        },
    });

    if (userAnswers.length === 0 || !quiz) {
        return (
            <div className="container mx-auto p-8 text-center animate-in fade-in duration-300">
                <h1 className="text-2xl font-bold">Results not found</h1>
                <p>No answers were recorded for this quiz, or it may not exist.</p>
                <Button asChild className="mt-4"><Link href="/dashboard">Back to Dashboard</Link></Button>
            </div>
        );
    }
    
    const totalQuestions = userAnswers.length;
    const correctAnswers = userAnswers.filter(a => a.isCorrect).length;
    const score = Math.round((correctAnswers / totalQuestions) * 100);

    const answerDetails: AnswerDetails[] = userAnswers.map(answer => {
        const question = answer.question;
        const userAnswerOption = question.answerOptions.find(opt => opt.id === answer.selectedOptionId);
        const correctAnswerOption = question.answerOptions.find(opt => opt.isCorrect);

        return {
            questionText: question.text,
            isCorrect: answer.isCorrect,
            userAnswerText: userAnswerOption?.text || "Not answered",
            correctAnswerText: correctAnswerOption?.text || "N/A",
            explanation: question.explanation
        };
    });

    const timeTaken = formatDuration(quiz.startedAt, quiz.completedAt);

    return (
        <div className="min-h-screen bg-muted/40 animate-in fade-in duration-300">
            <div className="container mx-auto max-w-4xl p-8">
                {/* Breadcrumb */}
                <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
                    <Home className="h-4 w-4" />
                    <ChevronRight className="h-4 w-4" />
                    <Link href="/dashboard" className="hover:text-foreground transition-colors">
                        Dashboard
                    </Link>
                    <ChevronRight className="h-4 w-4" />
                    <span className="font-medium text-foreground">Quiz Results</span>
                </nav>

                <Card className="transition-all hover:shadow-md">
                    <CardHeader className="text-center">
                        <div className="flex justify-center mb-4">
                            <div className="p-4 bg-primary/10 rounded-full">
                                <Award className="h-12 w-12 text-primary" />
                            </div>
                        </div>
                        <CardTitle className="text-3xl">Quiz Results</CardTitle>
                        <CardDescription>An overview of your performance.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {/* Score Summary */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-secondary rounded-lg mb-8">
                            <div className="text-center">
                                <p className="text-sm text-muted-foreground mb-1">Score</p>
                                <p className="text-4xl font-bold">{score}%</p>
                                <p className={`text-sm mt-1 ${
                                    score >= 80 ? 'text-green-600' : 
                                    score >= 60 ? 'text-yellow-600' : 
                                    'text-red-600'
                                }`}>
                                    {score >= 80 ? 'Excellent!' : score >= 60 ? 'Good Job!' : 'Keep Practicing!'}
                                </p>
                            </div>
                            <div className="text-center">
                                <p className="text-sm text-muted-foreground mb-1">Time Taken</p>
                                <p className="text-4xl font-bold">{timeTaken}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-sm text-muted-foreground mb-1">Correct Answers</p>
                                <p className="text-4xl font-bold">{correctAnswers} / {totalQuestions}</p>
                            </div>
                        </div>

                        {/* Detailed Answers */}
                        <div className="space-y-6">
                            <h3 className="text-lg font-semibold mb-4">Answer Breakdown</h3>
                            {answerDetails.map((detail, index) => (
                                <div key={index} className="border rounded-lg p-4 transition-all hover:shadow-sm">
                                    <div className="flex items-start gap-3 mb-3">
                                        {detail.isCorrect ? (
                                            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                                        ) : (
                                            <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                                        )}
                                        <div className="flex-1">
                                            <h4 className="font-semibold mb-2">
                                                Question {index + 1}: {detail.questionText}
                                            </h4>
                                        </div>
                                    </div>
                                    
                                    <div className="ml-8 space-y-2">
                                        <div className={`p-3 rounded-md ${
                                            detail.isCorrect 
                                                ? 'bg-green-50 dark:bg-green-950/30' 
                                                : 'bg-red-50 dark:bg-red-950/30'
                                        }`}>
                                            <p className="text-sm font-medium mb-1">Your Answer:</p>
                                            <p className="text-sm">{detail.userAnswerText}</p>
                                        </div>
                                        
                                        {!detail.isCorrect && (
                                            <div className="p-3 rounded-md bg-green-50 dark:bg-green-950/30">
                                                <p className="text-sm font-medium mb-1">Correct Answer:</p>
                                                <p className="text-sm">{detail.correctAnswerText}</p>
                                            </div>
                                        )}
                                        
                                        {detail.explanation && (
                                            <div className="p-3 rounded-md bg-muted">
                                                <p className="text-sm font-medium mb-1">Explanation:</p>
                                                <p className="text-sm text-muted-foreground">{detail.explanation}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-center gap-4 pt-6">
                        <Button asChild variant="outline">
                            <Link href="/dashboard">Return to Dashboard</Link>
                        </Button>
                        <Button asChild>
                            <Link href="/quiz/settings">Take Another Quiz</Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}