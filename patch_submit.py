import re

with open('components/NewReferralModal.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

old_block = r'''const handleSubmit = \(e: React\.FormEvent, shouldPrint: boolean = false\) => \{
    e\.preventDefault\(\);
    if \(!isFormValid\) return;'''

new_block = r'''const handleSubmit = (e: React.FormEvent, shouldPrint: boolean = false) => {
    e.preventDefault();
    if (!isFormValid) return;
    
    if (isExternalRecord) shouldPrint = false;'''

code = re.sub(old_block, new_block, code)

with open('components/NewReferralModal.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
