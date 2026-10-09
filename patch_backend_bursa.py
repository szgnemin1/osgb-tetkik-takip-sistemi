with open('App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace("city || 'İstanbul'", "city || 'Bursa'")
text = text.replace("town || 'Şişli'", "town || 'Mudanya'")

with open('App.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

with open('server.ts', 'r', encoding='utf-8') as f:
    text2 = f.read()

text2 = text2.replace('town: town || "Şişli"', 'town: town || "Mudanya"')
text2 = text2.replace('city: city || "İstanbul"', 'city: city || "Bursa"') # Note: city fallback might not be explicitly there, let's check

with open('server.ts', 'w', encoding='utf-8') as f:
    f.write(text2)

print("App.tsx and server.ts patched")
