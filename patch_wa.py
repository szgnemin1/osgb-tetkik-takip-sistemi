import re

with open('server.ts', 'r', encoding='utf-8') as f:
    text = f.read()

# Comment out Baileys import
text = re.sub(r'(const {.*?makeWASocket.*?require\(\'@whiskeysockets/baileys\'\);)', r'// \1', text)
text = re.sub(r'(const qrcode = require\(\'qrcode-terminal\'\);)', r'// \1', text)

# Comment out connectToWhatsApp() body and set waReady = false
connect_func = re.search(r'async function connectToWhatsApp\(\) \{.*?\}', text, re.DOTALL)
if connect_func:
    text = text[:connect_func.start()] + 'async function connectToWhatsApp() { console.log("WhatsApp disabled temporarily"); waReady = false; }' + text[connect_func.end():]

with open('server.ts', 'w', encoding='utf-8') as f:
    f.write(text)
print("WhatsApp backend imports disabled")
