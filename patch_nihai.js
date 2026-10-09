const fs = require('fs');
let text = fs.readFileSync('server.ts', 'utf8');

const oldCustomerBlock = /customer: \{\s*type: "INDIVIDUAL",\s*name: employeeName\?\.split\(" "\)\.slice\(0, -1\)\.join\(" "\) \|\| "Müşteri",\s*surname: employeeName\?\.split\(" "\)\.slice\(-1\)\.join\(" "\) \|\| "Soyadı",\s*identityNumber: employeeTc \|\| "11111111111",/;

const newCustomerBlock = `customer: {
          type: "INDIVIDUAL",
          name: employeeTc ? (employeeName?.split(" ").slice(0, -1).join(" ") || "Müşteri") : "Nihai",
          surname: employeeTc ? (employeeName?.split(" ").slice(-1).join(" ") || "Soyadı") : "Tüketici",
          identityNumber: employeeTc || "11111111111",`;

text = text.replace(oldCustomerBlock, newCustomerBlock);
fs.writeFileSync('server.ts', text, 'utf8');
console.log('Added Nihai Tuketici smart logic');
