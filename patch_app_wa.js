const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

// Find the previously injected whatsapp code in App.tsx and replace it.
const searchBlock = /const whatsappUrl = `https:\/\/wa\.me\/\$\{phoneFormatted\}\?text=\$\{encodedMsg\}`;[\s\S]*?\}, 500\);/m;

const replaceBlock = `
         fetch('/api/whatsapp/send', {
             method: 'POST',
             headers: {
                 'Content-Type': 'application/json',
                 'Authorization': \`Bearer \${sessionStorage.getItem('api_token')}\`
             },
             body: JSON.stringify({ phone: phoneFormatted, message: msg })
         }).catch(err => console.error('WhatsApp send error', err));
`;

if (code.match(searchBlock)) {
    code = code.replace(searchBlock, replaceBlock);
    fs.writeFileSync('App.tsx', code);
    console.log("App.tsx patched successfully.");
} else {
    console.log("Could not find the block in App.tsx");
}
