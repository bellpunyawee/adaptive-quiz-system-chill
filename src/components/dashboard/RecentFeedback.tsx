'use client';

/**
 * Recent Feedback Component for Dashboard
 *
 * Displays the most recent AI-generated feedback from completed quizzes
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface FeedbackSummary {
  feedbackId: string;
  quizId: string;
  quizDate: Date;
  quizScore: number;
  feedbackText: string;
  summary: string;
  keyInsight: string;
}

interface RecentFeedbackProps {
  limit?: number;
}

export function RecentFeedback({ limit = 3 }: RecentFeedbackProps) {
  const [feedbacks, setFeedbacks] = useState<FeedbackSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRecentFeedback = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/user/recent-feedback?limit=${limit}`);

      if (response.ok) {
        const data = await response.json();
        setFeedbacks(data.feedbacks || []);
      }
    } catch (error) {
      console.error('Error loading recent feedback:', error);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    loadRecentFeedback();
  }, [loadRecentFeedback]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Personalized Feedback
          </CardTitle>
          <CardDescription>Your latest personalized feedback</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (feedbacks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Personalized Feedback
          </CardTitle>
          <CardDescription>Get personalized feedback on your quizzes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-2">
              <p className="font-medium">No AI feedback yet</p>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Complete a quiz and generate personalized insights to see AI-powered recommendations here
              </p>
            </div>
            <Button asChild size="sm">
              <Link href="/quiz/settings">
                Take a Quiz
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Personalized Feedback
        </CardTitle>
        <CardDescription>AI-powered insights from your latest quizzes</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {feedbacks.map((feedback) => (
          <div
            key={feedback.feedbackId}
            className="p-4 border rounded-lg hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium">
                    {new Date(feedback.quizDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                    {feedback.quizScore}%
                  </span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {feedback.keyInsight}
                </p>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href={`/quiz/results/${feedback.quizId}`}>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        ))}

        {feedbacks.length >= limit && (
          <div className="pt-2">
            <Button asChild variant="outline" className="w-full" size="sm">
              <Link href="/dashboard/feedback-history">
                View All Feedback
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
