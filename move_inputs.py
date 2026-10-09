with open('components/NewReferralModal.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Remove the previously added JSX
text = text.replace("""                    </div>
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

                    </div>""", "")

# Find Ad Soyad
ad_soyad = """                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block ml-1">Ad Soyad <span className="text-red-500">*</span></label>
                        <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-base focus:border-emerald-500 outline-none placeholder-slate-600" placeholder="Örn: Ahmet Yılmaz" />
                      </div>"""

new_ad_soyad = ad_soyad + """
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

text = text.replace(ad_soyad, new_ad_soyad)

with open('components/NewReferralModal.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print("Moved inputs to top")
