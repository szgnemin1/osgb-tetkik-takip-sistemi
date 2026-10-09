const fs = require('fs');
const path = 'node_modules/whatsapp-rust-bridge/package.json';
const pkg = JSON.parse(fs.readFileSync(path, 'utf8'));

pkg.exports['.'] = {
  "require": "./dist/index.js",
  "import": "./dist/index.js",
  "default": "./dist/index.js",
  "types": "./dist/index.d.ts"
};
pkg.main = "./dist/index.js";

fs.writeFileSync(path, JSON.stringify(pkg, null, 4), 'utf8');
console.log('Patched whatsapp-rust-bridge package.json');
