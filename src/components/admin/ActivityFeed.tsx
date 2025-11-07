// src/components/admin/ActivityFeed.tsx
import { CheckCircle, UserPlus, Trophy } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ActivityFeedProps {
  recentQuizzes: Array<{
    id: string;
    createdAt: Date;
    completedAt: Date | null;
    quizType: string;
    user: {
      name: string | null;
      email: string | null;
    };
  }>;
  recentUsers: Array<{
    id: string;
    name: string | null;
    email: string | null;
    createdAt: Date;
    role: string;
  }>;
}

export function ActivityFeed({ recentQuizzes, recentUsers }: ActivityFeedProps) {
  // Combine and sort activities
  const activities = [
    ...recentQuizzes.map((quiz) => ({
      id: `quiz-${quiz.id}`,
      type: quiz.quizType === 'baseline' ? 'baseline' : 'quiz' as const,
      user: quiz.user.name || quiz.user.email || 'Unknown User',
      timestamp: quiz.completedAt || quiz.createdAt,
      quizType: quiz.quizType,
    })),
    ...recentUsers.map((user) => ({
      id: `user-${user.id}`,
      type: 'signup' as const,
      user: user.name || user.email || 'Unknown User',
      timestamp: user.createdAt,
      role: user.role,
    })),
  ]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10);

  const getActivityIcon = (type: 'quiz' | 'baseline' | 'signup') => {
    switch (type) {
      case 'baseline':
        return <Trophy className="h-5 w-5 text-blue-600" />;
      case 'quiz':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'signup':
        return <UserPlus className="h-5 w-5 text-purple-600" />;
    }
  };

  const getActivityMessage = (activity: typeof activities[0]) => {
    switch (activity.type) {
      case 'baseline':
        return (
          <>
            <span className="font-medium text-slate-900 dark:text-white">
              {activity.user}
            </span>{' '}
            <span className="text-slate-600 dark:text-slate-400">
              completed baseline assessment
            </span>
          </>
        );
      case 'quiz':
        return (
          <>
            <span className="font-medium text-slate-900 dark:text-white">
              {activity.user}
            </span>{' '}
            <span className="text-slate-600 dark:text-slate-400">
              completed a quiz
            </span>
          </>
        );
      case 'signup':
        return (
          <>
            <span className="font-medium text-slate-900 dark:text-white">
              {activity.user}
            </span>{' '}
            <span className="text-slate-600 dark:text-slate-400">
              joined the system
            </span>
            {activity.role === 'admin' && (
              <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                Admin
              </span>
            )}
          </>
        );
    }
  };

  if (activities.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500 dark:text-slate-400">
        <p>No recent activity</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div
          key={activity.id}
          className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <div className="mt-0.5">{getActivityIcon(activity.type)}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm">{getActivityMessage(activity)}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
