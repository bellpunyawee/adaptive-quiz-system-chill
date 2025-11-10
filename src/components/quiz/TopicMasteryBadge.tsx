import { Badge } from '@/components/ui/badge';
import { CheckCircle, TrendingUp, AlertCircle, Circle } from 'lucide-react';

interface TopicMasteryBadgeProps {
  accuracy: number;
  questionsAnswered: number;
  masteryStatus?: number;
  abilityTheta?: number;
  compact?: boolean;
}

export function TopicMasteryBadge({
  accuracy,
  questionsAnswered,
  masteryStatus,
  compact = false,
}: TopicMasteryBadgeProps) {
  // Determine badge style based on performance
  const getBadgeStyle = () => {
    if (questionsAnswered === 0) {
      return {
        icon: Circle,
        label: 'Not Practiced',
        className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
      };
    }

    if (masteryStatus === 1 || accuracy >= 80) {
      return {
        icon: CheckCircle,
        label: compact ? `${accuracy}%` : `Mastered (${accuracy}%)`,
        className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
      };
    }

    if (accuracy >= 60) {
      return {
        icon: TrendingUp,
        label: compact ? `${accuracy}%` : `Learning (${accuracy}%)`,
        className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
      };
    }

    return {
      icon: AlertCircle,
      label: compact ? `${accuracy}%` : `Needs Practice (${accuracy}%)`,
      className: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
    };
  };

  const { icon: Icon, label, className } = getBadgeStyle();

  return (
    <Badge variant="outline" className={`${className} flex items-center gap-1`}>
      <Icon className="h-3 w-3" />
      <span className="text-xs font-medium">{label}</span>
      {!compact && questionsAnswered > 0 && (
        <span className="text-xs opacity-70">({questionsAnswered} answered)</span>
      )}
    </Badge>
  );
}
