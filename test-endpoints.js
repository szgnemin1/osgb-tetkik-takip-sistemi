const fs = require('fs');
const data = JSON.parse(fs.readFileSync('global_data.json', 'utf8'));
const settings = data.appSettings || {};

async function testEndpoints() {
  const headers = {
    "Accept": "application/json",
    "X-ODEAL-MERCHANT-KEY": settings.odealMerchantKey,
    "X-ODEAL-SECRET-KEY": settings.odealSecretKey
  };

  const endpoints = [
    "https://api.odeal.com/api/v1/cities",
    "https://api.odeal.com/api/v1/towns",
    "https://api.odeal.com/api/v1/locations",
    "https://api.odeal.com/api/v1/regions"
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, { headers });
      console.log(`\nGET ${url}`);
      console.log(`Status: ${res.status}`);
      if (res.status !== 404 && res.status !== 405) {
        const text = await res.text();
        console.log(`Response: ${text.substring(0, 200)}`);
      }
    } catch(err) {}
  }
}

testEndpoints();
