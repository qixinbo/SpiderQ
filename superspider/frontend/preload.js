/**
 * The preload script runs before. It has access to web APIs
 * as well as Electron's renderer process modules and some
 * polyfilled Node.js functions.
 * 
 * https://www.electronjs.org/docs/latest/tutorial/sandbox
 */
const { contextBridge, ipcRenderer } = require('electron');

// 使用contextBridge定义全局对象，包括全局变量和全局函数
contextBridge.exposeInMainWorld('electronAPI', {
    // 定义两个全局函数，用于渲染进程向主进程发送进程间消息
    startDesign: (lang="en", user_data_folder = '') => ipcRenderer.send('start-design', lang, user_data_folder),
    startInvoke: (lang="en") => ipcRenderer.send('start-invoke', lang),
})
