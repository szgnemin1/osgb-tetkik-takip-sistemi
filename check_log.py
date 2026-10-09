import re
with open('server.ts', 'r', encoding='utf-8') as f:
    text = f.read()

start = text.find('=== BASKET ISTEGI GELDI ===')
print(text[start-100:start+200])
