'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Target, Sparkles, Compass, Settings } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { TopicMasteryBadge } from '@/components/quiz/TopicMasteryBadge';
import type { QuizSettings } from '@/types/quiz-settings';

type LearningStrategy = 'master' | 'balanced' | 'explore' | 'custom';

interface Cell {
  id: string;
  name: string;
}

interface TopicStat {
  cellId: string;
  cellName: string;
  abilityTheta: number;
  masteryStatus: number;
  accuracy: number;
  questionsAnswered: number;
  correctAnswers: number;
  lastPracticed: Date | null;
  suggestedPractice: boolean;
}

export default function QuizSettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cells, setCells] = useState<Cell[]>([]);
  const [topicStats, setTopicStats] = useState<TopicStat[]>([]);

  // Settings state
  const [strategy, setStrategy] = useState<LearningStrategy>('balanced');
  const [explorationParam, setExplorationParam] = useState(50);
  const [timerMode, setTimerMode] = useState<'unlimited' | 'limited'>('limited');
  const [timerMinutes, setTimerMinutes] = useState(10);
  const [maxQuestions, setMaxQuestions] = useState(15);
  const [topicSelection, setTopicSelection] = useState<'system' | 'manual'>('system');
  const [selectedCells, setSelectedCells] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch cells and topic stats in parallel
        const [cellsResponse, statsResponse] = await Promise.all([
          fetch('/api/cells'),
          fetch('/api/user/topic-stats')
        ]);

        if (cellsResponse.ok) {
          const data = await cellsResponse.json();
          setCells(data.cells);
        }

        if (statsResponse.ok) {
          const data = await statsResponse.json();
          setTopicStats(data.topics);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Handle URL parameters for pre-configuring strategy and topics
  useEffect(() => {
    const mode = searchParams.get('mode');
    const topicsParam = searchParams.get('topics');

    // Map old mode parameters to new strategies
    if (mode === 'practice' || mode === 'review') {
      setStrategy('master'); // Practice/Review maps to Master strategy
      setTopicSelection('manual');
    }

    if (topicsParam && cells.length > 0 && topicStats.length > 0) {
      // Parse topic names from URL and find matching cell IDs
      const topicNames = topicsParam.split(',');
      const matchingCellIds = cells
        .filter(cell => topicNames.includes(cell.name))
        .map(cell => cell.id);

      if (matchingCellIds.length > 0) {
        setSelectedCells(matchingCellIds);
        setTopicSelection('manual');
        setStrategy('master'); // Pre-selected topics indicates mastery focus
      }
    }
  }, [searchParams, cells, topicStats]);

  const handleCellToggle = (cellId: string) => {
    setSelectedCells(prev =>
      prev.includes(cellId)
        ? prev.filter(id => id !== cellId)
        : [...prev, cellId]
    );
  };

  // Helper to select all weak topics
  const handleSelectWeakTopics = () => {
    const weakTopicIds = topicStats
      .filter(stat => stat.suggestedPractice)
      .map(stat => stat.cellId);
    setSelectedCells(weakTopicIds);
    setTopicSelection('manual');
  };

  // Get topic stats for a specific cell
  const getTopicStat = (cellId: string): TopicStat | undefined => {
    return topicStats.find(stat => stat.cellId === cellId);
  };

  // Apply strategy configuration
  const applyStrategy = (selectedStrategy: LearningStrategy) => {
    switch (selectedStrategy) {
      case 'master':
        setExplorationParam(10);
        // Auto-select weak topics if available
        if (topicStats.some(t => t.suggestedPractice)) {
          handleSelectWeakTopics();
        }
        break;
      case 'balanced':
        setExplorationParam(50);
        setTopicSelection('system');
        setSelectedCells([]);
        break;
      case 'explore':
        setExplorationParam(90);
        setTopicSelection('system');
        setSelectedCells([]);
        break;
      case 'custom':
        // Keep current settings
        break;
    }
  };

  const handleSaveAndStart = async () => {
    if (topicSelection === 'manual' && selectedCells.length === 0) {
      alert('Please select at least one topic');
      return;
    }

    setSaving(true);

    // Map strategy to quiz type and practice filter
    let quizMode = 'standard';
    let practiceFilter = 'all';

    if (strategy === 'master') {
      quizMode = 'practice';
      practiceFilter = 'review'; // Include review of mistakes
    } else if (strategy === 'explore') {
      quizMode = 'practice';
      practiceFilter = 'new'; // Only new questions
    }

    const settings: QuizSettings & {
      quizMode?: string;
      practiceFilter?: string;
    } = {
      explorationParam: explorationParam / 100,
      timerMinutes: timerMode === 'unlimited' ? null : timerMinutes,
      maxQuestions,
      topicSelection,
      selectedCells: topicSelection === 'manual' ? selectedCells : [],
      quizMode,
      practiceFilter,
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

      {/* Main Settings Row: Learning Strategy (left) + Timer/Questions (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Learning Strategy Selection */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Learning Strategy
            </CardTitle>
            <CardDescription>
              Choose your learning focus - we&apos;ll optimize the quiz settings for you
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Master Weak Topics */}
              <button
                type="button"
                onClick={() => {
                  setStrategy('master');
                  applyStrategy('master');
                }}
                className={`p-5 rounded-lg border-2 transition-all text-left ${
                  strategy === 'master'
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-red-100 dark:bg-red-950">
                    <Target className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-base mb-1">Master Weak Topics</div>
                    <div className="text-sm text-muted-foreground">
                      Focus on improving areas where you struggle
                    </div>
                  </div>
                </div>
                {strategy === 'master' && (
                  <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2 mt-2">
                    ✓ Auto-selects topics &lt;70% accuracy<br/>
                    ✓ Includes review of past mistakes<br/>
                    ✓ High focus on mastery (10% exploration)
                  </div>
                )}
              </button>

              {/* Balanced Practice */}
              <button
                type="button"
                onClick={() => {
                  setStrategy('balanced');
                  applyStrategy('balanced');
                }}
                className={`p-5 rounded-lg border-2 transition-all text-left ${
                  strategy === 'balanced'
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950">
                    <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-base mb-1">Balanced Practice</div>
                    <div className="text-sm text-muted-foreground">
                      Recommended mix of reinforcement and discovery
                    </div>
                  </div>
                </div>
                {strategy === 'balanced' && (
                  <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2 mt-2">
                    ✓ System-selected topics<br/>
                    ✓ Mix of familiar and new content<br/>
                    ✓ Balanced approach (50% exploration)
                  </div>
                )}
              </button>

              {/* Explore New Content */}
              <button
                type="button"
                onClick={() => {
                  setStrategy('explore');
                  applyStrategy('explore');
                }}
                className={`p-5 rounded-lg border-2 transition-all text-left ${
                  strategy === 'explore'
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-green-100 dark:bg-green-950">
                    <Compass className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-base mb-1">Explore New Content</div>
                    <div className="text-sm text-muted-foreground">
                      Discover unfamiliar topics and questions
                    </div>
                  </div>
                </div>
                {strategy === 'explore' && (
                  <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2 mt-2">
                    ✓ Prioritizes less-practiced topics<br/>
                    ✓ Only new questions you haven&apos;t seen<br/>
                    ✓ High exploration (90% discovery)
                  </div>
                )}
              </button>

              {/* Custom Settings */}
              <button
                type="button"
                onClick={() => setStrategy('custom')}
                className={`p-5 rounded-lg border-2 transition-all text-left ${
                  strategy === 'custom'
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-950">
                    <Settings className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-base mb-1">Custom Settings</div>
                    <div className="text-sm text-muted-foreground">
                      Fine-tune all parameters yourself
                    </div>
                  </div>
                </div>
                {strategy === 'custom' && (
                  <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2 mt-2">
                    ✓ Full control over all settings<br/>
                    ✓ Manual topic selection<br/>
                    ✓ Custom exploration parameter
                  </div>
                )}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Timer and Number of Questions */}
        <div className="space-y-6">
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
      </div>

      {/* Advanced Settings - Below the main row */}
      <div className="space-y-6 mt-6">
        {/* Exploration Parameter - Only show in Custom mode */}
        {strategy === 'custom' && (
          <Card>
            <CardHeader>
              <CardTitle>Question Selection Strategy</CardTitle>
              <CardDescription>
                Balance between exploring new questions and exploiting known areas.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {explorationParam >= 75 ? 'High Exploration' :
                     explorationParam >= 25 ? 'Balanced' : 'High Exploitation'}
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
                  <span>Exploitation (Master)</span>
                  <span>Exploration (Discover)</span>
                </div>
              </div>

              {/* Explanation */}
              <div className="mt-4 p-3 bg-muted/50 rounded-md border">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">
                    {explorationParam < 25 ? 'Focus on Mastery:' :
                     explorationParam > 75 ? 'Focus on Discovery:' : 'Balanced:'}
                  </strong>
                  {' '}
                  {explorationParam < 25
                    ? 'Prioritize mastering topics you already know. More questions from familiar areas to reinforce learning.'
                    : explorationParam > 75
                    ? 'Explore new topics and expand your knowledge. More questions from less familiar areas.'
                    : 'A mix of familiar and new topics. The system adapts to both reinforce and introduce concepts.'}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Topic Configuration - Show for Master (auto) or Custom (manual) */}
        {(strategy === 'master' || strategy === 'custom') && (
          <Card>
            <CardHeader>
              <CardTitle>
                {strategy === 'master' ? 'Topics to Master' : 'Topic Selection'}
              </CardTitle>
              <CardDescription>
                {strategy === 'master'
                  ? 'Focus your practice on specific topics that need improvement'
                  : 'Choose which knowledge units to include in your quiz'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {strategy === 'custom' && (
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
              )}

              {/* Quick select for Master strategy */}
              {strategy === 'master' && topicStats.some(t => t.suggestedPractice) && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleSelectWeakTopics}
                  className="w-full"
                >
                  <Target className="h-4 w-4 mr-2" />
                  Select All Weak Topics ({topicStats.filter(t => t.suggestedPractice).length})
                </Button>
              )}

            {topicSelection === 'manual' && (
              <div className="space-y-3 pt-2">
                {/* Selected cells display */}
                {selectedCells.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Selected Topics:</Label>
                    {selectedCells.map(cellId => {
                      const cell = cells.find(c => c.id === cellId);
                      const stat = getTopicStat(cellId);
                      return cell ? (
                        <div
                          key={cell.id}
                          className="flex items-center justify-between px-4 py-2.5 bg-accent border rounded-md"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <svg className="w-4 h-4 text-muted-foreground flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                              <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                            </svg>
                            <span className="text-sm font-medium">{cell.name}</span>
                            {stat && (
                              <TopicMasteryBadge
                                accuracy={stat.accuracy}
                                questionsAnswered={stat.questionsAnswered}
                                masteryStatus={stat.masteryStatus}
                                abilityTheta={stat.abilityTheta}
                                compact
                              />
                            )}
                          </div>
                          <button
                            onClick={() => handleCellToggle(cell.id)}
                            className="p-1 hover:bg-background rounded transition-colors flex-shrink-0"
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
                          .map(cell => {
                            const stat = getTopicStat(cell.id);
                            return (
                              <button
                                key={cell.id}
                                type="button"
                                onClick={() => {
                                  handleCellToggle(cell.id);
                                  setIsDropdownOpen(false);
                                }}
                                className="w-full flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-accent transition-colors text-left"
                              >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <svg className="w-4 h-4 text-muted-foreground flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                                    <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                                  </svg>
                                  <span className="text-sm">{cell.name}</span>
                                </div>
                                {stat && (
                                  <TopicMasteryBadge
                                    accuracy={stat.accuracy}
                                    questionsAnswered={stat.questionsAnswered}
                                    masteryStatus={stat.masteryStatus}
                                    abilityTheta={stat.abilityTheta}
                                    compact
                                  />
                                )}
                              </button>
                            );
                          })
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        )}
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