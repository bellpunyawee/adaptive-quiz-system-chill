// src/app/quiz/[quizId]/page.tsx
'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CheckCircle, XCircle, Loader2, X, Clock, AlertTriangle, Home, ChevronRight } from 'lucide-react';
import { useStopwatch } from '@/hooks/use-stopwatch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Question {
  id: string;
  text: string;
  options: { id: string; text: string }[];
  totalQuestions: number;
  answeredCount: number;
}

interface Feedback {
  isCorrect: boolean;
  correctOptionId: string;
  explanation: string;
}

type QuizStatus = 'loading' | 'in-progress' | 'completed' | 'error';

interface AnswerHistory {
  questionNumber: number;
  isCorrect: boolean;
}

export default function QuizPage({ params: paramsPromise }: { params: Promise<{ quizId: string }> }) {
  const params = use(paramsPromise);
  const router = useRouter();
  
  const [question, setQuestion] = useState<Question | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [quizStatus, setQuizStatus] = useState<QuizStatus>('loading');
  const [answerHistory, setAnswerHistory] = useState<AnswerHistory[]>([]);
  const { time, stopTimer } = useStopwatch();

  const [timerLimit, setTimerLimit] = useState<number | null>(null);
  const [timeWarning, setTimeWarning] = useState(false);
  const [timeUp, setTimeUp] = useState(false);

  // Track when question was displayed for engagement metrics
  const [questionDisplayedAt, setQuestionDisplayedAt] = useState<number | null>(null);

  // Auto-redirect to results when quiz is completed
  useEffect(() => {
    if (quizStatus === 'completed') {
      const redirectTimer = setTimeout(() => {
        router.push(`/quiz/results/${params.quizId}`);
      }, 2000); // 2 second delay to show completion message

      return () => clearTimeout(redirectTimer);
    }
  }, [quizStatus, params.quizId, router]);

  useEffect(() => {
    async function fetchQuizSettings() {
      try {
        const response = await fetch(`/api/quiz/${params.quizId}/settings`);
        if (response.ok) {
          const { timerMinutes } = await response.json();
          if (timerMinutes) {
            setTimerLimit(timerMinutes);
          }
        }
      } catch (error) {
        console.error('Failed to fetch quiz settings:', error);
      }
    }
    fetchQuizSettings();
  }, [params.quizId]);

  useEffect(() => {
    if (timerLimit && time) {
      const [minutes, seconds] = time.split(':').map(Number);
      const totalMinutes = minutes + (seconds / 60);
      
      const warningThreshold = timerLimit * 0.8;
      if (totalMinutes >= warningThreshold && !timeWarning) {
        setTimeWarning(true);
      }
      
      if (totalMinutes >= timerLimit && !timeUp) {
        setTimeUp(true);
      }
    }
  }, [time, timerLimit, timeWarning, timeUp]);

  useEffect(() => {
    if (timeUp && selectedOption && !feedback) {
      handleSubmit(new Event('submit') as any);
    }
  }, [timeUp, selectedOption, feedback]);

  const fetchNextQuestion = async () => {
    setFeedback(null);
    setSelectedOption(null);
    setQuizStatus('loading');
    
    try {
      const res = await fetch(`/api/quiz/${params.quizId}`);
      if (!res.ok) throw new Error('Failed to fetch');
      
      const data = await res.json();
      
      if (data.status === 'completed') {
        setQuizStatus('completed');
        stopTimer();
      } else {
        setQuestion(data.question);
        setQuizStatus('in-progress');
        setTimeUp(false);
      }
    } catch (error) {
      console.error(error);
      setQuizStatus('error');
    }
  };

  useEffect(() => {
    fetchNextQuestion();
  }, [params.quizId]);

  // Capture timestamp when new question is displayed
  useEffect(() => {
    if (question && quizStatus === 'in-progress') {
      setQuestionDisplayedAt(Date.now());
    }
  }, [question?.id, quizStatus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOption || !question) return;

    // Calculate response time for engagement tracking
    const responseTime = questionDisplayedAt ? Date.now() - questionDisplayedAt : null;
    const displayedAt = questionDisplayedAt ? new Date(questionDisplayedAt).toISOString() : null;

    try {
      const res = await fetch(`/api/quiz/${params.quizId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: question.id,
          selectedOptionId: selectedOption,
          responseTime: responseTime, // Time in milliseconds
          questionDisplayedAt: displayedAt, // ISO timestamp
        }),
      });
      if (!res.ok) throw new Error('Failed to submit answer');

      const feedbackData = await res.json();
      setFeedback(feedbackData);
      
      setAnswerHistory([...answerHistory, {
        questionNumber: question.answeredCount + 1,
        isCorrect: feedbackData.isCorrect
      }]);
    } catch (error) {
      console.error(error);
    }
  };

  const handleAbort = async () => {
    try {
      await fetch(`/api/quiz/${params.quizId}/abort`, {
        method: 'POST',
      });
    } catch (error) {
      console.error('Failed to abort quiz:', error);
    } finally {
      router.push('/dashboard');
    }
  };

  if (quizStatus === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen animate-in fade-in duration-300">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading next question...</p>
      </div>
    );
  }
  
  if (quizStatus === 'completed') {
    return (
      <div className="flex items-center justify-center min-h-screen animate-in fade-in duration-300">
        <Card className="w-full max-w-lg text-center p-6">
          <CardHeader>
            <CardTitle className="text-2xl">Quiz Complete!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-center">
              <CheckCircle className="h-16 w-16 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-muted-foreground">You have completed the assessment.</p>
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <p className="text-sm font-medium">Generating personalized feedback...</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Redirecting to results page shortly
              </p>
            </div>
            <div className="flex justify-center gap-4 pt-2">
              <Button asChild variant="outline">
                <Link href="/dashboard">Return to Dashboard</Link>
              </Button>
              <Button asChild>
                <Link href={`/quiz/results/${params.quizId}`}>View Results Now</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (quizStatus === 'error') {
    return (
      <div className="flex items-center justify-center min-h-screen text-center">
        <p className="text-red-500">An error occurred. Please try refreshing the page.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/40 animate-in fade-in duration-300">
      <div className="container mx-auto max-w-4xl p-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Home className="h-4 w-4" />
          <ChevronRight className="h-4 w-4" />
          <Link href="/dashboard" className="hover:text-foreground transition-colors">
            Dashboard
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="font-medium text-foreground">Quiz</span>
        </nav>

        {/* Header with timer and abort button */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">Adaptive Quiz</h1>
            <div className={`flex items-center gap-2 text-sm transition-colors ${
              timeWarning ? 'text-orange-600 font-bold' : 
              timeUp ? 'text-red-600 font-bold' : 
              'text-muted-foreground'
            }`}>
              <Clock className={`h-4 w-4 ${timeUp ? 'animate-pulse' : ''}`} />
              <span className="font-mono">
                {time}
                {timerLimit && ` / ${timerLimit}:00`}
              </span>
              {timeWarning && !timeUp && (
                <AlertTriangle className="h-4 w-4 text-orange-600" />
              )}
            </div>
          </div>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <X className="h-4 w-4 mr-2" />
                Abort Quiz
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure you want to abort?</AlertDialogTitle>
                <AlertDialogDescription>
                  Your progress will not be saved. You'll need to start over if you want to complete this quiz.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Continue Quiz</AlertDialogCancel>
                <AlertDialogAction onClick={handleAbort} className="bg-destructive hover:bg-destructive/90">
                  Yes, Abort Quiz
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Time Up Warning */}
        {timeUp && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg animate-in slide-in-from-top duration-300">
            <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
              <AlertTriangle className="h-5 w-5" />
              <p className="font-semibold">Time's up! Please submit your answer or move to the next question.</p>
            </div>
          </div>
        )}

        {/* Progress indicator */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              Question {question ? question.answeredCount + 1 : '...'} of {question?.totalQuestions || '...'}
            </span>
            <span className="text-sm text-muted-foreground">
              {answerHistory.length > 0 && (
                <span>
                  {answerHistory.filter((a) => a.isCorrect).length} / {answerHistory.length} correct
                </span>
              )}
            </span>
          </div>
          
          <div className="flex gap-1.5 flex-wrap">
            {Array.from({ length: question?.totalQuestions || 0 }).map((_, index) => {
              const answer = answerHistory.find((a) => a.questionNumber === index + 1);
              const isCurrent = index === (question?.answeredCount || 0);
              
              return (
                <div
                  key={index}
                  className={`h-2 flex-1 min-w-[8px] rounded-full transition-all duration-300 ${
                    answer
                      ? answer.isCorrect
                        ? 'bg-green-500'
                        : 'bg-red-500'
                      : isCurrent
                      ? 'bg-primary animate-pulse'
                      : 'bg-muted'
                  }`}
                />
              );
            })}
          </div>
        </div>

        {/* Question card */}
        <Card className="transition-all hover:shadow-md">
          <CardHeader>
            <CardTitle>Question {question ? question.answeredCount + 1 : '...'}</CardTitle>
            <CardDescription className="pt-2 text-base leading-relaxed">
              {question?.text}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <RadioGroup
                value={selectedOption ?? ""}
                onValueChange={setSelectedOption}
                disabled={!!feedback}
                className="space-y-3"
              >
                {question?.options.map((option) => (
                  <Label
                    key={option.id}
                    htmlFor={option.id}
                    className={`flex items-center space-x-3 p-4 border rounded-md cursor-pointer transition-all ${
                      feedback && option.id === feedback.correctOptionId
                        ? 'border-green-500 bg-green-50 dark:bg-green-950'
                        : feedback && option.id === selectedOption && !feedback.isCorrect
                        ? 'border-red-500 bg-red-50 dark:bg-red-950'
                        : !feedback
                        ? 'hover:bg-accent'
                        : ''
                      }
                      ${feedback ? 'cursor-default' : ''}
                    `}
                  >
                    <RadioGroupItem value={option.id} id={option.id} />
                    <span className="flex-1">{option.text}</span>
                    {feedback && option.id === feedback.correctOptionId && (
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                    )}
                    {feedback && option.id === selectedOption && !feedback.isCorrect && (
                      <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                    )}
                  </Label>
                ))}
              </RadioGroup>

              {feedback && (
                <div className={`mt-4 p-4 rounded-md animate-in slide-in-from-top duration-300 ${
                  feedback.isCorrect 
                    ? 'bg-green-50 border border-green-200 dark:bg-green-950 dark:border-green-800' 
                    : 'bg-red-50 border border-red-200 dark:bg-red-950 dark:border-red-800'
                }`}>
                  <p className={`font-semibold mb-2 ${
                    feedback.isCorrect ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'
                  }`}>
                    {feedback.isCorrect ? '✓ Correct!' : '✗ Incorrect'}
                  </p>
                  {feedback.explanation && (
                    <p className="text-sm text-muted-foreground">{feedback.explanation}</p>
                  )}
                </div>
              )}

              <div className="mt-6 flex gap-3">
                {!feedback ? (
                  <Button type="submit" disabled={!selectedOption} className="flex-1 transition-all">
                    Submit Answer
                  </Button>
                ) : (
                  <Button type="button" onClick={fetchNextQuestion} className="flex-1 transition-all">
                    Next Question →
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}