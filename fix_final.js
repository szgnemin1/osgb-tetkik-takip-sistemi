const fs = require('fs');
let code = fs.readFileSync('components/AdminAuthModal.tsx', 'utf-8');

// Fix fetch URL backticks
code = code.replace(/fetch\(\$\{baseUrl\}api\/admin\/verify-fallback, \{/, "fetch(baseUrl + 'api/admin/verify-fallback', {");

// Fix Authorization backticks
code = code.replace(/'Authorization': Bearer/g, "'Authorization': 'Bearer ' + apiToken");

fs.writeFileSync('components/AdminAuthModal.tsx', code);
