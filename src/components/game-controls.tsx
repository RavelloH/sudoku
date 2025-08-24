'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  RotateCw, 
  Lightbulb, 
  RefreshCw,
  Clock,
  Trophy
} from 'lucide-react';
import { Difficulty } from '@/types/sudoku';
import { SudokuUtils } from '@/lib/sudoku';
import { cn } from '@/lib/utils';

interface GameControlsProps {
  difficulty: Difficulty;
  startTime: Date;
  isCompleted: boolean;
  isPaused: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onPause: () => void;
  onResume: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onHint: () => void;
  onNewGame: () => void;
  onRestart: () => void;
  className?: string;
}

export function GameControls({
  difficulty,
  startTime,
  isCompleted,
  isPaused,
  canUndo,
  canRedo,
  onPause,
  onResume,
  onUndo,
  onRedo,
  onHint,
  onNewGame,
  onRestart,
  className
}: GameControlsProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    if (isCompleted || isPaused) return;

    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, [isCompleted, isPaused]);

  const getElapsedTime = (): string => {
    if (isCompleted) return '已完成';
    
    const elapsed = Math.floor((currentTime.getTime() - startTime.getTime()) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}分${secs}秒`;
  };

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* Game Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge 
            variant="secondary" 
            className={cn("text-sm", SudokuUtils.getDifficultyColor(difficulty))}
          >
            {SudokuUtils.getDifficultyName(difficulty)}
          </Badge>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span className="font-mono">
              {getElapsedTime()}
            </span>
          </div>
        </div>

        {isCompleted && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400"
          >
            <Trophy className="w-4 h-4" />
            <span>恭喜完成！</span>
          </motion.div>
        )}
      </div>

      {/* Control Buttons */}
      <div className="flex flex-wrap gap-2">
        {/* Play/Pause */}
        {!isCompleted && (
          <Button
            variant="outline"
            size="sm"
            onClick={isPaused ? onResume : onPause}
            className="flex items-center gap-2"
          >
            {isPaused ? (
              <>
                <Play className="w-4 h-4" />
                继续
              </>
            ) : (
              <>
                <Pause className="w-4 h-4" />
                暂停
              </>
            )}
          </Button>
        )}

        {/* Undo */}
        <Button
          variant="outline"
          size="sm"
          onClick={onUndo}
          disabled={!canUndo}
          className="flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          撤销
        </Button>

        {/* Redo */}
        <Button
          variant="outline"
          size="sm"
          onClick={onRedo}
          disabled={!canRedo}
          className="flex items-center gap-2"
        >
          <RotateCw className="w-4 h-4" />
          重做
        </Button>

        {/* Hint */}
        {!isCompleted && (
          <Button
            variant="outline"
            size="sm"
            onClick={onHint}
            className="flex items-center gap-2"
          >
            <Lightbulb className="w-4 h-4" />
            提示
          </Button>
        )}

        {/* Restart */}
        <Button
          variant="outline"
          size="sm"
          onClick={onRestart}
          className="flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          重新开始
        </Button>

        {/* New Game */}
        <Button
          variant="default"
          size="sm"
          onClick={onNewGame}
          className="flex items-center gap-2"
        >
          <Play className="w-4 h-4" />
          新游戏
        </Button>
      </div>

      {/* Status Messages */}
      <div className="min-h-[2rem] flex items-center">
        {isPaused && !isCompleted && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm text-muted-foreground"
          >
            游戏已暂停，点击继续恢复游戏
          </motion.p>
        )}
      </div>
    </div>
  );
}
