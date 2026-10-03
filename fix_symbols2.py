def fix_file(path):
    with open(path, 'rb') as f:
        content = f.read()
    
    for char in ['₺', '•', '💡']:
        good_utf8 = char.encode('utf-8')
        bad_utf8 = good_utf8.decode('windows-1254').encode('utf-8')
        content = content.replace(bad_utf8, good_utf8)
        
    with open(path, 'wb') as f:
        f.write(content)

fix_file('components/SettingsView.tsx')
fix_file('App.tsx')
fix_file('types.ts')
