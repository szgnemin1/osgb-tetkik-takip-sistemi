import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf8');

const oldPayloadRegex = /const payload = \{\s*referenceCode: referralId,[\s\S]*?items: \[[\s\S]*?\]\s*\};\s*console\.log\("=== ODL PAYLOAD ===",/m;

const newPayload = `const payload = {
          basketType: "SIMPLE",
          referenceCode: referralId,
          externalDeviceKey: deviceKey,
          receiptInfo: {
            "SiparisNo": referralId.substring(0, 8),
            "Garson": "OSGB"
          },
          customer: {
            referenceCode: data.tcKimlik || "AFG123455",
            type: "INDIVIDUAL",
            name: "NİHAİ",
            surname: "TÜKETİCİ",
            identityNumber: "11111111111",
            city: "İstanbul",
            town: "Üsküdar",
            gsmNumber: "123466789",
            email: null,
            address: null
          },
          price: {
            grossPrice: parseFloat(amount)
          },
          items: [
            {
              quantity: 1,
              product: {
                name: "SAĞLIK HİZMETİ",
                referenceCode: "SH1234",
                price: {
                  grossPrice: parseFloat(amount),
                  vatRatio: 10,
                  sctRatio: 0
                },
                unitCode: "C62"
              }
            }
          ],
          paymentOptions: [
            {
              amount: parseFloat(amount),
              type: "CREDITCARD"
            }
          ]
        };
        
        console.log("=== ODL PAYLOAD ===",`;

code = code.replace(oldPayloadRegex, newPayload);
fs.writeFileSync('server.ts', code, 'utf8');
console.log("Updated payload to match strict rule");
