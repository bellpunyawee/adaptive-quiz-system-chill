'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Info,
  Lightbulb,
  TrendingUp,
  CheckCircle2,
  Brain,
  Target,
  BookOpen,
} from 'lucide-react';

export function HowItWorksDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Info className="h-4 w-4" />
          How It Works
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Brain className="h-6 w-6 text-primary" />
            Adaptive Learning Explained
          </DialogTitle>
          <DialogDescription>
            Learn how the quiz system personalizes your learning experience
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="how-to-use">How to Use</TabsTrigger>
            <TabsTrigger value="tips">Tips</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  What is an Adaptive Quiz?
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  An adaptive quiz adjusts question difficulty based on your performance,
                  similar to a personal tutor who:
                </p>
              </div>

              <div className="grid gap-3 pl-4">
                <div className="flex gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Starts at your level</p>
                    <p className="text-sm text-muted-foreground">
                      Not too easy, not too hard - just right for you
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Challenges you when you're doing well</p>
                    <p className="text-sm text-muted-foreground">
                      Gradually increases difficulty to keep you learning
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Provides review when you're struggling</p>
                    <p className="text-sm text-muted-foreground">
                      Offers easier questions to build confidence
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Focuses on topics that need attention</p>
                    <p className="text-sm text-muted-foreground">
                      Identifies weak areas and provides targeted practice
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  <strong>Why it works:</strong> This personalized approach helps you learn more
                  efficiently than traditional fixed-difficulty quizzes. You spend time on what
                  you need, not on what you already know.
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="how-to-use" className="space-y-4 mt-4">
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  Getting Started
                </h3>

                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                      1
                    </div>
                    <div>
                      <p className="font-medium mb-1">Start a Quiz</p>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Click the "Start Quiz" button on your dashboard</li>
                        <li>• Default settings: 5 questions, no time limit</li>
                        <li>• Customize in Settings if desired</li>
                      </ul>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                      2
                    </div>
                    <div>
                      <p className="font-medium mb-1">Answer Questions</p>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Read each question carefully - no time pressure</li>
                        <li>• Select the answer you think is correct</li>
                        <li>• Get immediate feedback after each answer</li>
                      </ul>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                      3
                    </div>
                    <div>
                      <p className="font-medium mb-1">Learn from Feedback</p>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Each question includes a detailed explanation</li>
                        <li>• Understand why your answer was right or wrong</li>
                        <li>• This is where real learning happens!</li>
                      </ul>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                      4
                    </div>
                    <div>
                      <p className="font-medium mb-1">Track Your Progress</p>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Dashboard shows performance by topic</li>
                        <li>• See which areas you've mastered</li>
                        <li>• Identify topics that need more practice</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="tips" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-yellow-600" />
                  Tips for Success
                </h3>

                <div className="space-y-3">
                  <div className="flex gap-3 p-3 bg-muted rounded-lg">
                    <TrendingUp className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Be Consistent</p>
                      <p className="text-sm text-muted-foreground">
                        Take quizzes regularly, even if just 5 questions at a time.
                        Consistent practice leads to better retention.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 p-3 bg-muted rounded-lg">
                    <BookOpen className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Read the Explanations</p>
                      <p className="text-sm text-muted-foreground">
                        Don't skip the explanations! They provide valuable context and
                        help reinforce your understanding.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 p-3 bg-muted rounded-lg">
                    <Target className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Review Your Mistakes</p>
                      <p className="text-sm text-muted-foreground">
                        Check your quiz history to identify patterns in the topics or
                        types of questions you find challenging.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 p-3 bg-muted rounded-lg">
                    <Brain className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Take Your Time</p>
                      <p className="text-sm text-muted-foreground">
                        There's no time limit (unless you set one). Think through each
                        question carefully before answering.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 p-3 bg-muted rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Trust the Process</p>
                      <p className="text-sm text-muted-foreground">
                        The system adapts to help you learn. Getting questions wrong is
                        normal and helps the system understand where to focus.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-sm text-green-900 dark:text-green-100 font-medium">
                  Remember: Making mistakes is part of learning! The system uses your
                  performance to personalize your experience and help you improve faster.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-6 flex justify-end">
          <Button onClick={() => setOpen(false)}>
            Got It!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
