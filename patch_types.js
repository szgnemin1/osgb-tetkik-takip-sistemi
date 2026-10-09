const fs = require('fs');
let code = fs.readFileSync('types.ts', 'utf8');
if (!code.includes('odealEnabled?: boolean')) {
  code = code.replace('odealMerchantKey?: string;', 'odealEnabled?: boolean;\n  odealMerchantKey?: string;');
  fs.writeFileSync('types.ts', code, 'utf8');
  console.log('Added odealEnabled to types.ts');
}
