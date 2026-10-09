import re

with open('App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

old_tx_logic = r"    if \(\(referral\.paymentMethod === 'CASH' \|\| referral\.paymentMethod === 'POS'\) && referral\.totalPrice && referral\.totalPrice > 0\) \{\n        const typeLabel = referral\.paymentMethod === 'CASH' \? 'Nakit' : 'Pos';\n        const newTransaction: SafeTransaction = \{\n            id: Math\.random\(\)\.toString\(36\)\.substr\(2, 9\),\n            type: 'INCOME',\n            amount: referral\.totalPrice,\n            description: Sevk Geliri \(\$\{typeLabel\}\): \$\{referral\.employee\.fullName\} \(\$\{referral\.employee\.company\}\),\n            date: referral\.referralDate,\n            paymentMethod: referral\.paymentMethod,\n            referralId: referral\.id\n        \};\n        await saveTransactionToDb\(newTransaction\);\n    \}"

new_tx_logic = '''    if ((referral.paymentMethod === 'CASH' || referral.paymentMethod === 'POS') && referral.totalPrice && referral.totalPrice > 0) {
        if (referral.paymentMethod === 'POS' && appSettings.odealMerchantKey) {
            // Do not create income here, the webhook will handle it.
            // But we must trigger the Odeal basket API!
            try {
                const res = await fetch('/api/odeal/basket', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        amount: referral.totalPrice,
                        referralId: referral.id,
                        deviceKey: appSettings.odealDeviceKey || 'POS-01',
                        employeeName: referral.employee.fullName,
                        employeeTc: referral.employee.tcNo,
                        city: referral.employee.city || 'İstanbul',
                        town: referral.employee.town || 'Şişli'
                    })
                });
                const data = await res.json();
                if (data.success) {
                    alert('Ödeal POS cihazı uyandırıldı! Lütfen cihaz üzerinden ödemeyi tamamlayın.');
                } else {
                    alert('Ödeal Başlatılamadı: ' + (data.error || 'Bilinmeyen hata'));
                }
            } catch (err) {
                alert('Ödeal sunucusuna bağlanılamadı.');
            }
        } else {
            const typeLabel = referral.paymentMethod === 'CASH' ? 'Nakit' : 'Pos';
            const newTransaction: SafeTransaction = {
                id: Math.random().toString(36).substr(2, 9),
                type: 'INCOME',
                amount: referral.totalPrice,
                description: Sevk Geliri ():  (),
                date: referral.referralDate,
                paymentMethod: referral.paymentMethod,
                referralId: referral.id
            };
            await saveTransactionToDb(newTransaction);
        }
    }'''

text = re.sub(old_tx_logic, new_tx_logic, text, flags=re.DOTALL)

with open('App.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print('App.tsx patched!')
