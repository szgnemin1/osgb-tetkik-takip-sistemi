const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { exec } = require('child_process');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Windows'da tarayıcıdan belge almak için WIA (Windows Image Acquisition) kullanan IPC Handler
ipcMain.handle('scan-document', async () => {
  if (process.platform !== 'win32') {
    throw new Error('Tarayıcı özelliği şu anda sadece Windows işletim sistemlerinde desteklenmektedir.');
  }

  return new Promise((resolve, reject) => {
    const timestamp = Date.now();
    const tempPath = path.join(os.tmpdir(), `scan_${timestamp}.jpg`);
    const scriptPath = path.join(os.tmpdir(), `scan_script_${timestamp}.ps1`);
    
    // Güvenli path (PowerShell single-quote escaping)
    const safeTempPath = tempPath.replace(/'/g, "''");

    const psScript = `
try {
    $dialog = New-Object -ComObject "WIA.CommonDialog"
    # ShowAcquireImage parametreleri: Config(1=Tarayıcı), Intent(1=Renkli), FormatID(JPEG)
    $image = $dialog.ShowAcquireImage(1, 1, 1, "{B96B3CAE-0728-11D3-9D7B-0000F81EF32E}", 1, 1, 0)
    
    if ($image -ne $null) {
        if (Test-Path '${safeTempPath}') { Remove-Item '${safeTempPath}' }
        $image.SaveFile('${safeTempPath}')
        Write-Output "SUCCESS"
    } else {
        Write-Output "CANCELLED"
    }
} catch {
    Write-Output "ERROR: $($_.Exception.Message)"
}
    `;

    fs.writeFileSync(scriptPath, psScript);

    exec(`powershell -WindowStyle Hidden -ExecutionPolicy Bypass -File "${scriptPath}"`, (error, stdout, stderr) => {
      // Temizlik (Script dosyası)
      try { fs.unlinkSync(scriptPath); } catch (e) {}

      console.log('Scanner Output:', stdout);

      if (stdout.includes("SUCCESS")) {
        if (fs.existsSync(tempPath)) {
          const bitmap = fs.readFileSync(tempPath);
          const base64Str = Buffer.from(bitmap).toString('base64');
          // Temizlik (Resim dosyası)
          try { fs.unlinkSync(tempPath); } catch (e) {}
          
          resolve(`data:image/jpeg;base64,${base64Str}`);
        } else {
          reject(new Error("Tarama dosyası oluşturulamadı."));
        }
      } else if (stdout.includes("CANCELLED")) {
        reject(new Error("Tarama işlemi iptal edildi."));
      } else {
        const errorMsg = stdout.replace("ERROR:", "").trim();
        reject(new Error(errorMsg || "Tarayıcı bulunamadı veya bağlantı hatası. Makineyi kontrol edin."));
      }
    });
  });
});
