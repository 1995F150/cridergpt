const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('criderDesktop', {
  getLanProfile: () => ipcRenderer.invoke('desktop-lan:profile'),
  saveLanProfile: (input) => ipcRenderer.invoke('desktop-lan:save', input),
  testLanConnection: () => ipcRenderer.invoke('desktop-lan:test'),
  clearLanProfile: () => ipcRenderer.invoke('desktop-lan:clear'),
  chat: (payload) => ipcRenderer.invoke('desktop-lan:chat', payload),
});
