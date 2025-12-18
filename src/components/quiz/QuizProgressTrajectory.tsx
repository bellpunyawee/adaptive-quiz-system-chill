'use client';

/**
 * Quiz Progress Trajectory Component
 *
 * Displays a line chart showing quiz performance over time.
 * Highlights the current quiz on the timeline.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceDot,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export interface QuizDataPoint {
  quizId: string;
  date: Date;
  score: number; // 0-100 percentage
  questionsCount: number;
  isCurrentQuiz?: boolean;
}

export interface TrajectoryData {
  quizzes: QuizDataPoint[];
  trend: 'improving' | 'stable' | 'declining';
  averageScore: number;
  improvement: number; // Change from first to last
}

interface QuizProgressTrajectoryProps {
  data?: TrajectoryData; // Pre-fetched data
  quizId?: string; // Current quiz ID (for API fetch)
  userId?: string; // User ID (for API fetch)
  compact?: boolean;
  maxQuizzes?: number;
  title?: string;
  description?: string;
}

/**
 * Get trend icon component
 */
function TrendIcon({ trend }: { trend: 'improving' | 'stable' | 'declining' }) {
  switch (trend) {
    case 'improving':
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    case 'declining':
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    default:
      return <Minus className="h-4 w-4 text-gray-500" />;
  }
}

/**
 * Get trend label and color
 */
function getTrendInfo(trend: 'improving' | 'stable' | 'declining'): {
  label: string;
  color: string;
} {
  switch (trend) {
    case 'improving':
      return { label: 'Improving', color: 'text-green-600' };
    case 'declining':
      return { label: 'Declining', color: 'text-red-600' };
    default:
      return { label: 'Stable', color: 'text-gray-600' };
  }
}

export function QuizProgressTrajectory({
  data: propData,
  quizId,
  compact = false,
  maxQuizzes = 10,
  title = 'Performance Trajectory',
  description = 'Your quiz scores over time',
}: QuizProgressTrajectoryProps) {
  const [data, setData] = useState<TrajectoryData | null>(propData || null);
  const [loading, setLoading] = useState(!propData && !!quizId);
  const [error, setError] = useState<string | null>(null);

  // Fetch data from API if not provided via props
  useEffect(() => {
    if (propData) {
      setData(propData);
      return;
    }

    if (!quizId) return;

    const fetchTrajectory = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/quiz/${quizId}/trajectory?maxQuizzes=${maxQuizzes}`);
        if (!response.ok) {
          throw new Error('Failed to fetch trajectory data');
        }
        const trajectoryData = await response.json();
        setData(trajectoryData);
      } catch (err: unknown) {
        console.error('Error fetching trajectory:', err);
        setError(err instanceof Error ? err.message : 'Failed to load progress data');
      } finally {
        setLoading(false);
      }
    };

    fetchTrajectory();
  }, [quizId, propData, maxQuizzes]);

  // Loading state
  if (loading) {
    return (
      <Card>
        <CardHeader className={compact ? 'pb-2' : undefined}>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardHeader className={compact ? 'pb-2' : undefined}>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (!data || data.quizzes.length === 0) {
    return (
      <Card>
        <CardHeader className={compact ? 'pb-2' : undefined}>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            {title}
          </CardTitle>
          {!compact && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>Not enough quiz history yet.</p>
            <p className="text-sm">Complete more quizzes to see your progress!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prepare chart data
  const chartData = data.quizzes
    .slice(-maxQuizzes)
    .map((quiz, index) => ({
      index: index + 1,
      date: format(new Date(quiz.date), 'MMM dd'),
      fullDate: format(new Date(quiz.date), 'MMM dd, yyyy'),
      score: quiz.score,
      questionsCount: quiz.questionsCount,
      isCurrentQuiz: quiz.isCurrentQuiz,
      quizId: quiz.quizId,
    }));

  const currentQuizData = chartData.find((d) => d.isCurrentQuiz);
  const trendInfo = getTrendInfo(data.trend);
  const chartHeight = compact ? 180 : 280;

  return (
    <Card>
      <CardHeader className={compact ? 'pb-2' : undefined}>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              {title}
            </CardTitle>
            {!compact && <CardDescription>{description}</CardDescription>}
          </div>
          {/* Trend indicator */}
          <div className="flex items-center gap-2 text-sm">
            <TrendIcon trend={data.trend} />
            <span className={trendInfo.color}>{trendInfo.label}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload[0]) {
                  const d = payload[0].payload;
                  return (
                    <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border">
                      <p className="font-semibold mb-1">{d.fullDate}</p>
                      <p className="text-sm">
                        Score: <span className="font-medium">{d.score}%</span>
                      </p>
                      <p className="text-sm">
                        Questions: <span className="font-medium">{d.questionsCount}</span>
                      </p>
                      {d.isCurrentQuiz && (
                        <p className="text-xs text-primary mt-1 font-medium">
                          ← Current Quiz
                        </p>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
            {/* Average reference line */}
            <ReferenceLine
              y={data.averageScore}
              stroke="#9ca3af"
              strokeDasharray="5 5"
              label={{
                value: `Avg: ${data.averageScore.toFixed(0)}%`,
                position: 'right',
                fontSize: 11,
                fill: '#9ca3af',
              }}
            />
            {/* Main score line */}
            <Line
              type="monotone"
              dataKey="score"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 4, fill: '#3b82f6' }}
              activeDot={{ r: 6 }}
            />
            {/* Highlight current quiz */}
            {currentQuizData && (
              <ReferenceDot
                x={currentQuizData.index}
                y={currentQuizData.score}
                r={8}
                fill="#22c55e"
                stroke="#fff"
                strokeWidth={2}
              />
            )}
          </LineChart>
        </ResponsiveContainer>

        {/* Summary stats */}
        {!compact && (
          <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">
                {data.averageScore.toFixed(0)}%
              </p>
              <p className="text-xs text-muted-foreground">Average Score</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{data.quizzes.length}</p>
              <p className="text-xs text-muted-foreground">Quizzes Taken</p>
            </div>
            <div className="text-center">
              <p
                className={`text-2xl font-bold ${
                  data.improvement > 0
                    ? 'text-green-600'
                    : data.improvement < 0
                    ? 'text-red-600'
                    : 'text-gray-600'
                }`}
              >
                {data.improvement > 0 ? '+' : ''}
                {data.improvement.toFixed(0)}%
              </p>
              <p className="text-xs text-muted-foreground">Change</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
