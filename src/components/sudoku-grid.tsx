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

  const getCellBackground = (row: number, col: number) => {
    const isSelected = selectedCell?.row === row && selectedCell?.col === col;
    const isConflict = isConflictCell(row, col);
    const conflictType = getConflictType(row, col);
    const isHighlightedCell = isHighlighted(row, col);
    
    if (isSelected) return 'bg-primary/20';
    if (isConflict && conflictType === 'row') return 'bg-yellow-200/60 dark:bg-yellow-800/30';
    if (isConflict && conflictType === 'column') return 'bg-yellow-200/60 dark:bg-yellow-800/30';
    if (isConflict && conflictType === 'box') return 'bg-yellow-200/60 dark:bg-yellow-800/30';
    if (isConflict) return 'bg-yellow-100/80 dark:bg-yellow-900/40';
    if (isHighlightedCell) return 'bg-yellow-100/60 dark:bg-yellow-900/30';
    
    return 'bg-background hover:bg-muted/30';
  };

  // 创建9个3x3的子网格
  const renderSubGrid = (startRow: number, startCol: number) => {
    const cells = [];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const row = startRow + i;
        const col = startCol + j;
        const cell = grid[row][col];
        const isSelected = selectedCell?.row === row && selectedCell?.col === col;
        const isInitial = isInitialCell(row, col);
        const isAutoSolved = isAutoSolvedCell(row, col);
        const isConflict = isConflictCell(row, col);
        
        cells.push(
          <motion.button
            key={`${row}-${col}`}
            className={cn(
              "relative w-full h-full flex items-center justify-center text-base md:text-lg font-medium",
              "border border-border/30 transition-all duration-200",
              getCellBackground(row, col),
              isSelected && "ring-2 ring-primary ring-inset z-20",
              !readOnly && !isInitial && "cursor-pointer",
              (readOnly || isInitial) && "cursor-default"
            )}
            onClick={(e) => handleCellClick(row, col, e)}
            onMouseDown={(e) => {
              if (isMobile) {
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
              const timer = setTimeout(() => {
                handleCellLongPress(row, col, e);
              }, 500);
              
              const cleanup = () => {
                clearTimeout(timer);
                document.removeEventListener('touchend', cleanup);
              };
              
              document.addEventListener('touchend', cleanup);
            }}
            onKeyDown={(e) => handleKeyDown(e, row, col)}
            tabIndex={readOnly || isInitial ? -1 : 0}
            disabled={readOnly || isInitial}
            whileHover={!readOnly && !isInitial ? { scale: 1.02 } : {}}
            whileTap={!readOnly && !isInitial ? { scale: 0.98 } : {}}
          >
            <AnimatePresence mode="wait">
              {cell && (
                <motion.span
                  key={`${row}-${col}-${cell}`}
                  initial={{ scale: 0, opacity: 0, rotateZ: -180 }}
                  animate={{ scale: 1, opacity: 1, rotateZ: 0 }}
                  exit={{ scale: 0, opacity: 0, rotateZ: 180 }}
                  transition={{ 
                    type: 'spring', 
                    stiffness: 300, 
                    damping: 20,
                    duration: 0.3
                  }}
                  className={cn(
                    "font-semibold",
                    isInitial && "text-foreground",
                    !isInitial && !isAutoSolved && "text-primary",
                    isAutoSolved && "text-muted-foreground",
                    isConflict && "text-yellow-600 dark:text-yellow-400"
                  )}
                >
                  {cell}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        );
      }
    }
    return cells;
  };

  return (
    <div className={cn("relative", className)}>
      {/* 主棋盘容器 */}
      <div className="inline-block bg-background rounded-xl shadow-xl border-4 border-border p-2">
        {/* 9x9网格，使用3x3的子网格布局 */}
        <div className="grid grid-cols-3 grid-rows-3 gap-2 bg-border rounded-lg p-2">
          {/* 渲染9个3x3子网格 */}
          {Array.from({ length: 9 }).map((_, index) => {
            const subGridRow = Math.floor(index / 3);
            const subGridCol = index % 3;
            const startRow = subGridRow * 3;
            const startCol = subGridCol * 3;
            
            return (
              <div
                key={`subgrid-${index}`}
                className="grid grid-cols-3 grid-rows-3 bg-background rounded-md shadow-sm border border-border/50 w-32 h-32 md:w-40 md:h-40"
              >
                {renderSubGrid(startRow, startCol)}
              </div>
            );
          })}
        </div>
      </div>

      {/* 数字轮盘 */}
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
