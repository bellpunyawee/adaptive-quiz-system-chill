// src/app/quiz/results/[quizId]/page.tsx
import { auth } from "@/auth";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import Link from 'next/link';
import { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Home, ChevronRight, Award, RefreshCw, Target, AlertCircle, Filter } from "lucide-react";
import { formatDuration } from "@/lib/utils";
import { QuestionReviewCard } from "@/components/quiz/QuestionReviewCard";
import { PerformanceSummary } from "@/components/quiz/PerformanceSummary";
import { PersonalizedFeedback } from "@/components/quiz/PersonalizedFeedback";
import { ErrorHeatmap, TopicError } from "@/components/quiz/ErrorHeatmap";
import { MasteryGauge, TopicMastery } from "@/components/quiz/MasteryGauge";
import { QuizProgressTrajectory, TrajectoryData } from "@/components/quiz/QuizProgressTrajectory";
import { ResultsTabs } from "@/components/quiz/ResultsTabs";
import { analyzeQuizForKnowledgeGaps } from "@/lib/adaptive-engine/knowledge-gap-analyzer";
import { generateDynamicReasoning } from "@/lib/adaptive-engine/selection-reasoning";
import { getMasteryStatus, thetaToMasteryPercentage } from "@/lib/ai/context-assembler";

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
                            id: true,
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

    // Calculate topic performance and error data
    const topicStats = new Map<string, { correct: number; total: number; cellId: string }>();
    userAnswers.forEach(answer => {
        const topicName = answer.question.cell.name;
        const cellId = answer.question.cell.id;
        const current = topicStats.get(topicName) || { correct: 0, total: 0, cellId };
        topicStats.set(topicName, {
            correct: current.correct + (answer.isCorrect ? 1 : 0),
            total: current.total + 1,
            cellId
        });
    });

    const topicPerformance = Array.from(topicStats.entries()).map(([topic, stats]) => ({
        topic,
        correct: stats.correct,
        total: stats.total,
        accuracy: Math.round((stats.correct / stats.total) * 100)
    }));

    // Build error heatmap data
    const topicErrors: TopicError[] = Array.from(topicStats.entries()).map(([topicName, stats]) => ({
        topicName,
        topicId: stats.cellId,
        errorRate: Math.round(((stats.total - stats.correct) / stats.total) * 100),
        errorCount: stats.total - stats.correct,
        totalQuestions: stats.total
    })).filter(t => t.errorCount > 0);

    // Get user cell masteries for mastery gauges
    const userCellMasteries = await prisma.userCellMastery.findMany({
        where: { userId: session.user.id },
        include: { cell: true },
    });

    // Build mastery gauge data for topics in this quiz
    const quizTopicIds = new Set(userAnswers.map(a => a.question.cell.id));
    const masteryData: TopicMastery[] = userCellMasteries
        .filter(m => quizTopicIds.has(m.cellId))
        .map(m => {
            const topicAnswers = userAnswers.filter(a => a.question.cell.id === m.cellId);
            const topicCorrect = topicAnswers.filter(a => a.isCorrect).length;
            const topicAccuracy = topicAnswers.length > 0 ? topicCorrect / topicAnswers.length : 0;

            return {
                topicName: m.cell.name,
                topicId: m.cellId,
                masteryPercentage: thetaToMasteryPercentage(m.ability_theta),
                abilityTheta: m.ability_theta,
                status: getMasteryStatus(m.ability_theta),
                questionsAnswered: topicAnswers.length,
                accuracy: topicAccuracy,
            };
        });

    // Get trajectory data
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const recentQuizzes = await prisma.quiz.findMany({
        where: {
            userId: session.user.id,
            status: 'completed',
            completedAt: { gte: ninetyDaysAgo },
        },
        include: {
            userAnswers: {
                select: { isCorrect: true }
            }
        },
        orderBy: { completedAt: 'asc' },
        take: 10,
    });

    const trajectoryQuizzes = recentQuizzes
        .filter(q => q.userAnswers.length > 0 && q.completedAt)
        .map(q => {
            const correctCount = q.userAnswers.filter(a => a.isCorrect).length;
            return {
                quizId: q.id,
                date: q.completedAt!,
                score: Math.round((correctCount / q.userAnswers.length) * 100),
                questionsCount: q.userAnswers.length,
                isCurrentQuiz: q.id === quizId,
            };
        });

    const avgScore = trajectoryQuizzes.length > 0
        ? trajectoryQuizzes.reduce((sum, q) => sum + q.score, 0) / trajectoryQuizzes.length
        : 0;
    const improvement = trajectoryQuizzes.length >= 2
        ? trajectoryQuizzes[trajectoryQuizzes.length - 1].score - trajectoryQuizzes[0].score
        : 0;

    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    if (trajectoryQuizzes.length >= 3) {
        const midpoint = Math.floor(trajectoryQuizzes.length / 2);
        const firstHalfAvg = trajectoryQuizzes.slice(0, midpoint).reduce((sum, q) => sum + q.score, 0) / midpoint;
        const secondHalfAvg = trajectoryQuizzes.slice(midpoint).reduce((sum, q) => sum + q.score, 0) / (trajectoryQuizzes.length - midpoint);
        const diff = secondHalfAvg - firstHalfAvg;
        if (diff > 5) trend = 'improving';
        else if (diff < -5) trend = 'declining';
    }

    const trajectoryData: TrajectoryData = {
        quizzes: trajectoryQuizzes,
        trend,
        averageScore: avgScore,
        improvement,
    };

    // Get user's average score from all completed quizzes
    const allUserQuizzes = await prisma.quiz.findMany({
        where: {
            userId: session.user.id,
            status: 'completed',
            id: { not: quizId }
        },
        include: {
            userAnswers: {
                select: { isCorrect: true }
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
        select: { baselineQuizId: true }
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
    const { questionFlags } = await analyzeQuizForKnowledgeGaps(
        session.user.id,
        quizId,
        userAnswers
    );

    // Find topics with low performance (< 70%) for practice suggestion
    const weakTopics = topicPerformance.filter(t => t.accuracy < 70);
    const incorrectQuestions = userAnswers.filter(a => !a.isCorrect);

    // =========================================================================
    // TAB CONTENT COMPONENTS
    // =========================================================================

    // Overview Tab Content
    const overviewContent = (
        <>
            {/* Error Heatmap (compact) */}
            {topicErrors.length > 0 && (
                <ErrorHeatmap
                    topicErrors={topicErrors}
                    maxTopics={5}
                    compact={true}
                    title="Areas Needing Attention"
                    description="Topics with the highest error rates"
                />
            )}

            {/* Mastery Gauges */}
            {masteryData.length > 0 && (
                <MasteryGauge
                    topics={masteryData}
                    layout="grid"
                    compact={true}
                    maxTopics={6}
                    title="Topic Mastery"
                />
            )}

            {/* Progress Trajectory */}
            {trajectoryData.quizzes.length >= 2 && (
                <QuizProgressTrajectory
                    data={trajectoryData}
                    compact={true}
                    title="Recent Progress"
                />
            )}

            {/* Quick Actions */}
            {(weakTopics.length > 0 || incorrectQuestions.length > 0) && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Target className="h-5 w-5 text-primary" />
                            Quick Actions
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-3">
                        {weakTopics.length > 0 && (
                            <Button asChild variant="default" size="sm">
                                <Link href={`/quiz/practice?topics=${weakTopics.map(t => t.topic).join(',')}`}>
                                    <AlertCircle className="h-4 w-4 mr-2" />
                                    Practice Weak Topics ({weakTopics.length})
                                </Link>
                            </Button>
                        )}
                        {incorrectQuestions.length > 0 && (
                            <Button asChild variant="outline" size="sm">
                                <Link href={`/quiz/review?quizId=${quizId}`}>
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Review Incorrect ({incorrectQuestions.length})
                                </Link>
                            </Button>
                        )}
                        <Button asChild variant="outline" size="sm">
                            <Link href="/quiz/settings">
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Take New Quiz
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            )}
        </>
    );

    // Analysis Tab Content
    const analysisContent = (
        <>
            {/* Full Error Heatmap */}
            <ErrorHeatmap
                topicErrors={topicErrors}
                maxTopics={10}
                compact={false}
                title="Error Distribution by Topic"
            />

            {/* Detailed Performance Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <PerformanceSummary
                    totalQuestions={totalQuestions}
                    correctAnswers={correctAnswers}
                    score={score}
                    topicPerformance={topicPerformance}
                    averageScore={averageScore}
                    baselineScore={baselineScore}
                />
            </div>

            {/* Full Mastery Gauges */}
            <MasteryGauge
                topics={masteryData}
                layout="grid"
                compact={false}
                title="Topic Mastery Levels"
            />

            {/* Full Progress Trajectory */}
            <QuizProgressTrajectory
                data={trajectoryData}
                compact={false}
                maxQuizzes={10}
            />
        </>
    );

    // AI Insights Tab Content (Voluntary - not auto-loaded)
    const insightsContent = (
        <>
            <PersonalizedFeedback quizId={quizId} autoLoad={false} />

            {/* Additional recommendations */}
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
        </>
    );

    // Review Tab Content
    const reviewContent = (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Question Review</CardTitle>
                        <CardDescription>
                            Click on any question to see detailed breakdown
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Filter className="h-4 w-4" />
                        <span>{totalQuestions} questions</span>
                    </div>
                </div>
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
                        try {
                            const metadata = JSON.parse(answer.selectionMetadata || '{}');
                            if (metadata.context) {
                                const dynamicReasoning = generateDynamicReasoning(
                                    metadata.context,
                                    uncertaintyFlag
                                );
                                enhancedReasoning = {
                                    categoryLabel: dynamicReasoning.categoryLabel,
                                    reasoningText: dynamicReasoning.reasoningText
                                };
                            }
                        } catch {
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
    );

    // =========================================================================
    // MAIN RENDER
    // =========================================================================

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

                {/* Score Hero Section (Always Visible) */}
                <Card className="border-2">
                    <CardContent className="pt-6">
                        <div className="flex flex-col md:flex-row items-center gap-6">
                            {/* Score Badge */}
                            <div className="flex flex-col items-center">
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
                                <p className="text-5xl font-bold mt-3">{score}%</p>
                                <p className="text-muted-foreground">
                                    {score >= 80 ? 'Excellent!' : score >= 60 ? 'Good Job!' : 'Keep Practicing!'}
                                </p>
                            </div>

                            {/* Quick Stats */}
                            <div className="flex-1 grid grid-cols-3 gap-4 w-full md:w-auto">
                                <div className="text-center p-3 bg-muted/50 rounded-lg">
                                    <p className="text-2xl font-bold">{correctAnswers}/{totalQuestions}</p>
                                    <p className="text-xs text-muted-foreground">Correct</p>
                                </div>
                                <div className="text-center p-3 bg-muted/50 rounded-lg">
                                    <p className="text-2xl font-bold">{timeTaken}</p>
                                    <p className="text-xs text-muted-foreground">Time</p>
                                </div>
                                <div className="text-center p-3 bg-muted/50 rounded-lg">
                                    <p className="text-2xl font-bold">{topicPerformance.length}</p>
                                    <p className="text-xs text-muted-foreground">Topics</p>
                                </div>
                            </div>

                            {/* Navigation Buttons */}
                            <div className="flex flex-col gap-2">
                                <Button asChild size="sm">
                                    <Link href="/quiz/settings">
                                        <RefreshCw className="h-4 w-4 mr-2" />
                                        New Quiz
                                    </Link>
                                </Button>
                                <Button asChild variant="outline" size="sm">
                                    <Link href="/dashboard">
                                        <Home className="h-4 w-4 mr-2" />
                                        Dashboard
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Tabbed Content */}
                <Suspense fallback={<div className="h-96 flex items-center justify-center">Loading...</div>}>
                    <ResultsTabs
                        defaultTab="overview"
                        overviewContent={overviewContent}
                        analysisContent={analysisContent}
                        insightsContent={insightsContent}
                        reviewContent={reviewContent}
                    />
                </Suspense>
            </div>
        </div>
    );
}
