'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Settings
} from 'lucide-react';

interface GeneratedPuzzle {
  id: string;
  puzzle: SudokuGrid;
  solution: SudokuGrid;
  difficulty: Difficulty;
  timestamp: Date;
}

interface PrintSettings {
  showHeader: boolean;
  puzzlesPerPage: number;
}

export function GenerateMode() {
  const [puzzles, setPuzzles] = useState<GeneratedPuzzle[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('medium');
  const [puzzleCount, setPuzzleCount] = useState(4);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSolutions, setShowSolutions] = useState(false);
  const [showDifficultyDialog, setShowDifficultyDialog] = useState(false);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [printSettings, setPrintSettings] = useState<PrintSettings>({
    showHeader: true,
    puzzlesPerPage: 4
  });

  const difficulties: { value: Difficulty; label: string; description: string }[] = [
    { value: 'easy', label: '简单', description: '适合新手，较多提示' },
    { value: 'medium', label: '中等', description: '平衡的挑战' },
    { value: 'hard', label: '困难', description: '需要一定技巧' },
    { value: 'expert', label: '专家', description: '高级解题技巧' },
    { value: 'master', label: '大师', description: '极具挑战性' },
    { value: 'extreme', label: '极限', description: '数独大师级别' },
  ];

  const puzzlesPerPageOptions = [1, 2, 4, 6, 8, 9, 12];

  const generatePuzzles = async () => {
    if (puzzleCount < 1 || puzzleCount > 50) {
      toast.error('请输入1-50之间的数字');
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
      setCurrentIndex(0);
      toast.success(`成功生成 ${puzzleCount} 个${SudokuUtils.getDifficultyName(selectedDifficulty)}难度数独！`);
    } catch (error) {
      console.error('生成数独时出错:', error);
      toast.error('生成数独时出现错误，请重试');
    } finally {
      setIsGenerating(false);
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const goToNext = () => {
    if (currentIndex < puzzles.length - 1) {
      setCurrentIndex(currentIndex + 1);
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
    
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 500);
    };

    toast.success('打印窗口已打开');
  };

  const generatePrintHTML = () => {
    const { showHeader, puzzlesPerPage } = printSettings;
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>数独题目 - ${SudokuUtils.getDifficultyName(selectedDifficulty)}难度</title>
        <style>
          body {
            font-family: 'Times New Roman', serif;
            margin: 20px;
            line-height: 1.4;
          }
          .page-header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
          }
          .puzzle-grid {
            display: inline-block;
            margin: 10px;
            page-break-inside: avoid;
          }
          .grid-container {
            display: grid;
            grid-template-columns: repeat(9, 30px);
            grid-template-rows: repeat(9, 30px);
            gap: 1px;
            border: 2px solid #000;
            background-color: #000;
          }
          .cell {
            background-color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            font-weight: bold;
          }
          .cell.thick-border-right {
            border-right: 2px solid #000;
          }
          .cell.thick-border-bottom {
            border-bottom: 2px solid #000;
          }
          .puzzle-info {
            text-align: center;
            margin-top: 10px;
            font-size: 12px;
          }
          .puzzles-row {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            margin-bottom: 20px;
          }
          @media print {
            .page-break {
              page-break-before: always;
            }
          }
        </style>
      </head>
      <body>
    `;

    if (showHeader) {
      html += `
        <div class="page-header">
          <h1>数独题目集</h1>
          <p>难度：${SudokuUtils.getDifficultyName(selectedDifficulty)} | 题目数量：${puzzles.length} | 生成时间：${new Date().toLocaleString()}</p>
          <p>RavelloH's Sudoku - sudoku.ravelloh.top</p>
        </div>
      `;
    }

    for (let i = 0; i < puzzles.length; i += puzzlesPerPage) {
      if (i > 0) {
        html += '<div class="page-break"></div>';
      }
      
      html += '<div class="puzzles-row">';
      
      for (let j = i; j < Math.min(i + puzzlesPerPage, puzzles.length); j++) {
        const puzzle = puzzles[j];
        html += `
          <div class="puzzle-grid">
            <div class="grid-container">
        `;
        
        for (let row = 0; row < 9; row++) {
          for (let col = 0; col < 9; col++) {
            const value = showSolutions ? puzzle.solution[row][col] : puzzle.puzzle[row][col];
            const isRightBorder = (col + 1) % 3 === 0 && col < 8;
            const isBottomBorder = (row + 1) % 3 === 0 && row < 8;
            
            html += `
              <div class="cell ${isRightBorder ? 'thick-border-right' : ''} ${isBottomBorder ? 'thick-border-bottom' : ''}">
                ${value || ''}
              </div>
            `;
          }
        }
        
        html += `
            </div>
            <div class="puzzle-info">
              题目 ${j + 1} ${showSolutions ? '(答案)' : ''}
            </div>
          </div>
        `;
      }
      
      html += '</div>';
    }

    html += `
        </body>
      </html>
    `;

    return html;
  };

  const copyToClipboard = async () => {
    if (puzzles.length === 0) {
      toast.error('请先生成数独');
      return;
    }

    try {
      const currentPuzzle = puzzles[currentIndex];
      const gridText = currentPuzzle.puzzle.map(row => 
        row.map(cell => cell || '.').join('')
      ).join('\n');
      
      await navigator.clipboard.writeText(gridText);
      toast.success('当前数独已复制到剪贴板');
    } catch (error) {
      toast.error('复制失败');
    }
  };

  const currentPuzzle = puzzles[currentIndex];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* 主要内容区域 - 左右布局 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧 - 数独显示区域 */}
        <div className="lg:col-span-2">
          <Card className="h-fit">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">数独题目</CardTitle>
                {puzzles.length > 0 && (
                  <Badge variant="outline">
                    {currentIndex + 1} / {puzzles.length}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {puzzles.length > 0 ? (
                <div className="space-y-4">
                  {/* 数独网格区域 */}
                  <div className="flex justify-center">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={currentIndex}
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        transition={{ duration: 0.2 }}
                      >
                        <SudokuGridComponent
                          grid={showSolutions ? currentPuzzle.solution : currentPuzzle.puzzle}
                          initialGrid={currentPuzzle.puzzle}
                          conflicts={[]}
                          onCellChange={() => {}}
                          readOnly={true}
                          className="w-full max-w-lg"
                        />
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  {/* 导航控制 */}
                  <div className="flex items-center justify-between">
                    <Button
                      variant="outline"
                      onClick={goToPrevious}
                      disabled={currentIndex === 0}
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      上一个
                    </Button>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="show-solutions"
                          checked={showSolutions}
                          onCheckedChange={setShowSolutions}
                        />
                        <Label htmlFor="show-solutions" className="text-sm">
                          显示答案
                        </Label>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      onClick={goToNext}
                      disabled={currentIndex === puzzles.length - 1}
                    >
                      下一个
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Grid3X3 className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">还没有生成数独题目</p>
                  <p className="text-sm">点击右侧的"生成数独"按钮开始</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 右侧 - 控制面板 */}
        <div className="space-y-4">
          {/* 生成设置 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">生成设置</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>难度等级</Label>
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => setShowDifficultyDialog(true)}
                >
                  {SudokuUtils.getDifficultyName(selectedDifficulty)}
                  <Settings className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="puzzle-count">生成数量</Label>
                <Input
                  id="puzzle-count"
                  type="number"
                  min="1"
                  max="50"
                  value={puzzleCount}
                  onChange={(e) => setPuzzleCount(parseInt(e.target.value) || 1)}
                  placeholder="输入要生成的数量"
                />
              </div>

              <Button
                className="w-full"
                onClick={generatePuzzles}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Grid3X3 className="w-4 h-4 mr-2" />
                    生成数独
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* 操作按钮 */}
          {puzzles.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">操作</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={copyToClipboard}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  复制当前题目
                </Button>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowPrintDialog(true)}
                >
                  <Printer className="w-4 h-4 mr-2" />
                  打印设置
                </Button>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={exportToPrint}
                >
                  <Download className="w-4 h-4 mr-2" />
                  导出打印
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* 难度选择对话框 */}
      <Dialog open={showDifficultyDialog} onOpenChange={setShowDifficultyDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>选择难度</DialogTitle>
            <DialogDescription>
              选择要生成的数独难度级别
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 py-4">
            {difficulties.map((diff) => (
              <Button
                key={diff.value}
                variant={selectedDifficulty === diff.value ? "default" : "outline"}
                className="justify-start h-auto p-4 text-left"
                onClick={() => {
                  setSelectedDifficulty(diff.value);
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

      {/* 打印设置对话框 */}
      <Dialog open={showPrintDialog} onOpenChange={setShowPrintDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>打印设置</DialogTitle>
            <DialogDescription>
              自定义打印格式和布局
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="show-header">显示页眉信息</Label>
              <Switch
                id="show-header"
                checked={printSettings.showHeader}
                onCheckedChange={(checked) => 
                  setPrintSettings(prev => ({ ...prev, showHeader: checked }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>每页数独数量</Label>
              <div className="grid grid-cols-4 gap-2">
                {puzzlesPerPageOptions.map((count) => (
                  <Button
                    key={count}
                    variant={printSettings.puzzlesPerPage === count ? "default" : "outline"}
                    size="sm"
                    onClick={() => 
                      setPrintSettings(prev => ({ ...prev, puzzlesPerPage: count }))
                    }
                  >
                    {count}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowPrintDialog(false)}>
              完成
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
