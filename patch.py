import re

with open('server.ts', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Replace imports
code = re.sub(
    r"import \{ Client, LocalAuth \} from 'whatsapp-web\.js';",
    "import makeWASocket, { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';\nimport pino from 'pino';",
    code
)

# 2. Replace Setup
setup_regex = r"// --- WHATSAPP CLIENT SETUP ---.*?\} catch\(e\) \{\s*console\.error\(\"WA Init Error:\", e\);\s*\}"

new_setup = """// --- WHATSAPP CLIENT SETUP ---
let waReady = false;
let waQr = '';
let sock: any = null;

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('baileys_auth_info');
    
    sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }) as any,
        printQRInTerminal: false
    });
    
    sock.ev.on('connection.update', (update: any) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            waQr = qr;
            waReady = false;
            console.log('WhatsApp QR Created');
        }
        
        if (connection === 'close') {
            waReady = false;
            waQr = '';
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                connectToWhatsApp();
            } else {
                console.log('WhatsApp Client disconnected/logged out');
            }
        } else if (connection === 'open') {
            waReady = true;
            waQr = '';
            console.log('WhatsApp Client is ready!');
        }
    });
    
    sock.ev.on('creds.update', saveCreds);
}

connectToWhatsApp();"""

code = re.sub(setup_regex, new_setup, code, flags=re.DOTALL)

# 3. Replace endpoints
logout_regex = r"await waClient\.logout\(\);"
code = re.sub(logout_regex, "if (sock) sock.logout();\n            waReady = false;\n            waQr = '';\n            connectToWhatsApp();", code)

send_regex = r"// whatsapp-web\.js uses the format: countrycode \+ number \+ @c\.us\s*const chatId = phone \+ \"@c\.us\";\s*await waClient\.sendMessage\(chatId, message\);"
new_send = """const chatId = phone.includes('@s.whatsapp.net') ? phone : phone + '@s.whatsapp.net';
            await sock.sendMessage(chatId, { text: message });"""
code = re.sub(send_regex, new_send, code)

with open('server.ts', 'w', encoding='utf-8') as f:
    f.write(code)
