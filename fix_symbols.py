def fix_file(path):
    with open(path, 'rb') as f:
        content = f.read()
    
    # ₺ (E2 82 BA) read as Windows-1252/1254 (E2 -> â, 82 -> ‚, BA -> º)
    # So we replace (C3 A2 E2 80 9A C2 BA) with (E2 82 BA)
    # Instead of guessing, we can generate it!
    
    for char in ['₺', '•', '💡']:
        good_utf8 = char.encode('utf-8')
        try:
            bad_utf8 = good_utf8.decode('windows-1252').encode('utf-8')
        except:
            bad_utf8 = good_utf8.decode('iso-8859-1').encode('utf-8')
        content = content.replace(bad_utf8, good_utf8)
        
    with open(path, 'wb') as f:
        f.write(content)

fix_file('components/SettingsView.tsx')
fix_file('App.tsx')
fix_file('types.ts')
