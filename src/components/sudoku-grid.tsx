'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { SudokuGrid, SudokuCell, Conflict } from '@/types/sudoku';
import { Button } from '@/components/ui/button';
import { Trash2, Play } from 'lucide-react';

interface SudokuGridComponentProps {
  grid: SudokuGrid;
  initialGrid: SudokuGrid;
  conflicts: Conflict[];
  autoSolvedCells?: Set<string>;
  onCellChange: (row: number, col: number, value: SudokuCell) => void;
  onCellSelect?: (row: number, col: number) => void;
  selectedCell?: { row: number; col: number } | null;
  readOnly?: boolean;
  highlightedCells?: Set<string>;
  className?: string;
  isPaused?: boolean;
  onContinue?: () => void;
}

interface NumberWheelProps {
  onSelect: (value: SudokuCell) => void;
  onClose: () => void;
  position: { x: number; y: number };
  currentValue?: SudokuCell;
}

function NumberWheel({ onSelect, onClose, position, currentValue }: NumberWheelProps) {
  const wheelRef = useRef<HTMLDivElement>(null);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number } | null>(null);
  const [hoveredNumber, setHoveredNumber] = useState<number | null>(null);

  const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const radius = 80;
  const center = { x: radius, y: radius };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wheelRef.current && !wheelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const getNumberPosition = (index: number) => {
    const angle = (index * 2 * Math.PI) / numbers.length - Math.PI / 2;
    const x = center.x + radius * 0.7 * Math.cos(angle);
    const y = center.y + radius * 0.7 * Math.sin(angle);
    return { x, y };
  };

  const handleClick = (value: SudokuCell) => {
    onSelect(value);
    onClose();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setDragStartPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragStartPos) return;

    const rect = wheelRef.current?.getBoundingClientRect();
    if (!rect) return;

    const centerX = rect.left + radius;
    const centerY = rect.top + radius;
    const mouseX = e.clientX - centerX;
    const mouseY = e.clientY - centerY;
    const distance = Math.sqrt(mouseX * mouseX + mouseY * mouseY);

    if (distance > 30 && distance < radius) {
      const angle = Math.atan2(mouseY, mouseX) + Math.PI / 2;
      const normalizedAngle = angle < 0 ? angle + 2 * Math.PI : angle;
      const section = Math.floor((normalizedAngle / (2 * Math.PI)) * numbers.length);
      const hoveredNum = numbers[section];
      setHoveredNumber(hoveredNum);
    } else {
      setHoveredNumber(null);
    }
  };

  const handleMouseUp = () => {
    if (hoveredNumber) {
      handleClick(hoveredNumber);
    }
    setDragStartPos(null);
    setHoveredNumber(null);
  };

  return (
    <motion.div
      ref={wheelRef}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className="fixed z-50 pointer-events-auto"
      style={{
        left: position.x - radius,
        top: position.y - radius,
        width: radius * 2,
        height: radius * 2
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Background circle */}
      <div className="absolute inset-0 bg-background/95 backdrop-blur-sm border border-primary/20 rounded-full shadow-lg" />
      
      {/* Center delete button */}
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 p-0 rounded-full hover:bg-destructive/20"
        onClick={() => handleClick(null)}
      >
        <Trash2 className="w-4 h-4" />
      </Button>
      
      {/* Numbers */}
      {numbers.map((number, index) => {
        const pos = getNumberPosition(index);
        const isHovered = hoveredNumber === number;
        const isCurrent = currentValue === number;
        
        return (
          <motion.button
            key={number}
            className={cn(
              "absolute w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transform -translate-x-1/2 -translate-y-1/2 transition-all",
              "hover:bg-primary hover:text-primary-foreground",
              isCurrent && "bg-primary text-primary-foreground",
              isHovered && "scale-110 bg-primary/80 text-primary-foreground"
            )}
            style={{ left: pos.x, top: pos.y }}
            onClick={() => handleClick(number)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            {number}
          </motion.button>
        );
      })}
    </motion.div>
  );
}

export function SudokuGridComponent({
  grid,
  initialGrid,
  conflicts,
  autoSolvedCells = new Set(),
  onCellChange,
  onCellSelect,
  selectedCell,
  readOnly = false,
  highlightedCells = new Set(),
  className,
  isPaused = false,
  onContinue
}: SudokuGridComponentProps) {
  const [showWheel, setShowWheel] = useState(false);
  const [wheelPosition, setWheelPosition] = useState({ x: 0, y: 0 });
  const [wheelCell, setWheelCell] = useState<{ row: number; col: number } | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const isInitialCell = (row: number, col: number): boolean => {
    return initialGrid[row][col] !== null;
  };

  const isConflictCell = (row: number, col: number): boolean => {
    return conflicts.some(conflict => 
      conflict.cells.some(cell => cell.row === row && cell.col === col)
    );
  };

  const getConflictType = (row: number, col: number): string | null => {
    const conflict = conflicts.find(c => 
      c.cells.some(cell => cell.row === row && cell.col === col)
    );
    return conflict?.type || null;
  };

  const isAutoSolvedCell = (row: number, col: number): boolean => {
    return autoSolvedCells.has(`${row}-${col}`);
  };

  const isHighlighted = (row: number, col: number): boolean => {
    return highlightedCells.has(`${row}-${col}`);
  };

  const handleCellClick = (row: number, col: number, e: React.MouseEvent) => {
    if (readOnly || isInitialCell(row, col) || isAutoSolvedCell(row, col) || isPaused) return;

    onCellSelect?.(row, col);

    if (isMobile) {
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      setWheelPosition({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      });
      setWheelCell({ row, col });
      setShowWheel(true);
    }
  };

  const handleCellLongPress = (row: number, col: number, e: React.MouseEvent | React.TouchEvent) => {
    if (readOnly || isInitialCell(row, col) || isPaused) return;

    e.preventDefault();
    
    const clientX = 'touches' in e ? e.touches[0]?.clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0]?.clientY : e.clientY;
    
    setWheelPosition({ x: clientX || 0, y: clientY || 0 });
    setWheelCell({ row, col });
    setShowWheel(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent, row: number, col: number) => {
    if (readOnly || isInitialCell(row, col) || isPaused) return;

    const key = e.key;
    if (key >= '1' && key <= '9') {
      onCellChange(row, col, parseInt(key));
    } else if (key === 'Backspace' || key === 'Delete' || key === '0') {
      onCellChange(row, col, null);
    }
  };

  const handleWheelSelect = (value: SudokuCell) => {
    if (wheelCell) {
      onCellChange(wheelCell.row, wheelCell.col, value);
    }
    setShowWheel(false);
    setWheelCell(null);
  };

  const getCellBackground = (row: number, col: number) => {
    const isSelected = selectedCell?.row === row && selectedCell?.col === col;
    const isConflict = isConflictCell(row, col);
    const conflictType = getConflictType(row, col);
    const isHighlightedCell = isHighlighted(row, col);
    const isInitial = isInitialCell(row, col);
    const isAutoSolved = isAutoSolvedCell(row, col);
    
    if (isSelected) return 'bg-primary/20';
    if (isConflict) {
      // 所有冲突的数字都显示黄色背景（包括初始数字）
      if (conflictType === 'row') return 'bg-yellow-200/60 dark:bg-yellow-800/30';
      if (conflictType === 'column') return 'bg-yellow-200/60 dark:bg-yellow-800/30';
      if (conflictType === 'box') return 'bg-yellow-200/60 dark:bg-yellow-800/30';
      return 'bg-yellow-100/80 dark:bg-yellow-900/40';
    }
    if (isAutoSolved) {
      // 自动推导的数字显示黄色背景
      return 'bg-yellow-100/60 dark:bg-yellow-900/30';
    }
    if (isHighlightedCell) return 'bg-green-100/60 dark:bg-green-900/30';
    
    return 'bg-background hover:bg-muted/30';
  };

  // 渲染单个格子
  const renderCell = (row: number, col: number) => {
    const cell = grid[row][col];
    const isSelected = selectedCell?.row === row && selectedCell?.col === col;
    const isInitial = isInitialCell(row, col);
    const isAutoSolved = isAutoSolvedCell(row, col);
    const isConflict = isConflictCell(row, col);
    
    // 调试日志
    if (cell && isAutoSolved) {
      console.log(`Cell ${row}-${col}: ${cell} is auto-solved`);
    }
    
    // 计算边框样式
    const isRightThick = (col + 1) % 3 === 0 && col < 8;
    const isBottomThick = (row + 1) % 3 === 0 && row < 8;
    
    return (
      <motion.button
        key={`${row}-${col}`}
        className={cn(
          "relative w-full h-full flex items-center justify-center text-base md:text-lg font-medium",
          "border-r border-b border-border/40 transition-all duration-200",
          isRightThick && "border-r-2 border-r-border",
          isBottomThick && "border-b-2 border-b-border",
          getCellBackground(row, col),
          isSelected && "ring-2 ring-primary ring-inset z-20",
          !readOnly && !isInitial && !isAutoSolved && !isPaused && "cursor-pointer",
          (readOnly || isInitial || isAutoSolved || isPaused) && "cursor-default"
        )}
        onClick={(e) => handleCellClick(row, col, e)}
        onMouseDown={(e) => {
          if (isMobile && !isPaused && !isAutoSolvedCell(row, col)) {
            const timer = setTimeout(() => {
              handleCellLongPress(row, col, e);
            }, 500);
            
            const cleanup = () => {
              clearTimeout(timer);
              document.removeEventListener('mouseup', cleanup);
            };
            
            document.addEventListener('mouseup', cleanup);
          }
        }}
        onTouchStart={(e) => {
          if (!isPaused && !isAutoSolvedCell(row, col)) {
            const timer = setTimeout(() => {
              handleCellLongPress(row, col, e);
            }, 500);
            
            const cleanup = () => {
              clearTimeout(timer);
              document.removeEventListener('touchend', cleanup);
            };
            
            document.addEventListener('touchend', cleanup);
          }
        }}
        onKeyDown={(e) => handleKeyDown(e, row, col)}
        tabIndex={readOnly || isInitial || isAutoSolved || isPaused ? -1 : 0}
        disabled={readOnly || isInitial || isAutoSolved || isPaused}
        whileHover={!readOnly && !isInitial && !isAutoSolved && !isPaused ? { scale: 1.02 } : {}}
        whileTap={!readOnly && !isInitial && !isAutoSolved && !isPaused ? { scale: 0.98 } : {}}
      >
        <AnimatePresence mode="wait">
          {cell && (
            <motion.span
              key={`${row}-${col}-${cell}`}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ 
                type: 'spring', 
                stiffness: 400, 
                damping: 25,
                duration: 0.15
              }}
              className={cn(
                "font-semibold",
                isInitial && "text-foreground",
                !isInitial && !isAutoSolved && "text-primary",
                isAutoSolved && "text-muted-foreground/60", // 暗灰色，更透明
                isConflict && !isInitial && "text-yellow-600 dark:text-yellow-400" // 只有用户输入的冲突数字才变色
              )}
            >
              {cell}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    );
  };

  return (
    <div className={cn("relative", className)}>
      {/* 暂停覆盖层和继续按钮 */}
      {isPaused && (
        <div className="absolute inset-0 z-10 flex items-center justify-center backdrop-blur-sm rounded-xl">
          <Button 
            onClick={onContinue}
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 py-4 text-lg shadow-lg"
          >
            <Play className="w-6 h-6 mr-2" />
            继续游戏
          </Button>
        </div>
      )}
      
      {/* 主棋盘容器 */}
      <div className={cn(
        "w-full max-w-lg mx-auto bg-card rounded-xl border transition-all duration-300 card-enhanced",
        isPaused && "blur-sm"
      )}>
        {/* 9x9统一网格 */}
        <div className="grid grid-cols-9 grid-rows-9 bg-background border-2 border-border w-full aspect-square rounded-lg overflow-hidden">
          {/* 渲染所有格子 */}
          {Array.from({ length: 81 }).map((_, index) => {
            const row = Math.floor(index / 9);
            const col = index % 9;
            return renderCell(row, col);
          })}
        </div>
      </div>

      {/* 数字轮盘 */}
      <AnimatePresence>
        {showWheel && !isPaused && (
          <NumberWheel
            onSelect={handleWheelSelect}
            onClose={() => {
              setShowWheel(false);
              setWheelCell(null);
            }}
            position={wheelPosition}
            currentValue={wheelCell ? grid[wheelCell.row][wheelCell.col] : null}
          />
        )}
      </AnimatePresence>
    </div>
  );
}