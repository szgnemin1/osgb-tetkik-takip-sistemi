import re
with open('server.ts', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace("console.log(\"=== ODL PAYLOAD ===\", JSON.stringify(payload, null, 2));", "")
text = text.replace("const response = await fetch(`https://api.odeal.com/api/v1/basket`, {", "console.log(\"=== ODL PAYLOAD ===\", JSON.stringify(payload, null, 2));\n      const response = await fetch(`https://api.odeal.com/api/v1/basket`, {")

with open('server.ts', 'w', encoding='utf-8') as f:
    f.write(text)

print("Fixed payload logging position")
