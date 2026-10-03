import re

with open('components/SettingsView.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Find all words that have characters outside standard ascii
words = set(re.findall(r'[a-zA-Z]*[^\x00-\x7F][a-zA-Z^\x00-\x7F]*', text))
print("Corrupted words:")
for w in sorted(list(words))[:100]:
    print(w)
