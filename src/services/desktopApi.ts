import type {
  DbInfo,
  InstituteState,
  Payment,
  SystemUser,
  UserRole,
} from '../types/institute.ts';

interface ElectronDesktopBridge {
  getState: () => Promise<InstituteState>;
  saveState: (state: InstituteState) => Promise<{ ok: boolean }>;
  addPayment: (payment: Payment) => Promise<InstituteState>;
  deleteStudent: (studentId: string) => Promise<InstituteState>;
  resetDemo: () => Promise<InstituteState>;
  getDbInfo: () => Promise<DbInfo>;
  createBackup: () => Promise<{
    canceled?: boolean;
    filePath?: string;
    sizeBytes?: number;
    createdAt?: string;
  }>;
  restoreBackup: () => Promise<{
    canceled?: boolean;
    state?: InstituteState;
  }>;
  listUsers: () => Promise<SystemUser[]>;
  createUser: (input: {
    username: string;
    fullName: string;
    role: UserRole;
    password: string;
  }) => Promise<SystemUser>;
  verifyLogin: (username: string, password: string) => Promise<SystemUser | null>;
  deleteUser: (userId: string) => Promise<{ ok: boolean }>;
  setRequireLogin: (enabled: boolean) => Promise<DbInfo>;
  printWindow: () => Promise<void>;
}

declare global {
  interface Window {
    electronAPI?: ElectronDesktopBridge;
  }
}

function getBridge(): ElectronDesktopBridge | null {
  return typeof window !== 'undefined' && window.electronAPI ? window.electronAPI : null;
}

async function parseErrorResponse(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string };
    return data.error || 'خطای غیرمنتظره در ارتباط با پایگاه داده';
  } catch {
    return 'خطای غیرمنتظره در ارتباط با پایگاه داده';
  }
}

export const desktopApi = {
  isDesktopApp(): boolean {
    return Boolean(getBridge());
  },

  async getState(): Promise<InstituteState> {
    const bridge = getBridge();
    if (bridge) return bridge.getState();

    const res = await fetch('/api/state');
    if (!res.ok) throw new Error(await parseErrorResponse(res));
    return (await res.json()) as InstituteState;
  },

  async saveState(state: InstituteState): Promise<{ ok: boolean }> {
    const bridge = getBridge();
    if (bridge) return bridge.saveState(state);

    const res = await fetch('/api/state', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
    });
    if (!res.ok) throw new Error(await parseErrorResponse(res));
    return (await res.json()) as { ok: boolean };
  },

  async addPayment(payment: Payment): Promise<InstituteState> {
    const bridge = getBridge();
    if (bridge) return bridge.addPayment(payment);

    const res = await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payment),
    });
    if (!res.ok) throw new Error(await parseErrorResponse(res));
    return (await res.json()) as InstituteState;
  },

  async deleteStudent(studentId: string): Promise<InstituteState> {
    const bridge = getBridge();
    if (bridge) return bridge.deleteStudent(studentId);

    const res = await fetch(`/api/students/${encodeURIComponent(studentId)}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(await parseErrorResponse(res));
    return (await res.json()) as InstituteState;
  },

  async resetDemo(): Promise<InstituteState> {
    const bridge = getBridge();
    if (bridge) return bridge.resetDemo();

    const res = await fetch('/api/reset-demo', { method: 'POST' });
    if (!res.ok) throw new Error(await parseErrorResponse(res));
    return (await res.json()) as InstituteState;
  },

  async getDbInfo(): Promise<DbInfo> {
    const bridge = getBridge();
    if (bridge) return bridge.getDbInfo();

    const res = await fetch('/api/db-info');
    if (!res.ok) throw new Error(await parseErrorResponse(res));
    return (await res.json()) as DbInfo;
  },

  async createNativeBackup(): Promise<{
    canceled?: boolean;
    filePath?: string;
    sizeBytes?: number;
    createdAt?: string;
  }> {
    const bridge = getBridge();
    if (bridge) return bridge.createBackup();

    const res = await fetch('/api/backup/download', { method: 'POST' });
    if (!res.ok) throw new Error(await parseErrorResponse(res));
    const createdAt = res.headers.get('X-Backup-Created-At') || new Date().toISOString();
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sepehr-backup-${Date.now()}.db`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return { canceled: false, sizeBytes: blob.size, createdAt };
  },

  async restoreNativeBackup(): Promise<{
    canceled?: boolean;
    state?: InstituteState;
  }> {
    const bridge = getBridge();
    if (!bridge) {
      throw new Error('برای انتخاب مستقیم فایل از پنجره ویندوز از نسخه دسکتاپ استفاده کنید.');
    }
    return bridge.restoreBackup();
  },

  async restoreBackupFileUpload(file: File): Promise<InstituteState> {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i += 1) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64Content = btoa(binary);
    const res = await fetch('/api/backup/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName: file.name, base64Content }),
    });
    if (!res.ok) throw new Error(await parseErrorResponse(res));
    const data = (await res.json()) as { state: InstituteState };
    return data.state;
  },

  async listUsers(): Promise<SystemUser[]> {
    const bridge = getBridge();
    if (bridge) return bridge.listUsers();

    const res = await fetch('/api/users');
    if (!res.ok) throw new Error(await parseErrorResponse(res));
    return (await res.json()) as SystemUser[];
  },

  async createUser(input: {
    username: string;
    fullName: string;
    role: UserRole;
    password: string;
  }): Promise<SystemUser> {
    const bridge = getBridge();
    if (bridge) return bridge.createUser(input);

    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error(await parseErrorResponse(res));
    return (await res.json()) as SystemUser;
  },

  async verifyLogin(username: string, password: string): Promise<SystemUser | null> {
    const bridge = getBridge();
    if (bridge) return bridge.verifyLogin(username, password);

    const res = await fetch('/api/users/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (res.status === 401) return null;
    if (!res.ok) throw new Error(await parseErrorResponse(res));
    return (await res.json()) as SystemUser;
  },

  async deleteUser(userId: string): Promise<void> {
    const bridge = getBridge();
    if (bridge) {
      await bridge.deleteUser(userId);
      return;
    }

    const res = await fetch(`/api/users/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(await parseErrorResponse(res));
  },

  async setRequireLogin(enabled: boolean): Promise<DbInfo> {
    const bridge = getBridge();
    if (bridge) return bridge.setRequireLogin(enabled);

    const res = await fetch('/api/users/require-login', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    });
    if (!res.ok) throw new Error(await parseErrorResponse(res));
    return (await res.json()) as DbInfo;
  },
};
