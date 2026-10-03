import os

def fix_double_encoding(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # The file was originally UTF-8. 
    # It was read using Windows-1252 (or Windows-1254), and then written back as UTF-8.
    # To reverse this, we can encode it back to Windows-1252, and decode it as UTF-8!
    
    try:
        # Some characters might not map perfectly if Windows-1254 was used, 
        # let's try Windows-1252 first as it's PowerShell's default ANSI on US Windows.
        raw_bytes = content.encode('windows-1252')
        fixed_content = raw_bytes.decode('utf-8')
        
        with open(path, 'w', encoding='utf-8') as f:
            f.write(fixed_content)
        print(f"Fixed {path} using windows-1252 reverse")
    except Exception as e:
        print(f"Could not reverse {path} using windows-1252: {e}")
        try:
            raw_bytes = content.encode('windows-1254')
            fixed_content = raw_bytes.decode('utf-8')
            with open(path, 'w', encoding='utf-8') as f:
                f.write(fixed_content)
            print(f"Fixed {path} using windows-1254 reverse")
        except Exception as e2:
            print(f"Could not reverse {path} using windows-1254: {e2}")

fix_double_encoding('components/SettingsView.tsx')
fix_double_encoding('App.tsx')
fix_double_encoding('types.ts')
