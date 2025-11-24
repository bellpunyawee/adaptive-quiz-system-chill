'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function LearnerModelIntro() {
  const [isMainExpanded, setIsMainExpanded] = useState(false);
  const [isDetailExpanded, setIsDetailExpanded] = useState(false);

  return (
    <Card className="border-2 border-black bg-white shadow-lg">
      <CardHeader
        className="cursor-pointer hover:bg-gray-50 transition-colors p-6"
        onClick={() => setIsMainExpanded(!isMainExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="h-6 w-6 text-black" />
            <CardTitle className="text-black text-2xl">Understanding Your Learner Model</CardTitle>
          </div>
          <Button variant="ghost" size="sm" className="h-10 w-10 p-0">
            {isMainExpanded ? (
              <ChevronUp className="h-6 w-6 text-gray-600" />
            ) : (
              <ChevronDown className="h-6 w-6 text-gray-600" />
            )}
          </Button>
        </div>
        <CardDescription className="text-gray-600 text-base mt-2">
          {isMainExpanded
            ? 'This dashboard shows psychometric ability estimates using Item Response Theory (IRT) and adaptive algorithms'
            : 'Click to learn about IRT, adaptive question selection, and how your ability is measured'
          }
        </CardDescription>
      </CardHeader>

      {isMainExpanded && (
        <CardContent>
          <div className="space-y-4">
            {/* Key Concepts - Expanded */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 border-2 border-gray-300 bg-gray-50 rounded-lg shadow-sm">
              <p className="font-bold text-black mb-2 text-lg">θ (Theta)</p>
              <p className="text-base text-gray-700 leading-relaxed">
                Your latent ability estimate on a scale from -3 to +3
              </p>
            </div>
            <div className="p-6 border-2 border-gray-300 bg-gray-50 rounded-lg shadow-sm">
              <p className="font-bold text-black mb-2 text-lg">Mastery Level</p>
              <p className="text-base text-gray-700 leading-relaxed">
                Classification based on θ: Beginner, Intermediate, Advanced, or Mastered
              </p>
            </div>
            <div className="p-6 border-2 border-gray-300 bg-gray-50 rounded-lg shadow-sm">
              <p className="font-bold text-black mb-2 text-lg">Confidence</p>
              <p className="text-base text-gray-700 leading-relaxed">
                How certain we are about your θ estimate (0-100%)
              </p>
            </div>
          </div>

          {/* Key Difference - Always Visible - Expanded */}
          <div className="p-6 border-2 border-black bg-white rounded-lg shadow-md">
            <p className="font-semibold text-black mb-3 text-xl">
              IRT vs Simple Accuracy
            </p>
            <p className="text-base text-gray-700 leading-relaxed">
              Unlike simple quiz accuracy, IRT accounts for <strong>question difficulty</strong> and your{' '}
              <strong>response patterns</strong>. You might have 65% accuracy but "Mastered" status because
              you're attempting very difficult questions.
            </p>
          </div>

          {/* Adaptive Question Selection */}
          <div className="p-6 border-2 border-blue-300 bg-blue-50 rounded-lg shadow-md">
            <p className="font-semibold text-black mb-3 text-xl">
              🎯 Adaptive Question Selection
            </p>
            <div className="space-y-3">
              <p className="text-base text-gray-700 leading-relaxed">
                Our system uses advanced algorithms to select the most informative questions for you:
              </p>
              <div className="ml-4 space-y-3">
                <div className="p-4 bg-white border border-blue-200 rounded-md">
                  <p className="font-semibold text-black mb-2 text-base">
                    IRT-UCB (Item Response Theory + Upper Confidence Bound)
                  </p>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    Selects questions matching your ability level while exploring your knowledge boundaries.
                    Balances between testing what you know and discovering your limits.
                  </p>
                </div>
                <div className="p-4 bg-white border border-blue-200 rounded-md">
                  <p className="font-semibold text-black mb-2 text-base">
                    Contextual Bandit (LinUCB) - Advanced Personalization
                  </p>
                  <p className="text-sm text-gray-700 leading-relaxed mb-2">
                    When enabled by your instructor, this AI-powered algorithm learns your unique learning patterns
                    to select truly personalized questions based on:
                  </p>
                  <ul className="text-sm text-gray-700 space-y-1 ml-4 list-disc">
                    <li>Your current ability (θ) and confidence level</li>
                    <li>Topic-specific mastery and accuracy</li>
                    <li>Question characteristics (difficulty, discrimination)</li>
                    <li>Recent performance patterns and response speed</li>
                  </ul>
                  <p className="text-xs text-gray-600 mt-2 italic">
                    Note: The system adapts to you individually, not just universally "good" questions.
                  </p>
                </div>
                <div className="p-4 bg-white border border-blue-200 rounded-md">
                  <p className="font-semibold text-black mb-2 text-base">
                    Sympson-Hetter Exposure Control
                  </p>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    Prevents over-using the same questions to ensure fair and varied assessment.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Expandable Details */}
          <div>
            <Button
              variant="ghost"
              size="lg"
              onClick={(e) => {
                e.stopPropagation();
                setIsDetailExpanded(!isDetailExpanded);
              }}
              className="w-full justify-between text-gray-700 hover:text-black hover:bg-gray-100 text-base py-6"
            >
              <span className="font-semibold">{isDetailExpanded ? 'Show Less' : 'Learn More About IRT & Technical Details'}</span>
              {isDetailExpanded ? (
                <ChevronUp className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
            </Button>

            {isDetailExpanded && (
              <div className="mt-6 space-y-6 border-l-4 border-gray-400 pl-6">
                <div className="p-5 bg-gray-50 rounded-lg border border-gray-300">
                  <p className="font-semibold text-black mb-3 text-lg">What is Item Response Theory?</p>
                  <p className="text-base text-gray-700 leading-relaxed">
                    IRT is a psychometric framework used in standardized testing (GRE, SAT, etc.) that
                    estimates your true ability by analyzing how you respond to questions of varying
                    difficulty. Unlike percentage scores, IRT provides a more accurate measure of your actual knowledge.
                  </p>
                </div>

                <div className="p-5 bg-gray-50 rounded-lg border border-gray-300">
                  <p className="font-semibold text-black mb-3 text-lg">How θ (Theta) Works</p>
                  <p className="text-base text-gray-700 mb-4 leading-relaxed">
                    Theta represents your ability on a standardized scale:
                  </p>
                  <div className="bg-white border-2 border-gray-400 p-5 rounded-md shadow-sm">
                    <div className="flex justify-between mb-3 pb-2 border-b border-gray-300">
                      <span className="text-base font-mono">-3.0 to -0.5</span>
                      <span className="font-bold text-base text-red-600">Beginner</span>
                    </div>
                    <div className="flex justify-between mb-3 pb-2 border-b border-gray-300">
                      <span className="text-base font-mono">-0.5 to +1.0</span>
                      <span className="font-bold text-base text-yellow-600">Intermediate</span>
                    </div>
                    <div className="flex justify-between mb-3 pb-2 border-b border-gray-300">
                      <span className="text-base font-mono">+1.0 to +1.5</span>
                      <span className="font-bold text-base text-blue-600">Advanced</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-base font-mono">+1.5 to +3.0</span>
                      <span className="font-bold text-base text-green-600">Mastered</span>
                    </div>
                  </div>
                </div>

                <div className="p-5 bg-gray-50 rounded-lg border border-gray-300">
                  <p className="font-semibold text-black mb-3 text-lg">Example Scenario</p>
                  <div className="bg-white border border-gray-400 p-5 rounded-md space-y-3">
                    <p className="text-base text-gray-700 leading-relaxed">
                      <strong className="text-black">Student A:</strong> 85% accuracy on easy questions → θ = 0.3 (Intermediate)
                    </p>
                    <p className="text-base text-gray-700 leading-relaxed">
                      <strong className="text-black">Student B:</strong> 65% accuracy on hard questions → θ = 1.6 (Mastered)
                    </p>
                  </div>
                  <p className="text-sm text-gray-600 mt-3 italic bg-yellow-50 border border-yellow-200 p-3 rounded">
                    💡 IRT recognizes that Student B has higher ability despite lower accuracy because they're tackling more difficult material.
                  </p>
                </div>

                <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-300">
                  <p className="font-semibold text-black mb-3 text-lg">3PL Model & Contextual Bandit</p>
                  <div className="space-y-3">
                    <div>
                      <p className="font-semibold text-black mb-2 text-base">Three-Parameter Logistic (3PL) Model:</p>
                      <p className="text-sm text-gray-700 leading-relaxed mb-2">
                        Our system uses the 3PL model which accounts for:
                      </p>
                      <ul className="text-sm text-gray-700 space-y-1 ml-4 list-disc">
                        <li><strong>Difficulty (b):</strong> How hard is the question?</li>
                        <li><strong>Discrimination (a):</strong> How well does it differentiate ability levels?</li>
                        <li><strong>Guessing (c):</strong> Chance of getting it right by luck (important for multiple choice)</li>
                      </ul>
                    </div>
                    <div className="pt-3 border-t border-blue-200">
                      <p className="font-semibold text-black mb-2 text-base">Contextual Bandit Enhancement:</p>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        When enabled, the LinUCB algorithm creates a 15-dimensional "context vector" combining your
                        ability, topic mastery, question parameters, and interaction patterns. It learns optimal
                        question selection through a hybrid approach: 70% personalized LinUCB + 30% proven IRT-UCB.
                      </p>
                    </div>
                  </div>
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
