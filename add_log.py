import re
with open('server.ts', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('app.post("/api/odeal/basket", authMiddleware, async (req, res) => {', 'app.post("/api/odeal/basket", authMiddleware, async (req, res) => {\n    console.log("=== BASKET ISTEGI GELDI ===", req.body);')

with open('server.ts', 'w', encoding='utf-8') as f:
    f.write(text)
