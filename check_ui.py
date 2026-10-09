import re
with open('components/NewReferralModal.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

start = text.find('İlçe')
print(text[start-50:start+200])
