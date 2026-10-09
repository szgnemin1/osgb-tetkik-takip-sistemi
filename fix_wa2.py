with open('server.ts', 'r', encoding='utf-8') as f:
    text = f.read()

start = text.find('async function connectToWhatsApp() {')
end = text.find('connectToWhatsApp();')

if start != -1 and end != -1:
    text = text[:start] + 'async function connectToWhatsApp() { console.log("WhatsApp disabled temporarily"); waReady = false; }\n\n' + text[end+len('connectToWhatsApp();'):]
    with open('server.ts', 'w', encoding='utf-8') as f:
        f.write(text)
    print("Fixed WA")
