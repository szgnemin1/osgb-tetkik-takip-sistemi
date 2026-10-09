import fs from 'fs';
let code = fs.readFileSync('server.ts', 'utf8');

const badPayload = `const payload = {
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
        };`;

const goodPayload = `const payload = {
          referenceCode: referralId,
          externalDeviceKey: deviceKey,
          basketType: "SIMPLE",
          customer: {
            type: "INDIVIDUAL",
            name: "Nihai",
            surname: "Tüketici",
            identityNumber: "11111111111",
            city: "bursa",
            town: "mudanya",
            address: "Belirtilmedi",
            email: "test@test.com",
            gsmNumber: "5555555555"
          },
          price: {
            grossPrice: parseFloat(amount)
          },
          items: [
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

code = code.replace(badPayload, goodPayload);
fs.writeFileSync('server.ts', code, 'utf8');
console.log("Reverted payload in server.ts");
