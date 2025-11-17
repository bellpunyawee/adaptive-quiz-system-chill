// src/components/BaselineAssessmentCTA.tsx
'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, ArrowRight } from 'lucide-react';

export function BaselineAssessmentCTA() {
  const router = useRouter();

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader>
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Brain className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-2xl">Complete Your Baseline Assessment</CardTitle>
            <CardDescription className="mt-2">
              Help us understand your current knowledge to personalize your learning experience
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">Quick 15-question assessment</p>
            <p className="text-sm text-muted-foreground">Takes about 10-15 minutes</p>
          </div>
          <Button size="lg" onClick={() => router.push('/baseline-intro')}>
            Get Started
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
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
