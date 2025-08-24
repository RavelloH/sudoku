'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { SudokuGridComponent } from '@/components/sudoku-grid';
import { SudokuUtils } from '@/lib/sudoku';
import { Difficulty, SudokuGrid } from '@/types/sudoku';
import { 
  Download, 
  Printer, 
  RefreshCw, 
  Grid3X3, 
  Copy,
  Eye,
  EyeOff
} from 'lucide-react';

interface GeneratedPuzzle {
  id: string;
  puzzle: SudokuGrid;
  solution: SudokuGrid;
  difficulty: Difficulty;
  timestamp: Date;
}

export function GenerateMode() {
  const [puzzles, setPuzzles] = useState<GeneratedPuzzle[]>([]);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('medium');
  const [puzzleCount, setPuzzleCount] = useState(4);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSolutions, setShowSolutions] = useState(false);

  const generatePuzzles = async () => {
    if (puzzleCount < 1 || puzzleCount > 20) {
      toast.error('请输入1-20之间的数字');
      return;
    }

    setIsGenerating(true);
    const newPuzzles: GeneratedPuzzle[] = [];

    try {
      for (let i = 0; i < puzzleCount; i++) {
        const { puzzle, solution } = SudokuUtils.generatePuzzle(selectedDifficulty);
        newPuzzles.push({
          id: `puzzle_${Date.now()}_${i}`,
          puzzle,
          solution,
          difficulty: selectedDifficulty,
          timestamp: new Date()
        });

        // 添加小延迟以显示进度
        if (i < puzzleCount - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      setPuzzles(newPuzzles);
      toast.success(`成功生成 ${puzzleCount} 个${SudokuUtils.getDifficultyName(selectedDifficulty)}难度数独！`);
    } catch (error) {
      console.error('生成数独时出错:', error);
      toast.error('生成数独时出现错误，请重试');
    } finally {
      setIsGenerating(false);
    }
  };

  const exportToPrint = () => {
    if (puzzles.length === 0) {
      toast.error('请先生成数独');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('无法打开打印窗口，请检查浏览器弹窗设置');
      return;
    }

    const printContent = generatePrintHTML();
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // 等待内容加载完成后打印
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  const exportToJSON = () => {
    if (puzzles.length === 0) {
      toast.error('请先生成数独');
      return;
    }

    const exportData = {
      puzzles: puzzles.map(p => ({
        id: p.id,
        puzzle: p.puzzle,
        solution: p.solution,
        difficulty: p.difficulty,
        timestamp: p.timestamp.toISOString()
      })),
      generated: new Date().toISOString(),
      count: puzzles.length,
      difficulty: selectedDifficulty
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json' 
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sudoku_puzzles_${selectedDifficulty}_${puzzles.length}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('数独已导出为JSON文件');
  };

  const generatePrintHTML = (): string => {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>数独题目 - ${SudokuUtils.getDifficultyName(selectedDifficulty)}难度</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            color: #000;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .puzzle-container {
            page-break-inside: avoid;
            margin-bottom: 40px;
        }
        .puzzle-grid {
            margin: 20px auto;
            border-collapse: collapse;
            border: 3px solid #000;
        }
        .puzzle-cell {
            width: 30px;
            height: 30px;
            border: 1px solid #000;
            text-align: center;
            vertical-align: middle;
            font-size: 16px;
            font-weight: bold;
        }
        .puzzle-cell.thick-right {
            border-right: 2px solid #000;
        }
        .puzzle-cell.thick-bottom {
            border-bottom: 2px solid #000;
        }
        .puzzle-info {
            text-align: center;
            margin: 10px 0;
        }
        @media print {
            .puzzle-container {
                page-break-after: always;
            }
            .puzzle-container:last-child {
                page-break-after: auto;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>RavelloH's Sudoku - 数独题目</h1>
        <p>难度：${SudokuUtils.getDifficultyName(selectedDifficulty)} | 题目数量：${puzzles.length} | 生成时间：${new Date().toLocaleString()}</p>
    </div>
    
    ${puzzles.map((puzzle, index) => `
        <div class="puzzle-container">
            <div class="puzzle-info">
                <h3>题目 ${index + 1}</h3>
            </div>
            <table class="puzzle-grid">
                ${puzzle.puzzle.map((row, rowIndex) => `
                    <tr>
                        ${row.map((cell, colIndex) => `
                            <td class="puzzle-cell ${colIndex % 3 === 2 && colIndex < 8 ? 'thick-right' : ''} ${rowIndex % 3 === 2 && rowIndex < 8 ? 'thick-bottom' : ''}">
                                ${cell || ''}
                            </td>
                        `).join('')}
                    </tr>
                `).join('')}
            </table>
        </div>
    `).join('')}
    
    ${showSolutions ? `
        <div style="page-break-before: always;">
            <div class="header">
                <h2>答案</h2>
            </div>
            ${puzzles.map((puzzle, index) => `
                <div class="puzzle-container">
                    <div class="puzzle-info">
                        <h3>题目 ${index + 1} 答案</h3>
                    </div>
                    <table class="puzzle-grid">
                        ${puzzle.solution.map((row, rowIndex) => `
                            <tr>
                                ${row.map((cell, colIndex) => `
                                    <td class="puzzle-cell ${colIndex % 3 === 2 && colIndex < 8 ? 'thick-right' : ''} ${rowIndex % 3 === 2 && rowIndex < 8 ? 'thick-bottom' : ''}">
                                        ${cell}
                                    </td>
                                `).join('')}
                            </tr>
                        `).join('')}
                    </table>
                </div>
            `).join('')}
        </div>
    ` : ''}
</body>
</html>
    `;
  };

  const copyPuzzleText = (puzzle: GeneratedPuzzle) => {
    const puzzleText = puzzle.puzzle.map(row => 
      row.map(cell => cell || '.').join(' ')
    ).join('\n');
    
    navigator.clipboard.writeText(puzzleText).then(() => {
      toast.success('数独已复制到剪贴板');
    }).catch(() => {
      toast.error('复制失败');
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* 生成设置 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Grid3X3 className="w-5 h-5" />
            批量生成数独
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="space-y-2">
              <Label htmlFor="difficulty">难度</Label>
              <Select
                value={selectedDifficulty}
                onValueChange={(value: Difficulty) => setSelectedDifficulty(value)}
              >
                <SelectTrigger id="difficulty" className="w-32">
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="count">数量</Label>
              <Input
                id="count"
                type="number"
                min={1}
                max={20}
                value={puzzleCount}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPuzzleCount(parseInt(e.target.value) || 1)}
                className="w-24"
              />
            </div>

            <div className="flex items-end">
              <Button
                onClick={generatePuzzles}
                disabled={isGenerating}
                className="flex items-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    生成数独
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* 操作按钮 */}
          {puzzles.length > 0 && (
            <>
              <Separator />
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={exportToPrint}
                  className="flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  打印
                </Button>
                <Button
                  variant="outline"
                  onClick={exportToJSON}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  导出JSON
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowSolutions(!showSolutions)}
                  className="flex items-center gap-2"
                >
                  {showSolutions ? (
                    <>
                      <EyeOff className="w-4 h-4" />
                      隐藏答案
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4" />
                      显示答案
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 生成进度 */}
      {isGenerating && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-sm text-muted-foreground">
                正在生成 {SudokuUtils.getDifficultyName(selectedDifficulty)} 难度数独...
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 生成的数独 */}
      {puzzles.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                生成结果
              </CardTitle>
              <Badge variant="secondary">
                {puzzles.length} 个数独
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {puzzles.map((puzzle, index) => (
                <motion.div
                  key={puzzle.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">题目 {index + 1}</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyPuzzleText(puzzle)}
                      className="flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      复制
                    </Button>
                  </div>
                  
                  <div className="transform scale-75 origin-center">
                    <SudokuGridComponent
                      grid={puzzle.puzzle}
                      initialGrid={puzzle.puzzle}
                      conflicts={[]}
                      onCellChange={() => {}}
                      readOnly={true}
                      className="pointer-events-none"
                    />
                  </div>

                  {showSolutions && (
                    <div className="space-y-2">
                      <h5 className="text-sm font-medium text-muted-foreground">答案</h5>
                      <div className="transform scale-75 origin-center">
                        <SudokuGridComponent
                          grid={puzzle.solution}
                          initialGrid={puzzle.solution}
                          conflicts={[]}
                          onCellChange={() => {}}
                          readOnly={true}
                          className="pointer-events-none opacity-75"
                        />
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 空状态 */}
      {puzzles.length === 0 && !isGenerating && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Grid3X3 className="w-12 h-12 mx-auto text-muted-foreground" />
              <div>
                <p className="text-lg font-medium">还没有生成数独</p>
                <p className="text-sm text-muted-foreground">
                  选择难度和数量，然后点击生成按钮开始
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
