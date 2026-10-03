turkish_chars = 'ığüşçöİĞÜŞÇÖ'
replacements = {}
for char in turkish_chars:
    good_char_utf8 = char.encode('utf-8')
    try:
        bad_char_utf8 = good_char_utf8.decode('windows-1252').encode('utf-8')
    except:
        bad_char_utf8 = good_char_utf8.decode('iso-8859-1').encode('utf-8')
    replacements[bad_char_utf8] = good_char_utf8

def fix_file(path):
    with open(path, 'rb') as f:
        content = f.read()
    for bad, good in replacements.items():
        content = content.replace(bad, good)
    with open(path, 'wb') as f:
        f.write(content)

fix_file('components/SettingsView.tsx')
fix_file('App.tsx')
fix_file('types.ts')
