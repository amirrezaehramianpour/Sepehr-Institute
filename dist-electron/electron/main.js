"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const database_1 = require("./database");
let mainWindow = null;
let database = null;
function getDb() {
    if (!database) {
        throw new Error('پایگاه داده هنوز راه‌اندازی نشده است.');
    }
    return database;
}
function initDatabase() {
    const dbPath = path_1.default.join(electron_1.app.getPath('appData'), 'SepehrInstitute', 'database', 'sepehr.db');
    const appPath = electron_1.app.getAppPath();
    const legacyPaths = [
        path_1.default.join(appPath, 'data', 'institute-db.json'),
        path_1.default.join(process.resourcesPath || appPath, 'data', 'institute-db.json'),
    ];
    database = new database_1.InstituteDatabase({
        dbPath,
        legacyJsonPaths: legacyPaths,
        isDesktop: true,
    });
}
function createMainWindow() {
    const appPath = electron_1.app.getAppPath();
    const preloadPath = path_1.default.join(__dirname, 'preload.js');
    const iconPath = path_1.default.join(appPath, 'build', 'icon.png');
    const distIndexPath = path_1.default.join(appPath, 'dist', 'index.html');
    mainWindow = new electron_1.BrowserWindow({
        width: 1360,
        height: 860,
        minWidth: 1080,
        minHeight: 700,
        title: 'مدیریت آموزشگاه سپهر',
        backgroundColor: '#FAF8F5',
        show: false,
        icon: fs_1.default.existsSync(iconPath) ? iconPath : undefined,
        webPreferences: {
            preload: preloadPath,
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
            webSecurity: true,
            devTools: !electron_1.app.isPackaged,
        },
    });
    electron_1.Menu.setApplicationMenu(null);
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
    if (devServerUrl && !electron_1.app.isPackaged) {
        mainWindow.loadURL(devServerUrl);
    }
    else {
        mainWindow.loadFile(distIndexPath);
    }
}
function registerIpcHandlers() {
    electron_1.ipcMain.handle('db:getState', () => getDb().getState());
    electron_1.ipcMain.handle('db:saveState', (_event, nextState) => {
        getDb().saveFullState(nextState);
        return { ok: true };
    });
    electron_1.ipcMain.handle('db:addPayment', (_event, payment) => {
        return getDb().addPaymentTransactional(payment);
    });
    electron_1.ipcMain.handle('db:deleteStudent', (_event, studentId) => {
        return getDb().deleteStudentSafely(studentId);
    });
    electron_1.ipcMain.handle('db:resetDemo', () => {
        return getDb().resetToSeed();
    });
    electron_1.ipcMain.handle('db:getDbInfo', () => {
        return getDb().getDbInfo();
    });
    electron_1.ipcMain.handle('backup:createDb', async () => {
        const win = mainWindow ?? electron_1.BrowserWindow.getFocusedWindow();
        const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
        const defaultName = `sepehr-backup-${stamp}.db`;
        const result = await electron_1.dialog.showSaveDialog(win, {
            title: 'انتخاب محل ذخیره فایل پشتیبان پایگاه داده',
            defaultPath: path_1.default.join(electron_1.app.getPath('documents'), defaultName),
            filters: [{ name: 'SQLite Database Backup', extensions: ['db'] }],
        });
        if (result.canceled || !result.filePath) {
            return { canceled: true };
        }
        const meta = await getDb().createBackup(result.filePath);
        return { canceled: false, ...meta };
    });
    electron_1.ipcMain.handle('backup:restoreDb', async () => {
        const win = mainWindow ?? electron_1.BrowserWindow.getFocusedWindow();
        const result = await electron_1.dialog.showOpenDialog(win, {
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
    electron_1.ipcMain.handle('users:list', () => getDb().listUsers());
    electron_1.ipcMain.handle('users:create', (_event, input) => {
        return getDb().createUser(input);
    });
    electron_1.ipcMain.handle('users:verifyLogin', (_event, payload) => {
        return getDb().verifyLogin(payload.username, payload.password);
    });
    electron_1.ipcMain.handle('users:delete', (_event, userId) => {
        getDb().deleteUser(userId);
        return { ok: true };
    });
    electron_1.ipcMain.handle('users:setRequireLogin', (_event, enabled) => {
        return getDb().setRequireLogin(enabled);
    });
    electron_1.ipcMain.handle('app:print', () => {
        const win = mainWindow ?? electron_1.BrowserWindow.getFocusedWindow();
        if (win) {
            win.webContents.print({ silent: false, printBackground: true });
        }
    });
}
// Enforce single desktop instance
const gotLock = electron_1.app.requestSingleInstanceLock();
if (!gotLock) {
    electron_1.app.quit();
}
else {
    electron_1.app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized())
                mainWindow.restore();
            mainWindow.focus();
        }
    });
    electron_1.app.whenReady().then(() => {
        electron_1.app.setName('SepehrInstitute');
        initDatabase();
        registerIpcHandlers();
        createMainWindow();
        electron_1.app.on('activate', () => {
            if (electron_1.BrowserWindow.getAllWindows().length === 0) {
                createMainWindow();
            }
        });
    });
    electron_1.app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') {
            database?.close();
            electron_1.app.quit();
        }
    });
    electron_1.app.on('before-quit', () => {
        database?.close();
    });
}
