// src/app/quiz/results/[quizId]/page.tsx
import { auth } from "@/auth";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Home, ChevronRight, Award, RefreshCw, Target, AlertCircle } from "lucide-react";
import { formatDuration } from "@/lib/utils";
import { QuestionReviewCard } from "@/components/quiz/QuestionReviewCard";
import { PerformanceSummary } from "@/components/quiz/PerformanceSummary";
import { PersonalizedFeedback } from "@/components/quiz/PersonalizedFeedback";
import { analyzeQuizForKnowledgeGaps } from "@/lib/adaptive-engine/knowledge-gap-analyzer";
import { generateDynamicReasoning } from "@/lib/adaptive-engine/selection-reasoning";

type PageProps = {
  params: Promise<{
    quizId: string;
  }>;
};

// Helper function to safely parse selection metadata JSON
function parseSelectionMetadata(raw: string | null): { categoryLabel: string; reasoningText: string } | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw);
    // Validate structure
    if (parsed && typeof parsed.categoryLabel === 'string' && typeof parsed.reasoningText === 'string') {
      return {
        categoryLabel: parsed.categoryLabel,
        reasoningText: parsed.reasoningText
      };
    }
    return undefined;
  } catch (e) {
    console.error('[Review] Failed to parse selectionMetadata:', e);
    return undefined;
  }
}

