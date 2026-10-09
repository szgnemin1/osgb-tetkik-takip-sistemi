with open('App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

start = text.find('activeTab === \'create_referral\'')
print(text[max(0, start-100):start+300])
