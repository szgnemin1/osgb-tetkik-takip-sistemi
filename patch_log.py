import re
with open('server.ts', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace("console.log(\"=== BASKET ISTEGI GELDI ===\", req.body);", "console.log(\"=== BASKET ISTEGI GELDI ===\", req.body);\n      console.log(\"=== ODL PAYLOAD ===\", JSON.stringify(payload, null, 2));")

with open('server.ts', 'w', encoding='utf-8') as f:
    f.write(text)

print("Updated server.ts to log ODL payload")
