export type SudokuCell = number | null;
export type SudokuGrid = SudokuCell[][];

export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert' | 'master' | 'extreme';

export interface SudokuGame {
  id: string;
  initialGrid: SudokuGrid;
  currentGrid: SudokuGrid;
  solutionGrid: SudokuGrid;
  difficulty: Difficulty;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  isCompleted: boolean;
  moves: Move[];
}

export interface Move {
  row: number;
  col: number;
  value: SudokuCell;
  previousValue: SudokuCell;
  timestamp: Date;
}

export interface GameStats {
  totalGames: number;
  completedGames: number;
  bestTimes: Record<Difficulty, number | null>;
  averageTimes: Record<Difficulty, number | null>;
}

export interface Conflict {
  type: 'row' | 'column' | 'box';
  index: number;
  cells: Array<{ row: number; col: number }>;
}

export interface Hint {
  row: number;
  col: number;
  value: number;
  reason: string;
}
