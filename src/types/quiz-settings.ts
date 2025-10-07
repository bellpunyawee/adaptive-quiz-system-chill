export interface QuizSettings {
  explorationParam: number;  // 0-1 range
  timerMinutes: number | null;  // NULL means unlimited/elapsed time only
  maxQuestions: number;
  topicSelection: 'system' | 'manual';
  selectedCells: string[];   // Array of cell IDs
}

export const DEFAULT_QUIZ_SETTINGS: QuizSettings = {
  explorationParam: 0.5,
  timerMinutes: 30,  // Default to 30 minutes limit
  maxQuestions: 10,
  topicSelection: 'system',
  selectedCells: []
};
