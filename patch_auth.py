with open('App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

old = "                const res = await fetch('/api/odeal/basket', {\n                    method: 'POST',\n                    headers: { 'Content-Type': 'application/json' },"
new = "                const res = await fetch('/api/odeal/basket', {\n                    method: 'POST',\n                    headers: {\n                        'Content-Type': 'application/json',\n                        'Authorization': Bearer \n                    },"

text = text.replace(old, new)

with open('App.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print('Patched fetch auth')
