with open('components/NewReferralModal.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

import re

# We need to replace the input for town with a select.
old_town_input = r"""            <div>
              <label className="block text-sm font-medium text-gray-700">İlçe</label>
              <input
                type="text"
                value=\{town\}
                onChange=\{\(e\) => setTown\(e\.target\.value\)\}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>"""

new_town_input = """            <div>
              <label className="block text-sm font-medium text-gray-700">İlçe</label>
              <select
                value={town}
                onChange={(e) => setTown(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              >
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
              </select>
            </div>"""

text = re.sub(old_town_input.encode('utf-8').decode('utf-8'), new_town_input.encode('utf-8').decode('utf-8'), text, flags=re.DOTALL)

# And make city a select as well just in case
old_city_input = r"""            <div>
              <label className="block text-sm font-medium text-gray-700">İl</label>
              <input
                type="text"
                value=\{city\}
                onChange=\{\(e\) => setCity\(e\.target\.value\)\}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>"""

new_city_input = """            <div>
              <label className="block text-sm font-medium text-gray-700">İl</label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              >
                <option value="Bursa">Bursa</option>
              </select>
            </div>"""

text = re.sub(old_city_input.encode('utf-8').decode('utf-8'), new_city_input.encode('utf-8').decode('utf-8'), text, flags=re.DOTALL)

with open('components/NewReferralModal.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Updated NewReferralModal with dropdowns")
