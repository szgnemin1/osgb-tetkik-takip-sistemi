with open('server.ts', 'r', encoding='utf-8') as f:
    text = f.read()

import re

old_customer = r"""        customer: {
          type: "INDIVIDUAL",
          city: \(city \|\| "bursa"\)\.toLowerCase\(\),
          town: \(town \|\| "mudanya"\)\.toLowerCase\(\),
          address: "\.",
          name: employeeName\?\.split\(" "\)\.slice\(0, -1\)\.join\(" "\) \|\| "Müşteri",
          surname: employeeName\?\.split\(" "\)\.slice\(-1\)\.join\(" "\) \|\| "Soyadı",
          identityNumber: employeeTc \|\| "11111111111"
        },"""

new_customer = """        const bursaTowns: Record<string, string> = {
          "nilüfer": "1", "osmangazi": "2", "yıldırım": "3", "büyükorhan": "4",
          "gemlik": "5", "gürsu": "6", "gürsü": "6", "harmancık": "7",
          "inegöl": "8", "iznik": "9", "karacabey": "10", "keles": "12",
          "kestel": "13", "mudanya": "14", "mustafakemalpaşa": "15",
          "orhaneli": "16", "orhangazi": "17", "yenişehir": "18"
        };
        const inputCity = (city || "bursa").toLowerCase();
        const inputTown = (town || "mudanya").toLowerCase();
        const mappedCity = inputCity === "bursa" ? "18" : inputCity;
        const mappedTown = bursaTowns[inputTown] || inputTown;

        const customerPayload = {
          type: "INDIVIDUAL",
          city: mappedCity,
          town: mappedTown,
          address: ".",
          name: employeeName?.split(" ").slice(0, -1).join(" ") || "Müşteri",
          surname: employeeName?.split(" ").slice(-1).join(" ") || "Soyadı",
          identityNumber: employeeTc || "11111111111"
        };
        
        const payload = {
        referenceCode: referralId,
        externalDeviceKey: deviceKey,
        basketType: "SIMPLE",
        customer: customerPayload,"""

text = re.sub(r'const payload = \{\s*referenceCode: referralId,\s*externalDeviceKey: deviceKey,\s*basketType: "SIMPLE",\s*customer: \{.*?\},', new_customer, text, flags=re.DOTALL)

with open('server.ts', 'w', encoding='utf-8') as f:
    f.write(text)

print("Updated server.ts with town mapping")
