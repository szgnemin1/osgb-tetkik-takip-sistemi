const fs = require('fs');

const serverFile = 'server.ts';
let code = fs.readFileSync(serverFile, 'utf8');

const waSetupCode = `
// --- WHATSAPP CLIENT SETUP ---
let waReady = false;
let waQr = '';
let sock: any = null;

async function connectToWhatsApp() {
  try {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    sock = makeWASocket({
      auth: state,
      printQRInTerminal: true,
      logger: pino({ level: 'silent' })
    });

    sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;
      if (qr) {
        waQr = qr;
      }
      if (connection === 'close') {
        const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
        console.log('WhatsApp connection closed, reconnecting:', shouldReconnect);
        waReady = false;
        waQr = '';
        if (shouldReconnect) {
          connectToWhatsApp();
        }
      } else if (connection === 'open') {
        console.log('WhatsApp connection opened');
        waReady = true;
        waQr = '';
      }
    });

    sock.ev.on('creds.update', saveCreds);
  } catch (err) {
    console.error('WhatsApp Error:', err);
  }
}

connectToWhatsApp();
`;

const dummyWaRegex = /\/\/ --- WHATSAPP CLIENT SETUP ---[\s\S]*?connectToWhatsApp\(\);/m;
code = code.replace(dummyWaRegex, waSetupCode);

const waRoutes = `
  app.get("/api/whatsapp/status", authMiddleware, (req, res) => {
    res.json({ ready: waReady, qr: waQr });
  });

  app.post("/api/whatsapp/logout", authMiddleware, async (req, res) => {
    if (sock) {
      await sock.logout();
      waReady = false;
      waQr = '';
      sock = null;
      connectToWhatsApp();
    }
    res.json({ success: true });
  });
`;

// Insert routes before app.get("/api/data"
code = code.replace(/app\.get\("\/api\/data"/, waRoutes + '\n  app.get("/api/data"');

fs.writeFileSync(serverFile, code, 'utf8');
console.log('WhatsApp restored');
