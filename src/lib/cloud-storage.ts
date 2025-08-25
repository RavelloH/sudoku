export interface CloudStorage {
  uuid: string;
  password: string;
  lastSync?: number;
}

export interface SyncResult {
  success: boolean;
  message: string;
  data?: unknown;
}

export class CloudStorageManager {
  private static instance: CloudStorageManager;
  private storage: CloudStorage | null = null;
  private lastUploadTime = 0;
  private readonly UPLOAD_COOLDOWN = 10000; // 10秒防抖
  private syncInProgress = false;

  private constructor() {
    // 只在客户端从localStorage加载认证信息
    if (typeof window !== 'undefined') {
      this.loadAuth();
    }
  }

  static getInstance(): CloudStorageManager {
    if (!CloudStorageManager.instance) {
      CloudStorageManager.instance = new CloudStorageManager();
    }
    return CloudStorageManager.instance;
  }

  // 从localStorage加载认证信息
  loadAuth(): CloudStorage | null {
    if (typeof window === 'undefined') {
      return null;
    }
    
    try {
      const stored = localStorage.getItem('sudoku_cloud_auth');
      if (stored) {
        this.storage = JSON.parse(stored);
        return this.storage;
      }
    } catch (error) {
      console.error('Failed to load auth from localStorage:', error);
    }
    return null;
  }

  // 保存认证信息到localStorage
  saveAuth(uuid: string, password: string): void {
    this.storage = { uuid, password };
    if (typeof window === 'undefined') {
      return;
    }
    
    try {
      localStorage.setItem('sudoku_cloud_auth', JSON.stringify(this.storage));
    } catch (error) {
      console.error('Failed to save auth to localStorage:', error);
    }
  }

  // 清除认证信息
  clearAuth(): void {
    this.storage = null;
    if (typeof window === 'undefined') {
      return;
    }
    
    try {
      localStorage.removeItem('sudoku_cloud_auth');
    } catch (error) {
      console.error('Failed to clear auth from localStorage:', error);
    }
  }

  // 检查是否已登录
  isLoggedIn(): boolean {
    return this.storage !== null;
  }

  // 获取当前认证信息
  getAuth(): CloudStorage | null {
    return this.storage;
  }

  // 上传数据到云端
  async uploadData(data: unknown): Promise<SyncResult> {
    if (!this.storage) {
      return { success: false, message: '未登录' };
    }

    // 检查防抖
    const now = Date.now();
    if (now - this.lastUploadTime < this.UPLOAD_COOLDOWN) {
      return { success: false, message: '请求过于频繁，请稍后再试' };
    }

    try {
      const response = await fetch('https://cache.ravelloh.top/api?mode=set', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: data,
          password: this.storage.password,
          safeIP: '*.*.*.*',
          expiredTime: 24 * 60 * 60 * 1000, // 24小时过期
          uuid: this.storage.uuid
        })
      });

      const result = await response.json();
      
      if (result.code === 200) {
        this.lastUploadTime = now;
        return { success: true, message: '上传成功', data: result };
      } else {
        return { success: false, message: result.message || '上传失败' };
      }
    } catch (error) {
      console.error('Upload failed:', error);
      return { success: false, message: '网络错误，上传失败' };
    }
  }

  // 从云端下载数据
  async downloadData(): Promise<SyncResult> {
    if (!this.storage) {
      return { success: false, message: '未登录' };
    }

    try {
      const response = await fetch('https://cache.ravelloh.top/api?mode=get', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          uuid: this.storage.uuid,
          password: this.storage.password,
          shouldDelete: false
        })
      });

      const result = await response.json();
      
      if (result.code === 200) {
        return { success: true, message: '下载成功', data: result.data };
      } else {
        return { success: false, message: result.message || '下载失败' };
      }
    } catch (error) {
      console.error('Download failed:', error);
      return { success: false, message: '网络错误，下载失败' };
    }
  }

  // 测试连接
  async testConnection(uuid: string, password: string): Promise<SyncResult> {
    try {
      const response = await fetch('https://cache.ravelloh.top/api?mode=get', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          uuid: uuid,
          password: password,
          shouldDelete: false
        })
      });

      const result = await response.json();
      
      if (result.code === 200) {
        return { success: true, message: '连接成功' };
      } else {
        return { success: false, message: result.message || '连接失败' };
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      return { success: false, message: '网络错误，连接失败' };
    }
  }

  // 生成随机UUID
  generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // 生成随机密码
  generatePassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // 生成快速登录链接
  generateQuickLoginLink(): string {
    if (!this.storage || typeof window === 'undefined') {
      return '';
    }
    return `${window.location.origin}/?uuid=${this.storage.uuid}&password=${this.storage.password}`;
  }

  // 检查URL参数中的快速登录信息
  checkQuickLogin(): { uuid: string; password: string } | null {
    if (typeof window === 'undefined') {
      return null;
    }
    
    const params = new URLSearchParams(window.location.search);
    const uuid = params.get('uuid');
    const password = params.get('password');
    
    if (uuid && password) {
      // 清除URL参数
      window.history.replaceState({}, document.title, window.location.pathname);
      return { uuid, password };
    }
    
    return null;
  }

  // 自动同步（在页面加载时下载，在本地更新时上传）
  async autoSync(localData: unknown, forceDownload = false): Promise<SyncResult> {
    if (this.syncInProgress) {
      return { success: false, message: '同步正在进行中' };
    }

    this.syncInProgress = true;

    try {
      // 如果强制下载或者没有本地数据，先下载
      if (forceDownload || !localData) {
        const downloadResult = await this.downloadData();
        if (downloadResult.success) {
          this.syncInProgress = false;
          return downloadResult;
        }
      }

      // 如果有本地数据，尝试上传
      if (localData) {
        const uploadResult = await this.uploadData(localData);
        this.syncInProgress = false;
        return uploadResult;
      }

      this.syncInProgress = false;
      return { success: false, message: '没有数据需要同步' };
    } catch (error) {
      this.syncInProgress = false;
      console.error('Auto sync failed:', error);
      return { success: false, message: '同步失败' };
    }
  }
}