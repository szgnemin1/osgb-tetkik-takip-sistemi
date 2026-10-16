import re

with open('types.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Update MedicalInstitution
pattern1 = re.compile(r'(whatsappTemplate\?: string;.*?\n)')
repl1 = r"\1  portalType?: 'VETA' | 'INFOMED' | 'NONE';\n  portalUrl?: string;\n  portalUsername?: string;\n  portalPassword?: string;\n"
content = pattern1.sub(repl1, content, count=1)

# Update Referral
pattern2 = re.compile(r'(odealStatus\?: string;\n)')
repl2 = r"\1  resultPdfPath?: string;\n  lastCheckedAt?: string;\n"
content = pattern2.sub(repl2, content, count=1)

with open('types.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("types.ts patched via python")
