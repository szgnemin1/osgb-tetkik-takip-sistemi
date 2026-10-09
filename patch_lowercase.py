import re
with open('server.ts', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('city: city || "Bursa",', 'city: (city || "bursa").toLowerCase(),')
text = text.replace('town: town || "Mudanya",', 'town: (town || "mudanya").toLowerCase(),')

with open('server.ts', 'w', encoding='utf-8') as f:
    f.write(text)

print("Forced to lowercase")
