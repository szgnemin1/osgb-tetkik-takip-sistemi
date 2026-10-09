import re
with open('App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

match = re.search(r'const handleSaveReferral = async.*?setEditingReferral', text, re.DOTALL)
if match:
    with open('debug_app.txt', 'w', encoding='utf-8') as f:
        f.write(match.group(0))
