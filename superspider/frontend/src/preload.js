/**
 * The preload script runs before. It has access to web APIs
 * as well as Electron's renderer process modules and some
 * polyfilled Node.js functions.
 * 
 * https://www.electronjs.org/docs/latest/tutorial/sandbox
 */
const { contextBridge, ipcRenderer } = require('electron');

// 把ipcRenderer暴露给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
    startDesign: (lang="en", user_data_folder = '') => ipcRenderer.send('start-design', lang, user_data_folder),
    startInvoke: (lang="en") => ipcRenderer.send('start-invoke', lang),
})
