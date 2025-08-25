'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { CloudStorageManager } from '@/lib/cloud-storage';
import { StorageUtils } from '@/lib/storage';
import { SudokuGame, Move } from '@/types/sudoku';
import { Copy, Link as LinkIcon, LogIn, UserPlus, Shield, Cloud, Check } from 'lucide-react';

interface CloudAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess?: () => void;
}

export function CloudAuthModal({ isOpen, onClose, onLoginSuccess }: CloudAuthModalProps) {
  const [activeTab, setActiveTab] = useState('login');
  const [loginUuid, setLoginUuid] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState<{ uuid: string; password: string } | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [cloudStorage] = useState(() => CloudStorageManager.getInstance());

  // 检查快速登录
  useEffect(() => {
    const quickLogin = cloudStorage.checkQuickLogin();
    if (quickLogin) {
      // 直接处理快速登录，避免循环依赖
      (async () => {
        try {
          const testResult = await cloudStorage.testConnection(quickLogin.uuid, quickLogin.password);
          if (testResult.success) {
            cloudStorage.saveAuth(quickLogin.uuid, quickLogin.password);
            
            // 立即开始同步
            const downloadResult = await cloudStorage.downloadData();
            if (downloadResult.success && downloadResult.data) {
              const data = downloadResult.data as { games?: unknown[]; stats?: unknown; settings?: unknown };
              if (data.games) {
                data.games.forEach((game: unknown) => {
                  const gameData = game as SudokuGame & { startTime: string; endTime?: string; moves: Array<Move & { timestamp: string }> };
                  StorageUtils.saveGame({
                    ...gameData,
                    startTime: new Date(gameData.startTime),
                    endTime: gameData.endTime ? new Date(gameData.endTime) : undefined,
                    moves: gameData.moves.map((move) => ({
                      row: move.row,
                      col: move.col,
                      value: move.value,
                      previousValue: move.previousValue,
                      timestamp: new Date(move.timestamp)
                    }))
                  });
                });
              }
              
              if (data.stats) {
                localStorage.setItem('sudoku_stats', JSON.stringify(data.stats));
              }
              
              if (data.settings) {
                localStorage.setItem('sudoku_settings', JSON.stringify(data.settings));
              }
              
              toast.success('快速登录成功！已同步云端数据');
            } else {
              toast.success('快速登录成功！');
            }
            
            onLoginSuccess?.();
          } else {
            toast.error('快速登录失败：' + testResult.message);
          }
        } catch {
          toast.error('快速登录失败，请检查网络连接');
        }
      })();
    }
  }, [cloudStorage, onLoginSuccess]);

  // 生成注册凭证
  const generateCredentials = () => {
    const uuid = cloudStorage.generateUUID();
    const password = cloudStorage.generatePassword();
    setGeneratedCredentials({ uuid, password });
  };

  // 复制到剪贴板
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`${label}已复制到剪贴板`);
    }).catch(() => {
      toast.error('复制失败，请手动复制');
    });
  };

  // 完成注册
  const completeRegistration = async () => {
    if (!generatedCredentials) return;

    setIsRegistering(true);
    try {
      // 先保存认证信息
      cloudStorage.saveAuth(generatedCredentials.uuid, generatedCredentials.password);
      
      // 尝试初始化上传一些数据以确保账户可用
      const initData = {
        games: [],
        stats: {
          totalGames: 0,
          completedGames: 0,
          bestTimes: {
            easy: null,
            medium: null,
            hard: null,
            expert: null,
            master: null,
            extreme: null
          },
          averageTimes: {
            easy: null,
            medium: null,
            hard: null,
            expert: null,
            master: null,
            extreme: null
          }
        },
        settings: {},
        lastSync: new Date().toISOString()
      };

      const uploadResult = await cloudStorage.uploadData(initData);
      
      if (uploadResult.success) {
        toast.success('注册成功！已开始同步数据');
        onLoginSuccess?.();
        onClose();
      } else {
        // 如果上传失败，清除保存的认证信息
        cloudStorage.clearAuth();
        toast.error('注册失败：' + uploadResult.message);
      }
    } catch {
      cloudStorage.clearAuth();
      toast.error('注册失败，请检查网络连接');
    } finally {
      setIsRegistering(false);
    }
  };

  
  // 处理登录
  const handleLogin = async () => {
    if (!loginUuid.trim() || !loginPassword.trim()) {
      toast.error('请输入UUID和密码');
      return;
    }

    setIsLoggingIn(true);
    try {
      // 测试连接
      const testResult = await cloudStorage.testConnection(loginUuid.trim(), loginPassword.trim());
      if (testResult.success) {
        // 保存认证信息
        cloudStorage.saveAuth(loginUuid.trim(), loginPassword.trim());
        
        // 立即开始同步 - 先下载数据
        const downloadResult = await cloudStorage.downloadData();
        if (downloadResult.success && downloadResult.data) {
          const data = downloadResult.data as { games?: unknown[]; stats?: unknown; settings?: unknown };
          // 恢复云端数据
          if (data.games) {
            data.games.forEach((game: unknown) => {
              const gameData = game as SudokuGame & { startTime: string; endTime?: string; moves: Array<Move & { timestamp: string }> };
              StorageUtils.saveGame({
                ...gameData,
                startTime: new Date(gameData.startTime),
                endTime: gameData.endTime ? new Date(gameData.endTime) : undefined,
                moves: gameData.moves.map((move) => ({
                  row: move.row,
                  col: move.col,
                  value: move.value,
                  previousValue: move.previousValue,
                  timestamp: new Date(move.timestamp)
                }))
              });
            });
          }
          
          if (data.stats) {
            localStorage.setItem('sudoku_stats', JSON.stringify(data.stats));
          }
          
          if (data.settings) {
            localStorage.setItem('sudoku_settings', JSON.stringify(data.settings));
          }
          
          toast.success('登录成功！已同步云端数据');
        } else {
          toast.success('登录成功！');
        }
        
        onLoginSuccess?.();
        onClose();
      } else {
        toast.error(testResult.message);
      }
    } catch {
      toast.error('登录失败，请检查网络连接');
    } finally {
      setIsLoggingIn(false);
    }
  };

  
  // 退出登录
  const handleLogout = () => {
    cloudStorage.clearAuth();
    toast.success('已退出登录');
  };

  // 检查当前登录状态
  const currentAuth = cloudStorage.getAuth();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cloud className="w-5 h-5" />
            云存档
          </DialogTitle>
          <DialogDescription>
            登录或注册云存档服务，同步你的游戏进度
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 当前登录状态 */}
          {currentAuth ? (
            <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="w-4 h-4 text-green-600" />
                  <span className="text-green-600">已登录</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">UUID:</span>
                    <code className="bg-muted px-2 py-1 rounded text-xs">{currentAuth.uuid}</code>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">密码:</span>
                    <code className="bg-muted px-2 py-1 rounded text-xs">{currentAuth.password}</code>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => copyToClipboard(currentAuth.uuid, 'UUID')}
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    复制UUID
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => copyToClipboard(currentAuth.password, '密码')}
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    复制密码
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => copyToClipboard(cloudStorage.generateQuickLoginLink(), '快速登录链接')}
                  >
                    <LinkIcon className="w-4 h-4 mr-1" />
                    复制链接
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="flex-1">
                        退出登录
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>退出登录</AlertDialogTitle>
                        <AlertDialogDescription>
                          确定要退出登录吗？退出后将无法同步云存档。
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction onClick={handleLogout}>确定</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login" className="flex items-center gap-2">
                  <LogIn className="w-4 h-4" />
                  登录
                </TabsTrigger>
                <TabsTrigger value="register" className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  注册
                </TabsTrigger>
              </TabsList>

            <TabsContent value="login" className="space-y-4">
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="login-uuid">UUID</Label>
                  <Input
                    id="login-uuid"
                    placeholder="请输入UUID"
                    value={loginUuid}
                    onChange={(e) => setLoginUuid(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">密码</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="请输入密码"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                  />
                </div>
                <Button 
                  className="w-full" 
                  onClick={handleLogin}
                  disabled={isLoggingIn || !loginUuid.trim() || !loginPassword.trim()}
                >
                  {isLoggingIn ? '登录中...' : '登录'}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="register" className="space-y-4">
              {!generatedCredentials ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-4">
                      点击生成按钮创建新的云存档账户
                    </p>
                    <Button onClick={generateCredentials} className="w-full">
                      <UserPlus className="w-4 h-4 mr-2" />
                      生成账户
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">生成的账户信息</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">UUID:</span>
                          <div className="flex items-center gap-2">
                            <code className="bg-muted px-2 py-1 rounded text-xs">{generatedCredentials.uuid}</code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(generatedCredentials.uuid, 'UUID')}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">密码:</span>
                          <div className="flex items-center gap-2">
                            <code className="bg-muted px-2 py-1 rounded text-xs">{generatedCredentials.password}</code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(generatedCredentials.password, '密码')}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      <Button 
                        size="sm" 
                        className="w-full"
                        onClick={completeRegistration}
                        disabled={isRegistering}
                      >
                        {isRegistering ? (
                          <>
                            <Cloud className="w-4 h-4 mr-2 animate-spin" />
                            注册中...
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4 mr-2" />
                            完成注册
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>

                  <div className="text-xs text-muted-foreground">
                    <p>⚠️ 请妥善保存UUID和密码，丢失后将无法找回！</p>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}