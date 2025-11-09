'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  const [explorationParam, setExplorationParam] = useState(50);
  const [timerMode, setTimerMode] = useState<'unlimited' | 'limited'>('limited');
  const [timerMinutes, setTimerMinutes] = useState(10);
  const [maxQuestions, setMaxQuestions] = useState(15);
  const [topicSelection, setTopicSelection] = useState<'system' | 'manual'>('system');
  const [selectedCells, setSelectedCells] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

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
      explorationParam: explorationParam / 100,
      timerMinutes: timerMode === 'unlimited' ? null : timerMinutes,
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
        <div className="text-muted-foreground">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      {/* Header Section */}
      <div className="mb-8">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Quiz Settings</h1>
          <p className="text-muted-foreground">Configure your adaptive quiz experience</p>
        </div>
      </div>

      {/* Settings Cards */}
      <div className="space-y-6">
        
        {/* Timer and Number of Questions - Same Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Timer Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Timer</CardTitle>
              <CardDescription>
                Change the timer to your preference.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant={timerMode === 'unlimited' ? 'default' : 'outline'}
                  onClick={() => setTimerMode('unlimited')}
                >
                  Elapsed Time
                </Button>
                <Button
                  type="button"
                  variant={timerMode === 'limited' ? 'default' : 'outline'}
                  onClick={() => setTimerMode('limited')}
                >
                  Time Limit
                </Button>
                
                {timerMode === 'limited' && (
                  <>
                    <div className="flex items-center gap-2">
                      <select
                        value={timerMinutes}
                        onChange={(e) => setTimerMinutes(Number(e.target.value))}
                        className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={15}>15</option>
                        <option value={20}>20</option>
                        <option value={30}>30</option>
                        <option value={45}>45</option>
                        <option value={60}>60</option>
                      </select>
                      <span className="text-sm text-muted-foreground">minutes</span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Number of Questions */}
          <Card>
            <CardHeader>
              <CardTitle>Number of Questions</CardTitle>
              <CardDescription>
                Customise the number of question items for your quiz.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Label htmlFor="max-questions" className="text-sm font-medium">#</Label>
                <input
                  id="max-questions"
                  type="number"
                  value={maxQuestions}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Only allow positive integers
                    if (value === '' || /^[1-9]\d*$/.test(value)) {
                      const num = parseInt(value) || 0;
                      if (num >= 1 && num <= 50) {
                        setMaxQuestions(num);
                      }
                    }
                  }}
                  onKeyDown={(e) => {
                    // Prevent special characters, minus, plus, decimal
                    if (['-', '+', 'e', 'E', '.'].includes(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  min="1"
                  max="50"
                  className="h-9 w-20 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                />
                <span className="text-sm text-muted-foreground">questions</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Exploration Parameter */}
        <Card>
          <CardHeader>
            <CardTitle>Question Selection</CardTitle>
            <CardDescription>
              Balance between exploring new questions and exploiting known areas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {explorationParam >= 75 ? 'Highly Exploration' : 
                   explorationParam >= 25 ? 'Balanced' : 'Highly Exploitation'}
                </span>
                <span className="text-sm text-muted-foreground">{explorationParam}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={explorationParam}
                onChange={(e) => setExplorationParam(Number(e.target.value))}
                className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Exploitation</span>
                <span>Exploration</span>
              </div>
            </div>
            
            {/* Explanation */}
            <div className="mt-4 p-3 bg-muted/50 rounded-md border">
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">
                  {explorationParam < 25 ? 'Focus on Weaknesses:' : 
                   explorationParam > 75 ? 'Try Everything:' : 'Balanced:'}
                </strong>
                {' '}
                {explorationParam < 25 
                  ? 'Focus on mastering topics you already know. Receive more questions from familiar areas to reinforce learning and build confidence.'
                  : explorationParam > 75
                  ? 'Explore new topics and expand your knowledge. Receive questions from less familiar areas to broaden your understanding.'
                  : 'A mix of familiar and new topics. The system adapts to both reinforce existing knowledge and introduce new concepts.'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
            <CardDescription>
              Choose the knowledge unit(s) that you want to practice or included in the quiz.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <Button
                type="button"
                variant={topicSelection === 'system' ? 'default' : 'outline'}
                onClick={() => {
                  setTopicSelection('system');
                  setSelectedCells([]);
                  setIsDropdownOpen(false);
                }}
              >
                System Automatic
              </Button>
              <Button
                type="button"
                variant={topicSelection === 'manual' ? 'default' : 'outline'}
                onClick={() => {
                  setTopicSelection('manual');
                }}
              >
                Manual Selection
              </Button>
            </div>

            {topicSelection === 'manual' && (
              <div className="space-y-3 pt-2">
                {/* Selected cells display */}
                {selectedCells.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Selected Topics:</Label>
                    {selectedCells.map(cellId => {
                      const cell = cells.find(c => c.id === cellId);
                      return cell ? (
                        <div
                          key={cell.id}
                          className="flex items-center justify-between px-4 py-2.5 bg-accent border rounded-md"
                        >
                          <div className="flex items-center gap-3">
                            <svg className="w-4 h-4 text-muted-foreground" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                              <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                            </svg>
                            <span className="text-sm font-medium">{cell.name}</span>
                          </div>
                          <button
                            onClick={() => handleCellToggle(cell.id)}
                            className="p-1 hover:bg-background rounded transition-colors"
                            aria-label={`Remove ${cell.name}`}
                          >
                            <svg className="w-4 h-4 text-muted-foreground hover:text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ) : null;
                    })}
                  </div>
                )}

                {/* Dropdown for adding topics */}
                <div className="relative">
                  <Label className="text-sm font-medium mb-2 block">Add Topics:</Label>
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="w-full flex items-center justify-between px-4 py-2.5 border rounded-md hover:bg-accent transition-colors text-sm"
                  >
                    <span className="text-muted-foreground">Select a topic...</span>
                    <svg 
                      className={`w-4 h-4 text-muted-foreground transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isDropdownOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {cells.filter(cell => !selectedCells.includes(cell.id)).length === 0 ? (
                        <div className="px-4 py-3 text-sm text-muted-foreground">
                          All topics selected
                        </div>
                      ) : (
                        cells
                          .filter(cell => !selectedCells.includes(cell.id))
                          .map(cell => (
                            <button
                              key={cell.id}
                              type="button"
                              onClick={() => {
                                handleCellToggle(cell.id);
                                setIsDropdownOpen(false);
                              }}
                              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent transition-colors text-left"
                            >
                              <svg className="w-4 h-4 text-muted-foreground" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                                <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                              </svg>
                              <span className="text-sm">{cell.name}</span>
                            </button>
                          ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action Button */}
      <div className="mt-6 flex justify-end">
        <Button
          onClick={handleSaveAndStart}
          disabled={saving}
          size="lg"
        >
          {saving ? 'Creating Quiz...' : 'Save & Start Quiz'}
        </Button>
      </div>
    </div>
  );
}