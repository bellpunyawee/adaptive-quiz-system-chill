'use client';

/**
 * Mastery Gauge Component
 *
 * Displays topic mastery levels using circular progress indicators.
 * Color-coded by mastery status: beginner → developing → proficient → mastered.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadialBarChart, RadialBar, ResponsiveContainer, Tooltip, PolarAngleAxis } from 'recharts';
import { Target } from 'lucide-react';

export type MasteryStatus = 'beginner' | 'developing' | 'proficient' | 'mastered';

export interface TopicMastery {
  topicName: string;
  topicId: string;
  masteryPercentage: number; // 0-100
  abilityTheta: number;
  status: MasteryStatus;
  questionsAnswered?: number;
  accuracy?: number;
}

interface MasteryGaugeProps {
  topics: TopicMastery[];
  layout?: 'grid' | 'list';
  compact?: boolean;
  maxTopics?: number;
  title?: string;
  description?: string;
}

/**
 * Get color based on mastery status
 */
function getMasteryColor(status: MasteryStatus): string {
  switch (status) {
    case 'mastered':
      return '#22c55e'; // green-500
    case 'proficient':
      return '#3b82f6'; // blue-500
    case 'developing':
      return '#f59e0b'; // amber-500
    case 'beginner':
      return '#ef4444'; // red-500
    default:
      return '#9ca3af'; // gray-400
  }
}

/**
 * Get background color for gauge
 */
function getMasteryBgColor(status: MasteryStatus): string {
  switch (status) {
    case 'mastered':
      return '#dcfce7'; // green-100
    case 'proficient':
      return '#dbeafe'; // blue-100
    case 'developing':
      return '#fef3c7'; // amber-100
    case 'beginner':
      return '#fee2e2'; // red-100
    default:
      return '#f3f4f6'; // gray-100
  }
}

/**
 * Get human-readable status label
 */
function getStatusLabel(status: MasteryStatus): string {
  switch (status) {
    case 'mastered':
      return 'Mastered';
    case 'proficient':
      return 'Proficient';
    case 'developing':
      return 'Developing';
    case 'beginner':
      return 'Beginner';
    default:
      return 'Unknown';
  }
}

/**
 * Single circular gauge for one topic
 */
function SingleGauge({
  topic,
  size = 'normal',
}: {
  topic: TopicMastery;
  size?: 'small' | 'normal';
}) {
  const gaugeSize = size === 'small' ? 100 : 140;
  const innerRadius = size === 'small' ? '65%' : '70%';
  const outerRadius = size === 'small' ? '85%' : '90%';

  const data = [
    {
      name: topic.topicName,
      value: topic.masteryPercentage,
      fill: getMasteryColor(topic.status),
    },
  ];

  return (
    <div
      className="flex flex-col items-center p-3 rounded-lg transition-colors"
      style={{ backgroundColor: getMasteryBgColor(topic.status) }}
    >
      <div className="relative" style={{ width: gaugeSize, height: gaugeSize }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            barSize={size === 'small' ? 8 : 12}
            data={data}
            startAngle={180}
            endAngle={-180}
          >
            <PolarAngleAxis
              type="number"
              domain={[0, 100]}
              angleAxisId={0}
              tick={false}
            />
            <RadialBar
              background={{ fill: '#e5e7eb' }}
              dataKey="value"
              cornerRadius={10}
              animationDuration={1000}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload[0]) {
                  return (
                    <div className="bg-white dark:bg-slate-800 p-2 rounded-lg shadow-lg border text-sm">
                      <p className="font-semibold">{topic.topicName}</p>
                      <p>Mastery: {topic.masteryPercentage}%</p>
                      <p>Ability (θ): {topic.abilityTheta.toFixed(2)}</p>
                      {topic.accuracy !== undefined && (
                        <p>Quiz Accuracy: {(topic.accuracy * 100).toFixed(0)}%</p>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={`font-bold ${size === 'small' ? 'text-lg' : 'text-2xl'}`}
            style={{ color: getMasteryColor(topic.status) }}
          >
            {topic.masteryPercentage}%
          </span>
        </div>
      </div>
      {/* Topic name and status */}
      <div className="text-center mt-1">
        <p
          className={`font-medium text-gray-800 ${size === 'small' ? 'text-xs' : 'text-sm'} line-clamp-2`}
          title={topic.topicName}
        >
          {topic.topicName.length > 20
            ? topic.topicName.substring(0, 18) + '...'
            : topic.topicName}
        </p>
        <p
          className={`${size === 'small' ? 'text-xs' : 'text-xs'} font-medium`}
          style={{ color: getMasteryColor(topic.status) }}
        >
          {getStatusLabel(topic.status)}
        </p>
      </div>
    </div>
  );
}

/**
 * List item for a topic (used in list layout)
 */
function ListItem({ topic }: { topic: TopicMastery }) {
  return (
    <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
      {/* Mini progress bar */}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium truncate" title={topic.topicName}>
            {topic.topicName}
          </span>
          <span
            className="text-sm font-bold"
            style={{ color: getMasteryColor(topic.status) }}
          >
            {topic.masteryPercentage}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
          <div
            className="h-2.5 rounded-full transition-all duration-500"
            style={{
              width: `${topic.masteryPercentage}%`,
              backgroundColor: getMasteryColor(topic.status),
            }}
          />
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-muted-foreground">
            θ: {topic.abilityTheta.toFixed(2)}
          </span>
          <span
            className="text-xs font-medium"
            style={{ color: getMasteryColor(topic.status) }}
          >
            {getStatusLabel(topic.status)}
          </span>
        </div>
      </div>
    </div>
  );
}

export function MasteryGauge({
  topics,
  layout = 'grid',
  compact = false,
  maxTopics = 6,
  title = 'Topic Mastery Levels',
  description = 'Your current mastery status for each topic',
}: MasteryGaugeProps) {
  if (topics.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>No mastery data available yet.</p>
            <p className="text-sm">Complete quizzes to see your mastery levels!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sort by mastery percentage and limit
  const sortedTopics = [...topics]
    .sort((a, b) => b.masteryPercentage - a.masteryPercentage)
    .slice(0, maxTopics);

  return (
    <Card>
      <CardHeader className={compact ? 'pb-2' : undefined}>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
        {!compact && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {layout === 'grid' ? (
          <div
            className={`grid gap-4 ${
              compact
                ? 'grid-cols-2 sm:grid-cols-3'
                : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
            }`}
          >
            {sortedTopics.map((topic) => (
              <SingleGauge
                key={topic.topicId}
                topic={topic}
                size={compact ? 'small' : 'normal'}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {sortedTopics.map((topic) => (
              <ListItem key={topic.topicId} topic={topic} />
            ))}
          </div>
        )}

        {/* Status legend */}
        {!compact && (
          <div className="flex flex-wrap gap-4 mt-6 text-xs text-muted-foreground justify-center">
            <div className="flex items-center gap-1">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: getMasteryColor('mastered') }}
              />
              <span>Mastered (θ≥1.5)</span>
            </div>
            <div className="flex items-center gap-1">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: getMasteryColor('proficient') }}
              />
              <span>Proficient (θ≥0.5)</span>
            </div>
            <div className="flex items-center gap-1">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: getMasteryColor('developing') }}
              />
              <span>Developing (θ≥-0.5)</span>
            </div>
            <div className="flex items-center gap-1">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: getMasteryColor('beginner') }}
              />
              <span>Beginner (θ&lt;-0.5)</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
