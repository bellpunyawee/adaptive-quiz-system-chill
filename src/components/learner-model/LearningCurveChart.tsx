'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

interface DataPoint {
  date: Date;
  ability_theta: number;
  confidence: number;
  quizId?: string;
}

interface TopicHistory {
  cellId: string;
  cellName: string;
  dataPoints: DataPoint[];
}

interface BaselinePoint {
  cellId: string;
  cellName: string;
  ability_theta: number;
  date: Date;
}

interface LearningCurveChartProps {
  history: TopicHistory[];
  baseline: BaselinePoint[];
  dateRange: {
    start: Date;
    end: Date;
    days: number;
  };
}

// Color palette for different topics (minimal B&W with varying shades)
const TOPIC_COLORS = [
  '#000000', // black
  '#1a1a1a', // very dark gray
  '#333333', // dark gray
  '#4d4d4d', // medium-dark gray
  '#666666', // medium gray
  '#808080', // medium-light gray
  '#999999', // light gray
  '#b3b3b3', // lighter gray
];

export function LearningCurveChart({ history, baseline, dateRange }: LearningCurveChartProps) {
  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Learning Progress
          </CardTitle>
          <CardDescription>
            Your ability progression over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>No learning history available yet.</p>
            <p className="text-sm">Complete more quizzes to see your progress!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Combine all data points from all topics into a single timeline
  const allDataPoints: Array<{
    date: Date;
    dateStr: string;
    [key: string]: any;
  }> = [];

  // Create a map of date -> {topic: ability}
  const dateMap = new Map<string, any>();

  history.forEach((topic) => {
    topic.dataPoints.forEach((point) => {
      const dateStr = format(new Date(point.date), 'MMM dd');
      if (!dateMap.has(dateStr)) {
        dateMap.set(dateStr, {
          date: new Date(point.date),
          dateStr,
        });
      }
      // Use topic name as key
      dateMap.get(dateStr)![topic.cellName] = point.ability_theta;
    });
  });

  // Convert map to sorted array
  const chartData = Array.from(dateMap.values()).sort((a, b) => a.date.getTime() - b.date.getTime());

  // Calculate improvement metrics
  const getImprovement = (topicHistory: TopicHistory) => {
    if (topicHistory.dataPoints.length < 2) return null;
    const first = topicHistory.dataPoints[0].ability_theta;
    const last = topicHistory.dataPoints[topicHistory.dataPoints.length - 1].ability_theta;
    return last - first;
  };

  const improvements = history.map(t => ({
    topic: t.cellName,
    improvement: getImprovement(t),
    color: TOPIC_COLORS[history.indexOf(t) % TOPIC_COLORS.length]
  })).filter(i => i.improvement !== null);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Learning Progress Over Time
          </CardTitle>
          <CardDescription>
            Ability (θ) progression for the last {dateRange.days} days
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="dateStr"
                tick={{ fontSize: 12 }}
              />
              <YAxis
                label={{ value: 'Ability (θ)', angle: -90, position: 'insideLeft' }}
                domain={[-3, 3]}
                ticks={[-3, -2, -1, 0, 1, 2, 3]}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length > 0) {
                    return (
                      <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border">
                        <p className="font-semibold mb-2">{payload[0].payload.dateStr}</p>
                        {payload.map((entry, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: entry.color }}
                            />
                            <span>{entry.name}:</span>
                            <span className="font-medium">{Number(entry.value).toFixed(2)}σ</span>
                          </div>
                        ))}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              {/* Baseline reference line at θ = 0 */}
              <ReferenceLine
                y={0}
                stroke="#9ca3af"
                strokeDasharray="3 3"
                label={{ value: 'Average', position: 'right', fontSize: 12 }}
              />
              {/* Draw a line for each topic */}
              {history.map((topic, index) => (
                <Line
                  key={topic.cellId}
                  type="monotone"
                  dataKey={topic.cellName}
                  stroke={TOPIC_COLORS[index % TOPIC_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Improvement Summary */}
      {improvements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Improvement Summary</CardTitle>
            <CardDescription>Progress over the last {dateRange.days} days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {improvements
                .sort((a, b) => (b.improvement || 0) - (a.improvement || 0))
                .map((item) => (
                  <div key={item.topic} className="flex items-center gap-4">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <div className="flex-1">
                      <p className="font-medium">{item.topic}</p>
                    </div>
                    <div className="text-right">
                      {item.improvement! >= 0 ? (
                        <p className="text-green-600 font-semibold flex items-center gap-1">
                          <TrendingUp className="h-4 w-4" />
                          +{item.improvement!.toFixed(2)}σ
                        </p>
                      ) : (
                        <p className="text-red-600 font-semibold">
                          {item.improvement!.toFixed(2)}σ
                        </p>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
