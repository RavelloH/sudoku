'use client';

import { useState, useEffect } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { Header } from '@/components/header';
import { ChallengeMode } from '@/components/challenge-mode';
import { GenerateMode } from '@/components/generate-mode';
import { SolverMode } from '@/components/solver-mode';
import { HistoryMode } from '@/components/history-mode';
import { SudokuGrid, SudokuGame } from '@/types/sudoku';
import { CloudStorageManager } from '@/lib/cloud-storage';
import { StorageUtils } from '@/lib/storage';
import { toast } from 'sonner';

export function SudokuApp() {
  const [currentTab, setCurrentTab] = useState('challenge');
  const [solverInitialGrid, setSolverInitialGrid] = useState<SudokuGrid | null>(null);
  const [challengeGame, setChallengeGame] = useState<SudokuGame | null>(null);
  const [cloudStorage] = useState(() => CloudStorageManager.getInstance());
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [isCloudSyncComplete, setIsCloudSyncComplete] = useState(false);

  // Hash routing logic
  useEffect(() => {
    const getTabFromHash = () => {
      const hash = window.location.hash.slice(1); // Remove the # symbol
      return ['challenge', 'generate', 'solver', 'history'].includes(hash) ? hash : 'challenge';
    };

    const handleHashChange = () => {
      const newTab = getTabFromHash();
      if (newTab !== currentTab) {
        // Clear solver initial grid when switching to solver mode directly via hash
        if (newTab === 'solver' && currentTab !== 'solver') {
          setSolverInitialGrid(null);
        }
        setCurrentTab(newTab);
      }
    };

    // Set initial tab based on hash
    const initialTab = getTabFromHash();
    if (initialTab !== currentTab) {
      setCurrentTab(initialTab);
    }

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [currentTab]);

  // 云存档同步逻辑
  useEffect(() => {
    // 检查快速登录
    const quickLogin = cloudStorage.checkQuickLogin();
    if (quickLogin) {
      cloudStorage.saveAuth(quickLogin.uuid, quickLogin.password);
      toast.success('快速登录成功！');
    }

    // 页面加载时从云端获取数据，然后立即用本地数据覆盖云端
    const syncWithCloud = async () => {
      if (!cloudStorage.isLoggedIn()) {
        setIsCloudSyncComplete(true);
        return;
      }

      try {
        setSyncStatus('syncing');
        
        // 从云端下载数据（仅用于检查）
        const result = await cloudStorage.checkCloudUpdates();
        
        if (result.success && result.data) {
          // 恢复云端数据到本地
          const cloudData = result.data as { games?: unknown[]; stats?: unknown; settings?: unknown };
          
          // 恢复游戏数据
          if (cloudData.games) {
            cloudData.games.forEach((game: unknown) => {
              const gameData = game as SudokuGame & { startTime: string; endTime?: string; moves: Array<{ timestamp: string } & Record<string, unknown>> };
              StorageUtils.saveGame({
                ...gameData,
                startTime: new Date(gameData.startTime),
                endTime: gameData.endTime ? new Date(gameData.endTime) : undefined,
                moves: gameData.moves.map((move) => ({
                  ...move,
                  timestamp: new Date(move.timestamp)
                }))
              });
            });
            
            // 恢复统计数据
            if (cloudData.stats) {
              localStorage.setItem('sudoku_stats', JSON.stringify(cloudData.stats));
            }
            
            // 恢复设置
            if (cloudData.settings) {
              localStorage.setItem('sudoku_settings', JSON.stringify(cloudData.settings));
            }
            
            setSyncStatus('success');
            toast.success('已从云端同步数据！');
            
            // 立即用本地数据覆盖云端
            const allGames = StorageUtils.getAllGamesIncludingUnstarted();
            const stats = StorageUtils.getStats();
            const settings = StorageUtils.getSettings();
            
            const localData = {
              games: allGames,
              stats: stats,
              settings: settings,
              lastSync: new Date().toISOString()
            };
            
            await cloudStorage.uploadLocalData(localData);
          } else {
            setSyncStatus('success');
          }
        } else {
          setSyncStatus('error');
          console.error('Cloud download failed:', result.message);
        }
      } catch (error) {
        setSyncStatus('error');
        console.error('Cloud sync error:', error);
      } finally {
        setIsCloudSyncComplete(true);
      }
    };

    // 立即执行同步，确保在页面内容加载前完成
    const timer = setTimeout(syncWithCloud, 500);
    
    return () => clearTimeout(timer);
  }, [cloudStorage]);

  // 移除云端数据更新监听和心跳同步
  // 现在只在页面加载时同步一次，然后本地变化立即上传到云端

  // 监听本地存储变化，立即上传到云端
  useEffect(() => {
    if (!cloudStorage.isLoggedIn() || !isCloudSyncComplete) {
      return;
    }

    // 上传本地数据到云端
    const uploadLocalData = async () => {
      try {
        const allGames = StorageUtils.getAllGamesIncludingUnstarted();
        const stats = StorageUtils.getStats();
        const settings = StorageUtils.getSettings();
        
        const localData = {
          games: allGames,
          stats: stats,
          settings: settings,
          lastSync: new Date().toISOString()
        };

        const result = await cloudStorage.uploadLocalData(localData);
        if (result.success) {
          console.log('Local data uploaded to cloud successfully');
        }
      } catch (error) {
        console.error('Auto upload failed:', error);
      }
    };

    // 监听storage事件（其他标签页的变化）
    const handleStorageChange = (event: StorageEvent) => {
      // 只监听我们关心的key
      const watchedKeys = ['sudoku_games', 'sudoku_stats', 'sudoku_settings', 'sudoku_current_game'];
      if (watchedKeys.includes(event.key || '')) {
        // 立即上传，无延时
        uploadLocalData();
      }
    };

    // 重写localStorage方法以监听当前标签页的变化
    const originalSetItem = localStorage.setItem;
    const originalRemoveItem = localStorage.removeItem;

    localStorage.setItem = function(key: string, value: string) {
      originalSetItem.call(this, key, value);
      
      // 只监听我们关心的key
      const watchedKeys = ['sudoku_games', 'sudoku_stats', 'sudoku_settings', 'sudoku_current_game'];
      if (watchedKeys.includes(key)) {
        // 立即上传，无延时
        uploadLocalData();
      }
    };

    localStorage.removeItem = function(key: string) {
      originalRemoveItem.call(this, key);
      
      // 只监听我们关心的key
      const watchedKeys = ['sudoku_games', 'sudoku_stats', 'sudoku_settings', 'sudoku_current_game'];
      if (watchedKeys.includes(key)) {
        // 立即上传，无延时
        uploadLocalData();
      }
    };

    // 监听storage事件（其他标签页的变化）
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      // 清理监听器
      window.removeEventListener('storage', handleStorageChange);
      
      // 恢复原始方法
      localStorage.setItem = originalSetItem;
      localStorage.removeItem = originalRemoveItem;
    };
  }, [cloudStorage, isCloudSyncComplete]);

  const handleTabChange = (tab: string) => {
    // Clear solver initial grid when switching to solver mode directly
    if (tab === 'solver' && currentTab !== 'solver') {
      setSolverInitialGrid(null);
    }
    setCurrentTab(tab);
    // Update the URL hash
    window.history.pushState(null, '', `#${tab}`);
  };

  const handleSwitchToSolver = (grid: SudokuGrid) => {
    setSolverInitialGrid(grid);
    setCurrentTab('solver');
    // Update the URL hash
    window.history.pushState(null, '', '#solver');
  };

  const handleSwitchToChallenge = (game?: SudokuGame) => {
    setChallengeGame(game || null);
    setCurrentTab('challenge');
    // Update the URL hash
    window.history.pushState(null, '', '#challenge');
  };

  const renderContent = () => {
    // 如果云同步未完成且已登录，显示加载状态
    if (!isCloudSyncComplete && cloudStorage.isLoggedIn()) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">正在同步云存档...</p>
          </div>
        </div>
      );
    }

    switch (currentTab) {
      case 'challenge':
        return <ChallengeMode onSwitchToSolver={handleSwitchToSolver} gameToLoad={challengeGame} />;
      case 'generate':
        return <GenerateMode />;
      case 'solver':
        return <SolverMode initialGrid={solverInitialGrid} />;
      case 'history':
        return <HistoryMode onSwitchToChallenge={handleSwitchToChallenge} />;
      default:
        return <ChallengeMode onSwitchToSolver={handleSwitchToSolver} gameToLoad={challengeGame} />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header currentTab={currentTab} onTabChange={handleTabChange} />
      
      <main className="container mx-auto px-4 py-8">
        {renderContent()}
      </main>

      <footer className="border-t bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 mt-16 border-border/50">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground text-center md:text-left">
              <p className="font-medium">© 2025 RavelloH&apos;s Sudoku. 精美的数独游戏体验。</p>
              <p className="mt-2 flex items-center justify-center md:justify-start gap-1">
                访问{' '}
                <a 
                  href="https://ravelloh.top" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  ravelloh.top
                </a>
                {' '}了解更多
              </p>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <a 
                href="https://ravelloh.top" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors"
              >
                作者博客
              </a>
              <span>•</span>
              <a 
                href="https://github.com/RavelloH/Sudoku" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors"
              >
                GitHub
              </a>
            </div>
          </div>
        </div>
      </footer>

      <Toaster position="bottom-right" richColors />
    </div>
  );
}
