'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Zap, Clock, ListOrdered, TrendingUp, Settings as SettingsIcon, Lightbulb } from 'lucide-react';
import { startNewQuiz } from '@/app/actions';

export function QuizStartDialog() {
  const [open, setOpen] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const handleStartQuiz = async () => {
    setIsStarting(true);
    try {
      await startNewQuiz();
    } catch (error) {
      setIsStarting(false);
      console.error('Error starting quiz:', error);
    }
  };

  return (
    <>
      <Button
        type="button"
        size="lg"
        onClick={() => setOpen(true)}
      >
        <Zap className="w-4 h-4 mr-2" />
        Start Quiz
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-xl">
              <Zap className="w-5 h-5" />
              Ready to Start Your Quiz?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p className="text-foreground">Your quiz will include:</p>

                <div className="space-y-3 bg-muted p-4 rounded-md">
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-foreground">Time Limit</p>
                      <p className="text-sm">No time limit - take your time!</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <ListOrdered className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-foreground">Number of Questions</p>
                      <p className="text-sm">5 questions</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        (About 5-10 minutes)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <TrendingUp className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-foreground">Question Selection</p>
                      <p className="text-sm">Balanced approach</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Mix of review and new topics
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2 text-sm bg-amber-50 dark:bg-amber-950/20 p-3 rounded-md border border-amber-200 dark:border-amber-800">
                  <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                  <div className="text-amber-900 dark:text-amber-100 space-y-1">
                    <p className="font-medium">First time?</p>
                    <ul className="text-xs space-y-0.5 pl-4">
                      <li>• Read each question carefully</li>
                      <li>• No time pressure - think it through</li>
                      <li>• Learn from the explanations after each answer</li>
                    </ul>
                  </div>
                </div>

                <div className="flex items-start gap-2 text-sm bg-blue-50 dark:bg-blue-950/20 p-3 rounded-md border border-blue-200 dark:border-blue-800">
                  <SettingsIcon className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <p className="text-blue-900 dark:text-blue-100">
                    Want to customize? Visit <span className="font-medium">Quiz Settings</span> after your first quiz.
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isStarting}>Maybe Later</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleStartQuiz}
              disabled={isStarting}
            >
              {isStarting ? 'Starting...' : 'Start Quiz!'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
