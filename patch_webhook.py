import re

with open('server.ts', 'r', encoding='utf-8') as f:
    code = f.read()

old_block = r'''        // If collection is referrals, trigger telegram notification only for newly created items'''

new_block = r'''        // Fatura Takip Webhook Integration
        if (collection === 'referrals' && item.paymentMethod === 'INVOICE' && !item.isExternalRecord) {
          try {
            const payload = [{
              id: item.id,
              paymentMethod: item.paymentMethod,
              totalPrice: item.totalPrice || 0,
              referralDate: item.referralDate,
              employee: {
                  fullName: item.employee?.fullName || "",
                  company: item.employee?.company || ""
              },
              exams: item.exams || []
            }];
            
            fetch('http://localhost:5000/api/webhook/health-services', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            }).catch(err => console.error("Webhook (Fatura Takip) gonderilemedi:", err.message));
          } catch (e) {
            console.error("Webhook (Fatura Takip) hatasi:", e);
          }
        }

        // If collection is referrals, trigger telegram notification only for newly created items'''

code = code.replace(old_block, new_block)

with open('server.ts', 'w', encoding='utf-8') as f:
    f.write(code)
