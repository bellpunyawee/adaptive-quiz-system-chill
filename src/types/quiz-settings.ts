export interface QuizSettings {
  explorationParam: number;  // 0-1 range
  timerMinutes: number;
  maxQuestions: number;
  topicSelection: 'system' | 'manual';
  selectedCells: string[];   // Array of cell IDs
}

export const DEFAULT_QUIZ_SETTINGS: QuizSettings = {
  explorationParam: 0.5,
  timerMinutes: 30,
  maxQuestions: 10,
  topicSelection: 'system',
  selectedCells: []
};

