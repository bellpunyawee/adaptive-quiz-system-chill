'use client';

import { useState } from 'react';
import { CheckCircle, XCircle, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface QuestionReviewCardProps {
  questionNumber: number;
  questionText: string;
  topic: string;
  difficulty: number;
  allOptions: { id: string; text: string; isCorrect: boolean }[];
  userAnswerId: string | null;
  correctAnswerId: string;
  isCorrect: boolean;
  explanation: string | null;
  responseTime?: number | null;
  hideExplanation?: boolean;
}

export function QuestionReviewCard({
  questionNumber,
  questionText,
  topic,
  difficulty,
  allOptions,
  userAnswerId,
  correctAnswerId,
  isCorrect,
  explanation,
  responseTime,
  hideExplanation = false,
}: QuestionReviewCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Get difficulty label
  const getDifficultyLabel = (diff: number) => {
    if (diff < -1) return { label: 'Easy', color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' };
    if (diff < 1) return { label: 'Medium', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' };
    return { label: 'Hard', color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' };
  };

  const difficultyInfo = getDifficultyLabel(difficulty);

  return (
    <Card className={`transition-all duration-200 ${isCorrect ? 'border-green-200 dark:border-green-900' : 'border-red-200 dark:border-red-900'}`}>
      <CardContent className="p-0">
        {/* Header - Always Visible */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full p-4 flex items-start gap-3 hover:bg-muted/50 transition-colors text-left"
        >
          {/* Correct/Incorrect Icon */}
          <div className="flex-shrink-0 mt-0.5">
            {isCorrect ? (
              <CheckCircle className="h-6 w-6 text-green-600" />
            ) : (
              <XCircle className="h-6 w-6 text-red-600" />
            )}
          </div>

          {/* Question Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h4 className="font-semibold text-base">
                Question {questionNumber}
              </h4>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge variant="outline" className="text-xs">
                  {topic}
                </Badge>
                <Badge className={`text-xs ${difficultyInfo.color}`}>
                  {difficultyInfo.label}
                </Badge>
              </div>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {questionText}
            </p>
          </div>

          {/* Expand Icon */}
          <div className="flex-shrink-0 mt-0.5">
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </button>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="px-4 pb-4 space-y-4 border-t">
            {/* Full Question */}
            <div className="pt-4">
              <p className="text-sm font-medium text-muted-foreground mb-2">Question:</p>
              <p className="text-base">{questionText}</p>
            </div>

            {/* All Answer Options */}
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Answer Options:</p>
              <div className="space-y-2">
                {allOptions.map((option) => {
                  const isUserAnswer = option.id === userAnswerId;
                  const isCorrectOption = option.id === correctAnswerId;

                  return (
                    <div
                      key={option.id}
                      className={`p-3 rounded-lg border-2 ${
                        isCorrectOption
                          ? 'bg-green-50 dark:bg-green-950/30 border-green-300 dark:border-green-800'
                          : isUserAnswer
                          ? 'bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-800'
                          : 'bg-muted/30 border-transparent'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {isCorrectOption && (
                          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        )}
                        {isUserAnswer && !isCorrectOption && (
                          <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <p className="text-sm">{option.text}</p>
                          {isUserAnswer && (
                            <p className="text-xs text-muted-foreground mt-1">Your answer</p>
                          )}
                          {isCorrectOption && (
                            <p className="text-xs text-green-700 dark:text-green-400 mt-1 font-medium">
                              Correct answer
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Explanation - Enhanced */}
            {explanation && !hideExplanation && (
              <div className="bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-300 dark:border-blue-800 rounded-lg p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500 dark:bg-blue-600 flex-shrink-0 mt-0.5">
                    <Info className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-base font-semibold text-blue-900 dark:text-blue-200 mb-2">
                      💡 Explanation
                    </p>
                    <p className="text-base leading-relaxed text-blue-900 dark:text-blue-300">
                      {explanation}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
              <span>Difficulty: {difficulty.toFixed(2)}</span>
              {responseTime && (
                <span>Response time: {(responseTime / 1000).toFixed(1)}s</span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
