import re
with open('components/NewReferralModal.tsx', 'r', encoding='utf-8') as f:
    text = f.read()
start = text.find('05XX XXX XX XX')
print(text[start-200:start+1000])
