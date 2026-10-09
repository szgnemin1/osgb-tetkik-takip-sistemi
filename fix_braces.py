with open('App.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# delete indices 268 and 270 (lines 269 and 271)
del lines[270]
del lines[268]

with open('App.tsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)
