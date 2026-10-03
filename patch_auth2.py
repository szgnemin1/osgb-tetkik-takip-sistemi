import re

with open('components/AdminAuthModal.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace("'Authorization': \\Bearer \\\\", "'Authorization': Bearer ")

with open('components/AdminAuthModal.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
