import json
import re

with open('server.ts', 'r', encoding='utf-8') as f:
    text = f.read()

old_payload_start = text.find('const payload = {')
old_payload_end = text.find('const response = await fetch(`https://api.odeal.com/api/v1/basket`')

if old_payload_start != -1 and old_payload_end != -1:
    new_payload = '''const payload = {
        referenceCode: referralId,
        externalDeviceKey: deviceKey,
        basketType: "SIMPLE",
        customer: {
          type: "INDIVIDUAL",
          name: employeeName?.split(" ")[0] || "Müşteri",
          surname: employeeName?.split(" ").slice(1).join(" ") || "Soyadı",
          identityNumber: employeeTc || "11111111111",
          city: city || "İstanbul",
          town: town || "Şişli"
        },
        price: {
          grossPrice: parseFloat(amount)
        },
        items: [
          {
            quantity: 1,
            product: {
                name: "SAĞLIK HİZMETİ",
                referenceCode: "196355",
                price: {
                    grossPrice: parseFloat(amount),
                    vatRatio: 10
                }
            }
          }
        ]
      };
      
      '''
    text = text[:old_payload_start] + new_payload + text[old_payload_end:]
    with open('server.ts', 'w', encoding='utf-8') as f:
        f.write(text)
    print("Payload updated")
else:
    print("Could not find payload")
