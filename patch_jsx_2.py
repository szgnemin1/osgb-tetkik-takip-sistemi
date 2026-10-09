with open('components/NewReferralModal.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

target = 'placeholder="05XX XXX XX XX" />\n                      </div>'
replacement = target + """
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block ml-1">İl</label>
                        <input type="text" value={city} onChange={e => setCity(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-base focus:border-emerald-500 outline-none placeholder-slate-600" placeholder="İl" />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block ml-1">İlçe</label>
                        <input type="text" value={town} onChange={e => setTown(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-base focus:border-emerald-500 outline-none placeholder-slate-600" placeholder="İlçe" />
                      </div>
                    </div>
                    <div className="mt-3">
                      <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block ml-1">Adres</label>
                      <input type="text" value={address} onChange={e => setAddress(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-base focus:border-emerald-500 outline-none placeholder-slate-600" placeholder="Adres" />
"""

text = text.replace(target, replacement)

with open('components/NewReferralModal.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("JSX ADDED")
