with open('components/NewReferralModal.tsx', 'r', encoding='utf-8') as f:
    text = f.read()
start = text.find('Personel Bilgisi Kartı')
end = text.find('STEP 2: İstenen Tetkikler')
print(text[start:end])
