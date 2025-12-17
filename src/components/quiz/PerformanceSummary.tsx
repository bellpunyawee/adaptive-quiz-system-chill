'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Target, Award } from 'lucide-react';

// Custom label component for Y-axis that handles long text
const CustomYAxisTick = (props: any) => {
  const { x, y, payload } = props;
  const maxLength = 20;
  const text = payload.value;
  const displayText = text.length > maxLength ? text.substring(0, maxLength) + '...' : text;

  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={4} textAnchor="end" fill="#666" fontSize={12}>
        {displayText}
      </text>
    </g>
  );
};

interface TopicPerformance {
  topic: string;
  correct: number;
  total: number;
  accuracy: number;
}

interface PerformanceSummaryProps {
  totalQuestions: number;
  correctAnswers: number;
  score: number;
  topicPerformance: TopicPerformance[];
  averageScore?: number; // User's average across all quizzes
  baselineScore?: number; // User's baseline score for comparison
}

export function PerformanceSummary({
  score,
  topicPerformance,
  averageScore,
  baselineScore,
}: PerformanceSummaryProps) {
  // Find best and worst topics
  const sortedTopics = [...topicPerformance].sort((a, b) => b.accuracy - a.accuracy);
  const bestTopic = sortedTopics[0];
  const worstTopic = sortedTopics[sortedTopics.length - 1];

  // Chart data
  const chartData = topicPerformance.map((topic) => ({
    name: topic.topic,
    accuracy: topic.accuracy,
    correct: topic.correct,
    total: topic.total,
  }));

  // Pastel colors for bars based on accuracy (easier on the eyes)
  const getBarColor = (accuracy: number) => {
    if (accuracy >= 80) return '#86efac'; // green-300 (pastel green)
    if (accuracy >= 60) return '#fde047'; // yellow-300 (pastel yellow)
    return '#fca5a5'; // red-300 (pastel red)
  };

  // Comparison with baseline
  const improvementFromBaseline = baselineScore !== undefined ? score - baselineScore : null;

  return (
    <>
      {/* Performance Insights Card - Takes 2 columns on desktop */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Performance Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Best Topic */}
            {bestTopic && (
              <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-900">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <p className="text-sm font-medium text-green-900 dark:text-green-300">Best Topic</p>
                </div>
                <p className="text-lg font-bold text-green-700 dark:text-green-400">{bestTopic.topic}</p>
                <p className="text-sm text-green-600 dark:text-green-500">
                  {bestTopic.accuracy}% ({bestTopic.correct}/{bestTopic.total})
                </p>
              </div>
            )}

            {/* Worst Topic */}
            {worstTopic && worstTopic.accuracy < 100 && (
              <div className="p-4 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-900">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  <p className="text-sm font-medium text-red-900 dark:text-red-300">Focus Area</p>
                </div>
                <p className="text-lg font-bold text-red-700 dark:text-red-400">{worstTopic.topic}</p>
                <p className="text-sm text-red-600 dark:text-red-500">
                  {worstTopic.accuracy}% ({worstTopic.correct}/{worstTopic.total})
                </p>
              </div>
            )}

            {/* Comparison to Average */}
            {averageScore !== undefined && (
              <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="h-4 w-4 text-blue-600" />
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-300">vs Your Average</p>
                </div>
                <p className="text-lg font-bold text-blue-700 dark:text-blue-400">
                  {score > averageScore ? '+' : ''}{(score - averageScore).toFixed(1)}%
                </p>
                <p className="text-sm text-blue-600 dark:text-blue-500">
                  Average: {averageScore.toFixed(1)}%
                </p>
              </div>
            )}

            {/* Comparison to Baseline */}
            {improvementFromBaseline !== null && (
              <div className="p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-900">
                <div className="flex items-center gap-2 mb-1">
                  <Award className="h-4 w-4 text-purple-600" />
                  <p className="text-sm font-medium text-purple-900 dark:text-purple-300">vs Baseline</p>
                </div>
                <p className="text-lg font-bold text-purple-700 dark:text-purple-400">
                  {improvementFromBaseline > 0 ? '+' : ''}{improvementFromBaseline.toFixed(1)}%
                </p>
                <p className="text-sm text-purple-600 dark:text-purple-500">
                  Baseline: {baselineScore?.toFixed(1)}%
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Topic Breakdown Chart - Full Width Below */}
      {topicPerformance.length > 0 && (
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Performance by Topic</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(250, chartData.length * 50)}>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 10, right: 30, left: 120, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  label={{ value: 'Accuracy (%)', position: 'insideBottom', offset: -5 }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={110}
                  tick={<CustomYAxisTick />}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload[0]) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border">
                          <p className="font-semibold mb-1">{data.name}</p>
                          <p className="text-sm">Accuracy: {data.accuracy}%</p>
                          <p className="text-sm">Correct: {data.correct}/{data.total}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="accuracy" radius={[0, 8, 8, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(entry.accuracy)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </>
  );
}
