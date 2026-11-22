import { app, BrowserWindow, dialog, ipcMain, Menu } from 'electron';
import fs from 'fs';
import path from 'path';
import type { InstituteState, Payment, UserRole } from '../src/types/institute';
import { InstituteDatabase } from './database';

let mainWindow: BrowserWindow | null = null;
let database: InstituteDatabase | null = null;

function getDb(): InstituteDatabase {
  if (!database) {
    throw new Error('پایگاه داده هنوز راه‌اندازی نشده است.');
  }
  return database;
}

function initDatabase(): void {
  const dbPath = path.join(app.getPath('appData'), 'SepehrInstitute', 'database', 'sepehr.db');
  const appPath = app.getAppPath();
  const legacyPaths = [
    path.join(appPath, 'data', 'institute-db.json'),
    path.join(process.resourcesPath || appPath, 'data', 'institute-db.json'),
  ];

  database = new InstituteDatabase({
    dbPath,
    legacyJsonPaths: legacyPaths,
    isDesktop: true,
  });
}

function createMainWindow(): void {
  const appPath = app.getAppPath();
  const preloadPath = path.join(__dirname, 'preload.js');
  const iconPath = path.join(appPath, 'build', 'icon.png');
  const distIndexPath = path.join(appPath, 'dist', 'index.html');

  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1080,
    minHeight: 700,
    title: 'مدیریت آموزشگاه سپهر',
    backgroundColor: '#FAF8F5',
    show: false,
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      devTools: !app.isPackaged,
    },
  });

  Menu.setApplicationMenu(null);

  // Block external popups or external navigation — 100% offline desktop confinement
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event, targetUrl) => {
    const devUrl = process.env.ELECTRON_RENDERER_URL;
    if (devUrl && targetUrl.startsWith(devUrl)) {
      return;
    }
    if (!targetUrl.startsWith('file://')) {
      event.preventDefault();
    }
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const devServerUrl = process.env.ELECTRON_RENDERER_URL;
  if (devServerUrl && !app.isPackaged) {
    mainWindow.loadURL(devServerUrl);
  } else {
    mainWindow.loadFile(distIndexPath);
  }
}

function registerIpcHandlers(): void {
  ipcMain.handle('db:getState', () => getDb().getState());

  ipcMain.handle('db:saveState', (_event, nextState: InstituteState) => {
    getDb().saveFullState(nextState);
    return { ok: true };
  });

  ipcMain.handle('db:addPayment', (_event, payment: Payment) => {
    return getDb().addPaymentTransactional(payment);
  });

  ipcMain.handle('db:deleteStudent', (_event, studentId: string) => {
    return getDb().deleteStudentSafely(studentId);
  });

  ipcMain.handle('db:resetDemo', () => {
    return getDb().resetToSeed();
  });

  ipcMain.handle('db:getDbInfo', () => {
    return getDb().getDbInfo();
  });

  ipcMain.handle('backup:createDb', async () => {
    const win = mainWindow ?? BrowserWindow.getFocusedWindow();
    const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
    const defaultName = `sepehr-backup-${stamp}.db`;
    const result = await dialog.showSaveDialog(win!, {
      title: 'انتخاب محل ذخیره فایل پشتیبان پایگاه داده',
      defaultPath: path.join(app.getPath('documents'), defaultName),
      filters: [{ name: 'SQLite Database Backup', extensions: ['db'] }],
    });

    if (result.canceled || !result.filePath) {
      return { canceled: true };
    }

    const meta = await getDb().createBackup(result.filePath);
    return { canceled: false, ...meta };
  });

  ipcMain.handle('backup:restoreDb', async () => {
    const win = mainWindow ?? BrowserWindow.getFocusedWindow();
    const result = await dialog.showOpenDialog(win!, {
      title: 'انتخاب فایل پشتیبان برای بازیابی اطلاعات',
      properties: ['openFile'],
      filters: [
        { name: 'فایل پشتیبان آموزشگاه (DB / JSON)', extensions: ['db', 'sqlite', 'json'] },
      ],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true };
    }

    const restoredState = getDb().restoreFromBackupFile(result.filePaths[0]);
    return { canceled: false, state: restoredState };
  });

  ipcMain.handle('users:list', () => getDb().listUsers());

  ipcMain.handle(
    'users:create',
    (
      _event,
      input: { username: string; fullName: string; role: UserRole; password: string },
    ) => {
      return getDb().createUser(input);
    },
  );

  ipcMain.handle(
    'users:verifyLogin',
    (_event, payload: { username: string; password: string }) => {
      return getDb().verifyLogin(payload.username, payload.password);
    },
  );

  ipcMain.handle('users:delete', (_event, userId: string) => {
    getDb().deleteUser(userId);
    return { ok: true };
  });

  ipcMain.handle('users:setRequireLogin', (_event, enabled: boolean) => {
    return getDb().setRequireLogin(enabled);
  });

  ipcMain.handle('app:print', () => {
    const win = mainWindow ?? BrowserWindow.getFocusedWindow();
    if (win) {
      win.webContents.print({ silent: false, printBackground: true });
    }
  });
}

// Enforce single desktop instance
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    app.setName('SepehrInstitute');
    initDatabase();
    registerIpcHandlers();
    createMainWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
      }
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      database?.close();
      app.quit();
    }
  });

  app.on('before-quit', () => {
    database?.close();
  });
}
