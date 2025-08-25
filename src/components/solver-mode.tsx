'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  Eye,
  RotateCcw
} from 'lucide-react';

interface SolverModeProps {
  initialGrid?: SudokuGrid | null;
}

export function SolverMode({ initialGrid }: SolverModeProps) {
  const [userGrid, setUserGrid] = useState<SudokuGrid>(() => 
    initialGrid ? SudokuUtils.copyGrid(initialGrid) : SudokuUtils.createEmptyGrid()
  );
  const [autoSolvedCells, setAutoSolvedCells] = useState<Set<string>>(new Set());
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [solvingStats, setSolvingStats] = useState({
    totalCells: 0,
    userCells: 0,
    autoSolvedCells: 0,
    conflictCells: 0
  });

  // 当接收到新的初始网格时，重置状态
  useEffect(() => {
    if (initialGrid) {
      setUserGrid(SudokuUtils.copyGrid(initialGrid));
      setAutoSolvedCells(new Set());
      setSelectedCell(null);
    }
  }, [initialGrid]);

  const updateAutoSolvedCells = useCallback(() => {
    const workingGrid = SudokuUtils.copyGrid(userGrid);
    const newAutoSolved = new Set<string>();
    let changed = false;

    // 首先标记所有当前非空的单元格为用户输入（这样它们就不会被重新分类为自动推导）
    const userCells = new Set<string>();
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (workingGrid[row][col] !== null && !autoSolvedCells.has(`${row}-${col}`)) {
          userCells.add(`${row}-${col}`);
        }
      }
    }

    // 持续寻找可以确定的单元格，直到没有新的可确定的为止
    let foundNewInThisIteration = true;
    while (foundNewInThisIteration) {
      foundNewInThisIteration = false;
      
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
              // 只有不是用户输入的单元格才能被标记为自动推导
              if (!userCells.has(key)) {
                newAutoSolved.add(key);
                workingGrid[row][col] = possibilities[0];
                foundNewInThisIteration = true;
                changed = true;
              }
            }
          }
        }
      }
    }

    // 保留之前已经标记为自动推导的单元格
    autoSolvedCells.forEach(key => {
      if (!userCells.has(key)) {
        newAutoSolved.add(key);
      }
    });

    if (changed || newAutoSolved.size !== autoSolvedCells.size) {
            setAutoSolvedCells(newAutoSolved);
      
      if (changed) {
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

  // 当网格变化时，更新自动解决的单元格和统计信息
  useEffect(() => {
    updateAutoSolvedCells();
  }, [updateAutoSolvedCells]);

  useEffect(() => {
    updateStats();
  }, [updateStats]);

  const handleCellChange = (row: number, col: number, value: SudokuCell) => {
    const key = `${row}-${col}`;
    
    // 如果这个单元格是自动解决的，不允许用户修改
    if (autoSolvedCells.has(key)) {
      toast.warning('这个数字是程序自动填入的，如需修改请先清空相关单元格');
      return;
    }

    const newGrid = SudokuUtils.copyGrid(userGrid);
    newGrid[row][col] = value;
    setUserGrid(newGrid);

    // 如果用户清空了一个单元格，需要重新计算自动解决的单元格
    if (value === null) {
      // 清除所有自动解决的单元格，重新计算
      setAutoSolvedCells(new Set());
    }
  };

  const clearGrid = () => {
    setUserGrid(SudokuUtils.createEmptyGrid());
    setAutoSolvedCells(new Set());
    setSelectedCell(null);
    toast.success('网格已清空');
  };

  const solve = () => {
    const solution = SudokuUtils.solve(userGrid);
    if (solution) {
      // 记录所有被完全解决填入的单元格
      const newAutoSolved = new Set<string>(autoSolvedCells);
      
      for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
          // 如果原来是空的，现在有值了，标记为自动解决
          if (userGrid[row][col] === null && solution[row][col] !== null) {
            newAutoSolved.add(`${row}-${col}`);
          }
        }
      }
      
      setUserGrid(solution);
      setAutoSolvedCells(newAutoSolved);
      toast.success('🎉 数独已完全解决！');
    } else {
      toast.error('无法解决当前数独，请检查输入是否正确');
    }
  };

  const isComplete = SudokuUtils.isComplete(userGrid);
  const conflicts = SudokuUtils.findConflicts(userGrid);
  const hasConflicts = conflicts.length > 0;
  const progress = (solvingStats.totalCells / 81) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* 完成提示 - 集成在进度卡片中 */}

      {/* 主要内容区域 - 左右布局 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧 - 数独显示区域 */}
        <div className="lg:col-span-2">
          <Card className="h-fit card-enhanced">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">数独解题器</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant={hasConflicts ? "destructive" : isComplete ? "default" : "secondary"}>
                    {hasConflicts ? '存在冲突' : isComplete ? '已完成' : '求解中'}
                  </Badge>
                  <Badge variant="outline">
                    {Math.round(progress)}% 完成
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* 数独网格区域 - 居中 */}
                <div className="flex justify-center">
                  <SudokuGridComponent
                    grid={userGrid}
                    initialGrid={SudokuUtils.createEmptyGrid()} // 没有初始固定数字
                    conflicts={conflicts}
                    autoSolvedCells={autoSolvedCells}
                    onCellChange={handleCellChange}
                    onCellSelect={(row, col) => setSelectedCell({ row, col })}
                    selectedCell={selectedCell}
                    className="w-full max-w-lg"
                  />
                </div>
                
                {/* 解题信息栏 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-muted/30 p-4 rounded-lg">
                  <div className="text-center">
                    <div className="text-lg font-semibold">{solvingStats.totalCells}</div>
                    <div className="text-sm text-muted-foreground">总填入</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-primary">{solvingStats.userCells}</div>
                    <div className="text-sm text-muted-foreground">用户填入</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-muted-foreground">{solvingStats.autoSolvedCells}</div>
                    <div className="text-sm text-muted-foreground">程序推导</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-destructive">{solvingStats.conflictCells}</div>
                    <div className="text-sm text-muted-foreground">冲突数字</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右侧 - 控制面板 */}
        <div className="space-y-4">
          {/* 解题进度 */}
          <Card className={isComplete ? "border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20" : ""}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                {isComplete ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <span className="text-green-600 dark:text-green-400">解题完成！</span>
                  </>
                ) : (
                  <>
                    <Brain className="w-5 h-5" />
                    解题进度
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isComplete && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 text-green-600 dark:text-green-400 bg-green-100/50 dark:bg-green-900/30 p-3 rounded-lg"
                >
                  <span className="text-2xl">🎉</span>
                  <div>
                    <div className="font-semibold">恭喜完成数独！</div>
                    <div className="text-sm opacity-80">所有数字都已正确填入</div>
                  </div>
                </motion.div>
              )}
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>完成度</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <motion.div
                    className={`rounded-full h-2 ${isComplete ? 'bg-green-500' : 'bg-primary'}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>

              {hasConflicts && (
                <div className="flex items-center gap-2 text-destructive text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  <span>发现 {solvingStats.conflictCells} 个冲突</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 操作工具 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">操作工具</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                className="w-full"
                onClick={solve}
                disabled={isComplete}
              >
                <Zap className="w-4 h-4 mr-2" />
                完全求解
              </Button>

              <Button
                variant="outline"
                className="w-full"
                onClick={clearGrid}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                清空网格
              </Button>
            </CardContent>
          </Card>

          {/* 使用说明 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">使用说明</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="space-y-2">
                <p>• 填入已知数字，程序会自动推导</p>
                <p>• <span className="text-muted-foreground font-mono bg-muted px-1 rounded">灰色数字</span> 是程序自动填入的</p>
                <p>• 冲突的数字会被高亮显示</p>
                <p>• 当所有数字确定时，数独完成</p>
              </div>
            </CardContent>
          </Card>

          {/* 解题技巧提示 */}
          {solvingStats.totalCells > 0 && !isComplete && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Lightbulb className="w-5 h-5" />
                  解题技巧
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {solvingStats.totalCells < 20 ? (
                  <p>继续填入更多已知数字，程序会自动推导出更多结果。</p>
                ) : hasConflicts ? (
                  <p>检查并修正标红的冲突数字，然后程序可以继续推导。</p>
                ) : solvingStats.autoSolvedCells === 0 ? (
                  <p>当前无法自动推导，尝试填入更多数字或使用高级解题技巧。</p>
                ) : (
                  <p>很好！程序已自动推导出 {solvingStats.autoSolvedCells} 个数字。</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </motion.div>
  );
}
