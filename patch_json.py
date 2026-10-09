with open('server.ts', 'r', encoding='utf-8') as f:
    text = f.read()

old = '''      if (!response.ok) {
        const errorText = await response.text();
        console.error("Ödeal Sepet Hatası:", errorText);
        return res.status(response.status).json({ error: "Ödeal başlatılamadı", details: errorText });
      }
      const responseData = await response.json();
      
      const referral = db.referrals?.find((r) => r.id === referralId);
      if (referral) {
          referral.odealTransactionId = responseData.id || "PENDING";'''

new = '''      if (!response.ok) {
        const errorText = await response.text();
        console.error("Ödeal Sepet Hatası:", errorText);
        return res.status(response.status).json({ error: "Ödeal başlatılamadı", details: errorText });
      }
      const rawText = await response.text();
      let responseData = {};
      if (rawText) {
          try { responseData = JSON.parse(rawText); } catch(e){}
      }
      
      const referral = db.referrals?.find((r) => r.id === referralId);
      if (referral) {
          referral.odealTransactionId = responseData.id || "PENDING";'''

text = text.replace(old, new)
with open('server.ts', 'w', encoding='utf-8') as f:
    f.write(text)
print('Patched json parsing')
