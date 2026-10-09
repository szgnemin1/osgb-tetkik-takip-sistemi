const fs = require('fs');
let text = fs.readFileSync('server.ts', 'utf8');

const oldCustomerBlock = /customer: \{\s*type: "INDIVIDUAL",\s*name: employeeTc \?[\s\S]*?identityNumber: employeeTc \|\| "11111111111",\s*city: \(city \|\| "Bursa"\)\.toLowerCase\(\),\s*town: \(town \|\| "Mudanya"\)\.toLowerCase\(\),\s*address: address \|\| "Belirtilmedi",\s*email: "test@test\.com",\s*gsmNumber: "5555555555"\s*\}/;

const newCustomerBlock = `customer: {
          type: "INDIVIDUAL",
          name: "Nihai",
          surname: "Tüketici",
          identityNumber: "11111111111",
          city: "bursa",
          town: "mudanya",
          address: "Belirtilmedi",
          email: "test@test.com",
          gsmNumber: "5555555555"
        }`;

text = text.replace(oldCustomerBlock, newCustomerBlock);
fs.writeFileSync('server.ts', text, 'utf8');
console.log('Forced Nihai Tüketici in backend');
