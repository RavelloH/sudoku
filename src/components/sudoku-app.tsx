'use client';

import { useState } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { Header } from '@/components/header';
import { ChallengeMode } from '@/components/challenge-mode';
import { GenerateMode } from '@/components/generate-mode';
import { SolverMode } from '@/components/solver-mode';
import { HistoryMode } from '@/components/history-mode';
import { SudokuGrid } from '@/types/sudoku';

export function SudokuApp() {
  const [currentTab, setCurrentTab] = useState('challenge');
  const [solverInitialGrid, setSolverInitialGrid] = useState<SudokuGrid | null>(null);

  const handleSwitchToSolver = (grid: SudokuGrid) => {
    setSolverInitialGrid(grid);
    setCurrentTab('solver');
  };

  const renderContent = () => {
    switch (currentTab) {
      case 'challenge':
        return <ChallengeMode onSwitchToSolver={handleSwitchToSolver} />;
      case 'generate':
        return <GenerateMode />;
      case 'solver':
        return <SolverMode initialGrid={solverInitialGrid} />;
      case 'history':
        return <HistoryMode />;
      default:
        return <ChallengeMode onSwitchToSolver={handleSwitchToSolver} />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header currentTab={currentTab} onTabChange={setCurrentTab} />
      
      <main className="container mx-auto px-4 py-8">
        {renderContent()}
      </main>

      <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 mt-16">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground text-center md:text-left">
              <p>© 2024 RavelloH's Sudoku. 精美的数独游戏体验。</p>
              <p className="mt-1">
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
