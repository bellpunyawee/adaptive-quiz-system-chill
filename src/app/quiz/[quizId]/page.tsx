'use client'; // This directive is crucial!

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useStopwatch } from '@/hooks/use-stopwatch'; // Import the new hook
import { Progress } from '@/components/ui/progress';   // Import the Progress component

// Define the TypeScript types for our component's state
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

export default function QuizPage({ params: paramsPromise }: { params: Promise<{ quizId: string }> }) {
  // Use the React 'use' hook to unwrap the Promise
  const params = use(paramsPromise);
  
  const [question, setQuestion] = useState<Question | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [quizStatus, setQuizStatus] = useState<QuizStatus>('loading');
  const { time, stopTimer } = useStopwatch();
  const [progress, setProgress] = useState(0);

  // --- Data Fetching and State Management ---

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
        stopTimer(); // Stop the timer when the quiz is done
      } else {
        setQuestion(data.question);
        setQuizStatus('in-progress');
        // Update progress when a new question is fetched
        setProgress((data.question.answeredCount / data.question.totalQuestions) * 100);
      }
    } catch (error) {
      console.error(error);
      setQuizStatus('error');
    }
  };

  useEffect(() => {
    // It's safe to call this here because 'use' resolves before the effect runs
    fetchNextQuestion();
  }, [params.quizId]); // Add params.quizId as a dependency to be explicit

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
    } catch (error) {
        console.error(error);
        // Optionally, show an error message to the user
    }
  };

  // --- Rendering Logic ---

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
            {/* THIS IS THE CHANGE */}
            <div className="flex justify-center gap-4">
              <Button asChild><Link href="/dashboard">Return to Dashboard</Link></Button>
              <Button variant="outline" asChild><Link href={`/quiz/results/${params.quizId}`}>View Results</Link></Button>
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
     )
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-muted/40">
      <div className="w-full max-w-2xl mb-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-semibold">Adaptive Quiz</h2>
          <div className="text-sm font-mono p-1.5 bg-muted rounded-md">{time}</div>
        </div>
        <Progress value={progress} className="w-full" />
      </div>
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Question {question ? question.answeredCount + 1 : '...'}</CardTitle>
          <CardDescription className="pt-2">{question?.text}</CardDescription>
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
                    ${feedback && option.id === feedback.correctOptionId ? 'border-green-500 bg-green-100/50' : ''}
                    ${feedback && option.id !== feedback.correctOptionId && option.id === selectedOption ? 'border-red-500 bg-red-100/50' : ''}
                  `}
                >
                  <RadioGroupItem value={option.id} id={option.id} />
                  <span>{option.text}</span>
                </Label>
              ))}
            </RadioGroup>
            <div className="mt-6 flex justify-end">
              {!feedback ? (
                <Button type="submit" disabled={!selectedOption}>Submit Answer</Button>
              ) : (
                <Button onClick={fetchNextQuestion}>Next Question</Button>
              )}
            </div>
          </form>

          {feedback && (
            <div className={`mt-4 p-4 rounded-md border ${feedback.isCorrect ? 'bg-green-100/50 border-green-500/50 text-green-900' : 'bg-red-100/50 border-red-500/50 text-red-900'}`}>
              <div className="flex items-center gap-2 font-bold">
                {feedback.isCorrect ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                <span>{feedback.isCorrect ? 'Correct!' : 'Incorrect'}</span>
              </div>
              <p className="mt-2 text-sm">{feedback.explanation}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}