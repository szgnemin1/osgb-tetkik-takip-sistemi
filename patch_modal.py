with open('components/NewReferralModal.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

import re

# We will just replace the specific <input type="text" value={town} ... /> with a select
# And <input type="text" value={city} ... /> with a select

old_town_input = r'<input type="text" value=\{town\} onChange=\{e => setTown\(e\.target\.value\)\} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all placeholder:text-slate-600" placeholder="le" />'

new_town_input = """<select value={town} onChange={e => setTown(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all appearance-none">
  <option value="Nilüfer">Nilüfer</option>
  <option value="Osmangazi">Osmangazi</option>
  <option value="Yıldırım">Yıldırım</option>
  <option value="Büyükorhan">Büyükorhan</option>
  <option value="Gemlik">Gemlik</option>
  <option value="Gürsu">Gürsu</option>
  <option value="Harmancık">Harmancık</option>
  <option value="İnegöl">İnegöl</option>
  <option value="İznik">İznik</option>
  <option value="Karacabey">Karacabey</option>
  <option value="Keles">Keles</option>
  <option value="Kestel">Kestel</option>
  <option value="Mudanya">Mudanya</option>
  <option value="Mustafakemalpaşa">Mustafakemalpaşa</option>
  <option value="Orhaneli">Orhaneli</option>
  <option value="Orhangazi">Orhangazi</option>
  <option value="Yenişehir">Yenişehir</option>
</select>"""

# Because of encoding issues with  in the source file, I'll use a more robust regex
text = re.sub(r'<input type="text" value=\{town\}.*?placeholder="[^"]+" />', new_town_input, text, flags=re.DOTALL)

new_city_input = """<select value={city} onChange={e => setCity(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all appearance-none">
  <option value="Bursa">Bursa</option>
</select>"""

text = re.sub(r'<input type="text" value=\{city\}.*?placeholder="[^"]+" />', new_city_input, text, flags=re.DOTALL)

with open('components/NewReferralModal.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Patched NewReferralModal")
