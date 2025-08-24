'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { SudokuGridComponent } from '@/components/sudoku-grid';
import { SudokuUtils } from '@/lib/sudoku';
import { SudokuGrid, SudokuCell, Conflict } from '@/types/sudoku';
import { 
  Brain, 
  Lightbulb, 
  RefreshCw, 
  CheckCircle,
  AlertTriangle,
  Zap,
  Eye
} from 'lucide-react';

export function SolverMode() {
  const [userGrid, setUserGrid] = useState<SudokuGrid>(SudokuUtils.createEmptyGrid());
  const [autoSolvedCells, setAutoSolvedCells] = useState<Set<string>>(new Set());
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [solvingStats, setSolvingStats] = useState({
    totalCells: 0,
    userCells: 0,
    autoSolvedCells: 0,
    conflictCells: 0
  });

  const updateAutoSolvedCells = useCallback(() => {
    const newAutoSolved = new Set<string>();
    const workingGrid = SudokuUtils.copyGrid(userGrid);
    let foundNew = false;

    // 找出所有可以确定的单元格
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (workingGrid[row][col] === null) {
          const possibilities = [];
          for (let num = 1; num <= 9; num++) {
            if (SudokuUtils.isValidMove(workingGrid, row, col, num)) {
              possibilities.push(num);
            }
          }
          
          // 如果只有一种可能性，自动填入
          if (possibilities.length === 1) {
            const key = `${row}-${col}`;
            if (!autoSolvedCells.has(key)) {
              foundNew = true;
            }
            newAutoSolved.add(key);
            workingGrid[row][col] = possibilities[0];
          }
        }
      }
    }

    if (foundNew || newAutoSolved.size !== autoSolvedCells.size) {
      setAutoSolvedCells(newAutoSolved);
      
      // 如果有新的自动解决的单元格，更新网格
      if (foundNew) {
        setUserGrid(workingGrid);
      }
    }
  }, [userGrid, autoSolvedCells]);

  const updateStats = useCallback(() => {
    let userCells = 0;
    let totalFilled = 0;
    
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (userGrid[row][col] !== null) {
          totalFilled++;
          if (!autoSolvedCells.has(`${row}-${col}`)) {
            userCells++;
          }
        }
      }
    }

    const conflicts = SudokuUtils.findConflicts(userGrid);
    const conflictCells = new Set();
    conflicts.forEach(conflict => {
      conflict.cells.forEach(cell => {
        conflictCells.add(`${cell.row}-${cell.col}`);
      });
    });

    setSolvingStats({
      totalCells: totalFilled,
      userCells,
      autoSolvedCells: autoSolvedCells.size,
      conflictCells: conflictCells.size
    });
  }, [userGrid, autoSolvedCells]);

  useEffect(() => {
    updateAutoSolvedCells();
  }, [userGrid]);

  useEffect(() => {
    updateStats();
  }, [userGrid, autoSolvedCells, updateStats]);

  const handleCellChange = useCallback((row: number, col: number, value: SudokuCell) => {
    const key = `${row}-${col}`;
    
    // 如果是自动解决的单元格，用户仍可以修改
    if (autoSolvedCells.has(key) && value === null) {
      const newAutoSolved = new Set(autoSolvedCells);
      newAutoSolved.delete(key);
      setAutoSolvedCells(newAutoSolved);
    }

    const newGrid = SudokuUtils.copyGrid(userGrid);
    newGrid[row][col] = value;
    setUserGrid(newGrid);

    // 检查是否完成
    if (value && SudokuUtils.isComplete(newGrid)) {
      toast.success('恭喜！数独已完成！', {
        icon: <CheckCircle className="w-4 h-4" />
      });
    }
  }, [userGrid, autoSolvedCells]);

  const solveStep = useCallback(() => {
    const hint = SudokuUtils.getHint(userGrid);
    if (hint) {
      const newGrid = SudokuUtils.copyGrid(userGrid);
      newGrid[hint.row][hint.col] = hint.value;
      setUserGrid(newGrid);
      
      const newAutoSolved = new Set(autoSolvedCells);
      newAutoSolved.add(`${hint.row}-${hint.col}`);
      setAutoSolvedCells(newAutoSolved);

      toast.success(
        `已填入：第${hint.row + 1}行第${hint.col + 1}列 = ${hint.value}`,
        {
          icon: <Lightbulb className="w-4 h-4" />
        }
      );
    } else {
      toast.info('当前状态下无法继续自动求解，请检查已填入的数字是否正确');
    }
  }, [userGrid, autoSolvedCells]);

  const solveCompletely = useCallback(() => {
    const solution = SudokuUtils.solve(userGrid);
    if (solution) {
      setUserGrid(solution);
      
      // 标记所有新填入的单元格为自动解决
      const newAutoSolved = new Set(autoSolvedCells);
      for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
          if (userGrid[row][col] === null && solution[row][col] !== null) {
            newAutoSolved.add(`${row}-${col}`);
          }
        }
      }
      setAutoSolvedCells(newAutoSolved);

      toast.success('数独已完全解决！', {
        icon: <CheckCircle className="w-4 h-4" />
      });
    } else {
      toast.error('无法解决当前数独，请检查输入是否正确', {
        icon: <AlertTriangle className="w-4 h-4" />
      });
    }
  }, [userGrid, autoSolvedCells]);

  const clearGrid = useCallback(() => {
    setUserGrid(SudokuUtils.createEmptyGrid());
    setAutoSolvedCells(new Set());
    setSelectedCell(null);
  }, []);

  const conflicts = SudokuUtils.findConflicts(userGrid);
  const isComplete = SudokuUtils.isComplete(userGrid);
  const hasConflicts = conflicts.length > 0;

  // 高亮冲突的单元格
  const highlightedCells = new Set<string>();
  conflicts.forEach(conflict => {
    conflict.cells.forEach(cell => {
      highlightedCells.add(`${cell.row}-${cell.col}`);
    });
  });

  const getGridForDisplay = (): SudokuGrid => {
    const displayGrid = SudokuUtils.copyGrid(userGrid);
    
    // 添加自动解决的单元格
    autoSolvedCells.forEach(key => {
      const [row, col] = key.split('-').map(Number);
      if (userGrid[row][col] !== null) {
        // 保持现有值，只是在渲染时会显示为灰色
      }
    });

    return displayGrid;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* 模式介绍和控制 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            自动解题模式
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            输入已知数字，程序会自动推导出确定的答案。灰色数字为自动推导结果。
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 统计信息 */}
          <div className="flex flex-wrap gap-4">
            <Badge variant="outline" className="flex items-center gap-1">
              <span className="w-2 h-2 bg-primary rounded-full"></span>
              用户输入: {solvingStats.userCells}
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <span className="w-2 h-2 bg-muted-foreground rounded-full"></span>
              自动推导: {solvingStats.autoSolvedCells}
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              总计: {solvingStats.totalCells}/81
            </Badge>
            {hasConflicts && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                冲突: {solvingStats.conflictCells}
              </Badge>
            )}
          </div>

          <Separator />

          {/* 控制按钮 */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={solveStep}
              disabled={isComplete || hasConflicts}
              className="flex items-center gap-2"
            >
              <Lightbulb className="w-4 h-4" />
              解决一步
            </Button>

            <Button
              variant="outline"
              onClick={solveCompletely}
              disabled={isComplete || hasConflicts}
              className="flex items-center gap-2"
            >
              <Zap className="w-4 h-4" />
              完全解决
            </Button>

            <Button
              variant="outline"
              onClick={clearGrid}
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              清空
            </Button>
          </div>

          {/* 状态提示 */}
          {isComplete && (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-green-700 dark:text-green-300">
                数独已完成！所有数字都填写正确。
              </span>
            </div>
          )}

          {hasConflicts && (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <span className="text-yellow-700 dark:text-yellow-300">
                检测到冲突！请检查高亮显示的数字。
              </span>
            </div>
          )}

          {!isComplete && !hasConflicts && autoSolvedCells.size > 0 && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <Eye className="w-5 h-5 text-blue-600" />
              <span className="text-blue-700 dark:text-blue-300">
                已自动推导出 {autoSolvedCells.size} 个答案（灰色显示）。
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 数独网格 */}
      <div className="flex justify-center">
        <SudokuGridComponent
          grid={getGridForDisplay()}
          initialGrid={SudokuUtils.createEmptyGrid()} // 没有初始数字，用户可以修改任何单元格
          conflicts={conflicts}
          autoSolvedCells={autoSolvedCells}
          onCellChange={handleCellChange}
          onCellSelect={(row, col) => setSelectedCell({ row, col })}
          selectedCell={selectedCell}
          highlightedCells={highlightedCells}
          readOnly={false}
        />
      </div>

      {/* 使用说明 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">使用说明</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <span className="font-semibold text-foreground">1.</span>
            <span>点击数独网格中的空白单元格，输入1-9的数字</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-semibold text-foreground">2.</span>
            <span>程序会自动推导出确定的答案，以灰色数字显示</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-semibold text-foreground">3.</span>
            <span>如果输入有冲突，相关单元格会被高亮显示</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-semibold text-foreground">4.</span>
            <span>可以使用"解决一步"逐步求解，或"完全解决"一次性得到答案</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-semibold text-foreground">5.</span>
            <span>移动端支持长按单元格调出数字轮盘进行输入</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
