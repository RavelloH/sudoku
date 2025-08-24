'use client';

import { useState, useEffect } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { Header } from '@/components/header';
import { ChallengeMode } from '@/components/challenge-mode';
import { GenerateMode } from '@/components/generate-mode';
import { SolverMode } from '@/components/solver-mode';
import { HistoryMode } from '@/components/history-mode';
import { SudokuGrid, SudokuGame } from '@/types/sudoku';

export function SudokuApp() {
  const [currentTab, setCurrentTab] = useState('challenge');
  const [solverInitialGrid, setSolverInitialGrid] = useState<SudokuGrid | null>(null);
  const [challengeGame, setChallengeGame] = useState<SudokuGame | null>(null);

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
              <p className="font-medium">© 2024 RavelloH&apos;s Sudoku. 精美的数独游戏体验。</p>
              <p className="mt-2 flex items-center justify-center md:justify-start gap-1">
                访问{' '}
                <a 
                  href="https://sudoku.ravelloh.top" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  sudoku.ravelloh.top
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
