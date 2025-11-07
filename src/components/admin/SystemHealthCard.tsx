// src/components/admin/SystemHealthCard.tsx
import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SystemHealthCardProps {
  title: string;
  value: string | number;
  status: 'good' | 'warning' | 'error';
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
}

export function SystemHealthCard({
  title,
  value,
  status,
  icon: Icon,
  description,
  trend,
}: SystemHealthCardProps) {
  const statusColors = {
    good: 'border-green-500 bg-green-50 dark:bg-green-950/20',
    warning: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20',
    error: 'border-red-500 bg-red-50 dark:bg-red-950/20',
  };

  const iconColors = {
    good: 'text-green-600 dark:text-green-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    error: 'text-red-600 dark:text-red-400',
  };

  return (
    <Card className={cn('border-l-4 transition-all hover:shadow-md', statusColors[status])}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
              {title}
            </p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
            {description && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {description}
              </p>
            )}
            {trend && (
              <div className="flex items-center gap-1 mt-2">
                <span
                  className={cn(
                    'text-sm font-medium',
                    trend.direction === 'up'
                      ? 'text-green-600'
                      : 'text-red-600'
                  )}
                >
                  {trend.direction === 'up' ? '↑' : '↓'} {Math.abs(trend.value)}%
                </span>
                <span className="text-xs text-slate-500">vs last period</span>
              </div>
            )}
          </div>
          <div className={cn('p-3 rounded-lg bg-white dark:bg-slate-800', iconColors[status])}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
