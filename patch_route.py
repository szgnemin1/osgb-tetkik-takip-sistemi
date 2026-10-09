import re

with open('server.ts', 'r', encoding='utf-8') as f:
    server = f.read()

route = r"""  app.post("/api/odeal/profile/update", authMiddleware, async (req, res) => {
    try {
      const { profileType, merchantKey, secretKey } = req.body;
      
      const response = await fetch("https://api.odeal.com/api/v1/profile/update", {
        method: 'PATCH',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json; charset=utf-8',
          'X-ODEAL-MERCHANT-KEY': merchantKey,
          'X-ODEAL-SECRET-KEY': secretKey
        },
        body: JSON.stringify({ profileType })
      });
      
      if (!response.ok) {
        const text = await response.text();
        return res.status(400).json({ success: false, error: "API Hatası: " + response.status + " - " + text });
      }
      
      const data = await response.json();
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/odeal/basket","""

server = re.sub(r'  app\.post\("/api/odeal/basket",', route, server)

with open('server.ts', 'w', encoding='utf-8') as f:
    f.write(server)

print("Added /api/odeal/profile/update route to server.ts")
