const fs = require('fs');
let code = fs.readFileSync('components/AdminAuthModal.tsx', 'utf-8');
code = code.replace("'Authorization': 'Bearer ' + apiToken, {", "'Authorization': 'Bearer ' + apiToken\n        }");
fs.writeFileSync('components/AdminAuthModal.tsx', code);
