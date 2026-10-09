import re
with open('components/NewReferralModal.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

start = text.find('const isStep1Valid')
print(text[start:start+300])
