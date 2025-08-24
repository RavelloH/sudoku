'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { SudokuGridComponent } from '@/components/sudoku-grid';
import { StorageUtils } from '@/lib/storage';
import { SudokuUtils } from '@/lib/sudoku';
import { SudokuGame, GameStats, Difficulty } from '@/types/sudoku';
import { 
  History, 
  Play, 
  Trash2, 
  Trophy, 
  Clock, 
  RotateCcw,
  Download,
  Upload,
  BarChart3,
  Calendar,
  CheckCircle
} from 'lucide-react';

export function HistoryMode() {
  const [games, setGames] = useState<SudokuGame[]>([]);
  const [stats, setStats] = useState<GameStats>(StorageUtils.getStats());
  const [selectedGame, setSelectedGame] = useState<SudokuGame | null>(null);
  const [gameToDelete, setGameToDelete] = useState<string | null>(null);
  const [showReplayDialog, setShowReplayDialog] = useState(false);
  const [replayIndex, setReplayIndex] = useState(0);
  const [isReplaying, setIsReplaying] = useState(false);

  useEffect(() => {
    loadGames();
  }, []);

  const loadGames = () => {
    const allGames = StorageUtils.getAllGames();
    setGames(allGames.sort((a, b) => b.startTime.getTime() - a.startTime.getTime()));
    setStats(StorageUtils.getStats());
  };

  const deleteGame = (gameId: string) => {
    StorageUtils.deleteGame(gameId);
    loadGames();
    setGameToDelete(null);
    toast.success('游戏记录已删除');
  };

  const startReplay = (game: SudokuGame) => {
    if (game.moves.length === 0) {
      toast.info('该游戏没有操作记录');
      return;
    }
    
    setSelectedGame(game);
    setReplayIndex(0);
    setShowReplayDialog(true);
  };

  const playReplay = () => {
    if (!selectedGame) return;
    
    setIsReplaying(true);
    setReplayIndex(0);
    
    const playMove = (index: number) => {
      if (index >= selectedGame.moves.length) {
        setIsReplaying(false);
        toast.success('回放完成！');
        return;
      }
      
      setReplayIndex(index + 1);
      setTimeout(() => playMove(index + 1), 1000); // 每秒播放一步
    };
    
    playMove(0);
  };

  const getReplayGrid = (): any => {
    if (!selectedGame) return SudokuUtils.createEmptyGrid();
    
    const grid = SudokuUtils.copyGrid(selectedGame.initialGrid);
    
    for (let i = 0; i < replayIndex && i < selectedGame.moves.length; i++) {
      const move = selectedGame.moves[i];
      grid[move.row][move.col] = move.value;
    }
    
    return grid;
  };

  const continueGame = (game: SudokuGame) => {
    // 这里应该切换到挑战模式并加载游戏
    toast.info('功能开发中：将切换到挑战模式继续游戏');
  };

  const restartGame = (game: SudokuGame) => {
    // 这里应该切换到挑战模式并重新开始游戏
    toast.info('功能开发中：将切换到挑战模式重新开始游戏');
  };

  const exportData = () => {
    try {
      const data = StorageUtils.exportData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sudoku_data_${format(new Date(), 'yyyy-MM-dd')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('数据已导出');
    } catch (error) {
      toast.error('导出失败');
    }
  };

  const importData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result as string;
          if (StorageUtils.importData(data)) {
            loadGames();
            toast.success('数据导入成功');
          } else {
            toast.error('数据格式错误');
          }
        } catch (error) {
          toast.error('导入失败');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}分${secs}秒`;
  };

  const getCompletionRate = (): number => {
    return stats.totalGames > 0 ? Math.round((stats.completedGames / stats.totalGames) * 100) : 0;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              游戏历史
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportData}>
                <Download className="w-4 h-4 mr-1" />
                导出
              </Button>
              <Button variant="outline" size="sm" onClick={importData}>
                <Upload className="w-4 h-4 mr-1" />
                导入
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="games" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="games">游戏记录</TabsTrigger>
              <TabsTrigger value="stats">统计数据</TabsTrigger>
            </TabsList>
            
            <TabsContent value="games" className="space-y-4">
              {games.length === 0 ? (
                <div className="text-center py-12">
                  <History className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">还没有游戏记录</p>
                  <p className="text-sm text-muted-foreground">开始你的第一局数独吧！</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {games.map((game) => (
                    <motion.div
                      key={game.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="border rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge 
                            variant={game.isCompleted ? "default" : "secondary"}
                            className="flex items-center gap-1"
                          >
                            {game.isCompleted ? (
                              <CheckCircle className="w-3 h-3" />
                            ) : (
                              <Clock className="w-3 h-3" />
                            )}
                            {game.isCompleted ? '已完成' : '进行中'}
                          </Badge>
                          
                          <Badge 
                            variant="outline"
                            className={SudokuUtils.getDifficultyColor(game.difficulty)}
                          >
                            {SudokuUtils.getDifficultyName(game.difficulty)}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startReplay(game)}
                            disabled={game.moves.length === 0}
                          >
                            <RotateCcw className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setGameToDelete(game.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">开始时间</span>
                          <p className="font-medium">
                            {format(game.startTime, 'MM-dd HH:mm')}
                          </p>
                        </div>
                        
                        {game.duration && (
                          <div>
                            <span className="text-muted-foreground">用时</span>
                            <p className="font-medium">{formatDuration(game.duration)}</p>
                          </div>
                        )}
                        
                        <div>
                          <span className="text-muted-foreground">步数</span>
                          <p className="font-medium">{game.moves.length}</p>
                        </div>
                        
                        <div>
                          <span className="text-muted-foreground">进度</span>
                          <p className="font-medium">
                            {Math.round((game.moves.length / 81) * 100)}%
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        {!game.isCompleted && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => continueGame(game)}
                          >
                            <Play className="w-4 h-4 mr-1" />
                            继续
                          </Button>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => restartGame(game)}
                        >
                          重新开始
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="stats" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <BarChart3 className="w-8 h-8 mx-auto mb-2 text-primary" />
                      <p className="text-2xl font-bold">{stats.totalGames}</p>
                      <p className="text-sm text-muted-foreground">总游戏数</p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <Trophy className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
                      <p className="text-2xl font-bold">{stats.completedGames}</p>
                      <p className="text-sm text-muted-foreground">已完成</p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                      <p className="text-2xl font-bold">{getCompletionRate()}%</p>
                      <p className="text-sm text-muted-foreground">完成率</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* 各难度最佳成绩 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">最佳成绩</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(['easy', 'medium', 'hard', 'expert', 'master', 'extreme'] as Difficulty[]).map((difficulty) => (
                      <div key={difficulty} className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="outline"
                            className={SudokuUtils.getDifficultyColor(difficulty)}
                          >
                            {SudokuUtils.getDifficultyName(difficulty)}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            {stats.bestTimes[difficulty] 
                              ? formatDuration(stats.bestTimes[difficulty]!)
                              : '暂无记录'
                            }
                          </p>
                          {stats.averageTimes[difficulty] && (
                            <p className="text-xs text-muted-foreground">
                              平均: {formatDuration(stats.averageTimes[difficulty]!)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* 回放对话框 */}
      <AlertDialog open={showReplayDialog} onOpenChange={setShowReplayDialog}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>游戏回放</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedGame && (
                <>
                  {SudokuUtils.getDifficultyName(selectedGame.difficulty)} 难度 | 
                  {format(selectedGame.startTime, 'yyyy-MM-dd HH:mm')} | 
                  第 {replayIndex} / {selectedGame.moves.length} 步
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="flex justify-center py-4">
            {selectedGame && (
              <div className="transform scale-75">
                <SudokuGridComponent
                  grid={getReplayGrid()}
                  initialGrid={selectedGame.initialGrid}
                  conflicts={[]}
                  onCellChange={() => {}}
                  readOnly={true}
                  className="pointer-events-none"
                />
              </div>
            )}
          </div>
          
          <div className="flex justify-center gap-2 py-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReplayIndex(Math.max(0, replayIndex - 1))}
              disabled={replayIndex === 0 || isReplaying}
            >
              上一步
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={playReplay}
              disabled={isReplaying || !selectedGame}
            >
              {isReplaying ? '播放中...' : '自动播放'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReplayIndex(Math.min(selectedGame?.moves.length || 0, replayIndex + 1))}
              disabled={replayIndex === (selectedGame?.moves.length || 0) || isReplaying}
            >
              下一步
            </Button>
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowReplayDialog(false);
              setIsReplaying(false);
            }}>
              关闭
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={!!gameToDelete} onOpenChange={() => setGameToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除游戏记录</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除这条游戏记录吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => gameToDelete && deleteGame(gameToDelete)}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
