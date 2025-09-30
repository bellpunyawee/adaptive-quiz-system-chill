import { auth } from "@/auth";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle } from "lucide-react";
import { formatDuration } from "@/lib/utils";

// Define the shape of the props the page will receive
type PageProps = {
  params: {
    quizId: string;
  };
};

// Helper type for our fetched data
type AnswerDetails = {
    questionText: string;
    isCorrect: boolean;
    userAnswerText: string | null;
    correctAnswerText: string | null;
    explanation: string | null;
}

// THE FIX IS IN THE FUNCTION SIGNATURE ITSELF
export default async function ResultsPage({ params: { quizId } }: PageProps) {
    const session = await auth();
    if (!session?.user) {
        redirect("/");
    }
    
    const userAnswers = await prisma.userAnswer.findMany({
        where: {
            quizId: quizId, // Use the destructured quizId directly
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

    // Fetch the quiz to get startedAt and completedAt
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
            <div className="container mx-auto p-8 text-center">
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
        <div className="container mx-auto max-w-3xl p-4 md:p-8">
            <Card>
                <CardHeader className="text-center">
                    <CardTitle className="text-3xl">Quiz Results</CardTitle>
                    <CardDescription>An overview of your performance.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex justify-around items-center p-6 bg-secondary rounded-lg mb-8">
                        <div>
                            <p className="text-sm text-muted-foreground">Score</p>
                            <p className="text-4xl font-bold">{score}%</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Time Taken</p>
                            <p className="text-4xl font-bold">{timeTaken}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Correct Answers</p>
                            <p className="text-4xl font-bold">{correctAnswers} / {totalQuestions}</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {answerDetails.map((detail, index) => (
                            <div key={index} className="border-b pb-6">
                                <h3 className="font-semibold mb-2">Question {index + 1}: {detail.questionText}</h3>
                                <div className={`flex items-start gap-3 p-3 rounded-md ${detail.isCorrect ? 'bg-green-100/50' : 'bg-red-100/50'}`}>
                                    {detail.isCorrect ? 
                                        <CheckCircle className="h-5 w-5 text-green-600 mt-1 flex-shrink-0" /> : 
                                        <XCircle className="h-5 w-5 text-red-600 mt-1 flex-shrink-0" />
                                    }
                                    <div>
                                        <p className="text-sm">Your answer: <span className="font-medium">{detail.userAnswerText}</span></p>
                                        {!detail.isCorrect && (
                                            <p className="text-sm">Correct answer: <span className="font-medium">{detail.correctAnswerText}</span></p>
                                        )}
                                    </div>
                                </div>
                                {detail.explanation && (
                                    <div className="mt-2 p-3 bg-muted/50 rounded-md text-sm">
                                        <p className="font-bold">Explanation:</p>
                                        <p>{detail.explanation}</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </CardContent>
                <CardFooter className="flex justify-center">
                    <Button asChild><Link href="/dashboard">Back to Dashboard</Link></Button>
                </CardFooter>
            </Card>
        </div>
    );
}