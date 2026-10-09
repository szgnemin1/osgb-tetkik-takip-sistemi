const fs = require('fs');
const data = JSON.parse(fs.readFileSync('global_data.json', 'utf8'));
const settings = data.appSettings || {};

const payload = {
  "referenceCode": "TEST-" + Math.floor(Math.random() * 100000),
  "externalDeviceKey": "POS-01",
  "basketType": "SIMPLE",
  "customer": {
    "type": "INDIVIDUAL",
    "city": "BURSA",
    "town": "MUDANYA",
    "address": "Mahalle Sokak",
    "name": "BÜYÜK HARFLİ",
    "surname": "TEST",
    "identityNumber": "34789154012"
  },
  "price": {
    "grossPrice": 100
  },
  "items": [
    {
      "quantity": 1,
      "product": {
        "unitCode": "C62",
        "name": "TEST URUN",
        "referenceCode": "12345",
        "price": {
          "grossPrice": 100,
          "vatRatio": 10
        }
      }
    }
  ]
};

fetch("https://api.odeal.com/api/v1/basket", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-ODEAL-MERCHANT-KEY": settings.odealMerchantKey,
    "X-ODEAL-SECRET-KEY": settings.odealSecretKey
  },
  body: JSON.stringify(payload)
}).then(res => res.json()).then(json => console.log("Response:", json));
