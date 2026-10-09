import re
with open('App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('<h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">OSGB Tetkik</h1>', '<h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">OSGB Tetkik (V2 - Adres Eklendi)</h1>')

with open('App.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("Title updated")