export default async function ResultsPage({ params }: PageProps) {
    const { quizId } = await params;
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
                    answerOptions: true,
                    cell: {
                        select: {
                            name: true
                        }
                    }
                }
            },
        },
        orderBy: {
            createdAt: 'asc'
        }
    });

    const quiz = await prisma.quiz.findUnique({
        where: {
            id: quizId,
        },
        select: {
            startedAt: true,
            completedAt: true,
            quizType: true,
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

    // Calculate topic performance
    const topicStats = new Map<string, { correct: number; total: number }>();
    userAnswers.forEach(answer => {
        const topicName = answer.question.cell.name;
        const current = topicStats.get(topicName) || { correct: 0, total: 0 };
        topicStats.set(topicName, {
            correct: current.correct + (answer.isCorrect ? 1 : 0),
            total: current.total + 1
        });
    });

    const topicPerformance = Array.from(topicStats.entries()).map(([topic, stats]) => ({
        topic,
        correct: stats.correct,
        total: stats.total,
        accuracy: Math.round((stats.correct / stats.total) * 100)
    }));

    // Get user's average score from all completed quizzes
    const allUserQuizzes = await prisma.quiz.findMany({
        where: {
            userId: session.user.id,
            status: 'completed',
            id: { not: quizId }
        },
        include: {
            userAnswers: {
                select: {
                    isCorrect: true
                }
            }
        }
    });

    let averageScore: number | undefined;
    if (allUserQuizzes.length > 0) {
        const totalScores = allUserQuizzes.reduce((sum, quiz) => {
            if (quiz.userAnswers.length === 0) return sum;
            const quizScore = (quiz.userAnswers.filter(a => a.isCorrect).length / quiz.userAnswers.length) * 100;
            return sum + quizScore;
        }, 0);
        averageScore = totalScores / allUserQuizzes.length;
    }

    // Get baseline score if available
    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
            baselineQuizId: true
        }
    });

    let baselineScore: number | undefined;
    if (user?.baselineQuizId) {
        const baselineAnswers = await prisma.userAnswer.findMany({
            where: {
                quizId: user.baselineQuizId,
                userId: session.user.id
            }
        });
        if (baselineAnswers.length > 0) {
            baselineScore = (baselineAnswers.filter(a => a.isCorrect).length / baselineAnswers.length) * 100;
        }
    }

    const timeTaken = formatDuration(quiz.startedAt, quiz.completedAt);

    // Analyze quiz for knowledge gaps and uncertainty signals
    const { topicsToReview, questionFlags } = await analyzeQuizForKnowledgeGaps(
        session.user.id,
        quizId,
        userAnswers
    );

    // Find topics with low performance (< 70%) for practice suggestion
    const weakTopics = topicPerformance.filter(t => t.accuracy < 70);
    const incorrectQuestions = userAnswers.filter(a => !a.isCorrect);

    return (
        <div className="min-h-screen bg-muted/40 animate-in fade-in duration-300">
            <div className="container mx-auto max-w-6xl p-4 md:p-8 space-y-6">
                {/* Breadcrumb */}
                <nav className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Home className="h-4 w-4" />
                    <ChevronRight className="h-4 w-4" />
                    <Link href="/dashboard" className="hover:text-foreground transition-colors">
                        Dashboard
                    </Link>
                    <ChevronRight className="h-4 w-4" />
                    <span className="font-medium text-foreground">Quiz Results</span>
                </nav>

                {/* Merged Score and Performance Summary */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Score Card */}
                    <Card className="lg:col-span-1">
                        <CardHeader className="text-center pb-4">
                            <div className="flex justify-center mb-4">
                                <div className={`p-4 rounded-full ${
                                    score >= 80 ? 'bg-green-100 dark:bg-green-950' :
                                    score >= 60 ? 'bg-yellow-100 dark:bg-yellow-950' :
                                    'bg-red-100 dark:bg-red-950'
                                }`}>
                                    <Award className={`h-12 w-12 ${
                                        score >= 80 ? 'text-green-600' :
                                        score >= 60 ? 'text-yellow-600' :
                                        'text-red-600'
                                    }`} />
                                </div>
                            </div>
                            <CardTitle className="text-4xl font-bold mb-2">{score}%</CardTitle>
                            <CardDescription className="text-lg">
                                {score >= 80 ? 'Excellent Work!' : score >= 60 ? 'Good Job!' : 'Keep Practicing!'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                    <span className="text-sm text-muted-foreground">Correct</span>
                                    <span className="text-lg font-bold">{correctAnswers} / {totalQuestions}</span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                    <span className="text-sm text-muted-foreground">Time</span>
                                    <span className="text-lg font-bold">{timeTaken}</span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                    <span className="text-sm text-muted-foreground">Questions</span>
                                    <span className="text-lg font-bold">{totalQuestions}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Right: Performance Insights */}
                    <PerformanceSummary
                        totalQuestions={totalQuestions}
                        correctAnswers={correctAnswers}
                        score={score}
                        topicPerformance={topicPerformance}
                        averageScore={averageScore}
                        baselineScore={baselineScore}
                    />
                </div>

                {/* AI-Powered Personalized Feedback */}
                <PersonalizedFeedback quizId={quizId} autoLoad={true} />

                {/* Action Buttons */}
                {(weakTopics.length > 0 || incorrectQuestions.length > 0) && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Target className="h-5 w-5 text-primary" />
                                Recommended Next Steps
                            </CardTitle>
                            <CardDescription>
                                Continue improving your skills with these targeted practice options
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-wrap gap-3">
                            {weakTopics.length > 0 && (
                                <Button asChild variant="default">
                                    <Link href={`/quiz/practice?topics=${weakTopics.map(t => t.topic).join(',')}`}>
                                        <AlertCircle className="h-4 w-4 mr-2" />
                                        Practice Weak Topics ({weakTopics.length})
                                    </Link>
                                </Button>
                            )}
                            {incorrectQuestions.length > 0 && (
                                <Button asChild variant="outline">
                                    <Link href={`/quiz/review?quizId=${quizId}`}>
                                        <RefreshCw className="h-4 w-4 mr-2" />
                                        Review Incorrect ({incorrectQuestions.length})
                                    </Link>
                                </Button>
                            )}
                            <Button asChild variant="outline">
                                <Link href="/quiz/settings">
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Take New Quiz
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* Question-by-Question Review */}
                <Card>
                    <CardHeader>
                        <CardTitle>Question Review</CardTitle>
                        <CardDescription>
                            Click on any question to see detailed breakdown
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {userAnswers.map((answer, index) => {
                            const question = answer.question;
                            const correctOption = question.answerOptions.find(opt => opt.isCorrect);

                            // Get uncertainty flag for this question
                            const uncertaintyFlag = questionFlags.get(answer.questionId);

                            // Parse existing selection metadata
                            const existingReasoning = parseSelectionMetadata(answer.selectionMetadata);

                            // Regenerate reasoning with uncertainty signal if flagged
                            let enhancedReasoning = existingReasoning;
                            if (uncertaintyFlag && existingReasoning) {
                                // Parse existing metadata to get context
                                try {
                                    const metadata = JSON.parse(answer.selectionMetadata || '{}');
                                    if (metadata.context) {
                                        // Regenerate with uncertainty signal
                                        const dynamicReasoning = generateDynamicReasoning(
                                            metadata.context,
                                            uncertaintyFlag
                                        );
                                        enhancedReasoning = {
                                            categoryLabel: dynamicReasoning.categoryLabel,
                                            reasoningText: dynamicReasoning.reasoningText
                                        };
                                    }
                                } catch (e) {
                                    // If context not available, keep existing reasoning
                                }
                            }

                            return (
                                <QuestionReviewCard
                                    key={answer.id}
                                    questionNumber={index + 1}
                                    questionText={question.text}
                                    topic={question.cell.name}
                                    difficulty={question.difficulty_b}
                                    allOptions={question.answerOptions}
                                    userAnswerId={answer.selectedOptionId}
                                    correctAnswerId={correctOption?.id || ''}
                                    isCorrect={answer.isCorrect}
                                    explanation={question.explanation}
                                    responseTime={answer.responseTime}
                                    hideExplanation={quiz.quizType === 'baseline'}
                                    bloomTaxonomy={question.bloomTaxonomy}
                                    selectionReasoning={enhancedReasoning}
                                    uncertaintyFlag={uncertaintyFlag ? {
                                        signalType: uncertaintyFlag.signalType,
                                        severity: uncertaintyFlag.severity
                                    } : undefined}
                                />
                            );
                        })}
                    </CardContent>
                </Card>

                {/* Navigation Footer */}
                <div className="flex justify-center gap-4 pb-8">
                    <Button asChild variant="outline" size="lg">
                        <Link href="/dashboard">
                            <Home className="h-4 w-4 mr-2" />
                            Return to Dashboard
                        </Link>
                    </Button>
                    <Button asChild size="lg">
                        <Link href="/quiz/settings">
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Take Another Quiz
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}