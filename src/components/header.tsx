'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { SudokuIcon } from '@/components/sudoku-icon';
import { 
  Tabs, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Sun, 
  Moon, 
  Monitor, 
  Cloud,
  CloudOff,
  Github,
  Globe,
  Menu,
  X
} from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { VisuallyHidden } from '@/components/ui/visually-hidden';
import { CloudAuthModal } from '@/components/cloud-auth-modal';
import { CloudStorageManager } from '@/lib/cloud-storage';
import { Badge } from '@/components/ui/badge';

interface HeaderProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
}

export function Header({ currentTab, onTabChange }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showCloudAuthModal, setShowCloudAuthModal] = useState(false);
  const [cloudStorage] = useState(() => CloudStorageManager.getInstance());
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // 检查登录状态
  useEffect(() => {
    setIsLoggedIn(cloudStorage.isLoggedIn());
  }, [cloudStorage]);

  const handleCloudAuthSuccess = () => {
    setIsLoggedIn(true);
  };

  const tabs = [
    { value: 'challenge', label: '挑战' },
    { value: 'generate', label: '批量生成' },
    { value: 'solver', label: '自动解题' },
    { value: 'history', label: '历史记录' }
  ];

  const ThemeToggle = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="w-9 h-9 p-0">
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">切换主题</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme('light')}>
          <Sun className="mr-2 h-4 w-4" />
          亮色
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>
          <Moon className="mr-2 h-4 w-4" />
          暗色
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>
          <Monitor className="mr-2 h-4 w-4" />
          跟随系统
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const ExternalLinks = () => (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="sm" className="w-9 h-9 p-0" asChild>
        <a 
          href="https://ravelloh.top" 
          target="_blank" 
          rel="noopener noreferrer"
          title="作者博客"
        >
          <Globe className="h-4 w-4" />
        </a>
      </Button>
      <Button variant="ghost" size="sm" className="w-9 h-9 p-0" asChild>
        <a 
          href="https://github.com/RavelloH/Sudoku" 
          target="_blank" 
          rel="noopener noreferrer"
          title="GitHub 仓库"
        >
          <Github className="h-4 w-4" />
        </a>
      </Button>
    </div>
  );

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 card-enhanced border-b-border/50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo and Title */}
          <div className="flex items-center gap-4">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3"
            >
              <SudokuIcon />
              <div>
                <h1 className="text-lg font-bold text-gradient">RavelloH&apos;s Sudoku</h1>
                <p className="hidden sm:block text-xs text-muted-foreground">关于数独的一切</p>
              </div>
            </motion.div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <Tabs value={currentTab} onValueChange={onTabChange}>
              <TabsList className="grid w-full grid-cols-4 bg-muted/30 border border-border/50">
                {tabs.map((tab) => (
                  <TabsTrigger 
                    key={tab.value} 
                    value={tab.value}
                    className="text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm"
                  >
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {/* Desktop Right Side */}
          <div className="hidden md:flex items-center gap-2">
            <ExternalLinks />
            <ThemeToggle />
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-9 h-9 p-0 hover:bg-muted/50 transition-colors relative"
              onClick={() => setShowCloudAuthModal(true)}
            >
              {isLoggedIn ? (
                <>
                  <Cloud className="h-4 w-4" />
                </>
              ) : (
                <CloudOff className="h-4 w-4" />
              )}
              <span className="sr-only">云存档</span>
            </Button>
          </div>

          {/* Mobile Menu */}
          <div className="md:hidden flex items-center gap-2">
            <ThemeToggle />
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="w-9 h-9 p-0">
                  <Menu className="h-4 w-4" />
                  <span className="sr-only">菜单</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px] px-6 py-6">
                <SheetHeader>
                  <VisuallyHidden>
                    <SheetTitle>菜单</SheetTitle>
                  </VisuallyHidden>
                </SheetHeader>
                <div className="flex flex-col gap-8">
                  {/* Mobile Navigation */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">导航</h3>
                    <div className="space-y-3">
                    {tabs.map((tab) => (
                      <Button
                        key={tab.value}
                        variant={currentTab === tab.value ? "default" : "ghost"}
                        className="w-full justify-start h-10"
                        onClick={() => {
                          onTabChange(tab.value);
                          setIsMobileMenuOpen(false);
                        }}
                      >
                        {tab.label}
                      </Button>
                    ))}
                    </div>
                  </div>

                  {/* Mobile Links */}
                  <div className="pt-4 border-t">
                    <h3 className="text-lg font-semibold mb-4">链接</h3>
                    <div className="space-y-3">
                      <Button variant="ghost" className="w-full justify-start h-10" asChild>
                        <a 
                          href="https://ravelloh.top" 
                          target="_blank" 
                          rel="noopener noreferrer"
                        >
                          <Globe className="mr-2 h-4 w-4" />
                          作者博客
                        </a>
                      </Button>
                      <Button variant="ghost" className="w-full justify-start h-10" asChild>
                        <a 
                          href="https://github.com/RavelloH/Sudoku" 
                          target="_blank" 
                          rel="noopener noreferrer"
                        >
                          <Github className="mr-2 h-4 w-4" />
                          GitHub 仓库
                        </a>
                      </Button>
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start h-10"
                        onClick={() => {
                          setShowCloudAuthModal(true);
                          setIsMobileMenuOpen(false);
                        }}
                      >
                        {isLoggedIn ? (
                          <>
                            <Cloud className="mr-2 h-4 w-4" />
                            云存档
                          </>
                        ) : (
                          <>
                            <CloudOff className="mr-2 h-4 w-4" />
                            登录云存档
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* 云存档认证模态窗口 */}
      <CloudAuthModal 
        isOpen={showCloudAuthModal} 
        onClose={() => setShowCloudAuthModal(false)}
        onLoginSuccess={handleCloudAuthSuccess}
      />
    </>
  );
}
