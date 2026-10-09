import re
with open('components/NewReferralModal.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# find all occurrences of setPaymentMethod
for match in re.finditer(r'.{0,50}setPaymentMethod.{0,50}', text):
    print(match.group(0))
