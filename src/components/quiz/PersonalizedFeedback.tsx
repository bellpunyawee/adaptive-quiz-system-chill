'use client';

/**
 * Personalized Feedback Component
 *
 * Displays LLM-generated personalized feedback for quiz results
 * Fetches feedback from the API and displays it in a structured format
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface FeedbackData {
  summary: string;
  strengths: string[];
  improvements: string[];
  insights: string;
  nextSteps: string[];
  fullText: string;
}

interface FeedbackMetadata {
  generatedAt: string;
  tokensUsed: number;
  responseTime: number;
  usedCache: boolean;
  modelUsed: string;
  cost?: string;
}

interface PersonalizedFeedbackProps {
  quizId: string;
  autoLoad?: boolean; // Whether to auto-load feedback on component mount
}

export function PersonalizedFeedback({ quizId, autoLoad = false }: PersonalizedFeedbackProps) {
  const [feedback, setFeedback] = useState<FeedbackData | null>(null);
  const [metadata, setMetadata] = useState<FeedbackMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);

  // Auto-load feedback if enabled
  useEffect(() => {
    if (autoLoad) {
      loadExistingFeedback();
    }
  }, [quizId, autoLoad]);

  /**
   * Try to load existing feedback first (GET)
   * If autoLoad is enabled and no feedback exists, generate it automatically
   */
  const loadExistingFeedback = async () => {
    try {
      const response = await fetch(`/api/quiz/${quizId}/feedback`);

      if (response.ok) {
        const data = await response.json();
        console.log('Loaded existing feedback data:', data.feedback);
        console.log('Strengths:', data.feedback?.strengths);
        console.log('Improvements:', data.feedback?.improvements);
        console.log('NextSteps:', data.feedback?.nextSteps);
        setFeedback(data.feedback);
        setMetadata(data.metadata);
      } else if (response.status === 404) {
        // No existing feedback found - if autoLoad is enabled, generate new feedback
        if (autoLoad) {
          await generateFeedback();
        }
      }
    } catch (err) {
      console.error('Error loading existing feedback:', err);
      // Don't show error for missing feedback
    }
  };

  /**
   * Generate new feedback (POST)
   */
  const generateFeedback = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/quiz/${quizId}/feedback`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || 'Failed to generate feedback');
      }

      const data = await response.json();
      console.log('Parsed feedback data:', data.feedback);
      console.log('Strengths:', data.feedback?.strengths);
      console.log('Improvements:', data.feedback?.improvements);
      console.log('NextSteps:', data.feedback?.nextSteps);
      setFeedback(data.feedback);
      setMetadata(data.metadata);
      setExpanded(true);
    } catch (err: any) {
      console.error('Error generating feedback:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Regenerate feedback (clear cache and generate new)
   */
  const regenerateFeedback = async () => {
    setFeedback(null);
    setMetadata(null);
    await generateFeedback();
  };

  // If no feedback loaded and not auto-loading, show generate button (only if autoLoad is false)
  if (!feedback && !loading && !autoLoad) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI-Powered Personalized Feedback
          </CardTitle>
          <CardDescription>
            Get personalized insights about your performance, strengths, and areas for improvement
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={generateFeedback} disabled={loading} size="lg" className="w-full">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating Insights...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Personalized Feedback
              </>
            )}
          </Button>
          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  }

  // Loading state
  if (loading && !feedback) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI-Powered Personalized Feedback
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">Analyzing your performance...</p>
            <p className="text-sm text-muted-foreground">This may take a few seconds</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Feedback display
  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Personalized Feedback
              {metadata?.usedCache && (
                <span className="text-xs font-normal text-muted-foreground px-2 py-1 bg-muted rounded">
                  Cached
                </span>
              )}
            </CardTitle>
            <CardDescription>
              AI-powered insights based on your performance and learning trajectory
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setExpanded(!expanded)}
              aria-label={expanded ? 'Collapse' : 'Expand'}
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={regenerateFeedback}
              disabled={loading}
              aria-label="Regenerate feedback"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && feedback && (
        <CardContent className="space-y-6">
          {/* Performance Summary */}
          {feedback.summary && (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <h3 className="text-lg font-semibold mb-2">Performance Summary</h3>
              <p className="text-muted-foreground leading-relaxed">{feedback.summary}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Key Strengths */}
            {feedback.strengths && feedback.strengths.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <span className="text-green-600 dark:text-green-400">✓</span>
                  Key Strengths
                </h3>
                <ul className="space-y-2">
                  {feedback.strengths.map((strength, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30"
                    >
                      <span className="text-green-600 dark:text-green-400 mt-0.5">•</span>
                      <span className="text-sm text-foreground flex-1">{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Growth Opportunities */}
            {feedback.improvements && feedback.improvements.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <span className="text-amber-600 dark:text-amber-400">↑</span>
                  Growth Opportunities
                </h3>
                <ul className="space-y-2">
                  {feedback.improvements.map((improvement, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30"
                    >
                      <span className="text-amber-600 dark:text-amber-400 mt-0.5">•</span>
                      <span className="text-sm text-foreground flex-1">{improvement}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Recommended Next Steps */}
          {feedback.nextSteps && feedback.nextSteps.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <span className="text-primary">→</span>
                Recommended Next Steps
              </h3>
              <ul className="space-y-2">
                {feedback.nextSteps.map((step, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20"
                  >
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                      {index + 1}
                    </span>
                    <span className="text-sm text-foreground flex-1 pt-0.5">{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      )}

      {error && (
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      )}
    </Card>
  );
}
