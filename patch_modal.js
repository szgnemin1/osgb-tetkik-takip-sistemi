const fs = require('fs');
let code = fs.readFileSync('components/NewReferralModal.tsx', 'utf8');

code = code.replace(/birthDate !== '' &&/g, "birthDate !== '' &&\n      phone.trim().length >= 10 &&");

// Add phone field to Step 1 mobile and desktop layouts
// Mobile is around line 496+, Desktop is around line 858+
// Let's use string replacement

// Desktop (COLUMN 1):
// <div>
//   <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block ml-1">Ad Soyad <span className="text-red-500">*</span></label>
//   <input type="text" value={fullName} ... />
// </div>

code = code.replace(/(<label className="text-\[10px\] uppercase font-bold text-slate-500 mb-1 block ml-1">Ad Soyad <span className="text-red-500">\*<\/span><\/label>\s*<input type="text" value=\{fullName\}[^>]+>\s*<\/div>)/g, 
`$1
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block ml-1">Telefon <span className="text-red-500">*</span></label>
                    <input type="tel" maxLength={15} value={phone} onChange={e => setPhone(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-sm focus:border-emerald-500 outline-none placeholder-slate-600" placeholder="Örn: 0555 555 5555" />
                  </div>`);

code = code.replace(/\[fullName, tcNo, birthDate, selectedCompanyData, initialData, companySearchTerm\]\);/g, "[fullName, tcNo, birthDate, phone, selectedCompanyData, initialData, companySearchTerm]);");

fs.writeFileSync('components/NewReferralModal.tsx', code);
