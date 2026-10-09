const fs = require('fs');

let server = fs.readFileSync('server.ts', 'utf8');

const basketRouteTop = `app.post("/api/odeal/basket", authMiddleware, async (req, res) => {
      try {
        const { amount, referralId, deviceKey, employeeName, employeeTc, city, town, address } = req.body;
        console.log("=== BASKET ISTEGI GELDI ===", req.body);
        
        const db = readData();
        const settings = db.appSettings || {};
        const merchantKey = settings.odealMerchantKey;
        const secretKey = settings.odealSecretKey;
        
`;

if (!server.includes('if (!settings.odealEnabled)')) {
  server = server.replace(basketRouteTop, basketRouteTop + `
        if (settings.odealEnabled === false) {
          console.log("Odeal entegrasyonu kapali. Atliyorum.");
          return res.json({ success: true, message: "Odeal entegrasyonu ayarlardan kapali." });
        }
`);
  fs.writeFileSync('server.ts', server, 'utf8');
  console.log("Patched server.ts");
}
