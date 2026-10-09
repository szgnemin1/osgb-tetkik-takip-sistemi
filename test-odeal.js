const fs = require('fs');

const data = JSON.parse(fs.readFileSync('global_data.json', 'utf8'));
const settings = data.appSettings || {};
const merchantKey = settings.odealMerchantKey;
const secretKey = settings.odealSecretKey;

if (!merchantKey || !secretKey) {
  console.error("API keys missing in global_data.json");
  process.exit(1);
}

const payload = {
  "referenceCode": "TEST-" + Math.floor(Math.random() * 100000),
  "externalDeviceKey": "POS-01",
  "basketType": "SIMPLE",
  "customer": {
    "type": "INDIVIDUAL",
    "city": "Bursa",
    "town": "Mudanya",
    "address": "Mahalle Sokak",
    "name": "TEST",
    "surname": "MUSTERI",
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

fetch("https://api.stg.odeal.com/api/v1/basket", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-ODEAL-MERCHANT-KEY": merchantKey,
    "X-ODEAL-SECRET-KEY": secretKey
  },
  body: JSON.stringify(payload)
}).then(res => res.json()).then(json => {
  console.log("Response:", json);
}).catch(err => {
  console.error("Error:", err);
});
