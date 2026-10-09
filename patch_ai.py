import re
with open('server.ts', 'r', encoding='utf-8') as f:
    text = f.read()

old_customer = r"""          city: \(city \|\| "bursa"\)\.toLowerCase\(\),
          town: \(town \|\| "mudanya"\)\.toLowerCase\(\),
          gsmNumber: "5555555555",
          email: "test@test\.com",
          address: "Belirtilmedi""""

new_customer = """          city: (city || "bursa").toLowerCase(),
          town: (town || "mudanya").toLowerCase(),
          district: (town || "mudanya").toLowerCase(),
          gsmNumber: "5555555555",
          email: "test@test.com",
          address: "Cumhuriyet Mah. Atatürk Cad. No:15" """

text = re.sub(old_customer, new_customer, text)

with open('server.ts', 'w', encoding='utf-8') as f:
    f.write(text)

print("Patched customer block for AI suggestion")
