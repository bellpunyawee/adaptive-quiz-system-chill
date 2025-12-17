// src/components/admin/ImportQuestionsDialog.tsx
// UI component for importing questions from master question banks

'use client';

import { useState, useEffect } from 'react';
import { Upload, AlertCircle, CheckCircle, X, Loader2, BookOpen, FileQuestion } from 'lucide-react';

interface Course {
  id: string;
  title: string;
  description?: string | null;
  instructor: {
    name: string | null;
    email: string | null;
  };
  _count: {
    questions: number;
    cells: number;
  };
}

interface Topic {
  id: string;
  name: string;
  _count: {
    questions: number;
  };
}

interface ImportQuestionsDialogProps {
  courseId: string;
  onClose: () => void;
  onSuccess: (imported: number) => void;
}

export function ImportQuestionsDialog({
  courseId,
  onClose,
  onSuccess,
}: ImportQuestionsDialogProps) {
  const [step, setStep] = useState<'select-source' | 'select-topics' | 'confirm' | 'importing' | 'complete'>('select-source');
  const [courses, setCourses] = useState<Course[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  const [resetCalibration, setResetCalibration] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [result, setResult] = useState<any>(null);

  // Load available source courses
  useEffect(() => {
    async function loadCourses() {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/courses/${courseId}/import-questions?action=list-sources`
        );
        const data = await response.json();

        if (data.success) {
          setCourses(data.courses);
        } else {
          setError('Failed to load available courses');
        }
      } catch (err) {
        setError('Error loading courses');
      } finally {
        setLoading(false);
      }
    }

    if (step === 'select-source') {
      loadCourses();
    }
  }, [courseId, step]);

  // Load topics from selected course
  useEffect(() => {
    async function loadTopics() {
      if (!selectedCourseId) return;

      try {
        setLoading(true);
        const response = await fetch(
          `/api/courses/${courseId}/import-questions?action=list-topics&sourceCourseId=${selectedCourseId}`
        );
        const data = await response.json();

        if (data.success) {
          setTopics(data.topics);
          // Select all topics by default
          setSelectedTopicIds(data.topics.map((t: Topic) => t.id));
        } else {
          setError('Failed to load topics');
        }
      } catch (err) {
        setError('Error loading topics');
      } finally {
        setLoading(false);
      }
    }

    if (step === 'select-topics' && selectedCourseId) {
      loadTopics();
    }
  }, [courseId, selectedCourseId, step]);

  const handleImport = async () => {
    setStep('importing');
    setError('');

    try {
      const response = await fetch(`/api/courses/${courseId}/import-questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceCourseId: selectedCourseId,
          topicIds: selectedTopicIds,
          resetCalibration,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResult(data);
        setStep('complete');
        setTimeout(() => {
          onSuccess(data.imported);
          onClose();
        }, 2000);
      } else {
        setError(data.error || 'Import failed');
        setStep('confirm');
      }
    } catch (err) {
      setError('Error during import');
      setStep('confirm');
    }
  };

  const selectedCourse = courses.find((c) => c.id === selectedCourseId);
  const selectedTopics = topics.filter((t) => selectedTopicIds.includes(t.id));
  const totalQuestions = selectedTopics.reduce((sum, t) => sum + t._count.questions, 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Upload className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Import Questions</h2>
              <p className="text-sm text-gray-600">Copy questions from another course</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Select Source Course */}
          {step === 'select-source' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select Source Course</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Choose a course to import questions from. Questions will be copied (not moved).
                </p>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                </div>
              ) : courses.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No courses with questions found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {courses.map((course) => (
                    <button
                      key={course.id}
                      onClick={() => {
                        setSelectedCourseId(course.id);
                        setStep('select-topics');
                      }}
                      className="w-full text-left p-4 border-2 border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{course.title}</h4>
                          {course.description && (
                            <p className="text-sm text-gray-600 mt-1">{course.description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <BookOpen className="h-3 w-3" />
                              {course._count.cells} topics
                            </span>
                            <span className="flex items-center gap-1">
                              <FileQuestion className="h-3 w-3" />
                              {course._count.questions} questions
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Select Topics */}
          {step === 'select-topics' && (
            <div className="space-y-4">
              <div>
                <button
                  onClick={() => setStep('select-source')}
                  className="text-sm text-blue-600 hover:text-blue-700 mb-3"
                >
                  ← Back to courses
                </button>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select Topics</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Choose which topics to import from <strong>{selectedCourse?.title}</strong>
                </p>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    {topics.map((topic) => (
                      <label
                        key={topic.id}
                        className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedTopicIds.includes(topic.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTopicIds([...selectedTopicIds, topic.id]);
                            } else {
                              setSelectedTopicIds(selectedTopicIds.filter((id) => id !== topic.id));
                            }
                          }}
                          className="w-4 h-4 text-blue-600"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{topic.name}</div>
                          <div className="text-sm text-gray-500">{topic._count.questions} questions</div>
                        </div>
                      </label>
                    ))}
                  </div>

                  <div className="pt-4 border-t">
                    <label className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={resetCalibration}
                        onChange={(e) => setResetCalibration(e.target.checked)}
                        className="w-4 h-4 text-blue-600 mt-1"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">Reset calibration data</div>
                        <div className="text-sm text-gray-600">
                          Recommended: Reset IRT parameters (difficulty, discrimination) to defaults for your course
                        </div>
                      </div>
                    </label>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 3: Confirm */}
          {step === 'confirm' && (
            <div className="space-y-4">
              <div>
                <button
                  onClick={() => setStep('select-topics')}
                  className="text-sm text-blue-600 hover:text-blue-700 mb-3"
                >
                  ← Back to topics
                </button>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Confirm Import</h3>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                <div>
                  <div className="text-sm text-blue-800 font-medium">Source Course</div>
                  <div className="text-blue-900">{selectedCourse?.title}</div>
                </div>
                <div>
                  <div className="text-sm text-blue-800 font-medium">Selected Topics</div>
                  <div className="text-blue-900">{selectedTopics.length} topics</div>
                </div>
                <div>
                  <div className="text-sm text-blue-800 font-medium">Total Questions</div>
                  <div className="text-blue-900">{totalQuestions} questions</div>
                </div>
                <div>
                  <div className="text-sm text-blue-800 font-medium">Calibration</div>
                  <div className="text-blue-900">{resetCalibration ? 'Reset to defaults' : 'Keep source values'}</div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <strong>Deep Copy:</strong> Questions will be copied, not moved. Changes to imported questions won't affect the source course.
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-red-800">{error}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Importing */}
          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-12 w-12 text-blue-600 animate-spin mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Importing Questions...</h3>
              <p className="text-sm text-gray-600">This may take a moment</p>
            </div>
          )}

          {/* Step 5: Complete */}
          {step === 'complete' && result && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="p-4 bg-green-100 rounded-full mb-4">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Import Successful!</h3>
              <p className="text-sm text-gray-600 mb-4">
                {result.imported} questions imported, {result.topicsCreated} topics created
              </p>
              {result.failed > 0 && (
                <p className="text-sm text-yellow-600">{result.failed} questions failed to import</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {(step === 'confirm' || step === 'select-topics') && (
          <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
            >
              Cancel
            </button>
            {step === 'select-topics' && (
              <button
                onClick={() => setStep('confirm')}
                disabled={selectedTopicIds.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
              >
                Continue ({selectedTopicIds.length} topics)
              </button>
            )}
            {step === 'confirm' && (
              <button
                onClick={handleImport}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Import {totalQuestions} Questions
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
