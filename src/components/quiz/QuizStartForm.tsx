// src/components/quiz/QuizStartForm.tsx
// Form for configuring and starting a course-scoped quiz

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Play, Loader2, Clock, Target, BookOpen } from 'lucide-react';

interface Topic {
  id: string;
  name: string;
  _count: {
    questions: number;
  };
  mastery?: {
    cellId: string;
    mastery_status: number;
    ability_theta: number;
  };
}

interface QuizStartFormProps {
  courseId: string;
  courseName: string;
  topics: Topic[];
  userId: string;
  baselineCompleted: boolean;
}

export function QuizStartForm({
  courseId,
  courseName,
  topics,
  userId,
  baselineCompleted,
}: QuizStartFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Quiz configuration state
  const [quizType, setQuizType] = useState<string>(baselineCompleted ? 'regular' : 'baseline');
  const [maxQuestions, setMaxQuestions] = useState(10);
  const [topicSelection, setTopicSelection] = useState<'system' | 'manual'>('system');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate topic selection
      if (topicSelection === 'manual' && selectedTopics.length === 0) {
        setError('Please select at least one topic');
        setLoading(false);
        return;
      }

      // Create quiz
      const response = await fetch('/api/quiz/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId, // ✅ Critical: Course scoping
          userId,
          maxQuestions,
          quizType,
          topicSelection,
          selectedCells: topicSelection === 'manual' ? selectedTopics : null,
        }),
      });

      const data = await response.json();

      if (response.ok && data.quizId) {
        // Redirect to quiz
        router.push(`/quiz/${data.quizId}`);
      } else {
        setError(data.error || 'Failed to start quiz');
        setLoading(false);
      }
    } catch (err) {
      setError('An error occurred while starting the quiz');
      setLoading(false);
    }
  };

  const toggleTopic = (topicId: string) => {
    setSelectedTopics((prev) =>
      prev.includes(topicId)
        ? prev.filter((id) => id !== topicId)
        : [...prev, topicId]
    );
  };

  const unmasteredTopics = topics.filter((t) => t.mastery?.mastery_status === 0);
  const masteredTopics = topics.filter((t) => t.mastery?.mastery_status === 1);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Quiz Type */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quiz Type</h2>
        <div className="space-y-3">
          {!baselineCompleted && (
            <label className="flex items-start gap-3 p-4 border-2 border-blue-500 bg-blue-50 rounded-lg cursor-pointer">
              <input
                type="radio"
                name="quizType"
                value="baseline"
                checked={quizType === 'baseline'}
                onChange={(e) => setQuizType(e.target.value)}
                className="mt-1 w-4 h-4 text-blue-600"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900">Baseline Assessment (Recommended)</div>
                <div className="text-sm text-gray-600 mt-1">
                  Calibrates the system to your skill level across all topics
                </div>
              </div>
            </label>
          )}

          <label className="flex items-start gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-gray-300 cursor-pointer">
            <input
              type="radio"
              name="quizType"
              value="regular"
              checked={quizType === 'regular'}
              onChange={(e) => setQuizType(e.target.value)}
              className="mt-1 w-4 h-4 text-blue-600"
            />
            <div className="flex-1">
              <div className="font-medium text-gray-900">Adaptive Quiz</div>
              <div className="text-sm text-gray-600 mt-1">
                Questions adapt to your ability level as you progress
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Quiz Settings */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quiz Settings</h2>

        {/* Max Questions */}
        <div className="mb-6">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Target className="h-4 w-4" />
            Number of Questions
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="5"
              max="50"
              step="5"
              value={maxQuestions}
              onChange={(e) => setMaxQuestions(Number(e.target.value))}
              className="flex-1"
            />
            <div className="w-16 px-3 py-2 border rounded-lg text-center font-semibold text-gray-900">
              {maxQuestions}
            </div>
          </div>
        </div>

        {/* Topic Selection */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
            <BookOpen className="h-4 w-4" />
            Topic Selection
          </label>
          <div className="space-y-3 mb-4">
            <label className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="radio"
                name="topicSelection"
                value="system"
                checked={topicSelection === 'system'}
                onChange={(e) => setTopicSelection(e.target.value as 'system')}
                className="mt-1 w-4 h-4 text-blue-600"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900">System Recommendation</div>
                <div className="text-sm text-gray-600">
                  Automatically selects topics based on your mastery level
                </div>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="radio"
                name="topicSelection"
                value="manual"
                checked={topicSelection === 'manual'}
                onChange={(e) => setTopicSelection(e.target.value as 'manual')}
                className="mt-1 w-4 h-4 text-blue-600"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900">Manual Selection</div>
                <div className="text-sm text-gray-600">
                  Choose specific topics to focus on
                </div>
              </div>
            </label>
          </div>

          {/* Topic Checkboxes (Manual Mode) */}
          {topicSelection === 'manual' && (
            <div className="pl-7 space-y-2">
              {unmasteredTopics.length > 0 && (
                <>
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-2">
                    In Progress ({unmasteredTopics.length})
                  </div>
                  {unmasteredTopics.map((topic) => (
                    <label
                      key={topic.id}
                      className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedTopics.includes(topic.id)}
                        onChange={() => toggleTopic(topic.id)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <div className="flex-1 flex items-center justify-between">
                        <span className="text-sm text-gray-900">{topic.name}</span>
                        <span className="text-xs text-gray-500">
                          {topic._count.questions} questions
                        </span>
                      </div>
                    </label>
                  ))}
                </>
              )}

              {masteredTopics.length > 0 && (
                <>
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-2 mt-4">
                    Mastered ({masteredTopics.length})
                  </div>
                  {masteredTopics.map((topic) => (
                    <label
                      key={topic.id}
                      className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer opacity-60"
                    >
                      <input
                        type="checkbox"
                        checked={selectedTopics.includes(topic.id)}
                        onChange={() => toggleTopic(topic.id)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <div className="flex-1 flex items-center justify-between">
                        <span className="text-sm text-gray-900">{topic.name}</span>
                        <span className="text-xs text-green-600 font-medium">✓ Mastered</span>
                      </div>
                    </label>
                  ))}
                </>
              )}

              {selectedTopics.length > 0 && (
                <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                  {selectedTopics.length} topic(s) selected
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-3 text-gray-700 font-medium hover:text-gray-900"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || (topicSelection === 'manual' && selectedTopics.length === 0)}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium transition-colors"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Starting...
            </>
          ) : (
            <>
              <Play className="h-5 w-5" />
              Start Quiz
            </>
          )}
        </button>
      </div>

      {/* Info */}
      <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
        <div className="flex items-start gap-2">
          <Clock className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
          <p>
            <strong>Estimated time:</strong> {Math.ceil(maxQuestions * 1.5)} - {maxQuestions * 2} minutes.
            Questions adapt to your ability level in real-time.
          </p>
        </div>
      </div>
    </form>
  );
}
