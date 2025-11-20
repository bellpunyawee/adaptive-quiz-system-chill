import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import prisma from '@/lib/db';
import { TopicMasteryRadar } from '@/components/learner-model/TopicMasteryRadar';
import { LearningCurveChart } from '@/components/learner-model/LearningCurveChart';
import { LearnerModelModalTrigger } from '@/components/learner-model/LearnerModelModalTrigger';
import { Home, ChevronRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

async function getMasteryData(userId: string) {
  const masteryData = await prisma.userCellMastery.findMany({
    where: { userId },
    include: {
      cell: {
        select: {
          id: true,
          name: true,
        }
      }
    },
    orderBy: {
      ability_theta: 'desc'
    }
  });

  const getMasteryLevel = (theta: number): 'beginner' | 'intermediate' | 'advanced' | 'mastered' => {
    if (theta >= 1.5) return 'mastered';
    if (theta >= 1.0) return 'advanced';
    if (theta >= 0.5) return 'intermediate';
    return 'beginner';
  };

  const topics = masteryData.map(m => ({
    cellId: m.cellId,
    cellName: m.cell.name,
    ability_theta: m.ability_theta,
    sem: m.sem || 0,
    confidence: m.confidence || 0,
    responseCount: m.responseCount,
    lastEstimated: m.lastEstimated,
    masteryLevel: getMasteryLevel(m.ability_theta),
    abilityPercentage: Math.round(((m.ability_theta + 3) / 6) * 100),
  }));

  const overallStats = {
    averageAbility: masteryData.length > 0
      ? masteryData.reduce((sum, m) => sum + m.ability_theta, 0) / masteryData.length
      : 0,
    topicsStarted: masteryData.length,
    topicsMastered: masteryData.filter(m => m.ability_theta >= 1.5).length,
    totalResponses: masteryData.reduce((sum, m) => sum + m.responseCount, 0),
  };

  return { topics, overallStats };
}

async function getAbilityHistory(userId: string, days: number = 30) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const historyRecords = await prisma.abilityHistory.findMany({
    where: {
      userId,
      updatedAt: {
        gte: startDate,
        lte: endDate
      }
    },
    include: {
      cell: {
        select: {
          id: true,
          name: true
        }
      }
    },
    orderBy: {
      updatedAt: 'asc'
    }
  });

  const historyByTopic = new Map<string, typeof historyRecords>();
  historyRecords.forEach(record => {
    const cellId = record.cellId;
    if (!historyByTopic.has(cellId)) {
      historyByTopic.set(cellId, []);
    }
    historyByTopic.get(cellId)!.push(record);
  });

  const history = Array.from(historyByTopic.entries()).map(([cellId, records]) => ({
    cellId,
    cellName: records[0].cell.name,
    dataPoints: records.map(r => ({
      date: r.updatedAt,
      ability_theta: r.ability_theta,
      confidence: r.confidence || 0,
      quizId: r.quizId || undefined
    }))
  }));

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { baselineQuizId: true }
  });

  let baseline: Array<{ cellId: string; cellName: string; ability_theta: number; date: Date }> = [];

  if (user?.baselineQuizId) {
    const baselineHistory = await prisma.abilityHistory.findMany({
      where: {
        userId,
        quizId: user.baselineQuizId
      },
      include: {
        cell: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    baseline = baselineHistory.map(h => ({
      cellId: h.cellId,
      cellName: h.cell.name,
      ability_theta: h.ability_theta,
      date: h.updatedAt
    }));
  }

  return {
    history,
    baseline,
    dateRange: {
      start: startDate,
      end: endDate,
      days
    }
  };
}

export default async function LearnerModelPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  // Fetch both datasets in parallel
  const [masteryData, historyData] = await Promise.all([
    getMasteryData(session.user.id),
    getAbilityHistory(session.user.id, 30),
  ]);

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Home className="h-4 w-4" />
        <ChevronRight className="h-4 w-4" />
        <Link href="/dashboard" className="hover:text-foreground transition-colors">
          Dashboard
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="font-medium text-foreground">Learner Model</span>
      </nav>

      {/* Header with Back Link */}
      <div className="mb-8">
        <div className="flex items-center justify-between gap-4 mb-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
          <LearnerModelModalTrigger />
        </div>
        <h1 className="text-3xl font-bold mb-2">Learner Model Dashboard</h1>
        <p className="text-muted-foreground">
          Advanced psychometric analysis using Item Response Theory (IRT). This shows your estimated ability (θ)
          based on question difficulty and response patterns, not just simple accuracy.{' '}
          <Link href="/dashboard" className="text-primary hover:underline">
            View simple overview →
          </Link>
        </p>
      </div>

      <div className="space-y-8">

        {/* Topic Mastery Section */}
        {masteryData && (
          <TopicMasteryRadar
            topics={masteryData.topics}
            overallStats={masteryData.overallStats}
          />
        )}

        {/* Learning Progress Section */}
        {historyData && historyData.history.length > 0 && (
          <LearningCurveChart
            history={historyData.history}
            baseline={historyData.baseline}
            dateRange={historyData.dateRange}
          />
        )}

        {/* Empty State */}
        {(!masteryData || masteryData.topics.length === 0) && (
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground mb-4">
              No learning data available yet.
            </p>
            <p className="text-sm text-muted-foreground">
              Complete some quizzes to start tracking your progress!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
