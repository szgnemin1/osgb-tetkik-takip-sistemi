import re

with open('server.ts', 'r', encoding='utf-8') as f:
    text = f.read()

# Add unitCode: "C62" to the product
old_product = '''            product: {
                name: "SAĞLIK HİZMETİ",'''
new_product = '''            product: {
                unitCode: "C62",
                name: "SAĞLIK HİZMETİ",'''

text = text.replace(old_product, new_product)

with open('server.ts', 'w', encoding='utf-8') as f:
    f.write(text)
print("Added unitCode C62")
