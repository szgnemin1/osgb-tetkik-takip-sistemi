with open('App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

import re
matches = re.finditer(r'Yeni Sevk', text)
for m in matches:
    start = max(0, m.start() - 100)
    end = min(len(text), m.end() + 100)
    print(text[start:end])
    print('---------')
