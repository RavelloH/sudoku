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
import { cn } from '@/lib/utils';

export function HistoryMode({ onSwitchToChallenge }: { onSwitchToChallenge?: (game?: SudokuGame) => void }) {
  const [games, setGames] = useState<SudokuGame[]>([]);
  const [stats, setStats] = useState<GameStats>(StorageUtils.getStats());
  const [selectedGame, setSelectedGame] = useState<SudokuGame | null>(null);
  const [selectedGameForDisplay, setSelectedGameForDisplay] = useState<SudokuGame | null>(null);
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
    
    // 如果有游戏但没有选中的游戏，自动选中第一个
    if (allGames.length > 0 && !selectedGameForDisplay) {
      setSelectedGameForDisplay(allGames[0]);
      setReplayIndex(allGames[0].moves.length);
    }
  };

  const deleteGame = (gameId: string) => {
    StorageUtils.deleteGame(gameId);
    // 如果删除的是当前选中的游戏，重置选中状态
    if (selectedGameForDisplay?.id === gameId) {
      setSelectedGameForDisplay(null);
    }
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
    if (!selectedGameForDisplay) return;
    
    setIsReplaying(true);
    setReplayIndex(0);
    
    const playMove = (index: number) => {
      if (index >= selectedGameForDisplay.moves.length) {
        setIsReplaying(false);
        toast.success('回放完成！');
        return;
      }
      
      setReplayIndex(index + 1);
      setTimeout(() => playMove(index + 1), 200); // 加快速度到400毫秒
    };
    
    playMove(0);
  };

  const getReplayGrid = (): any => {
    if (!selectedGameForDisplay) return SudokuUtils.createEmptyGrid();
    
    const grid = SudokuUtils.copyGrid(selectedGameForDisplay.initialGrid);
    
    for (let i = 0; i < replayIndex && i < selectedGameForDisplay.moves.length; i++) {
      const move = selectedGameForDisplay.moves[i];
      grid[move.row][move.col] = move.value;
    }
    
    return grid;
  };

  const continueGame = (game: SudokuGame) => {
    if (onSwitchToChallenge) {
      onSwitchToChallenge(game);
      toast.success('继续游戏');
    } else {
      toast.error('无法继续游戏');
    }
  };

  const restartGame = (game: SudokuGame) => {
    if (onSwitchToChallenge) {
      // 创建一个重新开始的游戏状态
      const restartedGame: SudokuGame = {
        ...game,
        id: `restart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        currentGrid: SudokuUtils.copyGrid(game.initialGrid),
        startTime: new Date(),
        endTime: undefined,
        duration: 0,
        isCompleted: false,
        moves: []
      };
      onSwitchToChallenge(restartedGame);
      toast.success('重新开始游戏');
    } else {
      toast.error('无法重新开始游戏');
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}分${secs}秒`;
  };

  const getCompletionRate = (): number => {
    return stats.totalGames > 0 ? Math.round((stats.completedGames / stats.totalGames) * 100) : 0;
  };

  const getDifficultyStats = (difficulty: Difficulty) => {
    const allGames = StorageUtils.getAllGames();
    const gamesOfDifficulty = allGames.filter(game => game.difficulty === difficulty);
    const completedGamesOfDifficulty = gamesOfDifficulty.filter(game => game.isCompleted);
    
    const started = gamesOfDifficulty.length;
    const completed = completedGamesOfDifficulty.length;
    const averageTime = completedGamesOfDifficulty.length > 0 
      ? Math.round(completedGamesOfDifficulty.reduce((sum, game) => sum + (game.duration || 0), 0) / completedGamesOfDifficulty.length)
      : 0;
    
    return { started, completed, averageTime };
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* 顶部统计数据栏 */}
      <Card className="card-enhanced">
        <CardContent className="pt-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <BarChart3 className="w-5 h-5 text-primary mr-2" />
                <span className="text-2xl font-bold">{stats.totalGames}</span>
              </div>
              <p className="text-sm text-muted-foreground">总游戏数</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Trophy className="w-5 h-5 text-yellow-500 mr-2" />
                <span className="text-2xl font-bold">{stats.completedGames}</span>
              </div>
              <p className="text-sm text-muted-foreground">已完成</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                <span className="text-2xl font-bold">{getCompletionRate()}%</span>
              </div>
              <p className="text-sm text-muted-foreground">完成率</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 主要内容区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧 - 棋盘展示区域 */}
        <div className="lg:col-span-2">
          <Card className="card-enhanced">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">对局回放</CardTitle>
                {selectedGameForDisplay && (
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={selectedGameForDisplay.isCompleted ? "default" : "secondary"}
                      className="flex items-center gap-1"
                    >
                      {selectedGameForDisplay.isCompleted ? (
                        <CheckCircle className="w-3 h-3" />
                      ) : (
                        <Clock className="w-3 h-3" />
                      )}
                      {selectedGameForDisplay.isCompleted ? '已完成' : '进行中'}
                    </Badge>
                    <Badge 
                      variant="outline"
                      className={SudokuUtils.getDifficultyColor(selectedGameForDisplay.difficulty)}
                    >
                      {SudokuUtils.getDifficultyName(selectedGameForDisplay.difficulty)}
                    </Badge>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {selectedGameForDisplay ? (
                <div className="space-y-4">
                  {/* 棋盘显示 */}
                  <div className="flex justify-center">
                    <SudokuGridComponent
                      grid={getReplayGrid()}
                      initialGrid={selectedGameForDisplay.initialGrid}
                      conflicts={[]}
                      onCellChange={() => {}}
                      readOnly={true}
                      className="w-full max-w-lg"
                    />
                  </div>
                  
                  {/* 回放控制 */}
                  {selectedGameForDisplay.moves.length > 0 && (
                    <div className="space-y-3">
                      <div className="text-center text-sm text-muted-foreground">
                        第 {replayIndex} / {selectedGameForDisplay.moves.length} 步
                      </div>
                      <div className="flex justify-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setReplayIndex(0)}
                          disabled={replayIndex === 0 || isReplaying}
                        >
                          开始
                        </Button>
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
                          disabled={isReplaying || selectedGameForDisplay.moves.length === 0}
                        >
                          {isReplaying ? '播放中...' : '自动播放'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setReplayIndex(Math.min(selectedGameForDisplay.moves.length, replayIndex + 1))}
                          disabled={replayIndex === selectedGameForDisplay.moves.length || isReplaying}
                        >
                          下一步
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setReplayIndex(selectedGameForDisplay.moves.length)}
                          disabled={replayIndex === selectedGameForDisplay.moves.length || isReplaying}
                        >
                          结束
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {/* 游戏详细信息 */}
                  {selectedGameForDisplay && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm bg-muted/30 p-4 rounded-lg">
                      <div>
                        <span className="text-muted-foreground">开始时间</span>
                        <p className="font-medium">
                          {format(selectedGameForDisplay.startTime, 'MM-dd HH:mm')}
                        </p>
                      </div>
                      
                      {selectedGameForDisplay.duration && (
                        <div>
                          <span className="text-muted-foreground">用时</span>
                          <p className="font-medium">{formatDuration(selectedGameForDisplay.duration)}</p>
                        </div>
                      )}
                      
                      <div>
                        <span className="text-muted-foreground">步数</span>
                        <p className="font-medium">{selectedGameForDisplay.moves.length}</p>
                      </div>
                      
                      <div>
                        <span className="text-muted-foreground">进度</span>
                        <p className="font-medium">
                          {Math.round((selectedGameForDisplay.moves.length / 81) * 100)}%
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <History className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">请选择一个游戏查看详情</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 右侧 - 游戏列表 */}
        <div className="space-y-4">
          {/* 最佳时间 */}
          <Card className="card-enhanced">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                最佳时间
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {(['easy', 'medium', 'hard', 'expert', 'master', 'extreme'] as Difficulty[]).map((difficulty) => {
                  const difficultyStats = getDifficultyStats(difficulty);
                  const difficultyColors = {
                    easy: 'text-green-600 dark:text-green-400',
                    medium: 'text-blue-600 dark:text-blue-400',
                    hard: 'text-orange-600 dark:text-orange-400',
                    expert: 'text-red-600 dark:text-red-400',
                    master: 'text-purple-600 dark:text-purple-400',
                    extreme: 'text-gray-600 dark:text-gray-400'
                  };
                  const difficultyNames = {
                    easy: '简单',
                    medium: '中等',
                    hard: '困难',
                    expert: '专家',
                    master: '大师',
                    extreme: '极限'
                  };
                  
                  return (
                    <div key={difficulty} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <span className={`text-sm font-medium ${difficultyColors[difficulty]}`}>
                        {difficultyNames[difficulty]}
                      </span>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="font-semibold">
                          {stats.bestTimes[difficulty] ? formatDuration(stats.bestTimes[difficulty]) : '--'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {difficultyStats.completed}/{difficultyStats.started}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {difficultyStats.averageTime > 0 ? formatDuration(difficultyStats.averageTime) : '--'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* 游戏记录 */}
          <Card className="card-enhanced">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold">游戏记录</CardTitle>
            </CardHeader>
            <CardContent className="max-h-[600px] overflow-y-auto custom-scrollbar">
              {games.length === 0 ? (
                <div className="text-center py-8">
                  <History className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">还没有游戏记录</p>
                  <p className="text-sm text-muted-foreground">开始你的第一局数独吧！</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {games.map((game) => (
                    <motion.div
                      key={game.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={cn(
                        "border rounded-lg p-3 cursor-pointer transition-all duration-200 hover:bg-muted/50",
                        selectedGameForDisplay?.id === game.id && "bg-primary/5"
                      )}
                      onClick={() => {
                        setSelectedGameForDisplay(game);
                        setReplayIndex(game.moves.length);
                      }}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={game.isCompleted ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {game.isCompleted ? '完成' : '进行中'}
                            </Badge>
                            <Badge 
                              variant="outline"
                              className="text-xs"
                            >
                              {SudokuUtils.getDifficultyName(game.difficulty)}
                            </Badge>
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setGameToDelete(game.id);
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">开始时间</span>
                            <p className="font-medium">
                              {format(game.startTime, 'MM-dd HH:mm')}
                            </p>
                          </div>
                          
                          {game.duration ? (
                            <div>
                              <span className="text-muted-foreground">用时</span>
                              <p className="font-medium">{formatDuration(game.duration)}</p>
                            </div>
                          ) : (
                            <div>
                              <span className="text-muted-foreground">步数</span>
                              <p className="font-medium">{game.moves.length}</p>
                            </div>
                          )}
                        </div>
                        
                        {!game.isCompleted && (
                          <div className="flex gap-1">
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="flex-1 text-xs h-7"
                              onClick={(e) => {
                                e.stopPropagation();
                                continueGame(game);
                              }}
                            >
                              <Play className="w-3 h-3 mr-1" />
                              继续
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="flex-1 text-xs h-7"
                              onClick={(e) => {
                                e.stopPropagation();
                                restartGame(game);
                              }}
                            >
                              重开
                            </Button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

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
              <div className="flex justify-center">
                <SudokuGridComponent
                  className="w-full max-w-lg pointer-events-none"
                  grid={selectedGame ? (() => {
                    const grid = SudokuUtils.copyGrid(selectedGame.initialGrid);
                    for (let i = 0; i < replayIndex && i < selectedGame.moves.length; i++) {
                      const move = selectedGame.moves[i];
                      grid[move.row][move.col] = move.value;
                    }
                    return grid;
                  })() : SudokuUtils.createEmptyGrid()}
                  initialGrid={selectedGame.initialGrid}
                  conflicts={[]}
                  onCellChange={() => {}}
                  readOnly={true}
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
              onClick={() => {
                if (!selectedGame) return;
                
                setIsReplaying(true);
                let currentIndex = 0;
                
                const playMove = () => {
                  if (currentIndex >= selectedGame.moves.length) {
                    setIsReplaying(false);
                    toast.success('回放完成！');
                    return;
                  }
                  
                  setReplayIndex(currentIndex + 1);
                  currentIndex++;
                  setTimeout(playMove, 200); // 加快速度到400毫秒
                };
                
                setReplayIndex(0);
                setTimeout(playMove, 200); // 初始延迟也加快到400毫秒
              }}
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