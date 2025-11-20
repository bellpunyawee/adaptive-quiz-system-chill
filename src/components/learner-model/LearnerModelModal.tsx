'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface LearnerModelModalProps {
  open: boolean;
  onClose: () => void;
}

export function LearnerModelModal({ open, onClose }: LearnerModelModalProps) {
  const [currentPage, setCurrentPage] = useState(0);

  const pages = [
    // Page 1: Key Concepts
    {
      title: 'Understanding Your Learner Model',
      content: (
        <div className="space-y-6">
          <p className="text-base text-gray-700 leading-relaxed">
            This dashboard shows psychometric ability estimates using <strong>Item Response Theory (IRT)</strong> and <strong>adaptive algorithms</strong>.
          </p>

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

          <div className="p-6 border-2 border-black bg-white rounded-lg shadow-md">
            <p className="font-semibold text-black mb-3 text-xl">
              IRT vs Simple Accuracy
            </p>
            <p className="text-base text-gray-700 leading-relaxed">
              Unlike simple quiz accuracy, IRT accounts for <strong>question difficulty</strong> and your{' '}
              <strong>response patterns</strong>. You might have 65% accuracy but &quot;Mastered&quot; status because
              you&apos;re attempting very difficult questions.
            </p>
          </div>
        </div>
      ),
    },

    // Page 2: Adaptive Question Selection
    {
      title: 'Adaptive Question Selection',
      content: (
        <div className="space-y-6">
          <div className="p-6 border-2 border-blue-300 bg-blue-50 rounded-lg shadow-md">
            <p className="font-semibold text-black mb-3 text-xl">
              🎯 How Questions Are Selected
            </p>
            <p className="text-base text-gray-700 leading-relaxed mb-4">
              Our system uses advanced algorithms to select the most informative questions for you:
            </p>

            <div className="space-y-4">
              <div className="p-5 bg-white border-2 border-blue-200 rounded-lg">
                <p className="font-semibold text-black mb-3 text-lg">
                  IRT-UCB (Item Response Theory + Upper Confidence Bound)
                </p>
                <p className="text-base text-gray-700 leading-relaxed">
                  Selects questions matching your ability level while exploring your knowledge boundaries.
                  Balances between testing what you know and discovering your limits.
                </p>
              </div>

              <div className="p-5 bg-white border-2 border-blue-200 rounded-lg">
                <p className="font-semibold text-black mb-3 text-lg">
                  Contextual Bandit (LinUCB) - Advanced Personalization
                </p>
                <p className="text-base text-gray-700 leading-relaxed mb-3">
                  When enabled by your instructor, this AI-powered algorithm learns your unique learning patterns
                  to select truly personalized questions based on:
                </p>
                <ul className="text-base text-gray-700 space-y-2 ml-6 list-disc">
                  <li>Your current ability (θ) and confidence level</li>
                  <li>Topic-specific mastery and accuracy</li>
                  <li>Question characteristics (difficulty, discrimination)</li>
                  <li>Recent performance patterns and response speed</li>
                </ul>
                <p className="text-sm text-gray-600 mt-3 italic bg-blue-50 border border-blue-200 p-3 rounded">
                  💡 The system adapts to you individually, not just universally &quot;good&quot; questions.
                </p>
              </div>

              <div className="p-5 bg-white border-2 border-blue-200 rounded-lg">
                <p className="font-semibold text-black mb-3 text-lg">
                  Sympson-Hetter Exposure Control
                </p>
                <p className="text-base text-gray-700 leading-relaxed">
                  Prevents over-using the same questions to ensure fair and varied assessment.
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
    },

    // Page 3: What is IRT?
    {
      title: 'What is Item Response Theory?',
      content: (
        <div className="space-y-6">
          <div className="p-6 bg-gray-50 rounded-lg border-2 border-gray-300">
            <p className="font-semibold text-black mb-3 text-xl">What is Item Response Theory?</p>
            <p className="text-base text-gray-700 leading-relaxed">
              IRT is a psychometric framework used in standardized testing (GRE, SAT, etc.) that
              estimates your true ability by analyzing how you respond to questions of varying
              difficulty. Unlike percentage scores, IRT provides a more accurate measure of your actual knowledge.
            </p>
          </div>

          <div className="p-6 bg-gray-50 rounded-lg border-2 border-gray-300">
            <p className="font-semibold text-black mb-4 text-xl">How θ (Theta) Works</p>
            <p className="text-base text-gray-700 mb-4 leading-relaxed">
              Theta represents your ability on a standardized scale:
            </p>
            <div className="bg-white border-2 border-gray-400 p-6 rounded-lg shadow-sm">
              <div className="flex justify-between items-center mb-4 pb-3 border-b-2 border-gray-300">
                <span className="text-lg font-mono">-3.0 to -0.5</span>
                <span className="font-bold text-lg text-red-600">Beginner</span>
              </div>
              <div className="flex justify-between items-center mb-4 pb-3 border-b-2 border-gray-300">
                <span className="text-lg font-mono">-0.5 to +1.0</span>
                <span className="font-bold text-lg text-yellow-600">Intermediate</span>
              </div>
              <div className="flex justify-between items-center mb-4 pb-3 border-b-2 border-gray-300">
                <span className="text-lg font-mono">+1.0 to +1.5</span>
                <span className="font-bold text-lg text-blue-600">Advanced</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-lg font-mono">+1.5 to +3.0</span>
                <span className="font-bold text-lg text-green-600">Mastered</span>
              </div>
            </div>
          </div>
        </div>
      ),
    },

    // Page 4: Example & 3PL Model
    {
      title: 'IRT in Action',
      content: (
        <div className="space-y-6">
          <div className="p-6 bg-gray-50 rounded-lg border-2 border-gray-300">
            <p className="font-semibold text-black mb-4 text-xl">Example Scenario</p>
            <div className="bg-white border-2 border-gray-400 p-6 rounded-lg space-y-4">
              <p className="text-lg text-gray-700 leading-relaxed">
                <strong className="text-black">Student A:</strong> 85% accuracy on easy questions → θ = 0.3 (Intermediate)
              </p>
              <p className="text-lg text-gray-700 leading-relaxed">
                <strong className="text-black">Student B:</strong> 65% accuracy on hard questions → θ = 1.6 (Mastered)
              </p>
            </div>
            <div className="mt-4 text-base text-gray-700 bg-yellow-50 border-2 border-yellow-300 p-4 rounded-lg">
              <p className="font-semibold text-black mb-2">💡 Key Insight:</p>
              <p className="leading-relaxed">
                IRT recognizes that Student B has higher ability despite lower accuracy because they're tackling more difficult material.
              </p>
            </div>
          </div>

          <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-300">
            <p className="font-semibold text-black mb-4 text-xl">3PL Model & Contextual Bandit</p>
            <div className="space-y-4">
              <div>
                <p className="font-semibold text-black mb-3 text-lg">Three-Parameter Logistic (3PL) Model:</p>
                <p className="text-base text-gray-700 leading-relaxed mb-3">
                  Our system uses the 3PL model which accounts for:
                </p>
                <ul className="text-base text-gray-700 space-y-2 ml-6 list-disc">
                  <li><strong>Difficulty (b):</strong> How hard is the question?</li>
                  <li><strong>Discrimination (a):</strong> How well does it differentiate ability levels?</li>
                  <li><strong>Guessing (c):</strong> Chance of getting it right by luck (important for multiple choice)</li>
                </ul>
              </div>
              <div className="pt-4 border-t-2 border-blue-200">
                <p className="font-semibold text-black mb-3 text-lg">Contextual Bandit Enhancement:</p>
                <p className="text-base text-gray-700 leading-relaxed">
                  When enabled, the LinUCB algorithm creates a 15-dimensional &quot;context vector&quot; combining your
                  ability, topic mastery, question parameters, and interaction patterns. It learns optimal
                  question selection through a hybrid approach: <strong>70% personalized LinUCB + 30% proven IRT-UCB</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ];

  const nextPage = () => {
    if (currentPage < pages.length - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleClose = () => {
    setCurrentPage(0);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold text-black">
              {pages[currentPage].title}
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="py-4">
          {pages[currentPage].content}
        </div>

        {/* Navigation Footer */}
        <div className="flex items-center justify-between pt-6 border-t">
          <Button
            variant="outline"
            onClick={prevPage}
            disabled={currentPage === 0}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="h-5 w-5" />
            Previous
          </Button>

          {/* Page Indicators */}
          <div className="flex items-center gap-2">
            {pages.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentPage(index)}
                className={`h-2 rounded-full transition-all ${
                  index === currentPage
                    ? 'w-8 bg-primary'
                    : 'w-2 bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`Go to page ${index + 1}`}
              />
            ))}
          </div>

          <Button
            variant="outline"
            onClick={nextPage}
            disabled={currentPage === pages.length - 1}
            className="flex items-center gap-2"
          >
            Next
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Page Counter */}
        <div className="text-center text-sm text-gray-600">
          Page {currentPage + 1} of {pages.length}
        </div>
      </DialogContent>
    </Dialog>
  );
}
