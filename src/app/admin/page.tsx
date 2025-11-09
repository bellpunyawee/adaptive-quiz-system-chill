// src/app/admin/page.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Activity, FileQuestion, TrendingUp, Clock, CheckCircle } from "lucide-react";
import prisma from "@/lib/db";
import { SystemHealthCard } from "@/components/admin/SystemHealthCard";
import { ActivityFeed } from "@/components/admin/ActivityFeed";
import { QuickActions } from "@/components/admin/QuickActions";

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  // Fetch dashboard statistics
  const [
    totalUsers,
    totalQuizzes,
    completedQuizzes,
    inProgressQuizzes,
    totalQuestions,
    activeQuestions,
    recentUsers,
    recentQuizzes,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.quiz.count(),
    prisma.quiz.count({ where: { status: 'completed' } }),
    prisma.quiz.count({ where: { status: 'in-progress' } }),
    prisma.question.count(),
    prisma.question.count({ where: { isActive: true } }),
    prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        role: true,
      },
    }),
    prisma.quiz.findMany({
      take: 10,
      where: { status: 'completed' },
      orderBy: { completedAt: 'desc' },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    }),
  ]);

  // Calculate completion rate
  const completionRate = totalQuizzes > 0
    ? Math.round((completedQuizzes / totalQuizzes) * 100)
    : 0;

  // Get baseline completion stats
  const baselineCompletedCount = await prisma.user.count({
    where: { baselineCompleted: true },
  });
  const baselineCompletionRate = totalUsers > 0
    ? Math.round((baselineCompletedCount / totalUsers) * 100)
    : 0;

  // Calculate active users (users who completed a quiz in last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const activeUsers = await prisma.user.count({
    where: {
      quizzes: {
        some: {
          completedAt: {
            gte: sevenDaysAgo,
          },
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          Dashboard Overview
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Monitor your quiz system&apos;s health and activity
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SystemHealthCard
          title="Total Users"
          value={totalUsers}
          status="good"
          icon={Users}
          description={`${activeUsers} active in last 7 days`}
        />
        <SystemHealthCard
          title="Completed Quizzes"
          value={completedQuizzes}
          status="good"
          icon={CheckCircle}
          description={`${completionRate}% completion rate`}
        />
        <SystemHealthCard
          title="Active Questions"
          value={activeQuestions}
          status={activeQuestions > 50 ? "good" : "warning"}
          icon={FileQuestion}
          description={`${totalQuestions} total questions`}
        />
        <SystemHealthCard
          title="In Progress"
          value={inProgressQuizzes}
          status="good"
          icon={Clock}
          description="Quizzes currently active"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity - Takes 2 columns */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Activity
              </CardTitle>
              <CardDescription>
                Latest quiz completions and user activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ActivityFeed
                recentQuizzes={recentQuizzes}
                recentUsers={recentUsers}
              />
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions - Takes 1 column */}
        <div className="space-y-6">
          <QuickActions />

          {/* Baseline Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Baseline Assessment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    Completion Rate
                  </span>
                  <span className="text-2xl font-bold text-slate-900 dark:text-white">
                    {baselineCompletionRate}%
                  </span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {baselineCompletedCount} of {totalUsers} users completed
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mt-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${baselineCompletionRate}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Health Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Quick Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    Avg Quizzes/User
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {totalUsers > 0
                      ? (completedQuizzes / totalUsers).toFixed(1)
                      : '0'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    Active Rate
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {totalUsers > 0
                      ? Math.round((activeUsers / totalUsers) * 100)
                      : 0}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    Question Pool
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {activeQuestions}/{totalQuestions}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
