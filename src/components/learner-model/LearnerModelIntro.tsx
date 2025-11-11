'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function LearnerModelIntro() {
  const [isMainExpanded, setIsMainExpanded] = useState(false);
  const [isDetailExpanded, setIsDetailExpanded] = useState(false);

  return (
    <Card className="border-2 border-black bg-white">
      <CardHeader
        className="cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsMainExpanded(!isMainExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-black" />
            <CardTitle className="text-black">Understanding Your Learner Model</CardTitle>
          </div>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            {isMainExpanded ? (
              <ChevronUp className="h-5 w-5 text-gray-600" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-600" />
            )}
          </Button>
        </div>
        <CardDescription className="text-gray-600">
          {isMainExpanded
            ? 'This dashboard shows psychometric ability estimates using Item Response Theory (IRT)'
            : 'Click to learn about IRT and how your ability is measured'
          }
        </CardDescription>
      </CardHeader>

      {isMainExpanded && (
        <CardContent>
          <div className="space-y-4">
            {/* Key Concepts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border-2 border-gray-300 bg-gray-50">
              <p className="font-bold text-black mb-1">θ (Theta)</p>
              <p className="text-sm text-gray-700">
                Your latent ability estimate on a scale from -3 to +3
              </p>
            </div>
            <div className="p-4 border-2 border-gray-300 bg-gray-50">
              <p className="font-bold text-black mb-1">Mastery Level</p>
              <p className="text-sm text-gray-700">
                Classification based on θ: Beginner, Intermediate, Advanced, or Mastered
              </p>
            </div>
            <div className="p-4 border-2 border-gray-300 bg-gray-50">
              <p className="font-bold text-black mb-1">Confidence</p>
              <p className="text-sm text-gray-700">
                How certain we are about your θ estimate (0-100%)
              </p>
            </div>
          </div>

          {/* Key Difference - Always Visible */}
          <div className="p-4 border-2 border-black bg-white">
            <p className="font-semibold text-black mb-2">
              IRT vs Simple Accuracy
            </p>
            <p className="text-sm text-gray-700">
              Unlike simple quiz accuracy, IRT accounts for <strong>question difficulty</strong> and your{' '}
              <strong>response patterns</strong>. You might have 65% accuracy but "Mastered" status because
              you're attempting very difficult questions.
            </p>
          </div>

          {/* Expandable Details */}
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setIsDetailExpanded(!isDetailExpanded);
              }}
              className="w-full justify-between text-gray-700 hover:text-black hover:bg-gray-100"
            >
              <span>{isDetailExpanded ? 'Show Less' : 'Learn More About IRT'}</span>
              {isDetailExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>

            {isDetailExpanded && (
              <div className="mt-4 space-y-4 border-l-4 border-gray-300 pl-4">
                <div>
                  <p className="font-semibold text-black mb-1">What is Item Response Theory?</p>
                  <p className="text-sm text-gray-700">
                    IRT is a psychometric framework used in standardized testing (GRE, SAT, etc.) that
                    estimates your true ability by analyzing how you respond to questions of varying
                    difficulty.
                  </p>
                </div>

                <div>
                  <p className="font-semibold text-black mb-1">How θ (Theta) Works</p>
                  <p className="text-sm text-gray-700 mb-2">
                    Theta represents your ability on a standardized scale:
                  </p>
                  <div className="bg-gray-50 border border-gray-300 p-3 text-xs font-mono">
                    <div className="flex justify-between mb-1">
                      <span>-3.0 to -0.5</span>
                      <span className="font-bold">Beginner</span>
                    </div>
                    <div className="flex justify-between mb-1">
                      <span>-0.5 to +1.0</span>
                      <span className="font-bold">Intermediate</span>
                    </div>
                    <div className="flex justify-between mb-1">
                      <span>+1.0 to +1.5</span>
                      <span className="font-bold">Advanced</span>
                    </div>
                    <div className="flex justify-between">
                      <span>+1.5 to +3.0</span>
                      <span className="font-bold">Mastered</span>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="font-semibold text-black mb-1">Example Scenario</p>
                  <div className="bg-gray-50 border border-gray-300 p-3">
                    <p className="text-sm text-gray-700 mb-2">
                      <strong>Student A:</strong> 85% accuracy on easy questions → θ = 0.3 (Intermediate)
                    </p>
                    <p className="text-sm text-gray-700">
                      <strong>Student B:</strong> 65% accuracy on hard questions → θ = 1.6 (Mastered)
                    </p>
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    IRT recognizes that Student B has higher ability despite lower accuracy.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
      )}
    </Card>
  );
}
