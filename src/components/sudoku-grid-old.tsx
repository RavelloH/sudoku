'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { SudokuGrid, SudokuCell, Conflict } from '@/types/sudoku';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

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
    const angle = (index * 2 * Math.PI) / 9 - Math.PI / 2;
    return {
      x: center.x + radius * 0.6 * Math.cos(angle),
      y: center.y + radius * 0.6 * Math.sin(angle)
    };
  };

  const getNumberFromPosition = (x: number, y: number): number | null => {
    const rect = wheelRef.current?.getBoundingClientRect();
    if (!rect) return null;

    const relativeX = x - rect.left - center.x;
    const relativeY = y - rect.top - center.y;
    const distance = Math.sqrt(relativeX * relativeX + relativeY * relativeY);

    if (distance < 20 || distance > radius * 0.8) return null;

    let angle = Math.atan2(relativeY, relativeX) + Math.PI / 2;
    if (angle < 0) angle += 2 * Math.PI;

    const section = Math.round((angle * 9) / (2 * Math.PI)) % 9;
    return numbers[section];
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setDragStartPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const number = getNumberFromPosition(e.clientX, e.clientY);
    setHoveredNumber(number);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (dragStartPos) {
      const number = getNumberFromPosition(e.clientX, e.clientY);
      if (number) {
        onSelect(number);
      }
      setDragStartPos(null);
    }
  };

  const handleClick = (value: SudokuCell) => {
    onSelect(value);
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
      <div className="absolute inset-0 bg-background/95 backdrop-blur-sm border-2 border-primary/20 rounded-full shadow-2xl" />
      
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
  className
}: SudokuGridComponentProps) {
  const [showWheel, setShowWheel] = useState(false);
  const [wheelPosition, setWheelPosition] = useState({ x: 0, y: 0 });
  const [wheelCell, setWheelCell] = useState<{ row: number; col: number } | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const isConflictCell = (row: number, col: number): boolean => {
    return conflicts.some(conflict => 
      conflict.cells.some(cell => cell.row === row && cell.col === col)
    );
  };

  const getConflictType = (row: number, col: number): string => {
    const conflict = conflicts.find(c => 
      c.cells.some(cell => cell.row === row && cell.col === col)
    );
    return conflict?.type || '';
  };

  const isInitialCell = (row: number, col: number): boolean => {
    return initialGrid[row][col] !== null;
  };

  const isAutoSolvedCell = (row: number, col: number): boolean => {
    return autoSolvedCells.has(`${row}-${col}`);
  };

  const isHighlighted = (row: number, col: number): boolean => {
    return highlightedCells.has(`${row}-${col}`);
  };

  const handleCellClick = (row: number, col: number, e: React.MouseEvent) => {
    if (readOnly || isInitialCell(row, col)) return;

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
    if (readOnly || isInitialCell(row, col)) return;

    e.preventDefault();
    
    const clientX = 'touches' in e ? e.touches[0]?.clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0]?.clientY : e.clientY;
    
    setWheelPosition({ x: clientX || 0, y: clientY || 0 });
    setWheelCell({ row, col });
    setShowWheel(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent, row: number, col: number) => {
    if (readOnly || isInitialCell(row, col)) return;

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

  return (
    <div className={cn("relative", className)}>
      <div className="inline-block bg-background border-2 border-border rounded-lg p-2 shadow-lg">
        <div className="grid grid-cols-9 gap-0">
          {grid.map((row, rowIndex) =>
            row.map((cell, colIndex) => {
              const isSelected = selectedCell?.row === rowIndex && selectedCell?.col === colIndex;
              const isConflict = isConflictCell(rowIndex, colIndex);
              const conflictType = getConflictType(rowIndex, colIndex);
              const isInitial = isInitialCell(rowIndex, colIndex);
              const isAutoSolved = isAutoSolvedCell(rowIndex, colIndex);
              const isHighlightedCell = isHighlighted(rowIndex, colIndex);
              const isRightBorder = (colIndex + 1) % 3 === 0 && colIndex < 8;
              const isBottomBorder = (rowIndex + 1) % 3 === 0 && rowIndex < 8;

              return (
                <motion.button
                  key={`${rowIndex}-${colIndex}`}
                  className={cn(
                    "w-12 h-12 md:w-16 md:h-16 text-base md:text-lg font-medium relative",
                    "focus:outline-none transition-all duration-150",
                    // 基础边框
                    "border border-border/40",
                    // 3x3区域的粗边框
                    colIndex % 3 === 0 && "border-l-2 border-l-border",
                    colIndex % 3 === 2 && "border-r-2 border-r-border", 
                    rowIndex % 3 === 0 && "border-t-2 border-t-border",
                    rowIndex % 3 === 2 && "border-b-2 border-b-border",
                    // 选中状态 - 提高z-index
                    isSelected && "ring-2 ring-primary ring-inset z-30 bg-primary/10",
                    // 数字类型样式
                    isInitial && "bg-muted text-muted-foreground font-bold",
                    isAutoSolved && "bg-muted/50 text-muted-foreground italic",
                    // 冲突高亮 - 高亮整行/列/宫为淡黄色，重复数字为黄色
                    isConflict && "bg-yellow-100 dark:bg-yellow-900/30",
                    isConflict && conflictType === 'row' && "bg-yellow-200 dark:bg-yellow-800/40",
                    isConflict && conflictType === 'column' && "bg-yellow-200 dark:bg-yellow-800/40", 
                    isConflict && conflictType === 'box' && "bg-yellow-200 dark:bg-yellow-800/40",
                    // 普通高亮
                    isHighlightedCell && "bg-yellow-100 dark:bg-yellow-900/30",
                    // 悬停效果
                    !readOnly && !isInitial && "hover:bg-accent hover:z-10",
                    (readOnly || isInitial) && "cursor-default"
                  )}
                  onClick={(e) => handleCellClick(rowIndex, colIndex, e)}
                  onMouseDown={(e) => {
                    if (isMobile) {
                      const timer = setTimeout(() => {
                        handleCellLongPress(rowIndex, colIndex, e);
                      }, 500);
                      
                      const cleanup = () => {
                        clearTimeout(timer);
                        document.removeEventListener('mouseup', cleanup);
                      };
                      
                      document.addEventListener('mouseup', cleanup);
                    }
                  }}
                  onTouchStart={(e) => {
                    const timer = setTimeout(() => {
                      handleCellLongPress(rowIndex, colIndex, e);
                    }, 500);
                    
                    const cleanup = () => {
                      clearTimeout(timer);
                      document.removeEventListener('touchend', cleanup);
                    };
                    
                    document.addEventListener('touchend', cleanup);
                  }}
                  onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
                  tabIndex={readOnly || isInitial ? -1 : 0}
                  disabled={readOnly || isInitial}
                  whileHover={!readOnly && !isInitial ? { scale: 1.05 } : {}}
                  whileTap={!readOnly && !isInitial ? { scale: 0.95 } : {}}
                >
                  <AnimatePresence mode="wait">
                    {cell && (
                      <motion.span
                        key={cell}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                        className={cn(
                          isConflict && "text-yellow-600 dark:text-yellow-400 font-bold"
                        )}
                      >
                        {cell}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              );
            })
          )}
        </div>
      </div>

      <AnimatePresence>
        {showWheel && (
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
