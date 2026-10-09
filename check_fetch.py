import re
with open('App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

start = text.find('fetch(\'/api/odeal/basket\'')
print(text[start-100:start+1000])
