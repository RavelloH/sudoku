import { SudokuGame, GameStats, Difficulty, Move } from '@/types/sudoku';

const STORAGE_KEYS = {
  GAMES: 'sudoku_games',
  STATS: 'sudoku_stats',
  SETTINGS: 'sudoku_settings'
};

export interface GameSettings {
  theme: 'light' | 'dark' | 'system';
  showHints: boolean;
  autoSave: boolean;
}

export class StorageUtils {
  static saveGame(game: SudokuGame): void {
    try {
      const games = this.getAllGamesIncludingUnstarted();
      const existingIndex = games.findIndex(g => g.id === game.id);
      
      if (existingIndex >= 0) {
        games[existingIndex] = game;
      } else {
        games.push(game);
      }
      
      localStorage.setItem(STORAGE_KEYS.GAMES, JSON.stringify(games));
    } catch (error) {
      console.error('Failed to save game:', error);
    }
  }

  static getCurrentGame(): SudokuGame | null {
    try {
      // 从所有游戏中找到未完成的游戏作为当前游戏
      const allGames = this.getAllGamesIncludingUnstarted();
      const incompleteGames = allGames.filter(game => !game.isCompleted);
      
      // 如果有多个未完成的游戏，返回最近的一个
      if (incompleteGames.length === 0) return null;
      
      const currentGame = incompleteGames.reduce((latest, game) => {
        const latestTime = new Date(latest.startTime).getTime();
        const gameTime = new Date(game.startTime).getTime();
        return gameTime > latestTime ? game : latest;
      }, incompleteGames[0]);
      
      return currentGame;
    } catch (error) {
      console.error('Failed to load current game:', error);
      return null;
    }
  }

  static getAllGames(): SudokuGame[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.GAMES);
      if (!stored) return [];
      
      const games = JSON.parse(stored);
      return games
        .map((game: { startTime: string; endTime?: string; moves: Array<Move & { timestamp: string }> } & Record<string, unknown>) => ({
          ...game,
          startTime: new Date(game.startTime),
          endTime: game.endTime ? new Date(game.endTime) : undefined,
          moves: game.moves.map((move: Move & { timestamp: string }) => ({
            row: move.row,
            col: move.col,
            value: move.value,
            previousValue: move.previousValue,
            timestamp: new Date(move.timestamp)
          }))
        }))
        .filter((game: SudokuGame) => game.moves.length > 0); // 只返回已开始的游戏
    } catch (error) {
      console.error('Failed to load games:', error);
      return [];
    }
  }

  static getAllGamesIncludingUnstarted(): SudokuGame[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.GAMES);
      if (!stored) return [];
      
      const games = JSON.parse(stored);
      return games.map((game: { startTime: string; endTime?: string; moves: Array<Move & { timestamp: string }> } & Record<string, unknown>) => ({
        ...game,
        startTime: new Date(game.startTime),
        endTime: game.endTime ? new Date(game.endTime) : undefined,
        moves: game.moves.map((move: Move & { timestamp: string }) => ({
          row: move.row,
          col: move.col,
          value: move.value,
          previousValue: move.previousValue,
          timestamp: new Date(move.timestamp)
        }))
      }));
    } catch (error) {
      console.error('Failed to load games:', error);
      return [];
    }
  }

  static getGame(id: string): SudokuGame | null {
    const games = this.getAllGames();
    return games.find(game => game.id === id) || null;
  }

  static deleteGame(id: string): void {
    try {
      const games = this.getAllGamesIncludingUnstarted().filter(game => game.id !== id);
      localStorage.setItem(STORAGE_KEYS.GAMES, JSON.stringify(games));
    } catch (error) {
      console.error('Failed to delete game:', error);
    }
  }

  static getStats(): GameStats {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.STATS);
      const baseStats = stored ? JSON.parse(stored) : this.getDefaultStats();
      
      // 从实际的游戏记录中重新计算总游戏数
      const allGames = this.getAllGames();
      const stats = {
        ...baseStats,
        totalGames: allGames.length
      };
      
      return stats;
    } catch (error) {
      console.error('Failed to load stats:', error);
      return this.getDefaultStats();
    }
  }

  static updateStats(completedGame: SudokuGame): void {
    try {
      const stats = this.getStats();
      const { difficulty, duration } = completedGame;
      
      if (!duration) return;
      
      // 只增加已完成游戏数，总游戏数从所有游戏记录中计算
      stats.completedGames++;
      
      // Update best time
      if (!stats.bestTimes[difficulty] || duration < stats.bestTimes[difficulty]!) {
        stats.bestTimes[difficulty] = duration;
      }
      
      // Update average time
      const completedGamesOfDifficulty = this.getAllGames().filter(
        game => game.difficulty === difficulty && game.isCompleted && game.duration
      );
      
      if (completedGamesOfDifficulty.length > 0) {
        const totalTime = completedGamesOfDifficulty.reduce(
          (sum, game) => sum + (game.duration || 0), 
          0
        );
        stats.averageTimes[difficulty] = Math.round(totalTime / completedGamesOfDifficulty.length);
      }
      
      localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
    } catch (error) {
      console.error('Failed to update stats:', error);
    }
  }

  static getSettings(): GameSettings {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (!stored) return this.getDefaultSettings();
      
      return { ...this.getDefaultSettings(), ...JSON.parse(stored) };
    } catch (error) {
      console.error('Failed to load settings:', error);
      return this.getDefaultSettings();
    }
  }

  static saveSettings(settings: Partial<GameSettings>): void {
    try {
      const currentSettings = this.getSettings();
      const newSettings = { ...currentSettings, ...settings };
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(newSettings));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }

  static exportData(): string {
    const games = this.getAllGames();
    const stats = this.getStats();
    const settings = this.getSettings();
    
    return JSON.stringify({
      games,
      stats,
      settings,
      exportDate: new Date().toISOString(),
      version: '1.0'
    }, null, 2);
  }

  static importData(data: string): boolean {
    try {
      const parsed = JSON.parse(data);
      
      if (parsed.games) {
        localStorage.setItem(STORAGE_KEYS.GAMES, JSON.stringify(parsed.games));
      }
      
      if (parsed.stats) {
        localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(parsed.stats));
      }
      
      if (parsed.settings) {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(parsed.settings));
      }
      
      return true;
    } catch (error) {
      console.error('Failed to import data:', error);
      return false;
    }
  }

  static clearAllData(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.GAMES);
      localStorage.removeItem(STORAGE_KEYS.STATS);
      localStorage.removeItem(STORAGE_KEYS.SETTINGS);
      
      // 清理旧的 CURRENT_GAME 键（如果存在）
      if (localStorage.getItem('sudoku_current_game')) {
        localStorage.removeItem('sudoku_current_game');
      }
    } catch (error) {
      console.error('Failed to clear data:', error);
    }
  }

  private static getDefaultStats(): GameStats {
    return {
      totalGames: 0,
      completedGames: 0,
      bestTimes: {
        easy: null,
        medium: null,
        hard: null,
        expert: null,
        master: null,
        extreme: null
      },
      averageTimes: {
        easy: null,
        medium: null,
        hard: null,
        expert: null,
        master: null,
        extreme: null
      }
    };
  }

  private static getDefaultSettings(): GameSettings {
    return {
      theme: 'system',
      showHints: true,
      autoSave: true
    };
  }
}
