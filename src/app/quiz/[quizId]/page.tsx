'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CheckCircle, XCircle, Loader2, X, Clock, AlertTriangle } from 'lucide-react';
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

  // ===== TIMER FUNCTIONALITY =====
  const [timerLimit, setTimerLimit] = useState<number | null>(null);
  const [timeWarning, setTimeWarning] = useState(false);
  const [timeUp, setTimeUp] = useState(false);

  // Fetch quiz settings on mount
  useEffect(() => {
    async function fetchQuizSettings() {
      try {
        const response = await fetch(`/api/quiz/${params.quizId}/settings`);
        if (response.ok) {
          const { timerMinutes } = await response.json();
          if (timerMinutes) {
            setTimerLimit(timerMinutes);
            console.log(`[TIMER] Limit set to ${timerMinutes} minutes`);
          }
        }
      } catch (error) {
        console.error('Failed to fetch quiz settings:', error);
      }
    }
    fetchQuizSettings();
  }, [params.quizId]);

  // Monitor timer against limit
  useEffect(() => {
    if (timerLimit && time) {
      const [minutes, seconds] = time.split(':').map(Number);
      const totalMinutes = minutes + (seconds / 60);
      
      // Warning at 80% of time limit
      const warningThreshold = timerLimit * 0.8;
      if (totalMinutes >= warningThreshold && !timeWarning) {
        setTimeWarning(true);
        console.log(`[TIMER] Warning threshold reached`);
      }
      
      // Time's up!
      if (totalMinutes >= timerLimit && !timeUp) {
        setTimeUp(true);
        console.log(`[TIMER] Time limit reached!`);
      }
    }
  }, [time, timerLimit, timeWarning, timeUp]);

  // Auto-submit when time's up (if an answer is selected)
  useEffect(() => {
    if (timeUp && selectedOption && !feedback) {
      console.log(`[TIMER] Auto-submitting due to time limit`);
      handleSubmit(new Event('submit') as any);
    }
  }, [timeUp, selectedOption, feedback]);

  // ===== END TIMER FUNCTIONALITY =====

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
        setTimeUp(false); // Reset time up flag for new question
      }
    } catch (error) {
      console.error(error);
      setQuizStatus('error');
    }
  };

  useEffect(() => {
    fetchNextQuestion();
  }, [params.quizId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOption || !question) return;

    try {
      const res = await fetch(`/api/quiz/${params.quizId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: question.id,
          selectedOptionId: selectedOption,
        }),
      });
      if (!res.ok) throw new Error('Failed to submit answer');

      const feedbackData = await res.json();
      setFeedback(feedbackData);
      
      // Add to answer history
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
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading next question...</p>
      </div>
    );
  }
  
  if (quizStatus === 'completed') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-lg text-center p-6">
          <CardHeader>
            <CardTitle className="text-2xl">Quiz Complete!</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-6 text-muted-foreground">You have completed the assessment.</p>
            <div className="flex justify-center gap-4">
              <Button asChild><Link href="/dashboard">Return to Dashboard</Link></Button>
              <Button variant="outline" asChild>
                <Link href={`/quiz/results/${params.quizId}`}>View Results</Link>
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
    <div className="min-h-screen p-4 bg-muted/40">
      <div className="container mx-auto max-w-4xl">
        {/* Header with timer and abort button */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">Adaptive Quiz</h1>
            <div className={`flex items-center gap-2 text-sm ${
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

        {/* Time Up Warning Banner */}
        {timeUp && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
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
          
          {/* Dot progress bar */}
          <div className="flex gap-1.5 flex-wrap">
            {Array.from({ length: question?.totalQuestions || 0 }).map((_, index) => {
              const answer = answerHistory.find((a) => a.questionNumber === index + 1);
              const isCurrent = index === (question?.answeredCount || 0);
              
              return (
                <div
                  key={index}
                  className={`h-2 flex-1 min-w-[8px] rounded-full transition-all ${
                    answer
                      ? answer.isCorrect
                        ? 'bg-green-500'
                        : 'bg-red-500'
                      : isCurrent
                      ? 'bg-primary animate-pulse'
                      : 'bg-muted'
                  }`}
                  title={
                    answer
                      ? `Question ${index + 1}: ${answer.isCorrect ? 'Correct' : 'Incorrect'}`
                      : isCurrent
                      ? 'Current question'
                      : 'Not yet answered'
                  }
                />
              );
            })}
          </div>
        </div>

        {/* Question card */}
        <Card>
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
                    className={`flex items-center space-x-3 p-4 border rounded-md cursor-pointer transition-colors
                      ${feedback && option.id === feedback.correctOptionId
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
                <div className={`mt-4 p-4 rounded-md ${
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
                  <Button type="submit" disabled={!selectedOption} className="flex-1">
                    Submit Answer
                  </Button>
                ) : (
                  <Button type="button" onClick={fetchNextQuestion} className="flex-1">
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