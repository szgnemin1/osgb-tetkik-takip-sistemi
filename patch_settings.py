import re

with open('components/SettingsView.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Add Odeal to activeTab
code = re.sub(
    r"const \[activeTab, setActiveTab\] = useState<'general' \| 'companies' \| 'exams' \| 'institutions' \| 'backup' \| 'update'>\('general'\);",
    "const [activeTab, setActiveTab] = useState<'general' | 'companies' | 'exams' | 'institutions' | 'backup' | 'update' | 'odeal'>('general');",
    code
)

# 2. Add Odeal States
state_regex = r"(const \[odealDeviceKey, setOdealDeviceKey\] = useState\(settings\.odealDeviceKey \|\| ''\);)"
new_states = r"""\1
  const [odealEnabled, setOdealEnabled] = useState(settings.odealEnabled ?? true);
  const [odealMerchantKey, setOdealMerchantKey] = useState(settings.odealMerchantKey || '');
  const [odealSecretKey, setOdealSecretKey] = useState(settings.odealSecretKey || '');"""
code = re.sub(state_regex, new_states, code)

# 3. Add handleSaveOdealSettings
save_regex = r"(const handleUpdateGeneralSettings = \(e: React\.FormEvent\) => \{)"
save_odeal = r"""const handleSaveOdealSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onUpdateSettings({
        ...settings,
        odealEnabled,
        odealMerchantKey,
        odealSecretKey,
        odealDeviceKey
      });
      alert("Ödeal ayarları güncellendi.");
    } catch(err) {
      alert("Hata oluştu.");
    }
  };

  const handleToggleOdealProfile = async (profileType: 'INTERNAL_BASKET' | 'EXTERNAL_DEVICE_TO_DEVICE') => {
    if (!odealMerchantKey || !odealSecretKey) {
      alert("Lütfen önce Merchant Key ve Secret Key bilgilerini kaydedin.");
      return;
    }
    
    try {
      const { getApiToken } = await import('../services/useServerData');
      const token = getApiToken();
      const res = await fetch('/api/odeal/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ profileType, merchantKey: odealMerchantKey, secretKey: odealSecretKey })
      });
      
      const data = await res.json();
      if (data.success) {
        alert("Cihaz profili başarıyla " + (profileType === 'EXTERNAL_DEVICE_TO_DEVICE' ? 'D2D (Entegrasyon)' : 'Normal (Bağımsız)') + " moduna alındı!");
      } else {
        alert("Hata: " + (data.error || "Bilinmeyen hata"));
      }
    } catch(err) {
      alert("İstek gönderilirken hata oluştu.");
    }
  };

  \1"""
code = re.sub(save_regex, save_odeal, code)

# 4. Add Tab Button
tab_regex = r"(<button\s+onClick=\{\(\) => setActiveTab\('update'\)\})"
tab_odeal = r"""<button
            onClick={() => setActiveTab('odeal')}
            className={`px-6 py-4 text-center font-medium text-sm transition-colors whitespace-nowrap ${activeTab === 'odeal' ? 'bg-slate-900/50 text-blue-400 border-b-2 border-blue-500' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
          >
            Ödeal POS
          </button>
          \1"""
code = re.sub(tab_regex, tab_odeal, code)

# 5. Add Content
content_regex = r"(\s*\{activeTab === 'update' && \()"
content_odeal = r"""
        {activeTab === 'odeal' && (
          <div className="space-y-6 max-w-2xl">
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-sm">
               <div className="flex items-center space-x-3 mb-6">
                 <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                    <span className="text-emerald-400 font-bold text-lg">Ö</span>
                 </div>
                 <div>
                    <h3 className="text-lg font-bold text-white">Ödeal Fiziki POS Entegrasyonu</h3>
                    <p className="text-sm text-slate-400">POS cihazından otomatik tahsilat ayarları.</p>
                 </div>
               </div>

               <form onSubmit={handleSaveOdealSettings} className="space-y-6">
                 {/* Toggle */}
                 <div className="flex items-center p-4 bg-slate-800 rounded-lg border border-slate-600">
                    <input 
                      type="checkbox" 
                      id="odealEnabled"
                      checked={odealEnabled}
                      onChange={(e) => setOdealEnabled(e.target.checked)}
                      className="w-5 h-5 rounded border-slate-600 text-emerald-600 focus:ring-emerald-500 bg-slate-900 mr-3"
                    />
                    <div>
                      <label htmlFor="odealEnabled" className="text-base font-bold text-white cursor-pointer block">POS Entegrasyonunu Aktif Et</label>
                      <p className="text-xs text-slate-400 mt-1">Kapalıysa sistem POS'a sepet göndermez.</p>
                    </div>
                 </div>

                 {/* Credentials */}
                 <div className="space-y-4 p-4 bg-slate-800 rounded-lg border border-slate-600">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Merchant Key (Üye İşyeri Anahtarı)</label>
                      <input 
                        type="text" 
                        value={odealMerchantKey} 
                        onChange={(e) => setOdealMerchantKey(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-500 rounded text-white focus:ring-blue-500 outline-none" 
                        placeholder="Örn: 5x8d..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Secret Key (Gizli Anahtar)</label>
                      <input 
                        type="password" 
                        value={odealSecretKey} 
                        onChange={(e) => setOdealSecretKey(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-500 rounded text-white focus:ring-blue-500 outline-none" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">Cihaz Kodu (Device Key)</label>
                      <input 
                        type="text" 
                        value={odealDeviceKey} 
                        onChange={(e) => setOdealDeviceKey(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-500 rounded text-white focus:ring-blue-500 outline-none" 
                        placeholder="Örn: POS-01"
                      />
                    </div>
                 </div>

                 <button type="submit" className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold transition-colors">
                   Ayarları Kaydet
                 </button>
               </form>

               {/* Profile Update Tools */}
               <div className="mt-8 pt-6 border-t border-slate-700">
                  <h4 className="text-white font-bold mb-4">Cihaz Modu (Profil) Yönetimi</h4>
                  <p className="text-sm text-slate-400 mb-4">Fiziki POS cihazını bilgisayardan entegre çalışacak duruma getirebilir veya eski (bağımsız) haline döndürebilirsiniz. (Not: Merchant Key ve Secret Key yukarıda kayıtlı olmalıdır)</p>
                  
                  <div className="flex flex-col sm:flex-row gap-4">
                    <button 
                      onClick={() => handleToggleOdealProfile('EXTERNAL_DEVICE_TO_DEVICE')}
                      className="flex-1 py-3 px-4 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/50 text-blue-300 hover:text-white rounded-lg font-bold transition-colors text-sm"
                      type="button"
                    >
                      D2D (Entegrasyon) Moduna Al
                    </button>
                    <button 
                      onClick={() => handleToggleOdealProfile('INTERNAL_BASKET')}
                      className="flex-1 py-3 px-4 bg-slate-700 hover:bg-slate-600 border border-slate-500 text-slate-200 hover:text-white rounded-lg font-bold transition-colors text-sm"
                      type="button"
                    >
                      Normal (Bağımsız) Moda Al
                    </button>
                  </div>
               </div>
            </div>
          </div>
        )
        }\1"""
code = re.sub(content_regex, content_odeal, code)

# Remove the old general settings odeal inputs to avoid confusion!
old_odeal_inputs = r"""                     <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-slate-800 rounded border border-slate-600">
                        <div className="flex-1">
                           <label className="block text-sm font-medium text-white">Ödeal Cihaz Kodu \(Device Key\)</label>
                           <p className="text-xs text-slate-400 mt-1">Ödeal POS cihazınızın cihaz kodunu giriniz \(Device2Device entegrasyonu için zorunludur\).</p>
                        </div>
                        <div className="w-full md:w-1/3">
                           <input 
                             type="text" 
                             value=\{odealDeviceKey\}
                             onChange=\{\(e\) => setOdealDeviceKey\(e\.target\.value\)\}
                             className="w-full px-3 py-2 bg-slate-900 border border-slate-500 rounded text-white focus:ring-blue-500 outline-none" 
                             placeholder="Örn: POS-01"
                           />
                        </div>
                     </div>"""
code = re.sub(old_odeal_inputs, "", code)

with open('components/SettingsView.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("SettingsView patched properly with Profile Toggle buttons")
