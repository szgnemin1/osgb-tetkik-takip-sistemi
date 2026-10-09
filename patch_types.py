with open('types.ts', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('town?: string;', 'town?: string;\n  address?: string;')

with open('types.ts', 'w', encoding='utf-8') as f:
    f.write(text)
print("types.ts updated")
