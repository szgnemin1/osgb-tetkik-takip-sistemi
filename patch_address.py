with open('components/NewReferralModal.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace("useState('.')", "useState('Belirtilmedi')")
text = text.replace("address || '.'", "address || 'Belirtilmedi'")

with open('components/NewReferralModal.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

with open('App.tsx', 'r', encoding='utf-8') as f:
    text2 = f.read()

text2 = text2.replace("address || '.'", "address || 'Belirtilmedi'")

with open('App.tsx', 'w', encoding='utf-8') as f:
    f.write(text2)

with open('server.ts', 'r', encoding='utf-8') as f:
    text3 = f.read()

text3 = text3.replace('address || "."', 'address || "Belirtilmedi"')

with open('server.ts', 'w', encoding='utf-8') as f:
    f.write(text3)

print("Updated address fallback to Belirtilmedi")
