import re
with open('server.ts', 'r', encoding='utf-8') as f:
    text = f.read()

old_customer_block = r"""        customer: {
          type: "INDIVIDUAL",
          city: \(city \|\| "bursa"\)\.toLowerCase\(\),
          town: \(town \|\| "mudanya"\)\.toLowerCase\(\),
          address: "\.",
          name: employeeName\?\.split\(" "\)\.slice\(0, -1\)\.join\(" "\) \|\| "Müşteri",
          surname: employeeName\?\.split\(" "\)\.slice\(-1\)\.join\(" "\) \|\| "Soyadı",
          identityNumber: employeeTc \|\| "11111111111"
        },"""

new_customer_block = """        customer: {
          type: "INDIVIDUAL",
          referenceCode: referralId,
          name: employeeName?.split(" ").slice(0, -1).join(" ") || "Müşteri",
          surname: employeeName?.split(" ").slice(-1).join(" ") || "Soyadı",
          identityNumber: employeeTc || "11111111111",
          title: employeeName || "Müşteri",
          taxNumber: "",
          taxOffice: "",
          city: (city || "bursa").toLowerCase(),
          town: (town || "mudanya").toLowerCase(),
          gsmNumber: "5555555555",
          email: "test@test.com",
          address: "Belirtilmedi"
        },"""

text = re.sub(old_customer_block.encode('utf-8').decode('utf-8'), new_customer_block.encode('utf-8').decode('utf-8'), text, flags=re.DOTALL)

with open('server.ts', 'w', encoding='utf-8') as f:
    f.write(text)

print("Added all customer fields to payload")
