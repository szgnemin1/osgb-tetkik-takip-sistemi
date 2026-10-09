const fs = require('fs');
let text = fs.readFileSync('server.ts', 'utf8');

const oldCustomerBlock = /customer: \{\s*type: "INDIVIDUAL",\s*referenceCode: referralId,[\s\S]*?address: "Cumhuriyet Mah\. Atatürk Cad\. No:15"\s*\}/;

const newCustomerBlock = `customer: {
          type: "INDIVIDUAL",
          name: employeeName?.split(" ").slice(0, -1).join(" ") || "Müşteri",
          surname: employeeName?.split(" ").slice(-1).join(" ") || "Soyadı",
          identityNumber: employeeTc || "11111111111",
          city: (city || "Bursa").toLowerCase(),
          town: (town || "Mudanya").toLowerCase(),
          address: address || "Belirtilmedi",
          email: "test@test.com",
          gsmNumber: "5555555555"
        }`;

text = text.replace(oldCustomerBlock, newCustomerBlock);
fs.writeFileSync('server.ts', text, 'utf8');
console.log('Reverted to final robust customer block');
