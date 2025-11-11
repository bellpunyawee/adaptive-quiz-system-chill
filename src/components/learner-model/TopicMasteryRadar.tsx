'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, Award, Target } from 'lucide-react';

interface TopicMastery {
  cellId: string;
  cellName: string;
  ability_theta: number;
  sem: number;
  confidence: number;
  responseCount: number;
  lastEstimated: Date | null;
  masteryLevel: 'beginner' | 'intermediate' | 'advanced' | 'mastered';
  abilityPercentage: number;
}

interface TopicMasteryRadarProps {
  topics: TopicMastery[];
  overallStats: {
    averageAbility: number;
    topicsStarted: number;
    topicsMastered: number;
    totalResponses: number;
  };
}

export function TopicMasteryRadar({ topics, overallStats }: TopicMasteryRadarProps) {
  // Color mapping for mastery levels (minimal B&W)
  const getMasteryColor = (level: string) => {
    switch (level) {
      case 'mastered':
        return '#000000'; // black
      case 'advanced':
        return '#404040'; // dark gray
      case 'intermediate':
        return '#808080'; // medium gray
      case 'beginner':
        return '#c0c0c0'; // light gray
      default:
        return '#e0e0e0'; // very light gray
    }
  };

  // Get badge variant
  const getMasteryBadgeVariant = (level: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (level) {
      case 'mastered':
        return 'default';
      case 'advanced':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  // Chart data
  const chartData = topics.map(t => ({
    name: t.cellName,
    ability: t.abilityPercentage,
    theta: t.ability_theta,
    confidence: t.confidence,
    responseCount: t.responseCount,
    masteryLevel: t.masteryLevel,
  }));

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Topics Started</CardDescription>
            <CardTitle className="text-3xl">{overallStats.topicsStarted}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Topics Mastered</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              {overallStats.topicsMastered}
              {overallStats.topicsMastered > 0 && <Award className="h-5 w-5 text-yellow-500" />}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Average Ability</CardDescription>
            <CardTitle className="text-3xl">
              {overallStats.averageAbility >= 0 ? '+' : ''}
              {overallStats.averageAbility.toFixed(2)}σ
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Responses</CardDescription>
            <CardTitle className="text-3xl">{overallStats.totalResponses}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Topic Mastery Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Topic Mastery Levels
          </CardTitle>
          <CardDescription>
            Your ability level across different topics (0-100% scale)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {topics.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No topic data available yet.</p>
              <p className="text-sm">Complete a quiz to see your progress!</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(300, topics.length * 60)}>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 10, right: 30, left: 120, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  label={{ value: 'Ability (%)', position: 'insideBottom', offset: -5 }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={110}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload[0]) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border">
                          <p className="font-semibold mb-1">{data.name}</p>
                          <p className="text-sm">Ability: {data.ability}%</p>
                          <p className="text-sm">θ: {data.theta.toFixed(2)}σ</p>
                          <p className="text-sm">Confidence: {(data.confidence * 100).toFixed(0)}%</p>
                          <p className="text-sm">Responses: {data.responseCount}</p>
                          <Badge className="mt-1" variant={getMasteryBadgeVariant(data.masteryLevel)}>
                            {data.masteryLevel}
                          </Badge>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="ability" radius={[0, 8, 8, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getMasteryColor(entry.masteryLevel)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Topic Details List */}
      <Card>
        <CardHeader>
          <CardTitle>Topic Details</CardTitle>
          <CardDescription>Detailed breakdown by topic</CardDescription>
        </CardHeader>
        <CardContent>
          {topics.length === 0 ? (
            <p className="text-center text-muted-foreground">No topics yet</p>
          ) : (
            <div className="space-y-3">
              {topics.map((topic) => (
                <div
                  key={topic.cellId}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium">{topic.cellName}</p>
                      <Badge variant={getMasteryBadgeVariant(topic.masteryLevel)}>
                        {topic.masteryLevel}
                      </Badge>
                      {topic.masteryLevel === 'mastered' && (
                        <Award className="h-4 w-4 text-yellow-500" />
                      )}
                    </div>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span>θ: {topic.ability_theta.toFixed(2)}σ</span>
                      <span>Confidence: {(topic.confidence * 100).toFixed(0)}%</span>
                      <span>Responses: {topic.responseCount}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold" style={{ color: getMasteryColor(topic.masteryLevel) }}>
                      {topic.abilityPercentage}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
