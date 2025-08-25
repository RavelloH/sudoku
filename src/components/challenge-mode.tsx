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
  DialogTrigger,
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
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { SudokuGridComponent } from '@/components/sudoku-grid';
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
  Zap,
  Plus
} from 'lucide-react';

interface ChallengeProps {
  onSwitchToSolver?: (grid: SudokuGrid) => void;
  gameToLoad?: SudokuGame | null;
}

export function ChallengeMode({ onSwitchToSolver, gameToLoad }: ChallengeProps) {
  const [currentGame, setCurrentGame] = useState<SudokuGame | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [isPaused, setIsPaused] = useState(false); // 默认不暂停，新游戏时直接可以开始
  const [showNewGameDialog, setShowNewGameDialog] = useState(false);
  const [showRestartDialog, setShowRestartDialog] = useState(false);
  const [showDifficultyDialog, setShowDifficultyDialog] = useState(false);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('medium');
  const [tempSelectedDifficulty, setTempSelectedDifficulty] = useState<Difficulty | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [gameStarted, setGameStarted] = useState(false); // 是否已开始游戏（输入了第一个数字）
  const [highlightedCells, setHighlightedCells] = useState<Set<string>>(new Set());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const gameLoadedRef = useRef(false); // 跟踪是否已经处理了 gameToLoad

  // 计时器逻辑
  useEffect(() => {
    if (currentGame && gameStarted && !isPaused && !currentGame.isCompleted) {
      intervalRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [currentGame, gameStarted, isPaused, currentGame?.isCompleted]);

  // 页面关闭前提示和自动暂停
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (currentGame && gameStarted && !isPaused && !currentGame.isCompleted) {
        e.preventDefault();
        e.returnValue = '是否需要暂停游戏？';
        // 自动暂停游戏
        setIsPaused(true);
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentGame, gameStarted, isPaused]);

  // 恢复已保存的游戏或加载传入的游戏
  useEffect(() => {
    // 如果已经处理了 gameToLoad，不再重复处理
    if (gameLoadedRef.current) {
      return;
    }

    // 优先处理传入的游戏（从历史记录页面点击继续/重开）
    if (gameToLoad) {
      setCurrentGame(gameToLoad);
      setCurrentMoveIndex(gameToLoad.moves.length - 1);
      setSelectedDifficulty(gameToLoad.difficulty);
      
      // 使用传入游戏的duration
      setElapsedTime(gameToLoad.duration || 0);
      
      setGameStarted(gameToLoad.moves.length > 0);
      setIsPaused(true); // 加载游戏时默认暂停
      
      // 如果是未完成的游戏，保存为当前游戏
      if (!gameToLoad.isCompleted) {
        StorageUtils.saveGame(gameToLoad);
      }
      
      // 标记为已处理
      gameLoadedRef.current = true;
    } else {
      // 如果没有传入游戏，尝试恢复已保存的游戏
      const savedGame = StorageUtils.getCurrentGame();
      if (savedGame && !savedGame.isCompleted) {
        setCurrentGame(savedGame);
        setCurrentMoveIndex(savedGame.moves.length - 1);
        setSelectedDifficulty(savedGame.difficulty);
        
        // 恢复时使用保存的duration，而不是实时计算
        // 这样可以避免暂停后刷新页面时间还在变化的问题
        setElapsedTime(savedGame.duration || 0);
        
        setGameStarted(savedGame.moves.length > 0);
        setIsPaused(true); // 恢复时默认暂停
      } else {
        // 直接在这里创建新游戏，避免循环引用
        const { puzzle, solution } = SudokuUtils.generatePuzzle(selectedDifficulty);
        const game: SudokuGame = {
          id: `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          initialGrid: SudokuUtils.copyGrid(puzzle),
          currentGrid: SudokuUtils.copyGrid(puzzle),
          solutionGrid: solution,
          difficulty: selectedDifficulty,
          startTime: new Date(),
          isCompleted: false,
          moves: []
        };
        setCurrentGame(game);
        setSelectedCell(null);
        setIsPaused(false);
        setCurrentMoveIndex(-1);
        setElapsedTime(0);
        setGameStarted(false);
        setHighlightedCells(new Set());
        StorageUtils.saveGame(game);
      }
    }
  }, [gameToLoad, selectedDifficulty]);

  // 页面可见性变化时暂停/恢复计时
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsPaused(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // 难度选择对话框状态管理
  useEffect(() => {
    if (showDifficultyDialog) {
      setTempSelectedDifficulty(null);
    } else {
      setTempSelectedDifficulty(null);
    }
  }, [showDifficultyDialog]);

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
    setIsPaused(false); // 新游戏时不要暂停，让用户可以直接开始
    setCurrentMoveIndex(-1);
    setElapsedTime(0);
    setGameStarted(false);
    setHighlightedCells(new Set());
    
    // 立即保存到历史记录，确保统计准确
    StorageUtils.saveGame(game);
  }, []);

  const makeMove = useCallback((row: number, col: number, value: number | null, isHint: boolean = false) => {
    if (!currentGame || currentGame.isCompleted) return;

    const previousValue = currentGame.currentGrid[row][col];
    if (previousValue === value) return;

    // 如果这是第一次输入，开始计时
    if (!gameStarted) {
      setGameStarted(true);
      setIsPaused(false);
      // 更新开始时间并重新保存
      const updatedGame = {
        ...currentGame,
        startTime: new Date()
      };
      StorageUtils.saveGame(updatedGame);
      setCurrentGame(updatedGame);
    }

    const move: Move = {
      row,
      col,
      value,
      previousValue,
      timestamp: new Date()
    };

    const newGrid = SudokuUtils.copyGrid(currentGame.currentGrid);
    newGrid[row][col] = value;

    const newMoves = [...currentGame.moves.slice(0, currentMoveIndex + 1), move];

    const updatedGame: SudokuGame = {
      ...currentGame,
      currentGrid: newGrid,
      moves: newMoves,
      duration: elapsedTime,
      hintsUsed: isHint ? (currentGame.hintsUsed || 0) + 1 : (currentGame.hintsUsed || 0)
    };

    // 检查是否完成
    if (SudokuUtils.isComplete(newGrid)) {
      updatedGame.isCompleted = true;
      updatedGame.endTime = new Date();
      updatedGame.duration = elapsedTime;
      
      // 更新统计
      StorageUtils.updateStats(updatedGame);
      
      // 庆祝动画
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      
      toast.success('🎉 恭喜完成！', {
        description: `用时 ${Math.floor(elapsedTime / 60)}分${elapsedTime % 60}秒`
      });
    }

    setCurrentGame(updatedGame);
    setCurrentMoveIndex(newMoves.length - 1);
    
    // 总是保存游戏状态
    StorageUtils.saveGame(updatedGame);
  }, [currentGame, currentMoveIndex, elapsedTime, gameStarted]);

  const undo = useCallback(() => {
    if (!currentGame || currentMoveIndex < 0) return;

    const move = currentGame.moves[currentMoveIndex];
    const newGrid = SudokuUtils.copyGrid(currentGame.currentGrid);
    newGrid[move.row][move.col] = move.previousValue;

    const updatedGame = {
      ...currentGame,
      currentGrid: newGrid,
      duration: elapsedTime
    };

    setCurrentGame(updatedGame);
    setCurrentMoveIndex(currentMoveIndex - 1);
    
    // 总是保存游戏状态
    StorageUtils.saveGame(updatedGame);
  }, [currentGame, currentMoveIndex, elapsedTime, gameStarted]);

  const redo = useCallback(() => {
    if (!currentGame || currentMoveIndex >= currentGame.moves.length - 1) return;

    const move = currentGame.moves[currentMoveIndex + 1];
    const newGrid = SudokuUtils.copyGrid(currentGame.currentGrid);
    newGrid[move.row][move.col] = move.value;

    const updatedGame = {
      ...currentGame,
      currentGrid: newGrid,
      duration: elapsedTime
    };

    setCurrentGame(updatedGame);
    setCurrentMoveIndex(currentMoveIndex + 1);
    
    // 总是保存游戏状态
    StorageUtils.saveGame(updatedGame);
  }, [currentGame, currentMoveIndex, elapsedTime, gameStarted]);

  const getHint = useCallback(() => {
    if (!currentGame || currentGame.isCompleted) return;

    const hint = SudokuUtils.getHint(currentGame.currentGrid);
    if (hint) {
      // 如果游戏还没开始，提示数字应该开始计时
      if (!gameStarted) {
        setGameStarted(true);
        setIsPaused(false);
        // 更新开始时间并重新保存
        const updatedGame = {
          ...currentGame,
          startTime: new Date()
        };
        StorageUtils.saveGame(updatedGame);
        setCurrentGame(updatedGame);
      }
      
      // 填入提示数字
      makeMove(hint.row, hint.col, hint.value, true);
      
      // 高亮显示相关数字
      const cellsToHighlight = new Set<string>();
      
      // 高亮同行、同列、同宫的数字
      for (let i = 0; i < 9; i++) {
        // 同行
        if (currentGame.currentGrid[hint.row][i] === hint.value) {
          cellsToHighlight.add(`${hint.row}-${i}`);
        }
        // 同列
        if (currentGame.currentGrid[i][hint.col] === hint.value) {
          cellsToHighlight.add(`${i}-${hint.col}`);
        }
      }
      
      // 同宫
      const boxRow = Math.floor(hint.row / 3) * 3;
      const boxCol = Math.floor(hint.col / 3) * 3;
      for (let r = boxRow; r < boxRow + 3; r++) {
        for (let c = boxCol; c < boxCol + 3; c++) {
          if (currentGame.currentGrid[r][c] === hint.value) {
            cellsToHighlight.add(`${r}-${c}`);
          }
        }
      }
      
      // 特别高亮填入的数字
      cellsToHighlight.add(`${hint.row}-${hint.col}`);
      
      setHighlightedCells(cellsToHighlight);
      
      // 3秒后清除高亮
      setTimeout(() => {
        setHighlightedCells(new Set());
      }, 3000);
      
      toast.success('提示已填入', {
        description: hint.reason
      });
    } else {
      toast.info('暂无可用提示');
    }
  }, [currentGame, makeMove]);

  const restartGame = useCallback(() => {
    if (!currentGame) return;

    const restartedGame: SudokuGame = {
      ...currentGame,
      currentGrid: SudokuUtils.copyGrid(currentGame.initialGrid),
      moves: [],
      isCompleted: false,
      duration: 0,
      endTime: undefined
    };

    setCurrentGame(restartedGame);
    setCurrentMoveIndex(-1);
    setElapsedTime(0);
    setGameStarted(false);
    setIsPaused(false); // 重新开始游戏时不要暂停
    setHighlightedCells(new Set());
    setSelectedCell(null);
    
    // 立即保存重新开始的游戏
    StorageUtils.saveGame(restartedGame);
  }, [currentGame]);

  const handleSwitchToSolver = () => {
    if (currentGame && onSwitchToSolver) {
      onSwitchToSolver(currentGame.currentGrid);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const conflicts = currentGame ? SudokuUtils.findConflicts(currentGame.currentGrid) : [];

  const difficulties: { value: Difficulty; label: string; description: string }[] = [
    { value: 'easy', label: '简单', description: '适合新手，较多提示' },
    { value: 'medium', label: '中等', description: '平衡的挑战' },
    { value: 'hard', label: '困难', description: '需要一定技巧' },
    { value: 'expert', label: '专家', description: '高级解题技巧' },
    { value: 'master', label: '大师', description: '极具挑战性' },
    { value: 'extreme', label: '极限', description: '数独大师级别' },
  ];

  if (!currentGame) {
    return <div className="flex items-center justify-center min-h-[400px]">加载中...</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* 完成庆祝动画 */}
      <AnimatePresence>
        {currentGame.isCompleted && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          >
            <Card className="w-96 shadow-2xl border-primary/50">
              <CardHeader className="text-center">
                <motion.div
                  initial={{ rotate: 0 }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, ease: "easeInOut" }}
                  className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-primary to-primary/60 rounded-full flex items-center justify-center"
                >
                  <Trophy className="w-8 h-8 text-primary-foreground" />
                </motion.div>
                <CardTitle className="text-2xl">🎉 恭喜完成！</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center space-y-2">
                  <p className="text-lg">
                    难度：<span className="font-semibold">{SudokuUtils.getDifficultyName(currentGame.difficulty)}</span>
                  </p>
                  <p className="text-lg">
                    用时：<span className="font-semibold">{formatTime(currentGame.duration || 0)}</span>
                  </p>
                  <p className="text-lg">
                    步数：<span className="font-semibold">{currentGame.moves.length}</span>
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowDifficultyDialog(true)}
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

      {/* 主要游戏区域 - 上下布局 */}
      <div className="space-y-6">
        {/* 数独网格区域 - 带Card容器 */}
        <Card className="h-fit card-enhanced">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">数独游戏</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {SudokuUtils.getDifficultyName(currentGame.difficulty)}
                </Badge>
                {currentGame.isCompleted && (
                  <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                    已完成
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <SudokuGridComponent
                grid={currentGame.currentGrid}
                initialGrid={currentGame.initialGrid}
                conflicts={conflicts}
                onCellChange={makeMove}
                onCellSelect={(row, col) => setSelectedCell({ row, col })}
                selectedCell={selectedCell}
                highlightedCells={highlightedCells}
                onContinue={() => setIsPaused(false)}
                isPaused={isPaused}
                className="w-full max-w-lg"
              />
            </div>
          </CardContent>
        </Card>

        {/* 控制面板区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* 游戏状态 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">游戏状态</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-lg">
                <Clock className="w-5 h-5" />
                <span className="font-mono">{formatTime(elapsedTime)}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const newPausedState = !isPaused;
                    setIsPaused(newPausedState);
                    
                    // 如果正在暂停，保存当前时间
                    if (newPausedState && currentGame) {
                      const updatedGame = {
                        ...currentGame,
                        duration: elapsedTime
                      };
                      StorageUtils.saveGame(updatedGame);
                      setCurrentGame(updatedGame);
                    }
                  }}
                  disabled={!gameStarted || currentGame.isCompleted}
                >
                  {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                </Button>
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>步数：{currentGame.moves.length}</span>
                <span>提示：{currentGame.hintsUsed ?? 0}</span>
              </div>
              {!gameStarted && (
                <div className="text-sm text-muted-foreground">
                  输入第一个数字开始计时
                </div>
              )}
            </CardContent>
          </Card>

          {/* 游戏控制 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">游戏控制</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={undo}
                  disabled={currentMoveIndex < 0}
                >
                  <Undo className="w-4 h-4 mr-1" />
                  撤销
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={redo}
                  disabled={currentMoveIndex >= currentGame.moves.length - 1}
                >
                  <Redo className="w-4 h-4 mr-1" />
                  恢复
                </Button>
              </div>
              
              <Button
                variant="outline"
                className="w-full"
                onClick={getHint}
                disabled={currentGame.isCompleted}
              >
                <Lightbulb className="w-4 h-4 mr-2" />
                提示
              </Button>
              
              <Button
                variant="outline"
                className="w-full"
                onClick={handleSwitchToSolver}
              >
                <Zap className="w-4 h-4 mr-2" />
                自动解题
              </Button>
            </CardContent>
          </Card>

          {/* 游戏设置 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">游戏设置</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowDifficultyDialog(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                开始新游戏
              </Button>
              
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowDifficultyDialog(true)}
              >
                <Settings className="w-4 h-4 mr-2" />
                选择难度
              </Button>
              
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowRestartDialog(true)}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                重新开始
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 难度选择对话框 */}
      <Dialog open={showDifficultyDialog} onOpenChange={setShowDifficultyDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>选择难度</DialogTitle>
            <DialogDescription>
              选择一个适合你的难度级别开始新游戏
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 py-4">
            {difficulties.map((diff) => (
              <Button
                key={diff.value}
                variant={tempSelectedDifficulty === diff.value ? "default" : "outline"}
                className="justify-start h-auto p-4 text-left"
                onClick={() => {
                  setTempSelectedDifficulty(diff.value);
                  setSelectedDifficulty(diff.value);
                  startNewGame(diff.value);
                  setShowDifficultyDialog(false);
                }}
              >
                <div>
                  <div className="font-semibold">{diff.label}</div>
                  <div className="text-sm text-muted-foreground">{diff.description}</div>
                </div>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

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
            <AlertDialogAction onClick={() => {
              restartGame();
              setShowRestartDialog(false);
            }}>
              确定
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
