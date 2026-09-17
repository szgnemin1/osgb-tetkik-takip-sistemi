const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const waImport = `
import { Client, LocalAuth } from 'whatsapp-web.js';

// --- WHATSAPP CLIENT SETUP ---
let waReady = false;
let waQr = '';

const waClient = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-accelerated-2d-canvas', '--no-first-run', '--no-zygote', '--single-process', '--disable-gpu']
    }
});

waClient.on('qr', (qr) => {
    waQr = qr;
    waReady = false;
    console.log('WhatsApp QR Created');
});

waClient.on('ready', () => {
    waReady = true;
    waQr = '';
    console.log('WhatsApp Client is ready!');
});

waClient.on('disconnected', (reason) => {
    waReady = false;
    waQr = '';
    console.log('WhatsApp Client disconnected', reason);
});

// Start initialization but catch errors so it doesn't crash the server
try {
    waClient.initialize().catch(err => console.error("WA Init Catch:", err));
} catch(e) {
    console.error("WA Init Error:", e);
}
`;

// Insert after imports
code = code.replace(/import path from "path";/, `import path from "path";\n${waImport}`);


const waEndpoints = `
  // --- WHATSAPP ENDPOINTS ---
  app.get("/api/whatsapp/status", authMiddleware, (req, res) => {
      res.json({ ready: waReady, qr: waQr });
  });

  app.post("/api/whatsapp/logout", authMiddleware, async (req, res) => {
      try {
          await waClient.logout();
          waReady = false;
          waQr = '';
          res.json({ success: true });
      } catch (error) {
          res.status(500).json({ error: 'Logout failed' });
      }
  });

  app.post("/api/whatsapp/send", authMiddleware, async (req, res) => {
      const { phone, message } = req.body;
      if (!waReady) {
          return res.status(400).json({ error: 'WhatsApp is not connected' });
      }
      try {
          // whatsapp-web.js uses the format: countrycode + number + @c.us
          const chatId = phone + "@c.us";
          await waClient.sendMessage(chatId, message);
          res.json({ success: true });
      } catch (error) {
          console.error("WA Send Error:", error);
          res.status(500).json({ error: 'Failed to send message' });
      }
  });
`;

// Insert before the error handler
code = code.replace(/\/\/ --- ERROR HANDLER ---/, `${waEndpoints}\n  // --- ERROR HANDLER ---`);

fs.writeFileSync('server.ts', code);
