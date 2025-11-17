// src/app/quiz/baseline/results/[quizId]/page.tsx
'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PerformanceChart, type ChartData } from '@/app/dashboard/PerformanceChart';
import { PersonalizedFeedback } from '@/components/quiz/PersonalizedFeedback';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';

type CellResult = {
  cellId: string;
  cellName: string;
  abilityTheta: number;
  sem: number;
  confidence: number;
  questionsAnswered: number;
  correctAnswers: number;
  accuracy: number;
};

type BaselineResults = {
  quizId: string;
  completedAt: string;
  overall: {
    questionsAnswered: number;
    correctAnswers: number;
    accuracy: number;
    averageAbility: number;
  };
  cells: CellResult[];
  strengths: CellResult[];
  areasForGrowth: CellResult[];
  recommendations: string[];
};

export default function BaselineResultsPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = use(params);
  const router = useRouter();
  const [results, setResults] = useState<BaselineResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchResults() {
      try {
        const response = await fetch(`/api/quiz/baseline/results/${quizId}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch results');
        }

        const data = await response.json();
        setResults(data);
      } catch (err) {
        console.error('Error fetching baseline results:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchResults();
  }, [quizId]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
            <p className="mt-4 text-muted-foreground">Loading your results...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !results) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error Loading Results</CardTitle>
            <CardDescription>{error || 'Unable to load baseline assessment results.'}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/dashboard')} variant="outline">
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Convert ability theta to percentage score for visualization
  const chartData: ChartData[] = results.cells.map((cell) => ({
    name: cell.cellName,
    score: cell.accuracy,
  }));

  // Helper function to classify ability level
  const getAbilityLevel = (theta: number): string => {
    if (theta >= 1.0) return 'Advanced';
    if (theta >= 0.5) return 'Intermediate';
    if (theta >= 0) return 'Developing';
    return 'Beginner';
  };

  // Helper function to get skill level color
  const getSkillLevelColor = (theta: number): string => {
    if (theta >= 1.0) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    if (theta >= 0.5) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    if (theta >= 0) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
  };

  return (
    <TooltipProvider>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Your Python Skill Profile</h1>
          <p className="text-muted-foreground">
            Based on your baseline assessment completed on{' '}
            {new Date(results.completedAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>

        {/* AI-Powered Personalized Feedback */}
        <PersonalizedFeedback quizId={quizId} autoLoad={true} />

      {/* Overall Summary */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Overall Performance</CardTitle>
          <CardDescription>Summary of your baseline assessment</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-4xl font-bold">{results.overall.accuracy}%</div>
              <div className="text-sm text-muted-foreground mt-1">Overall Accuracy</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold">
                {results.overall.correctAnswers}/{results.overall.questionsAnswered}
              </div>
              <div className="text-sm text-muted-foreground mt-1">Correct Answers</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold">{getAbilityLevel(results.overall.averageAbility)}</div>
              <div className="text-sm text-muted-foreground mt-1">Average Level</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Chart */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Performance by Topic</CardTitle>
          <CardDescription>Your accuracy across different Python topics</CardDescription>
        </CardHeader>
        <CardContent>
          <PerformanceChart data={chartData} />
        </CardContent>
      </Card>

      {/* Strengths */}
      {results.strengths.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Your Strengths</CardTitle>
            <CardDescription>Topics where you performed well</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {results.strengths.map((cell) => (
                <div key={cell.cellId} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-lg">{cell.cellName}</h3>
                    <span className={`text-sm font-medium px-3 py-1 rounded-full ${getSkillLevelColor(cell.abilityTheta)}`}>
                      {getAbilityLevel(cell.abilityTheta)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Accuracy</div>
                      <div className="font-medium">{cell.accuracy}%</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Correct Answers</div>
                      <div className="font-medium">
                        {cell.correctAnswers}/{cell.questionsAnswered}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground flex items-center gap-1">
                        Confidence
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3.5 w-3.5 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>How certain we are about this skill assessment. Higher confidence means more questions answered in this topic, giving us a more accurate picture of your ability.</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="font-medium">
                        {cell.confidence ? `${Math.round(cell.confidence * 100)}%` : 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Areas for Growth */}
      {results.areasForGrowth.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Areas for Growth</CardTitle>
            <CardDescription>Topics to focus on for improvement</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {results.areasForGrowth.map((cell) => (
                <div key={cell.cellId} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-lg">{cell.cellName}</h3>
                    <span className={`text-sm font-medium px-3 py-1 rounded-full ${getSkillLevelColor(cell.abilityTheta)}`}>
                      {getAbilityLevel(cell.abilityTheta)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Accuracy</div>
                      <div className="font-medium">{cell.accuracy}%</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Correct Answers</div>
                      <div className="font-medium">
                        {cell.correctAnswers}/{cell.questionsAnswered}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground flex items-center gap-1">
                        Confidence
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3.5 w-3.5 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>How certain we are about this skill assessment. Higher confidence means more questions answered in this topic, giving us a more accurate picture of your ability.</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="font-medium">
                        {cell.confidence ? `${Math.round(cell.confidence * 100)}%` : 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Your Learning Path</CardTitle>
          <CardDescription>Personalized next steps based on your assessment results</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {results.recommendations.map((recommendation, index) => (
              <li key={index} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium mt-0.5">
                  {index + 1}
                </span>
                <p className="text-sm leading-relaxed pt-0.5">{recommendation}</p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button size="lg" onClick={() => router.push('/dashboard')}>
          Start Adaptive Quizzes
        </Button>
        <Button size="lg" variant="outline" onClick={() => router.push(`/quiz/results/${quizId}`)}>
          View Quiz History
        </Button>
      </div>
      </div>
    </TooltipProvider>
  );
}
