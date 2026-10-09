with open('components/NewReferralModal.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

import re
matches = [m.start() for m in re.finditer('currentStep === 1', text)]
for m in matches:
    print(text[m:m+500])
    print("------------------")
