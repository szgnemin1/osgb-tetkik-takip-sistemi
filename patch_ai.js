const fs = require('fs');
let text = fs.readFileSync('server.ts', 'utf8');

text = text.replace('address: "Belirtilmedi"', 'address: "Cumhuriyet Mah. Atatürk Cad. No:15"');
text = text.replace('town: (town || "mudanya").toLowerCase(),', 'town: (town || "mudanya").toLowerCase(),\n          district: (town || "mudanya").toLowerCase(),');

fs.writeFileSync('server.ts', text, 'utf8');
console.log('Patched customer block via JS');
