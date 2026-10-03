def fix_file(path):
    with open(path, 'rb') as f:
        content = f.read()
    content = content.replace(b'\xc3\x85\xc2\x9e', b'\xc5\x9e') # Ş
    content = content.replace(b'\xc3\x85\xc2\x9f', b'\xc5\x9f') # ş (just in case)
    with open(path, 'wb') as f:
        f.write(content)

fix_file('components/SettingsView.tsx')
fix_file('App.tsx')
fix_file('types.ts')
