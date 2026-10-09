import re
with open('App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

modals = re.findall(r'<([A-Z][a-zA-Z0-9]*Modal) ', text)
print(list(set(modals)))
