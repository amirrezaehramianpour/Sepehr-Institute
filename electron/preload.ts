import { contextBridge, ipcRenderer } from 'electron';
import type {
  DbInfo,
  InstituteState,
  Payment,
  SystemUser,
  UserRole,
} from '../src/types/institute';

export interface ElectronDesktopBridge {
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

const bridge: ElectronDesktopBridge = {
  getState: () => ipcRenderer.invoke('db:getState'),
  saveState: (state) => ipcRenderer.invoke('db:saveState', state),
  addPayment: (payment) => ipcRenderer.invoke('db:addPayment', payment),
  deleteStudent: (studentId) => ipcRenderer.invoke('db:deleteStudent', studentId),
  resetDemo: () => ipcRenderer.invoke('db:resetDemo'),
  getDbInfo: () => ipcRenderer.invoke('db:getDbInfo'),
  createBackup: () => ipcRenderer.invoke('backup:createDb'),
  restoreBackup: () => ipcRenderer.invoke('backup:restoreDb'),
  listUsers: () => ipcRenderer.invoke('users:list'),
  createUser: (input) => ipcRenderer.invoke('users:create', input),
  verifyLogin: (username, password) => ipcRenderer.invoke('users:verifyLogin', { username, password }),
  deleteUser: (userId) => ipcRenderer.invoke('users:delete', userId),
  setRequireLogin: (enabled) => ipcRenderer.invoke('users:setRequireLogin', enabled),
  printWindow: () => ipcRenderer.invoke('app:print'),
};

contextBridge.exposeInMainWorld('electronAPI', bridge);
