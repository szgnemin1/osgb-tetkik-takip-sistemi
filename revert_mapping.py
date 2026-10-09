with open('server.ts', 'r', encoding='utf-8') as f:
    text = f.read()

import re

# Remove the town mapping logic
old_customer_block = r"""        const bursaTowns: Record<string, string> = \{.*?        const payload = \{
        referenceCode: referralId,
        externalDeviceKey: deviceKey,
        basketType: "SIMPLE",
        customer: customerPayload,"""

new_customer_block = """        const payload = {
        referenceCode: referralId,
        externalDeviceKey: deviceKey,
        basketType: "SIMPLE",
        customer: {
          type: "INDIVIDUAL",
          city: city || "Bursa",
          town: town || "Mudanya",
          address: ".",
          name: employeeName?.split(" ").slice(0, -1).join(" ") || "Müşteri",
          surname: employeeName?.split(" ").slice(-1).join(" ") || "Soyadı",
          identityNumber: employeeTc || "11111111111"
        },"""

text = re.sub(old_customer_block.encode('utf-8').decode('utf-8'), new_customer_block.encode('utf-8').decode('utf-8'), text, flags=re.DOTALL)

with open('server.ts', 'w', encoding='utf-8') as f:
    f.write(text)

print("Reverted server.ts mapping")
