// src/app/admin/health/page.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, CheckCircle, XCircle, FileQuestion, Database, TrendingUp } from "lucide-react";
import prisma from "@/lib/db";
import { SystemHealthCard } from "@/components/admin/SystemHealthCard";

export const dynamic = 'force-dynamic';

export default async function HealthPage() {
  // Fetch comprehensive health metrics
  const [
    totalQuestions,
    activeQuestions,
    retiredQuestions,
    totalUsers,
    totalQuizzes,
    completedQuizzes,
    totalAnswers,
    questionsNeedingCalibration,
    highExposureQuestions,
  ] = await Promise.all([
    prisma.question.count(),
    prisma.question.count({ where: { isActive: true } }),
    prisma.question.count({ where: { isActive: false } }),
    prisma.user.count(),
    prisma.quiz.count(),
    prisma.quiz.count({ where: { status: 'completed' } }),
    prisma.userAnswer.count(),
    prisma.question.count({
      where: {
        isActive: true,
        responseCount: { lt: 10 },
      },
    }),
    prisma.question.count({
      where: {
        isActive: true,
        exposureCount: { gte: 8 }, // 80% of max exposure (10)
      },
    }),
  ]);

  // Get average exposure
  const questionsWithExposure = await prisma.question.aggregate({
    where: { isActive: true },
    _avg: { exposureCount: true },
  });
  const avgExposure = questionsWithExposure._avg.exposureCount || 0;

  // Calculate health status
  const questionPoolHealth = activeQuestions > 50 ? 'good' : activeQuestions > 20 ? 'warning' : 'error';
  const calibrationHealth = questionsNeedingCalibration < 10 ? 'good' : questionsNeedingCalibration < 30 ? 'warning' : 'error';
  const exposureHealth = highExposureQuestions < 10 ? 'good' : highExposureQuestions < 30 ? 'warning' : 'error';

  // Generate warnings
  const warnings = [];
  if (activeQuestions < 50) {
    warnings.push({
      level: 'warning' as const,
      message: 'Question pool is running low. Consider adding more questions.',
    });
  }
  if (questionsNeedingCalibration > 20) {
    warnings.push({
      level: 'warning' as const,
      message: `${questionsNeedingCalibration} questions need calibration (fewer than 10 responses).`,
    });
  }
  if (highExposureQuestions > 20) {
    warnings.push({
      level: 'error' as const,
      message: `${highExposureQuestions} questions are overexposed. Consider retiring or resetting them.`,
    });
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          System Health
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Monitor question pool and system metrics
        </p>
      </div>

      {/* Alerts */}
      {warnings.length > 0 && (
        <div className="space-y-3">
          {warnings.map((warning, index) => (
            <Alert
              key={index}
              variant={warning.level === 'error' ? 'destructive' : 'default'}
            >
              {warning.level === 'error' ? (
                <XCircle className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              <AlertTitle>
                {warning.level === 'error' ? 'Critical' : 'Warning'}
              </AlertTitle>
              <AlertDescription>{warning.message}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* No warnings message */}
      {warnings.length === 0 && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>All Systems Operational</AlertTitle>
          <AlertDescription>
            No issues detected. System is running smoothly.
          </AlertDescription>
        </Alert>
      )}

      {/* Question Pool Health */}
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
          Question Pool Status
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <SystemHealthCard
            title="Total Questions"
            value={totalQuestions}
            status="good"
            icon={FileQuestion}
            description="All questions in database"
          />
          <SystemHealthCard
            title="Active Questions"
            value={activeQuestions}
            status={questionPoolHealth}
            icon={CheckCircle}
            description={`${retiredQuestions} retired`}
          />
          <SystemHealthCard
            title="Need Calibration"
            value={questionsNeedingCalibration}
            status={calibrationHealth}
            icon={TrendingUp}
            description="< 10 responses"
          />
          <SystemHealthCard
            title="High Exposure"
            value={highExposureQuestions}
            status={exposureHealth}
            icon={AlertTriangle}
            description="≥ 80% of max exposure"
          />
        </div>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Question Pool Details */}
        <Card>
          <CardHeader>
            <CardTitle>Question Pool Details</CardTitle>
            <CardDescription>Comprehensive question statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700">
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  Total Questions
                </span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {totalQuestions}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700">
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  Active Questions
                </span>
                <span className="font-semibold text-green-600 dark:text-green-400">
                  {activeQuestions}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700">
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  Retired Questions
                </span>
                <span className="font-semibold text-slate-600 dark:text-slate-400">
                  {retiredQuestions}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700">
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  Average Exposure
                </span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {avgExposure.toFixed(1)} / 10
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  Questions Needing Calibration
                </span>
                <span className="font-semibold text-yellow-600 dark:text-yellow-400">
                  {questionsNeedingCalibration}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Database Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Database Metrics
            </CardTitle>
            <CardDescription>System-wide statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700">
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  Total Users
                </span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {totalUsers.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700">
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  Total Quizzes
                </span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {totalQuizzes.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700">
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  Completed Quizzes
                </span>
                <span className="font-semibold text-green-600 dark:text-green-400">
                  {completedQuizzes.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700">
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  Total User Answers
                </span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {totalAnswers.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  Completion Rate
                </span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {totalQuizzes > 0
                    ? Math.round((completedQuizzes / totalQuizzes) * 100)
                    : 0}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
