import { SudokuGrid, SudokuCell, Difficulty, Conflict, Hint } from '@/types/sudoku';

export class SudokuUtils {
  static createEmptyGrid(): SudokuGrid {
    return Array(9).fill(null).map(() => Array(9).fill(null));
  }

  static copyGrid(grid: SudokuGrid): SudokuGrid {
    return grid.map(row => [...row]);
  }

  static isValidMove(grid: SudokuGrid, row: number, col: number, num: number): boolean {
    // Check row
    for (let c = 0; c < 9; c++) {
      if (c !== col && grid[row][c] === num) return false;
    }

    // Check column
    for (let r = 0; r < 9; r++) {
      if (r !== row && grid[r][col] === num) return false;
    }

    // Check 3x3 box
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    for (let r = boxRow; r < boxRow + 3; r++) {
      for (let c = boxCol; c < boxCol + 3; c++) {
        if ((r !== row || c !== col) && grid[r][c] === num) return false;
      }
    }

    return true;
  }

  static isComplete(grid: SudokuGrid): boolean {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (grid[row][col] === null) return false;
      }
    }
    return this.isValid(grid);
  }

  static isValid(grid: SudokuGrid): boolean {
    // Check all rows
    for (let row = 0; row < 9; row++) {
      const seen = new Set<number>();
      for (let col = 0; col < 9; col++) {
        const val = grid[row][col];
        if (val !== null) {
          if (seen.has(val)) return false;
          seen.add(val);
        }
      }
    }

    // Check all columns
    for (let col = 0; col < 9; col++) {
      const seen = new Set<number>();
      for (let row = 0; row < 9; row++) {
        const val = grid[row][col];
        if (val !== null) {
          if (seen.has(val)) return false;
          seen.add(val);
        }
      }
    }

    // Check all 3x3 boxes
    for (let boxRow = 0; boxRow < 3; boxRow++) {
      for (let boxCol = 0; boxCol < 3; boxCol++) {
        const seen = new Set<number>();
        for (let r = boxRow * 3; r < boxRow * 3 + 3; r++) {
          for (let c = boxCol * 3; c < boxCol * 3 + 3; c++) {
            const val = grid[r][c];
            if (val !== null) {
              if (seen.has(val)) return false;
              seen.add(val);
            }
          }
        }
      }
    }

    return true;
  }

  static findConflicts(grid: SudokuGrid): Conflict[] {
    const conflicts: Conflict[] = [];

    // Check rows
    for (let row = 0; row < 9; row++) {
      const seen = new Map<number, number[]>();
      for (let col = 0; col < 9; col++) {
        const val = grid[row][col];
        if (val !== null) {
          if (!seen.has(val)) seen.set(val, []);
          seen.get(val)!.push(col);
        }
      }
      seen.forEach((cols, value) => {
        if (cols.length > 1) {
          conflicts.push({
            type: 'row',
            index: row,
            cells: cols.map(col => ({ row, col }))
          });
        }
      });
    }

    // Check columns
    for (let col = 0; col < 9; col++) {
      const seen = new Map<number, number[]>();
      for (let row = 0; row < 9; row++) {
        const val = grid[row][col];
        if (val !== null) {
          if (!seen.has(val)) seen.set(val, []);
          seen.get(val)!.push(row);
        }
      }
      seen.forEach((rows, value) => {
        if (rows.length > 1) {
          conflicts.push({
            type: 'column',
            index: col,
            cells: rows.map(row => ({ row, col }))
          });
        }
      });
    }

    // Check 3x3 boxes
    for (let boxRow = 0; boxRow < 3; boxRow++) {
      for (let boxCol = 0; boxCol < 3; boxCol++) {
        const seen = new Map<number, Array<{ row: number; col: number }>>();
        for (let r = boxRow * 3; r < boxRow * 3 + 3; r++) {
          for (let c = boxCol * 3; c < boxCol * 3 + 3; c++) {
            const val = grid[r][c];
            if (val !== null) {
              if (!seen.has(val)) seen.set(val, []);
              seen.get(val)!.push({ row: r, col: c });
            }
          }
        }
        seen.forEach((cells, value) => {
          if (cells.length > 1) {
            conflicts.push({
              type: 'box',
              index: boxRow * 3 + boxCol,
              cells
            });
          }
        });
      }
    }

    return conflicts;
  }

  static solve(grid: SudokuGrid): SudokuGrid | null {
    const gridCopy = this.copyGrid(grid);
    
    const findEmpty = (): [number, number] | null => {
      for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
          if (gridCopy[row][col] === null) return [row, col];
        }
      }
      return null;
    };

    const backtrack = (): boolean => {
      const empty = findEmpty();
      if (!empty) return true;

      const [row, col] = empty;
      for (let num = 1; num <= 9; num++) {
        if (this.isValidMove(gridCopy, row, col, num)) {
          gridCopy[row][col] = num;
          if (backtrack()) return true;
          gridCopy[row][col] = null;
        }
      }
      return false;
    };

    return backtrack() ? gridCopy : null;
  }

  static generatePuzzle(difficulty: Difficulty): { puzzle: SudokuGrid; solution: SudokuGrid } {
    // Start with a complete grid
    const solution = this.generateComplete();
    const puzzle = this.copyGrid(solution);
    
    // Remove cells based on difficulty
    const cellsToRemove = this.getCellsToRemove(difficulty);
    const positions = [];
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        positions.push({ row, col });
      }
    }
    
    // Shuffle positions
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }
    
    // Remove cells
    for (let i = 0; i < cellsToRemove && i < positions.length; i++) {
      const { row, col } = positions[i];
      puzzle[row][col] = null;
    }
    
    return { puzzle, solution };
  }

  private static generateComplete(): SudokuGrid {
    const grid = this.createEmptyGrid();
    
    // Fill the first row with numbers 1-9 shuffled
    const firstRow = Array.from({ length: 9 }, (_, i) => i + 1);
    for (let i = firstRow.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [firstRow[i], firstRow[j]] = [firstRow[j], firstRow[i]];
    }
    grid[0] = firstRow;
    
    // Solve the rest
    const solved = this.solve(grid);
    return solved || this.createEmptyGrid();
  }

  private static getCellsToRemove(difficulty: Difficulty): number {
    const cellCounts = {
      easy: 35,
      medium: 45,
      hard: 50,
      expert: 55,
      master: 60,
      extreme: 65
    };
    return cellCounts[difficulty];
  }

  static getHint(grid: SudokuGrid): Hint | null {
    // Find the easiest cell to solve
    let bestHint: Hint | null = null;
    let minPossibilities = 10;

    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (grid[row][col] === null) {
          const possibilities = [];
          for (let num = 1; num <= 9; num++) {
            if (this.isValidMove(grid, row, col, num)) {
              possibilities.push(num);
            }
          }
          
          if (possibilities.length === 1) {
            return {
              row,
              col,
              value: possibilities[0],
              reason: `This is the only number that can go in this cell.`
            };
          }
          
          if (possibilities.length > 0 && possibilities.length < minPossibilities) {
            minPossibilities = possibilities.length;
            bestHint = {
              row,
              col,
              value: possibilities[0],
              reason: `This cell has only ${possibilities.length} possibilities: ${possibilities.join(', ')}.`
            };
          }
        }
      }
    }

    return bestHint;
  }

  static getDifficultyName(difficulty: Difficulty): string {
    const names = {
      easy: '简单',
      medium: '中等',
      hard: '困难',
      expert: '专家',
      master: '大师',
      extreme: '极限'
    };
    return names[difficulty];
  }

  static getDifficultyColor(difficulty: Difficulty): string {
    const colors = {
      easy: 'text-green-600',
      medium: 'text-blue-600',
      hard: 'text-yellow-600',
      expert: 'text-orange-600',
      master: 'text-red-600',
      extreme: 'text-purple-600'
    };
    return colors[difficulty];
  }
}
