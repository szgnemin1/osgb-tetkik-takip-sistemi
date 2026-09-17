const fs = require('fs');
let code = fs.readFileSync('components/SettingsView.tsx', 'utf8');

code = code.replace(/const \[iLocationUrl, setILocationUrl\] = useState\(''\);/, `const [iLocationUrl, setILocationUrl] = useState('');
  const [iSendWhatsapp, setISendWhatsapp] = useState(false);
  const [iWhatsappTemplate, setIWhatsappTemplate] = useState('Sayın {hasta_adi}, {kurum_adi} kurumuna sevkiniz oluşturulmuştur. Konum: {konum_linki}');`);

code = code.replace(/setILocationUrl\(''\);/g, `setILocationUrl('');
    setISendWhatsapp(false);
    setIWhatsappTemplate('Sayın {hasta_adi}, {kurum_adi} kurumuna sevkiniz oluşturulmuştur. Konum: {konum_linki}');`);

code = code.replace(/setILocationUrl\(inst\.locationUrl \|\| ''\);/, `setILocationUrl(inst.locationUrl || '');
    setISendWhatsapp(inst.sendWhatsapp || false);
    setIWhatsappTemplate(inst.whatsappTemplate || 'Sayın {hasta_adi}, {kurum_adi} kurumuna sevkiniz oluşturulmuştur. Konum: {konum_linki}');`);

code = code.replace(/id: editingInstitutionId,/, `id: editingInstitutionId,
        sendWhatsapp: iSendWhatsapp,
        whatsappTemplate: iWhatsappTemplate,`);

code = code.replace(/id: Math\.random\(\)\.toString\(36\)\.substr\(2, 9\),/, `id: Math.random().toString(36).substr(2, 9),
        sendWhatsapp: iSendWhatsapp,
        whatsappTemplate: iWhatsappTemplate,`);

code = code.replace(/<input placeholder="Konum Linki \(Google Maps vb\.\)" value=\{iLocationUrl\} onChange=\{e => setILocationUrl\(e\.target\.value\)\} className="bg-slate-800 border-slate-600 rounded px-3 py-2 text-white text-sm focus:ring-blue-500 outline-none" \/>/, `<input placeholder="Konum Linki (Google Maps vb.)" value={iLocationUrl} onChange={e => setILocationUrl(e.target.value)} className="bg-slate-800 border-slate-600 rounded px-3 py-2 text-white text-sm focus:ring-blue-500 outline-none" />
                   
                   <div className="md:col-span-2 mt-4 space-y-3 border-t border-slate-700/50 pt-4">
                     <label className="flex items-center space-x-2 cursor-pointer bg-slate-900/50 p-3 rounded-lg border border-slate-700 hover:bg-slate-800 transition-colors">
                       <input 
                         type="checkbox" 
                         checked={iSendWhatsapp}
                         onChange={(e) => setISendWhatsapp(e.target.checked)}
                         className="w-4 h-4 rounded border-slate-600 text-blue-600 focus:ring-blue-500 bg-slate-800"
                       />
                       <div className="flex flex-col">
                         <span className="text-sm font-bold text-slate-200">Personel Telefonuna WhatsApp Mesajı Gönder (Web)</span>
                         <span className="text-xs text-slate-400">Bu kurum seçilip sevk kaydedildiğinde, doğrudan WhatsApp Web'e yönlendirerek konum ve sevk bilgisini atmaya yarar.</span>
                       </div>
                     </label>
                     
                     {iSendWhatsapp && (
                       <div className="pl-6">
                         <label className="text-[10px] text-slate-400 uppercase font-bold mb-1 block">WhatsApp Mesaj Taslağı</label>
                         <textarea 
                           value={iWhatsappTemplate}
                           onChange={(e) => setIWhatsappTemplate(e.target.value)}
                           className="w-full bg-slate-800 border-slate-600 rounded px-3 py-2 text-slate-200 text-sm focus:ring-blue-500 outline-none min-h-[80px]"
                           placeholder="Değişkenler: {hasta_adi}, {kurum_adi}, {konum_linki}"
                         />
                         <p className="text-xs text-slate-500 mt-1">Kullanılabilecek Değişkenler: <strong>{'{hasta_adi}'}</strong>, <strong>{'{kurum_adi}'}</strong>, <strong>{'{konum_linki}'}</strong></p>
                       </div>
                     )}
                   </div>`);

fs.writeFileSync('components/SettingsView.tsx', code);
