import re

with open('components/NewReferralModal.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. State
text = text.replace("const [birthDate, setBirthDate] = useState('');", "const [birthDate, setBirthDate] = useState('');\n  const [city, setCity] = useState('İstanbul');\n  const [town, setTown] = useState('Şişli');\n  const [address, setAddress] = useState('.');")

# 2. Init
text = text.replace("setPhone(initialData.employee.phone || '');", "setPhone(initialData.employee.phone || '');\n        setCity(initialData.employee.city || 'İstanbul');\n        setTown(initialData.employee.town || 'Şişli');\n        setAddress(initialData.employee.address || '.');")

# 3. Object
text = text.replace("phone: phone,\n      },", "phone: phone,\n        city: city,\n        town: town,\n        address: address,\n      },")
text = text.replace("phone,\n      },", "phone,\n        city,\n        town,\n        address,\n      },")

# 4. HandleSubmit
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

# 5. Remove Popup
# The popup starts with {showPaymentReminder && ( and ends with </div>\n        </div>\n      )}
popup = re.search(r'\{/\* Ödeme Tipi Hatırlatma.*?(?=\{/\* Form \*/\}|</div>\s*</div>\s*\)\s*;\s*\}|\Z)', text, re.DOTALL)
if popup:
    # Just carefully find the closing of showPaymentReminder
    # Actually, it's safer to just replace `showPaymentReminder && (` with `false && (`
    text = text.replace('{showPaymentReminder && (', '{false && (')

# 6. Inputs
old_phone_jsx = """            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Telefon</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  placeholder="05XX XXX XX XX"
                />
              </div>
            </div>"""

new_inputs_jsx = old_phone_jsx + """
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">İl / İlçe</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-1/2 px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  placeholder="İl"
                />
                <input
                  type="text"
                  value={town}
                  onChange={(e) => setTown(e.target.value)}
                  className="w-1/2 px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  placeholder="İlçe"
                />
              </div>
            </div>
            
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Adres</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                placeholder="Adres"
              />
            </div>"""

text = text.replace(old_phone_jsx, new_inputs_jsx)

with open('components/NewReferralModal.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("Safely patched")
