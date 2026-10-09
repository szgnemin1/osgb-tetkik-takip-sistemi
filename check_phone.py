import re
with open('components/NewReferralModal.tsx', 'r', encoding='utf-8') as f:
    text = f.read()
start = text.find('Telefon')
print(text[start-100:start+600])
