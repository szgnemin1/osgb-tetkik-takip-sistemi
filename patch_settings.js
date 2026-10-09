const fs = require('fs');

let code = fs.readFileSync('components/SettingsView.tsx', 'utf8');

// 1. Add 'odeal' to the union type of activeTab
code = code.replace(
  "const [activeTab, setActiveTab] = useState<'general' | 'companies' | 'exams' | 'institutions' | 'backup' | 'update'>('general');",
  "const [activeTab, setActiveTab] = useState<'general' | 'companies' | 'exams' | 'institutions' | 'backup' | 'update' | 'odeal'>('general');"
);

// 2. Add Odeal States
const stateAnchor = "const [odealDeviceKey, setOdealDeviceKey] = useState(settings.odealDeviceKey || '');";
const newStates = `const [odealDeviceKey, setOdealDeviceKey] = useState(settings.odealDeviceKey || '');
  const [odealEnabled, setOdealEnabled] = useState(settings.odealEnabled ?? true);
  const [odealMerchantKey, setOdealMerchantKey] = useState(settings.odealMerchantKey || '');
  const [odealSecretKey, setOdealSecretKey] = useState(settings.odealSecretKey || '');`;
code = code.replace(stateAnchor, newStates);

// 3. Add handleSaveOdealSettings function
const saveFuncAnchor = "const handleUpdateGeneralSettings = (e: React.FormEvent) => {";
const saveOdealFunc = `const handleSaveOdealSettings = async (e: React.FormEvent) => {
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

  ` + saveFuncAnchor;
code = code.replace(saveFuncAnchor, saveOdealFunc);

// 4. Add Button to Tab Bar
const buttonAnchor = `          <button
            onClick={() => setActiveTab('update')}`;
const odealTabButton = `          <button
            onClick={() => setActiveTab('odeal')}
            className={\`px-6 py-4 text-center font-medium text-sm transition-colors whitespace-nowrap \${activeTab === 'odeal' ? 'bg-slate-900/50 text-blue-400 border-b-2 border-blue-500' : 'text-slate-400 hover:text-white hover:bg-slate-700'}\`}
          >
            Ödeal POS
          </button>
` + buttonAnchor;
code = code.replace(buttonAnchor, odealTabButton);

// 5. Add Odeal Tab Content
const contentAnchor = `        {activeTab === 'update' && (`;
const odealTabContent = `        {activeTab === 'odeal' && (
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

               {/* Instructions */}
               <div className="mt-8 p-5 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <h4 className="text-blue-400 font-bold mb-3 flex items-center">
                    <span className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center mr-2 text-sm">i</span>
                    Cihazı D2D (Entegrasyon) Moduna Alma ve Çıkarma
                  </h4>
                  <ul className="text-sm text-blue-100/80 space-y-3 list-disc pl-5">
                    <li>Sistemin otomatik olarak cihazdan kart çekebilmesi için cihazın <b>D2D</b> modunda olması gerekir.</li>
                    <li><strong className="text-white">D2D (Entegrasyon) Moduna Almak İçin:</strong> Fiziki POS cihazı üzerinden <i>Ödeal Uygulaması &gt; Ayarlar &gt; Entegrasyon Tipi &gt; D2D</i> seçeneğini işaretleyin.</li>
                    <li><strong className="text-white">Eski Haline (Bağımsız Mod) Almak İçin:</strong> Cihazı normal, elle tutar girilecek şekilde kullanmak isterseniz yine cihaz üzerinden <i>Ödeal Uygulaması &gt; Ayarlar &gt; Entegrasyon Tipi &gt; Standalone (Bağımsız)</i> seçeneğini seçmelisiniz.</li>
                  </ul>
               </div>
            </div>
          </div>
        )}

` + contentAnchor;
code = code.replace(contentAnchor, odealTabContent);

// 6. Fix types in App.tsx / useServerData (not strictly required since it's JS at runtime, but good to ensure interface AppSettings has these fields if defined)
fs.writeFileSync('components/SettingsView.tsx', code, 'utf8');
console.log('SettingsView patched for Odeal POS tab.');
