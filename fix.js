const fs = require('fs');
let code = fs.readFileSync('components/AdminAuthModal.tsx', 'utf-8');
code = code.replace(/'Authorization': [^,]+,/g, "'Authorization': 'Bearer ' + apiToken,");
fs.writeFileSync('components/AdminAuthModal.tsx', code);
