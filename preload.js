const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getVersion: () => process.versions.electron,
  scanDocument: () => ipcRenderer.invoke('scan-document'),
});
