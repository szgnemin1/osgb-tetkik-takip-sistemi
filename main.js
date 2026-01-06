const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const Store = require('electron-store');

// Veri kalıcılığı için store başlatma
const store = new Store();

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    title: "OSGB Tetkik Takip Sistemi",
    webPreferences: {
      nodeIntegration: false, // Güvenlik için kapalı
      contextIsolation: true, // Güvenlik için açık
      preload: path.join(__dirname, 'preload.js')
    },
    autoHideMenuBar: true // Menü çubuğunu gizle
  });

  // Geliştirme ortamı mı yoksa üretim mi?
  const isDev = process.env.NODE_ENV !== 'production' && !app.isPackaged;

  if (isDev) {
    // Vite sunucusunu bekle (concurrently ile çalıştırıldığında)
    mainWindow.loadURL('http://localhost:5173');
    // Geliştirici araçlarını aç
    // mainWindow.webContents.openDevTools();
  } else {
    // Üretim ortamında build edilmiş dosyayı yükle
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// --- IPC Handlers (Renderer ile iletişim) ---
// Eğer renderer process'ten main process'e özel istekler gelirse buraya eklenebilir.
