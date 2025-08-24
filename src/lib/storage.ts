import { SudokuGame, GameStats, Difficulty } from '@/types/sudoku';

const STORAGE_KEYS = {
  GAMES: 'sudoku_games',
  STATS: 'sudoku_stats',
  SETTINGS: 'sudoku_settings',
  CURRENT_GAME: 'sudoku_current_game'
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
      
      // 如果游戏尚未完成，也保存为当前游戏
      if (!game.isCompleted) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_GAME, JSON.stringify(game));
      } else {
        // 如果游戏完成，清除当前游戏
        localStorage.removeItem(STORAGE_KEYS.CURRENT_GAME);
      }
    } catch (error) {
      console.error('Failed to save game:', error);
    }
  }

  static getCurrentGame(): SudokuGame | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CURRENT_GAME);
      if (!stored) return null;
      
      const game = JSON.parse(stored);
      return {
        ...game,
        startTime: new Date(game.startTime),
        endTime: game.endTime ? new Date(game.endTime) : undefined,
        moves: game.moves.map((move: any) => ({
          ...move,
          timestamp: new Date(move.timestamp)
        }))
      };
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
        .map((game: any) => ({
          ...game,
          startTime: new Date(game.startTime),
          endTime: game.endTime ? new Date(game.endTime) : undefined,
          moves: game.moves.map((move: any) => ({
            ...move,
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
      return games.map((game: any) => ({
        ...game,
        startTime: new Date(game.startTime),
        endTime: game.endTime ? new Date(game.endTime) : undefined,
        moves: game.moves.map((move: any) => ({
          ...move,
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
      if (!stored) return this.getDefaultStats();
      
      return JSON.parse(stored);
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
      
      stats.totalGames++;
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
