'use client';

/**
 * Error Heatmap Component
 *
 * Visualizes error rates by topic using a horizontal bar chart.
 * Color-coded from green (low errors) to red (high errors).
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { AlertTriangle } from 'lucide-react';

// Custom Y-axis tick for truncating long topic names
const CustomYAxisTick = (props: { x: number; y: number; payload: { value: string } }) => {
  const { x, y, payload } = props;
  const maxLength = 18;
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

export interface TopicError {
  topicName: string;
  topicId: string;
  errorRate: number; // 0-100 percentage
  errorCount: number;
  totalQuestions: number;
}

interface ErrorHeatmapProps {
  topicErrors: TopicError[];
  maxTopics?: number; // Limit displayed topics (default: 5)
  compact?: boolean; // Compact mode for Overview tab
  title?: string;
  description?: string;
}

/**
 * Get color based on error rate (inverse of accuracy)
 * Green (low errors) -> Yellow (medium) -> Red (high errors)
 */
function getErrorColor(errorRate: number): string {
  if (errorRate <= 20) return '#86efac'; // green-300 (excellent - few errors)
  if (errorRate <= 40) return '#bef264'; // lime-300
  if (errorRate <= 50) return '#fde047'; // yellow-300
  if (errorRate <= 70) return '#fdba74'; // orange-300
  return '#fca5a5'; // red-300 (needs attention - many errors)
}

/**
 * Get severity label for error rate
 */
function getSeverityLabel(errorRate: number): string {
  if (errorRate <= 20) return 'Strong';
  if (errorRate <= 40) return 'Good';
  if (errorRate <= 50) return 'Fair';
  if (errorRate <= 70) return 'Needs Work';
  return 'Focus Area';
}

export function ErrorHeatmap({
  topicErrors,
  maxTopics = 5,
  compact = false,
  title = 'Error Distribution by Topic',
  description = 'Topics with higher error rates need more attention',
}: ErrorHeatmapProps) {
  if (topicErrors.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-muted-foreground" />
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>No errors to display - great job!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sort by error rate descending and limit to maxTopics
  const sortedErrors = [...topicErrors]
    .sort((a, b) => b.errorRate - a.errorRate)
    .slice(0, maxTopics);

  // Chart data
  const chartData = sortedErrors.map((topic) => ({
    name: topic.topicName,
    errorRate: topic.errorRate,
    errorCount: topic.errorCount,
    totalQuestions: topic.totalQuestions,
    accuracy: 100 - topic.errorRate,
  }));

  const chartHeight = compact
    ? Math.max(150, chartData.length * 35)
    : Math.max(200, chartData.length * 45);

  return (
    <Card>
      <CardHeader className={compact ? 'pb-2' : undefined}>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          {title}
        </CardTitle>
        {!compact && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: compact ? 90 : 110, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
            <XAxis
              type="number"
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
              tick={{ fontSize: 11 }}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={compact ? 80 : 100}
              tick={<CustomYAxisTick x={0} y={0} payload={{ value: '' }} />}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload[0]) {
                  const data = payload[0].payload;
                  const severity = getSeverityLabel(data.errorRate);
                  return (
                    <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border">
                      <p className="font-semibold mb-1">{data.name}</p>
                      <p className="text-sm">
                        Error Rate: <span className="font-medium">{data.errorRate.toFixed(0)}%</span>
                      </p>
                      <p className="text-sm">
                        Incorrect: <span className="font-medium">{data.errorCount}/{data.totalQuestions}</span>
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Status: <span className="font-medium">{severity}</span>
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="errorRate" radius={[0, 4, 4, 0]} maxBarSize={30}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getErrorColor(entry.errorRate)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Summary legend */}
        {!compact && (
          <div className="flex flex-wrap gap-4 mt-4 text-xs text-muted-foreground justify-center">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: '#86efac' }} />
              <span>Strong (0-20%)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: '#fde047' }} />
              <span>Fair (40-50%)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: '#fca5a5' }} />
              <span>Focus (70%+)</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
