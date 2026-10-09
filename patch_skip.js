import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf8');

const oldPayload = `          items: [
            {
              quantity: 1,
              product: {
                  unitCode: "C62",
                  name: "SAĞLIK HİZMETİ",
                  referenceCode: "196355",
                  price: {
                      grossPrice: parseFloat(amount),
                      vatRatio: 10
                  }
              }
            }
          ]
        };`;

const newPayload = `          items: [
            {
              quantity: 1,
              product: {
                  unitCode: "C62",
                  name: "SAĞLIK HİZMETİ",
                  referenceCode: "196355",
                  price: {
                      grossPrice: parseFloat(amount),
                      vatRatio: 10
                  }
              }
            }
          ],
          paymentOptions: [
            {
              amount: parseFloat(amount),
              type: "CREDITCARD"
            }
          ]
        };`;

if (code.includes(oldPayload)) {
    code = code.replace(oldPayload, newPayload);
    fs.writeFileSync('server.ts', code, 'utf8');
    console.log('Added paymentOptions CREDITCARD to skip payment selection screen');
} else {
    console.log('Could not find payload to replace');
}
