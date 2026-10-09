import re
with open('server.ts', 'r', encoding='utf-8') as f:
    text = f.read()

match = re.search(r'app\.get\("/api/data".*?\);', text, re.DOTALL)
if match:
    print(match.group(0)[:500])
