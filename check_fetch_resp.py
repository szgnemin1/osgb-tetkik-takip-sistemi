import re
with open('server.ts', 'r', encoding='utf-8') as f:
    text = f.read()

start = text.find('const response = await fetch')
print(text[start:start+500])
