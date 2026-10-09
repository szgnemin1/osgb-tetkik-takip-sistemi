import re
with open('App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace("localStorage.getItem('token')", "sessionStorage.getItem('api_token')")

with open('App.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("Token fixed in App.tsx")
