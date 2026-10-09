import re
with open('types.ts', 'r', encoding='utf-8') as f:
    text = f.read()

start = text.find('export interface Employee {')
end = text.find('}', start)
print(text[start:end+1])
