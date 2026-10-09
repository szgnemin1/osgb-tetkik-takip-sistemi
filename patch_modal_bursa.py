with open('components/NewReferralModal.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Defaults in state
text = text.replace("useState('İstanbul')", "useState('Bursa')")
text = text.replace("useState('Şişli')", "useState('Mudanya')")

# 2. Defaults in init
text = text.replace("city || 'İstanbul'", "city || 'Bursa'")
text = text.replace("town || 'Şişli'", "town || 'Mudanya'")

# 3. Remove Adres JSX from UI
import re
address_jsx_pattern = r'<div>\s*<label className="text-\[10px\] uppercase font-bold text-slate-500 mb-1 block ml-1">Adres</label>\s*<input type="text" value=\{address\}.*?placeholder="Adres" />\s*</div>'
text = re.sub(address_jsx_pattern, '', text, flags=re.DOTALL)

with open('components/NewReferralModal.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("Modal patched")
