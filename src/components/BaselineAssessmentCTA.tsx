// src/components/BaselineAssessmentCTA.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp } from 'lucide-react';

export function BaselineAssessmentCTA() {
  const router = useRouter();
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(true);

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
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <CardTitle className="text-2xl">Complete Your Baseline Assessment</CardTitle>
              <CardDescription>
                Help us understand your current Python knowledge to personalize your learning experience
              </CardDescription>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="ml-2">
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                <span className="sr-only">Toggle</span>
              </Button>
            </CollapsibleTrigger>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-4">
        <div className="space-y-3">
          <p className="text-sm">
            This quick 15-question assessment takes about <strong>10-15 minutes</strong> and will help us:
          </p>
          <ul className="text-sm space-y-2 ml-4">
            <li className="flex items-start gap-2">
              <span className="text-foreground mt-0.5">•</span>
              <span>Understand your current skill level across Python topics</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-foreground mt-0.5">•</span>
              <span>Identify which areas you're strongest in</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-foreground mt-0.5">•</span>
              <span>Recommend where to focus your learning efforts</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-foreground mt-0.5">•</span>
              <span>Provide more accurate question selection in future quizzes</span>
            </li>
          </ul>
        </div>

        <div className="rounded-lg bg-muted p-4 space-y-2">
          <p className="text-sm font-medium">What to expect:</p>
          <ul className="text-sm space-y-1 ml-4">
            <li className="flex items-start gap-2">
              <span className="text-muted-foreground mt-0.5">•</span>
              <span>15 questions covering 5 Python topics (3 questions each)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-muted-foreground mt-0.5">•</span>
              <span>No time limit - take your time to think through each question</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-muted-foreground mt-0.5">•</span>
              <span>Questions adapt to your responses for accurate assessment</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-muted-foreground mt-0.5">•</span>
              <span>Visual results showing your skill profile</span>
            </li>
          </ul>
        </div>

        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive p-3">
            <p className="text-sm text-destructive font-medium">Error: {error}</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button size="lg" onClick={handleStartBaseline} disabled={isStarting} className="flex-1">
            {isStarting ? (
              <>
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent mr-2" />
                Starting...
              </>
            ) : (
              'Start Assessment'
            )}
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => router.push('/dashboard')}
            disabled={isStarting}
          >
            Maybe Later
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          You can take this assessment once. It helps us provide a better learning experience.
        </p>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export function BaselineCompletedCard({ baselineQuizId }: { baselineQuizId: string }) {
  const router = useRouter();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Baseline Assessment Complete</CardTitle>
        <CardDescription>You've completed your baseline assessment</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Your baseline assessment results are available. View your skill profile to see your strengths and areas for growth.
        </p>
        <Button
          variant="outline"
          onClick={() => router.push(`/quiz/baseline/results/${baselineQuizId}`)}
        >
          View Baseline Results
        </Button>
      </CardContent>
    </Card>
  );
}
