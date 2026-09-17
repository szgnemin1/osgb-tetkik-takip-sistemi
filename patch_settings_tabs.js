const fs = require('fs');
let code = fs.readFileSync('components/SettingsView.tsx', 'utf8');

// 1. Add 'whatsapp' to tabs
code = code.replace(/<button\n\s*onClick=\{\(\) => setActiveTab\('institutions'\)\}/, `<button
          onClick={() => setActiveTab('whatsapp')}
          className={\`px-6 py-4 text-center font-medium text-sm transition-colors whitespace-nowrap \${activeTab === 'whatsapp' ? 'bg-slate-900/50 text-blue-400 border-b-2 border-blue-500' : 'text-slate-400 hover:text-white hover:bg-slate-700'}\`}
        >
          WhatsApp Web
        </button>
        <button
          onClick={() => setActiveTab('institutions')}`);


// 2. Add whatsapp connection states
code = code.replace(/const \[activeTab, setActiveTab\] = useState\('general'\);/, `const [activeTab, setActiveTab] = useState('general');
  const [waReady, setWaReady] = useState(false);
  const [waQr, setWaQr] = useState('');
  const [waLoading, setWaLoading] = useState(false);
  
  const checkWaStatus = async () => {
      try {
          const res = await fetch('/api/whatsapp/status', {
              headers: { 'Authorization': \`Bearer \${sessionStorage.getItem('api_token')}\` }
          });
          const data = await res.json();
          setWaReady(data.ready);
          setWaQr(data.qr);
      } catch (err) {
          console.error(err);
      }
  };

  useEffect(() => {
      if (activeTab === 'whatsapp') {
          checkWaStatus();
          const interval = setInterval(checkWaStatus, 3000);
          return () => clearInterval(interval);
      }
  }, [activeTab]);
  
  const handleWaLogout = async () => {
      try {
          await fetch('/api/whatsapp/logout', {
              method: 'POST',
              headers: { 'Authorization': \`Bearer \${sessionStorage.getItem('api_token')}\` }
          });
          checkWaStatus();
      } catch (err) {}
  };
`);

// 3. Render whatsapp tab
const waTabRender = `
        {activeTab === 'whatsapp' && (
          <div className="space-y-6 max-w-2xl">
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-sm">
               <div className="flex items-center space-x-3 mb-6">
                 <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500">
                    <Smartphone className="w-6 h-6" />
                 </div>
                 <div>
                    <h3 className="text-lg font-bold text-white">WhatsApp Web Bağlantısı</h3>
                    <p className="text-sm text-slate-400">Sistemin arka planda otomatik mesaj gönderebilmesi için telefonunuzu bağlayın.</p>
                 </div>
               </div>
               
               <div className="bg-slate-950 p-6 rounded-lg border border-slate-800 text-center flex flex-col items-center">
                  {waReady ? (
                      <div className="space-y-4">
                          <div className="w-20 h-20 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
                              <Check className="w-10 h-10" />
                          </div>
                          <h4 className="text-xl font-bold text-emerald-400">WhatsApp Bağlı</h4>
                          <p className="text-slate-400 text-sm">Sistem aktif olarak mesaj gönderebilir durumda.</p>
                          <button onClick={handleWaLogout} className="mt-4 px-6 py-2 bg-red-600/20 text-red-500 hover:bg-red-600/30 rounded-lg font-medium transition-colors">
                              Bağlantıyı Kes
                          </button>
                      </div>
                  ) : waQr ? (
                      <div className="space-y-4">
                          <h4 className="text-md font-bold text-white">QR Kodu Okutun</h4>
                          <p className="text-slate-400 text-sm max-w-sm mx-auto">WhatsApp uygulamasını açın, "Bağlı Cihazlar" menüsünden "Cihaz Bağla" diyerek bu QR kodu okutun.</p>
                          <div className="p-4 bg-white rounded-xl inline-block mt-4">
                              <QRCodeSVG value={waQr} size={250} level="H" />
                          </div>
                      </div>
                  ) : (
                      <div className="space-y-4">
                          <div className="w-12 h-12 border-4 border-slate-700 border-t-emerald-500 rounded-full animate-spin mx-auto"></div>
                          <p className="text-slate-400">WhatsApp başlatılıyor veya QR kod bekleniyor...</p>
                      </div>
                  )}
               </div>
            </div>
          </div>
        )}
`;

code = code.replace(/\{activeTab === 'institutions' && \(/, `${waTabRender}\n        {activeTab === 'institutions' && (`);

fs.writeFileSync('components/SettingsView.tsx', code);
