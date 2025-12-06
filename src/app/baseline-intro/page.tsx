// src/app/baseline-intro/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Clock, Target, TrendingUp, CheckCircle2, Brain, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface BaselineStats {
  totalTopics: number;
  topicsWithBaseline: number;
  totalBaselineQuestions: number;
  expectedQuizLength: number;
  questionsPerTopic: number;
  estimatedTimeMinutes: number;
  topics: Array<{
    id: string;
    name: string;
    totalQuestions: number;
    willUse: number;
    hasEnough: boolean;
  }>;
}

export default function BaselineIntroPage() {
  const router = useRouter();
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<BaselineStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // Fetch baseline statistics
  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch('/api/quiz/baseline/stats');
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        } else {
          console.error('Failed to fetch baseline stats');
        }
      } catch (error) {
        console.error('Error fetching baseline stats:', error);
      } finally {
        setIsLoadingStats(false);
      }
    }
    fetchStats();
  }, []);

  const handleStartBaseline = async () => {
    setIsStarting(true);
    setError(null);

    try {
      const response = await fetch('/api/quiz/baseline', {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start baseline assessment');
      }

      const data = await response.json();
      router.push(`/quiz/${data.quizId}`);
    } catch (err) {
      console.error('Error starting baseline:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsStarting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto max-w-4xl p-4 md:p-8">
        {/* Back Button */}
        <div className="mb-6">
          <Button variant="ghost" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>

        {/* Hero Section */}
        <div className="text-center mb-8 space-y-4 animate-in fade-in duration-500">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Brain className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Baseline Assessment</h1>
          {/* <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Help us understand your current knowledge to personalize your learning experience
          </p> */}
        </div>

        {/* Quick Stats */}
        {isLoadingStats ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6 text-center">
                <Clock className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold">
                  {stats?.estimatedTimeMinutes ? `~${stats.estimatedTimeMinutes} min` : 'N/A'}
                </p>
                <p className="text-sm text-muted-foreground">Estimated time</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <Target className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold">
                  {stats?.expectedQuizLength || 0} Questions
                </p>
                <p className="text-sm text-muted-foreground">
                  {stats?.questionsPerTopic || 3} per topic
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <TrendingUp className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold">
                  {stats?.topicsWithBaseline || 0} Topics
                </p>
                <p className="text-sm text-muted-foreground">
                  {stats?.totalBaselineQuestions || 0} total questions
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content */}
        <div className="space-y-6">
          {/* What We'll Learn */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                What We'll Learn About You
              </CardTitle>
              <CardDescription>
                This assessment helps us create a personalized learning path
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                    1
                  </span>
                  <div>
                    <p className="font-medium">Your Current Skill Level</p>
                    <p className="text-sm text-muted-foreground">
                      Understand your proficiency across {stats?.topicsWithBaseline || 'multiple'} different topics
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                    2
                  </span>
                  <div>
                    <p className="font-medium">Your Strongest Topics</p>
                    <p className="text-sm text-muted-foreground">
                      Identify areas where you excel to build on your strengths
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                    3
                  </span>
                  <div>
                    <p className="font-medium">Focus Areas for Growth</p>
                    <p className="text-sm text-muted-foreground">
                      Discover where to focus your learning efforts for maximum impact
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                    4
                  </span>
                  <div>
                    <p className="font-medium">Personalized Question Selection</p>
                    <p className="text-sm text-muted-foreground">
                      Future quizzes will adapt to your ability for optimal learning
                    </p>
                  </div>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* How It Works */}
          {/* <Card>
            <CardHeader>
              <CardTitle>How It Works</CardTitle>
              <CardDescription>
                Adaptive assessment using Item Response Theory (IRT)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <span className="text-blue-600 font-semibold">1</span>
                  </div>
                  <div>
                    <p className="font-medium">Start with Medium Difficulty</p>
                    <p className="text-sm text-muted-foreground">
                      Initial questions help us gauge your baseline knowledge
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <span className="text-blue-600 font-semibold">2</span>
                  </div>
                  <div>
                    <p className="font-medium">Questions Adapt to Your Responses</p>
                    <p className="text-sm text-muted-foreground">
                      Correct answers lead to harder questions; incorrect to easier ones
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <span className="text-blue-600 font-semibold">3</span>
                  </div>
                  <div>
                    <p className="font-medium">Cover All Topics</p>
                    <p className="text-sm text-muted-foreground">
                      {stats?.topics && stats.topics.length > 0 ? (
                        <>Questions span {stats.topicsWithBaseline} topics: {stats.topics.map(t => t.name).join(', ')}</>
                      ) : (
                        'Questions will cover multiple topics from your curriculum'
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <span className="text-blue-600 font-semibold">4</span>
                  </div>
                  <div>
                    <p className="font-medium">Get Your Skill Profile</p>
                    <p className="text-sm text-muted-foreground">
                      Visual results show your ability across topics with radar charts and learning curves
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card> */}

          {/* What to Expect */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle>What to Expect</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">
                    <strong>No time limit</strong> - Take your time to think through each question carefully
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">
                    <strong>Can't retake</strong> - This is a one-time assessment for accurate ability estimation
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">
                    <strong>Immediate feedback</strong> - See explanations after completing the assessment
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">
                    <strong>AI-powered insights</strong> - Get personalized recommendations based on your performance
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">
                    <strong>Track your progress</strong> - Compare future quiz results to your baseline
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Error Display */}
          {error && (
            <Card className="border-destructive">
              <CardContent className="pt-6">
                <p className="text-sm text-destructive font-medium">Error: {error}</p>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Button
              size="lg"
              onClick={handleStartBaseline}
              disabled={isStarting}
              className="flex-1 text-lg h-14"
            >
              {isStarting ? (
                <>
                  <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-solid border-current border-r-transparent mr-2" />
                  Starting Assessment...
                </>
              ) : (
                <>
                  <Brain className="h-5 w-5 mr-2" />
                  Start Baseline Assessment
                </>
              )}
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => router.push('/dashboard')}
              disabled={isStarting}
              className="sm:w-auto text-lg h-14"
            >
              Maybe Later
            </Button>
          </div>

          <p className="text-sm text-muted-foreground text-center pt-2">
            💡 <strong>Tip:</strong> This assessment provides the foundation for your personalized learning journey. Taking it now ensures the best experience.
          </p>
        </div>
      </div>
    </div>
  );
}
