import re

with open('components/AdminAuthModal.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace("fetch(pi/admin/request-otp, {", "fetch(${baseUrl}api/admin/request-otp, {")
code = code.replace("fetch(pi/admin/verify-otp, {", "fetch(${baseUrl}api/admin/verify-otp, {")

# Also fix authorization headers missing backticks!
code = code.replace("'Authorization': Bearer ", "'Authorization': Bearer ")

with open('components/AdminAuthModal.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
