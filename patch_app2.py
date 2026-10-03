import re

with open('App.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace(r"\n", "\n")

with open('App.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
