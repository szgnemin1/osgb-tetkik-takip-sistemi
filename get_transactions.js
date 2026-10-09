const fs = require('fs');
const data = JSON.parse(fs.readFileSync('global_data.json', 'utf8'));
const settings = data.appSettings || {};

async function getTransactions() {
  const url = 'https://api.odeal.com/api/v1/report/transactions?beginDate=2026-10-09&endDate=2026-10-10';
  
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "X-ODEAL-MERCHANT-KEY": settings.odealMerchantKey,
        "X-ODEAL-SECRET-KEY": settings.odealSecretKey
      }
    });
    
    if (!res.ok) {
      console.log("Error status:", res.status);
      console.log(await res.text());
      return;
    }
    
    const json = await res.json();
    console.log(JSON.stringify(json, null, 2));
  } catch (err) {
    console.error(err);
  }
}

getTransactions();
