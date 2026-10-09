with open('server.ts', 'r', encoding='utf-8') as f:
    text = f.read()

import re

# We will modify the payload generation block to explicitly force lowercase and "."
old_customer = r"""        customer: {
          type: "INDIVIDUAL",
          name: employeeName\?\.split\(" "\)\[0\] \|\| "Müşteri",
          surname: employeeName\?\.split\(" "\)\.slice\(1\)\.join\(" "\) \|\| "Soyadı",
          identityNumber: employeeTc \|\| "11111111111",
          city: city \|\| "Bursa",
          town: town \|\| "Mudanya",
          address: address \|\| "Belirtilmedi"
        },"""

new_customer = """        customer: {
          type: "INDIVIDUAL",
          city: (city || "bursa").toLowerCase(),
          town: (town || "mudanya").toLowerCase(),
          address: ".",
          name: employeeName?.split(" ").slice(0, -1).join(" ") || "Müşteri",
          surname: employeeName?.split(" ").slice(-1).join(" ") || "Soyadı",
          identityNumber: employeeTc || "11111111111"
        },"""

text = re.sub(old_customer.encode('utf-8').decode('utf-8'), new_customer.encode('utf-8').decode('utf-8'), text, flags=re.DOTALL)

with open('server.ts', 'w', encoding='utf-8') as f:
    f.write(text)

print("Updated server.ts")
