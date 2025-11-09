// src/app/admin/users/page.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, UserPlus, Award } from "lucide-react";
import prisma from "@/lib/db";
import { SystemHealthCard } from "@/components/admin/SystemHealthCard";
import { formatDistanceToNow } from "date-fns";

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  // Calculate date ranges
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Fetch user statistics
  const [
    totalUsers,
    activeUsers7d,
    newUsers30d,
    baselineCompleted,
    topUsers,
    recentUsers,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({
      where: {
        quizzes: {
          some: {
            completedAt: {
              gte: sevenDaysAgo,
            },
          },
        },
      },
    }),
    prisma.user.count({
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
    }),
    prisma.user.count({
      where: {
        baselineCompleted: true,
      },
    }),
    prisma.user.findMany({
      take: 10,
      where: {
        quizzes: {
          some: {
            status: 'completed',
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        baselineCompleted: true,
        createdAt: true,
        _count: {
          select: {
            quizzes: {
              where: {
                status: 'completed',
              },
            },
          },
        },
      },
      orderBy: {
        quizzes: {
          _count: 'desc',
        },
      },
    }),
    prisma.user.findMany({
      take: 10,
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        name: true,
        email: true,
        baselineCompleted: true,
        createdAt: true,
        role: true,
      },
    }),
  ]);

  // Calculate baseline completion rate
  const baselineCompletionRate = totalUsers > 0
    ? Math.round((baselineCompleted / totalUsers) * 100)
    : 0;

  // Calculate activity rate
  const activityRate = totalUsers > 0
    ? Math.round((activeUsers7d / totalUsers) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          Users Overview
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Monitor user statistics and engagement metrics
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SystemHealthCard
          title="Total Users"
          value={totalUsers}
          status="good"
          icon={Users}
          description="All registered users"
        />
        <SystemHealthCard
          title="Active Users (7d)"
          value={activeUsers7d}
          status={activityRate > 20 ? "good" : "warning"}
          icon={UserCheck}
          description={`${activityRate}% activity rate`}
        />
        <SystemHealthCard
          title="New Users (30d)"
          value={newUsers30d}
          status="good"
          icon={UserPlus}
          description="Recent signups"
        />
        <SystemHealthCard
          title="Baseline Completed"
          value={`${baselineCompletionRate}%`}
          status={baselineCompletionRate > 50 ? "good" : "warning"}
          icon={Award}
          description={`${baselineCompleted} of ${totalUsers} users`}
        />
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Active Users */}
        <Card>
          <CardHeader>
            <CardTitle>Top Active Users</CardTitle>
            <CardDescription>
              Users with most completed quizzes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {topUsers.length > 0 ? (
              <div className="space-y-3">
                {topUsers.map((user, index) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                          {user.name || 'Unknown User'}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {user.baselineCompleted && (
                        <Award className="h-4 w-4 text-yellow-500" title="Baseline completed" />
                      )}
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">
                        {user._count.quizzes} quizzes
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                <p>No user activity yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Users */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Users</CardTitle>
            <CardDescription>
              Latest user registrations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentUsers.length > 0 ? (
              <div className="space-y-3">
                {recentUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-semibold">
                        {user.name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                            {user.name || 'Unknown User'}
                          </p>
                          {user.role === 'admin' && (
                            <span className="flex-shrink-0 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 px-2 py-0.5 rounded-full">
                              Admin
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {user.email}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Joined {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    {user.baselineCompleted && (
                      <Award className="h-4 w-4 text-yellow-500 flex-shrink-0" title="Baseline completed" />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                <p>No users registered yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Engagement Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Engagement Metrics</CardTitle>
          <CardDescription>User activity and retention statistics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                7-Day Activity Rate
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-slate-900 dark:text-white">
                  {activityRate}%
                </span>
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  ({activeUsers7d} active)
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mt-3">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${activityRate}%` }}
                />
              </div>
            </div>

            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                Baseline Completion
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-slate-900 dark:text-white">
                  {baselineCompletionRate}%
                </span>
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  ({baselineCompleted} completed)
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mt-3">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all"
                  style={{ width: `${baselineCompletionRate}%` }}
                />
              </div>
            </div>

            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                Growth (30 days)
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-slate-900 dark:text-white">
                  {newUsers30d}
                </span>
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  new users
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
                {totalUsers > 0 && newUsers30d > 0
                  ? `+${Math.round((newUsers30d / totalUsers) * 100)}% growth`
                  : 'No growth data'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
