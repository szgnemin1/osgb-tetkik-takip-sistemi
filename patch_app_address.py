with open('App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

old_body = """                        employeeTc: referral.employee.tcNo,
                        city: referral.employee.city || 'İstanbul',
                        town: referral.employee.town || 'Şişli'
                    })"""

new_body = """                        employeeTc: referral.employee.tcNo,
                        city: referral.employee.city || 'İstanbul',
                        town: referral.employee.town || 'Şişli',
                        address: referral.employee.address || '.'
                    })"""

text = text.replace(old_body, new_body)

with open('App.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("App.tsx updated")
