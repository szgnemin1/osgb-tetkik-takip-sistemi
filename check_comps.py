import re
with open('components/NewReferralModal.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

comps = re.findall(r'export (?:function|const) ([A-Z][a-zA-Z0-9]*)', text)
print(comps)
