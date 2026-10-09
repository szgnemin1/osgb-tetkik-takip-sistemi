import re
with open('server.ts', 'r', encoding='utf-8') as f:
    text = f.read()

start = text.find('app.post("/api/odeal/basket"')
print(text[start:start+1000])
