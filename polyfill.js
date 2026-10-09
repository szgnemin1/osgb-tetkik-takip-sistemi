const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

if (!code.includes('node-fetch')) {
  code = `// Fetch polyfill for older Node versions (Windows Server 2012)
if (typeof fetch === 'undefined') {
  global.fetch = require('node-fetch');
}
` + code;
  fs.writeFileSync('server.ts', code, 'utf8');
  console.log("Added fetch polyfill to server.ts");
}
