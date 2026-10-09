with open('App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()
start = text.find('if ((referral.paymentMethod ===')
print(text[start:start+1500])
