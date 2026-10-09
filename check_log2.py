with open('server.ts', 'r', encoding='utf-8') as f:
    text = f.read()
start = text.find('console.log("=== ODL PAYLOAD ==="')
if start > -1:
    print(text[start-100:start+200])
