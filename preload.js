const { contextBridge, ipcRenderer } = require('electron');

// Güvenli bir şekilde API'leri ön yüze açıyoruz
contextBridge.exposeInMainWorld('electronAPI', {
  // Örnek fonksiyonlar
  getVersion: () => process.versions.electron,
  // İleride dosya yazdırma vb. işlemler için burası kullanılabilir
});
