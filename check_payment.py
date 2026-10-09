import re
with open('components/NewReferralModal.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

start = text.find('if (showPaymentReminder) {')
if start == -1:
    start = text.find('showPaymentReminder &&')
    if start == -1:
        start = text.find('showPaymentReminder ?')

print(text[max(0, start-100):start+1500])
