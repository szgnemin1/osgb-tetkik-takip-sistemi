with open('App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

import re
matches = re.finditer(r'activeTab === \'create_referral\'', text)
for m in matches:
    start = max(0, m.start() - 100)
    end = min(len(text), m.end() + 300)
    print(text[start:end])
    print('---------')
