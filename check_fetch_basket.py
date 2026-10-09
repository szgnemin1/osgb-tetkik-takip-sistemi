import re
with open('server.ts', 'r', encoding='utf-8') as f:
    text = f.read()

start = text.find('fetch(`https://api.odeal.com/api/v1/basket`')
print(text[start:start+1000])
