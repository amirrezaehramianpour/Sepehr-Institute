"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const bridge = {
    getState: () => electron_1.ipcRenderer.invoke('db:getState'),
    saveState: (state) => electron_1.ipcRenderer.invoke('db:saveState', state),
    addPayment: (payment) => electron_1.ipcRenderer.invoke('db:addPayment', payment),
    deleteStudent: (studentId) => electron_1.ipcRenderer.invoke('db:deleteStudent', studentId),
    resetDemo: () => electron_1.ipcRenderer.invoke('db:resetDemo'),
    getDbInfo: () => electron_1.ipcRenderer.invoke('db:getDbInfo'),
    createBackup: () => electron_1.ipcRenderer.invoke('backup:createDb'),
    restoreBackup: () => electron_1.ipcRenderer.invoke('backup:restoreDb'),
    listUsers: () => electron_1.ipcRenderer.invoke('users:list'),
    createUser: (input) => electron_1.ipcRenderer.invoke('users:create', input),
    verifyLogin: (username, password) => electron_1.ipcRenderer.invoke('users:verifyLogin', { username, password }),
    deleteUser: (userId) => electron_1.ipcRenderer.invoke('users:delete', userId),
    setRequireLogin: (enabled) => electron_1.ipcRenderer.invoke('users:setRequireLogin', enabled),
    printWindow: () => electron_1.ipcRenderer.invoke('app:print'),
};
electron_1.contextBridge.exposeInMainWorld('electronAPI', bridge);
