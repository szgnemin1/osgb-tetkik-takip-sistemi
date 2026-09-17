const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

const injection = `
    if (referral.targetInstitutionId) {
      const inst = institutions.find(i => i.id === referral.targetInstitutionId);
      if (inst && inst.sendWhatsapp && referral.employee.phone) {
         let msg = inst.whatsappTemplate || 'Sayın {hasta_adi}, {kurum_adi} kurumuna sevkiniz oluşturulmuştur. Konum: {konum_linki}';
         msg = msg.replace(/\\{hasta_adi\\}/g, referral.employee.fullName)
                  .replace(/\\{kurum_adi\\}/g, inst.name)
                  .replace(/\\{konum_linki\\}/g, inst.locationUrl || '');
         
         let phoneFormatted = referral.employee.phone.replace(/\\D/g, '');
         if (phoneFormatted.startsWith('0')) {
             phoneFormatted = '90' + phoneFormatted.substring(1);
         } else if (!phoneFormatted.startsWith('90') && phoneFormatted.length === 10) {
             phoneFormatted = '90' + phoneFormatted;
         }

         const encodedMsg = encodeURIComponent(msg);
         const whatsappUrl = \`https://wa.me/\${phoneFormatted}?text=\${encodedMsg}\`;
         
         // Biraz gecikmeli açılabilir browser engeline takılmamak için veya direkt
         setTimeout(() => {
             window.open(whatsappUrl, '_blank');
         }, 500);
      }
    }
`;

code = code.replace(/const newTransaction: SafeTransaction = \{/g, `const newTransaction: SafeTransaction = {`);

code = code.replace(/await saveReferralToDb\(referral\);/, `await saveReferralToDb(referral);\n${injection}`);

fs.writeFileSync('App.tsx', code);
