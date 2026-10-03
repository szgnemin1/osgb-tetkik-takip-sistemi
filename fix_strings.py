import os

replacements = {
    "Ä±": "ı",
    "ÄŸ": "ğ",
    "Ã¼": "ü",
    "ÅŸ": "ş",
    "Ã§": "ç",
    "Ã¶": "ö",
    "Ä°": "İ",
    "Åž": "Ş",
    "Ãœ": "Ü",
    "Ã–": "Ö",
    "Ã‡": "Ç",
    "Äž": "Ğ"
}

def fix_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    for bad, good in replacements.items():
        content = content.replace(bad, good)
        
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
        
    print(f"Fixed {path}")

fix_file('components/SettingsView.tsx')
fix_file('App.tsx')
fix_file('types.ts')
