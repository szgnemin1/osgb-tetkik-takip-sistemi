import re

with open('components/NewReferralModal.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Add state variables right after setBirthDate
text = re.sub(
    r"(const \[birthDate, setBirthDate\] = useState\(''\);)",
    r"\1\n  const [city, setCity] = useState('İstanbul');\n  const [town, setTown] = useState('Şişli');\n  const [address, setAddress] = useState('.');",
    text
)

# 2. Initialization in useEffect
text = re.sub(
    r"(setPhone\(initialData\.employee\.phone \|\| ''\);)",
    r"\1\n        setCity(initialData.employee.city || 'İstanbul');\n        setTown(initialData.employee.town || 'Şişli');\n        setAddress(initialData.employee.address || '.');",
    text
)

# 3. Add to Referral object 
text = re.sub(
    r"(phone: phone,)",
    r"\1\n        city: city,\n        town: town,\n        address: address,",
    text
)
text = re.sub(
    r"(phone,\n)",
    r"\1        city,\n        town,\n        address,\n",
    text
)

# 4. Handle Submit logic
old_handle = """  const handleSubmit = (e: React.FormEvent, shouldPrint: boolean = false) => {
    e.preventDefault();
    if (!isFormValid) return;
    
    if (isExternalRecord) shouldPrint = false;

    if (paymentMethod !== 'INVOICE') {
      setPendingPrint(shouldPrint);
      if (isExternalRecord) {
          executeSubmit(paymentMethod, shouldPrint, isExternalRecord);
      } else {
          setShowPaymentReminder(true);
      }
    } else {
      executeSubmit('INVOICE', shouldPrint, isExternalRecord);
    }
  };"""
new_handle = """  const handleSubmit = (e: React.FormEvent, shouldPrint: boolean = false) => {
    e.preventDefault();
    if (!isFormValid) return;
    
    if (isExternalRecord) shouldPrint = false;
    executeSubmit(paymentMethod, shouldPrint, isExternalRecord);
  };"""
text = text.replace(old_handle, new_handle)

# 5. Disable Popup
text = text.replace('{showPaymentReminder && (', '{false && (')

# 6. Add inputs directly after Ad Soyad
ad_soyad_pattern = r"(<label.*?Ad Soyad.*?</label>\s*<input.*?setFullName.*?/>\s*</div>)"

new_inputs = r"""\1
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block ml-1">İl</label>
                          <input type="text" value={city} onChange={e => setCity(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-base focus:border-emerald-500 outline-none placeholder-slate-600" placeholder="İl" />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block ml-1">İlçe</label>
                          <input type="text" value={town} onChange={e => setTown(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-base focus:border-emerald-500 outline-none placeholder-slate-600" placeholder="İlçe" />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block ml-1">Adres</label>
                        <input type="text" value={address} onChange={e => setAddress(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-base focus:border-emerald-500 outline-none placeholder-slate-600" placeholder="Adres" />
                      </div>"""

text = re.sub(ad_soyad_pattern, new_inputs, text, flags=re.DOTALL)

with open('components/NewReferralModal.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("Finished!")
