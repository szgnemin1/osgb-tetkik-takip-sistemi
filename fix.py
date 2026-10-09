import json
with open('App.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()
with open('fix_content.txt', 'r', encoding='utf-8') as f:
    content = f.read()
lines[224:266] = [content + '\n']
with open('App.tsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)
