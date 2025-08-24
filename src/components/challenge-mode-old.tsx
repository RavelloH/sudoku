'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { SudokuGridComponent } from '@/components/sudoku-grid';
import { GameControls } from '@/components/game-controls';
import { SudokuUtils } from '@/lib/sudoku';
import { StorageUtils } from '@/lib/storage';
import { 
  SudokuGrid, 
  SudokuGame, 
  Move, 
  Difficulty,
  Hint 
} from '@/types/sudoku';
import { 
  Sparkles, 
  Trophy, 
  Clock, 
  RotateCcw,
  Play,
  Pause,
  Settings,
  Lightbulb,
  Undo,
  Redo,
  RotateCw,
  Zap
} from 'lucide-react';

export function ChallengeMode() {
  const [currentGame, setCurrentGame] = useState<SudokuGame | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [showNewGameDialog, setShowNewGameDialog] = useState(false);
  const [showRestartDialog, setShowRestartDialog] = useState(false);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('medium');

  // 初始化游戏
  useEffect(() => {
    startNewGame(selectedDifficulty);
  }, []);

  const generateGameId = (): string => {
    return `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const startNewGame = useCallback((difficulty: Difficulty) => {
    const { puzzle, solution } = SudokuUtils.generatePuzzle(difficulty);
    
    const game: SudokuGame = {
      id: generateGameId(),
      initialGrid: SudokuUtils.copyGrid(puzzle),
      currentGrid: SudokuUtils.copyGrid(puzzle),
      solutionGrid: solution,
      difficulty,
      startTime: new Date(),
      isCompleted: false,
      moves: []
    };

    setCurrentGame(game);
    setSelectedCell(null);
    setIsPaused(false);
    setCurrentMoveIndex(-1);
    
    // 保存游戏
    StorageUtils.saveGame(game);
  }, []);

  const makeMove = useCallback((row: number, col: number, value: number | null) => {
    if (!currentGame || isPaused) return;

    const previousValue = currentGame.currentGrid[row][col];
    if (previousValue === value) return;

    const move: Move = {
      row,
      col,
      value,
      previousValue,
      timestamp: new Date()
    };

    // 创建新的游戏状态
    const newGrid = SudokuUtils.copyGrid(currentGame.currentGrid);
    newGrid[row][col] = value;

    // 截断之后的历史记录（如果用户之前撤销了一些操作）
    const newMoves = [...currentGame.moves.slice(0, currentMoveIndex + 1), move];

    const updatedGame: SudokuGame = {
      ...currentGame,
      currentGrid: newGrid,
      moves: newMoves
    };

    // 检查是否完成
    if (SudokuUtils.isComplete(newGrid)) {
      const endTime = new Date();
      const duration = Math.floor((endTime.getTime() - currentGame.startTime.getTime()) / 1000);
      
      updatedGame.isCompleted = true;
      updatedGame.endTime = endTime;
      updatedGame.duration = duration;

      // 更新统计
      StorageUtils.updateStats(updatedGame);

      // 庆祝动画
      setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      }, 100);

      toast.success(`恭喜完成！用时：${Math.floor(duration / 60)}分${duration % 60}秒`, {
        icon: <Trophy className="w-4 h-4" />,
        duration: 5000
      });
    }

    setCurrentGame(updatedGame);
    setCurrentMoveIndex(newMoves.length - 1);
    
    // 保存游戏
    StorageUtils.saveGame(updatedGame);
  }, [currentGame, isPaused, currentMoveIndex]);

  const undoMove = useCallback(() => {
    if (!currentGame || currentMoveIndex < 0) return;

    const move = currentGame.moves[currentMoveIndex];
    const newGrid = SudokuUtils.copyGrid(currentGame.currentGrid);
    newGrid[move.row][move.col] = move.previousValue;

    const updatedGame: SudokuGame = {
      ...currentGame,
      currentGrid: newGrid,
      isCompleted: false,
      endTime: undefined,
      duration: undefined
    };

    setCurrentGame(updatedGame);
    setCurrentMoveIndex(currentMoveIndex - 1);
    
    StorageUtils.saveGame(updatedGame);
  }, [currentGame, currentMoveIndex]);

  const redoMove = useCallback(() => {
    if (!currentGame || currentMoveIndex >= currentGame.moves.length - 1) return;

    const move = currentGame.moves[currentMoveIndex + 1];
    const newGrid = SudokuUtils.copyGrid(currentGame.currentGrid);
    newGrid[move.row][move.col] = move.value;

    const updatedGame: SudokuGame = {
      ...currentGame,
      currentGrid: newGrid
    };

    // 重新检查是否完成
    if (SudokuUtils.isComplete(newGrid)) {
      const endTime = new Date();
      const duration = Math.floor((endTime.getTime() - currentGame.startTime.getTime()) / 1000);
      
      updatedGame.isCompleted = true;
      updatedGame.endTime = endTime;
      updatedGame.duration = duration;
    }

    setCurrentGame(updatedGame);
    setCurrentMoveIndex(currentMoveIndex + 1);
    
    StorageUtils.saveGame(updatedGame);
  }, [currentGame, currentMoveIndex]);

  const getHint = useCallback(() => {
    if (!currentGame || isPaused) return;

    const hint = SudokuUtils.getHint(currentGame.currentGrid);
    if (hint) {
      toast.info(
        `提示：第${hint.row + 1}行第${hint.col + 1}列应该填入${hint.value}。${hint.reason}`,
        {
          icon: <Sparkles className="w-4 h-4" />,
          duration: 5000
        }
      );
      
      // 高亮提示的单元格
      setSelectedCell({ row: hint.row, col: hint.col });
    } else {
      toast.info('当前没有明显的提示可用，请继续分析！');
    }
  }, [currentGame, isPaused]);

  const restartGame = useCallback(() => {
    if (!currentGame) return;

    const restartedGame: SudokuGame = {
      ...currentGame,
      currentGrid: SudokuUtils.copyGrid(currentGame.initialGrid),
      startTime: new Date(),
      endTime: undefined,
      duration: undefined,
      isCompleted: false,
      moves: []
    };

    setCurrentGame(restartedGame);
    setSelectedCell(null);
    setIsPaused(false);
    setCurrentMoveIndex(-1);
    
    StorageUtils.saveGame(restartedGame);
    setShowRestartDialog(false);
  }, [currentGame]);

  const conflicts = currentGame ? SudokuUtils.findConflicts(currentGame.currentGrid) : [];

  if (!currentGame) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>正在生成数独...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* 难度选择和新游戏 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              挑战模式
            </CardTitle>
            <div className="flex items-center gap-3">
              <Select
                value={selectedDifficulty}
                onValueChange={(value: Difficulty) => setSelectedDifficulty(value)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">简单</SelectItem>
                  <SelectItem value="medium">中等</SelectItem>
                  <SelectItem value="hard">困难</SelectItem>
                  <SelectItem value="expert">专家</SelectItem>
                  <SelectItem value="master">大师</SelectItem>
                  <SelectItem value="extreme">极限</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={() => setShowNewGameDialog(true)}
                disabled={isPaused}
              >
                新游戏
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <GameControls
            difficulty={currentGame.difficulty}
            startTime={currentGame.startTime}
            isCompleted={currentGame.isCompleted}
            isPaused={isPaused}
            canUndo={currentMoveIndex >= 0}
            canRedo={currentMoveIndex < currentGame.moves.length - 1}
            onPause={() => setIsPaused(true)}
            onResume={() => setIsPaused(false)}
            onUndo={undoMove}
            onRedo={redoMove}
            onHint={getHint}
            onNewGame={() => setShowNewGameDialog(true)}
            onRestart={() => setShowRestartDialog(true)}
          />
        </CardContent>
      </Card>

      {/* 数独网格 */}
      <div className="flex justify-center">
        <div className="relative">
          <SudokuGridComponent
            grid={currentGame.currentGrid}
            initialGrid={currentGame.initialGrid}
            conflicts={conflicts}
            onCellChange={makeMove}
            onCellSelect={(row, col) => setSelectedCell({ row, col })}
            selectedCell={selectedCell}
            readOnly={isPaused || currentGame.isCompleted}
          />
          
          {/* 暂停遮罩 */}
          <AnimatePresence>
            {isPaused && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-lg flex items-center justify-center"
              >
                <div className="text-center space-y-4">
                  <Clock className="w-12 h-12 mx-auto text-muted-foreground" />
                  <p className="text-lg font-medium">游戏已暂停</p>
                  <Button onClick={() => setIsPaused(false)}>
                    继续游戏
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 完成庆祝 */}
      <AnimatePresence>
        {currentGame.isCompleted && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          >
            <Card className="w-full max-w-md mx-4">
              <CardHeader className="text-center">
                <motion.div
                  initial={{ rotate: 0 }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, ease: "easeInOut" }}
                  className="w-16 h-16 mx-auto mb-4 bg-primary rounded-full flex items-center justify-center"
                >
                  <Trophy className="w-8 h-8 text-primary-foreground" />
                </motion.div>
                <CardTitle className="text-2xl">恭喜完成！</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center space-y-2">
                  <p className="text-lg">
                    难度：<span className="font-semibold">{SudokuUtils.getDifficultyName(currentGame.difficulty)}</span>
                  </p>
                  <p className="text-lg">
                    用时：<span className="font-semibold">{Math.floor((currentGame.duration || 0) / 60)}分{(currentGame.duration || 0) % 60}秒</span>
                  </p>
                  <p className="text-lg">
                    步数：<span className="font-semibold">{currentGame.moves.length}</span>
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowNewGameDialog(true)}
                    className="flex-1"
                  >
                    再来一局
                  </Button>
                  <Button 
                    onClick={() => setShowRestartDialog(true)}
                    className="flex-1"
                  >
                    重新挑战
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 新游戏确认对话框 */}
      <AlertDialog open={showNewGameDialog} onOpenChange={setShowNewGameDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>开始新游戏</AlertDialogTitle>
            <AlertDialogDescription>
              确定要开始一个新的{SudokuUtils.getDifficultyName(selectedDifficulty)}难度游戏吗？当前进度将会丢失。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                startNewGame(selectedDifficulty);
                setShowNewGameDialog(false);
              }}
            >
              确定
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 重新开始确认对话框 */}
      <AlertDialog open={showRestartDialog} onOpenChange={setShowRestartDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>重新开始</AlertDialogTitle>
            <AlertDialogDescription>
              确定要重新开始当前游戏吗？所有进度将会丢失。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={restartGame}>
              确定
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
