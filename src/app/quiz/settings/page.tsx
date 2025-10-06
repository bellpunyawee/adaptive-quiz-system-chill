'use client';

import React, { useState, useEffect } from 'react';
import { Save, Info, Settings, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import type { QuizSettings } from '@/types/quiz-settings';

interface Cell {
  id: string;
  name: string;
}

export default function QuizSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cells, setCells] = useState<Cell[]>([]);
  
  // Settings state
  const [explorationParam, setExplorationParam] = useState(50); // 0-100 for UI
  const [timerMinutes, setTimerMinutes] = useState(30);
  const [maxQuestions, setMaxQuestions] = useState(10);
  const [topicSelection, setTopicSelection] = useState<'system' | 'manual'>('system');
  const [selectedCells, setSelectedCells] = useState<string[]>([]);

  // Fetch available cells
  useEffect(() => {
    async function fetchCells() {
      try {
        const response = await fetch('/api/cells');
        if (response.ok) {
          const data = await response.json();
          setCells(data.cells);
        }
      } catch (error) {
        console.error('Failed to fetch cells:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchCells();
  }, []);

  const handleCellToggle = (cellId: string) => {
    setSelectedCells(prev => 
      prev.includes(cellId)
        ? prev.filter(id => id !== cellId)
        : [...prev, cellId]
    );
  };

  const handleSaveAndStart = async () => {
    if (topicSelection === 'manual' && selectedCells.length === 0) {
      alert('Please select at least one topic');
      return;
    }

    setSaving(true);

    const settings: QuizSettings = {
      explorationParam: explorationParam / 100, // Convert to 0-1
      timerMinutes,
      maxQuestions,
      topicSelection,
      selectedCells: topicSelection === 'manual' ? selectedCells : []
    };

    try {
      const response = await fetch('/api/quiz/create-with-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        const { quizId } = await response.json();
        router.push(`/quiz/${quizId}`);
      } else {
        throw new Error('Failed to create quiz');
      }
    } catch (error) {
      console.error('Error creating quiz:', error);
      alert('Failed to create quiz. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header with Back Button */}
        <div className="mb-8">
          <Link href="/dashboard">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <Settings className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">
              Quiz Configuration
            </h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400">
            Customize your adaptive quiz experience
          </p>
        </div>

        {/* Settings Card */}
        <Card className="shadow-lg">
          <CardContent className="p-8 space-y-8">
            
            {/* 1. Exploration vs Exploitation */}
            <div>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    Exploration vs Exploitation
                    <div className="group relative">
                      <Info className="w-4 h-4 text-slate-400 cursor-help" />
                      <div className="hidden group-hover:block absolute left-0 top-6 w-72 p-3 bg-slate-900 text-white text-xs rounded-lg shadow-xl z-10">
                        Adjust the slider to balance between exploring new questions and exploiting known areas based on your preferences.
                      </div>
                    </div>
                  </Label>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Adjust the slider to balance between exploring new questions and exploiting known areas
                  </p>
                </div>
                <div className="ml-4">
                  <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                    {explorationParam >= 75 ? 'Highly Exploration' : 
                     explorationParam >= 25 ? 'Balanced' : 'Highly Exploitation'}
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={explorationParam}
                  onChange={(e) => setExplorationParam(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>Highly Exploitation</span>
                  <span>Highly Exploration</span>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-slate-200 dark:border-slate-700"></div>

            {/* 2. Timer Configuration */}
            <div>
              <Label className="text-base font-semibold flex items-center gap-2 mb-3">
                Timer Configuration
                <div className="group relative">
                  <Info className="w-4 h-4 text-slate-400 cursor-help" />
                  <div className="hidden group-hover:block absolute left-0 top-6 w-72 p-3 bg-slate-900 text-white text-xs rounded-lg shadow-xl z-10">
                    Set the timer for each question in minutes.
                  </div>
                </div>
              </Label>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                Set the timer for each question in minutes.
              </p>
              
              <div className="flex items-center gap-3">
                <select
                  value={timerMinutes}
                  onChange={(e) => setTimerMinutes(Number(e.target.value))}
                  className="flex-1 px-4 py-2.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={20}>20</option>
                  <option value={25}>25</option>
                  <option value={30}>30</option>
                  <option value={45}>45</option>
                  <option value={60}>60</option>
                </select>
                <span className="text-slate-600 dark:text-slate-400 font-medium">
                  minutes
                </span>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-slate-200 dark:border-slate-700"></div>

            {/* 3. Maximum Number of Questions */}
            <div>
              <Label className="text-base font-semibold flex items-center gap-2 mb-3">
                Maximum Number of Questions
                <div className="group relative">
                  <Info className="w-4 h-4 text-slate-400 cursor-help" />
                  <div className="hidden group-hover:block absolute left-0 top-6 w-72 p-3 bg-slate-900 text-white text-xs rounded-lg shadow-xl z-10">
                    Choose the total number of questions in a single quiz session.
                  </div>
                </div>
              </Label>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                Choose the total number of questions in a single quiz session.
              </p>
              
              <div className="flex items-center gap-3">
                <select
                  value={maxQuestions}
                  onChange={(e) => setMaxQuestions(Number(e.target.value))}
                  className="flex-1 px-4 py-2.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={20}>20</option>
                  <option value={25}>25</option>
                  <option value={30}>30</option>
                  <option value={40}>40</option>
                  <option value={50}>50</option>
                </select>
                <span className="text-slate-600 dark:text-slate-400 font-medium">
                  questions
                </span>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-slate-200 dark:border-slate-700"></div>

            {/* 4. Knowledge Units Configuration */}
            <div>
              <Label className="text-base font-semibold flex items-center gap-2 mb-3">
                Knowledge Units (KU) Configuration
                <div className="group relative">
                  <Info className="w-4 h-4 text-slate-400 cursor-help" />
                  <div className="hidden group-hover:block absolute left-0 top-6 w-72 p-3 bg-slate-900 text-white text-xs rounded-lg shadow-xl z-10">
                    Choose the KU(s) that you want to practice or included in this quiz.
                  </div>
                </div>
              </Label>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                Choose the KU(s) that you want to practice or included in this quiz.
              </p>

              {/* Topic Selection Mode */}
              <div className="space-y-4">
                <div className="flex gap-4">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="radio"
                      name="topicSelection"
                      value="system"
                      checked={topicSelection === 'system'}
                      onChange={(e) => setTopicSelection(e.target.value as 'system')}
                      className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-slate-700 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                      System Recommendation
                    </span>
                  </label>
                  
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="radio"
                      name="topicSelection"
                      value="manual"
                      checked={topicSelection === 'manual'}
                      onChange={(e) => setTopicSelection(e.target.value as 'manual')}
                      className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-slate-700 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                      Manual Selection
                    </span>
                  </label>
                </div>

                {/* Manual Selection - Cell Checkboxes */}
                {topicSelection === 'manual' && (
                  <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                      Select Topics:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {cells.map((cell) => (
                        <label
                          key={cell.id}
                          className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600 cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition"
                        >
                          <input
                            type="checkbox"
                            checked={selectedCells.includes(cell.id)}
                            onChange={() => handleCellToggle(cell.id)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="text-sm text-slate-700 dark:text-slate-300">
                            {cell.name}
                          </span>
                        </label>
                      ))}
                    </div>
                    
                    {selectedCells.length === 0 && (
                      <p className="mt-3 text-xs text-red-600 dark:text-red-400">
                        ⚠ Please select at least one topic to continue
                      </p>
                    )}
                  </div>
                )}

                {topicSelection === 'system' && (
                  <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      ℹ The system will automatically select topics based on your current mastery levels and learning progress.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="mt-6 flex gap-4">
          <Button
            onClick={handleSaveAndStart}
            disabled={saving || (topicSelection === 'manual' && selectedCells.length === 0)}
            className="flex-1 h-12"
          >
            <Save className="w-5 h-5 mr-2" />
            {saving ? 'Creating Quiz...' : 'Save settings and start the quiz'}
          </Button>
        </div>

        {/* Settings Summary */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-sm">Current Settings Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400">
              <div>
                <span className="font-medium">Exploration:</span> {explorationParam}%
              </div>
              <div>
                <span className="font-medium">Timer:</span> {timerMinutes} minutes
              </div>
              <div>
                <span className="font-medium">Max Questions:</span> {maxQuestions}
              </div>
              <div>
                <span className="font-medium">Topic Mode:</span> {topicSelection === 'system' ? 'System' : `Manual (${selectedCells.length} selected)`}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}