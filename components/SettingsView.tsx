import React, { useState, useRef } from 'react';
import { Company, ExamDefinition, HazardClass, MedicalInstitution, AppSettings } from '../types';
import { Trash2, Plus, Building2, TestTube, Save, Check, Wallet, Receipt, Upload, FileDown, AlertCircle, MapPin, Sliders, CheckSquare, Square, Image as ImageIcon, Edit2, XCircle, Database, Download, RefreshCw, AlertTriangle, CreditCard, Banknote } from 'lucide-react';
import * as XLSX from 'xlsx';
import { exportFullData, restoreFullData } from '../services/storage';

interface SettingsViewProps {
  companies: Company[];
  onAddCompany: (c: Company) => void;
  onUpdateCompany: (c: Company) => void;
  onDeleteCompany: (id: string) => void;
  onBulkDeleteCompanies: (ids: string[]) => void;
  exams: ExamDefinition[];
  onAddExam: (e: ExamDefinition) => void;
  onUpdateExam: (e: ExamDefinition) => void;
  onDeleteExam: (id: string) => void;
  institutions: MedicalInstitution[];
  onAddInstitution: (i: MedicalInstitution) => void;
  onDeleteInstitution: (id: string) => void;
  settings: AppSettings;
  onUpdateSettings: (s: AppSettings) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  companies,
  onAddCompany,
  onUpdateCompany,
  onDeleteCompany,
  onBulkDeleteCompanies,
  exams,
  onAddExam,
  onUpdateExam,
  onDeleteExam,
  institutions,
  onAddInstitution,
  onDeleteInstitution,
  settings,
  onUpdateSettings
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'companies' | 'exams' | 'institutions' | 'backup'>('general');

  // General Settings State
  const [ekgAgeLimit, setEkgAgeLimit] = useState(settings.ekgLimitAge);
  const [logo, setLogo] = useState<string | undefined>(settings.companyLogo);

  // Company Form State
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);
  const [cName, setCName] = useState('');
  const [cHazard, setCHazard] = useState<HazardClass>(HazardClass.LESS);
  const [cDoctor, setCDoctor] = useState('');
  const [cSpecialist, setCSpecialist] = useState('');
  const [cPaymentMethod, setCPaymentMethod] = useState<'CASH' | 'POS' | 'INVOICE'>('INVOICE');
  const [cSelectedExams, setCSelectedExams] = useState<string[]>([]);
  const [cPreferredInst, setCPreferredInst] = useState<string>(''); // For forced institution
  
  // Company Selection State (Bulk Delete)
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);
  
  // File Import Ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);

  // Exam Form State
  const [eName, setEName] = useState('');
  const [eCode, setECode] = useState('');
  const [ePrice, setEPrice] = useState('');
  const [eCost, setECost] = useState(''); // New Cost State

  // Institution Form State
  const [iName, setIName] = useState('');
  const [iPhone, setIPhone] = useState('');

  const toggleCompanyExam = (examName: string) => {
    setCSelectedExams(prev => 
      prev.includes(examName) ? prev.filter(e => e !== examName) : [...prev, examName]
    );
  };

  const handleUpdateGeneralSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({ 
        ...settings, 
        ekgLimitAge: ekgAgeLimit,
        companyLogo: logo 
    });
    alert("Ayarlar güncellendi.");
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2000000) { // 2MB limit
          alert("Logo dosyası 2MB'dan küçük olmalıdır.");
          return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
      setLogo(undefined);
      if(logoInputRef.current) logoInputRef.current.value = '';
  };

  // Populate form for editing
  const handleEditCompany = (company: Company) => {
    setEditingCompanyId(company.id);
    setCName(company.name);
    setCHazard(company.hazardClass);
    setCDoctor(company.assignedDoctor);
    setCSpecialist(company.assignedSpecialist);
    setCPaymentMethod(company.defaultPaymentMethod);
    setCSelectedExams(company.defaultExams);
    setCPreferredInst(company.forcedInstitutionId || '');
    // Scroll to form (simple implementation)
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingCompanyId(null);
    setCName('');
    setCDoctor('');
    setCSpecialist('');
    setCPaymentMethod('INVOICE');
    setCSelectedExams([]);
    setCPreferredInst('');
  };

  const handleCompanySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cName) return;

    if (editingCompanyId) {
      // UPDATE Existing
      const updatedCompany: Company = {
        id: editingCompanyId,
        name: cName,
        hazardClass: cHazard,
        assignedDoctor: cDoctor || 'Belirlenmedi',
        assignedSpecialist: cSpecialist || 'Belirlenmedi',
        defaultExams: cSelectedExams,
        defaultPaymentMethod: cPaymentMethod,
        forcedInstitutionId: cPreferredInst || undefined
      };
      onUpdateCompany(updatedCompany);
      handleCancelEdit(); // Reset form
    } else {
      // ADD New
      const newCompany: Company = {
        id: Math.random().toString(36).substr(2, 9),
        name: cName,
        hazardClass: cHazard,
        assignedDoctor: cDoctor || 'Belirlenmedi',
        assignedSpecialist: cSpecialist || 'Belirlenmedi',
        defaultExams: cSelectedExams,
        defaultPaymentMethod: cPaymentMethod,
        forcedInstitutionId: cPreferredInst || undefined
      };
      onAddCompany(newCompany);
      handleCancelEdit(); // Reset form using same helper
    }
  };

  const handleAddInstitution = (e: React.FormEvent) => {
    e.preventDefault();
    if(!iName) return;
    const newInst: MedicalInstitution = {
      id: Math.random().toString(36).substr(2, 9),
      name: iName,
      phone: iPhone
    };
    onAddInstitution(newInst);
    setIName('');
    setIPhone('');
  };
  
  // Bulk Delete Logic
  const handleToggleSelectCompany = (id: string) => {
    setSelectedCompanyIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllCompanies = () => {
    if (selectedCompanyIds.length === companies.length) {
      setSelectedCompanyIds([]);
    } else {
      setSelectedCompanyIds(companies.map(c => c.id));
    }
  };

  const handleBulkDelete = () => {
    if (selectedCompanyIds.length === 0) return;
    if (window.confirm(`Seçili ${selectedCompanyIds.length} firmayı silmek istediğinize emin misiniz?`)) {
      onBulkDeleteCompanies(selectedCompanyIds);
      setSelectedCompanyIds([]);
    }
  };

  // --- Bulk Import / Template Logic (Excel .xlsx) ---

  const downloadTemplate = () => {
    // Sheet 1: Firmalar (Template to fill)
    const headers = ["Firma Adı", "Tehlike Sınıfı (Az/Tehlikeli/Çok)", "Hekim Adı", "Uzman Adı", "Ödeme (Nakit/Pos/Fatura)", "Tetkik Kodları (Virgül ile)"];
    const exampleRow = ["Örnek Metal A.Ş.", "Tehlikeli", "Dr. Ahmet Yılmaz", "Uzm. Ayşe Demir", "Fatura", "101, 103, 105"];
    const wsFirmalar = XLSX.utils.aoa_to_sheet([headers, exampleRow]);
    
    wsFirmalar['!cols'] = [
      { wch: 30 }, // Firma Adı
      { wch: 25 }, // Tehlike
      { wch: 20 }, // Hekim
      { wch: 20 }, // Uzman
      { wch: 20 }, // Ödeme
      { wch: 30 }  // Tetkik Kodları
    ];

    // Sheet 2: Tetkik Referans (Read-only reference)
    const refHeaders = ["Tetkik Kodu", "Tetkik Adı", "Satış Fiyatı", "Maliyet"];
    const refRows = exams.map(e => [e.code, e.name, e.price, e.cost || 0]);
    const wsRef = XLSX.utils.aoa_to_sheet([refHeaders, ...refRows]);
    wsRef['!cols'] = [{ wch: 15 }, { wch: 30 }, { wch: 10 }, { wch: 10 }];

    // Create Workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsFirmalar, "Firma_Listesi");
    XLSX.utils.book_append_sheet(wb, wsRef, "Tetkik_Referans_Listesi");

    // Write file
    XLSX.writeFile(wb, "firma_yukleme_sablonu.xlsx");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      if (!bstr) return;

      try {
        const wb = XLSX.read(bstr, { type: 'binary' });
        
        // Use the first sheet
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        
        // Convert to JSON array
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

        let successCount = 0;

        // Skip header row
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          if (!row || row.length === 0 || !row[0]) continue;

          const name = String(row[0]).trim();
          const hazardRaw = String(row[1] || '').toLowerCase();
          const doctor = String(row[2] || 'Belirlenmedi').trim();
          const specialist = String(row[3] || 'Belirlenmedi').trim();
          const paymentRaw = String(row[4] || '').toLowerCase();
          const examCodesStr = String(row[5] || '').trim();

          // Hazard Class
          let hazard = HazardClass.LESS;
          if (hazardRaw.includes('çok') || hazardRaw.includes('cok')) hazard = HazardClass.VERY_DANGEROUS;
          else if (hazardRaw.includes('az')) hazard = HazardClass.LESS;
          else if (hazardRaw.includes('tehlikeli')) hazard = HazardClass.DANGEROUS;

          // Payment
          let payment: 'CASH' | 'POS' | 'INVOICE' = 'INVOICE';
          if (paymentRaw.includes('nakit') || paymentRaw.includes('elden') || paymentRaw.includes('kasa')) {
            payment = 'CASH';
          } else if (paymentRaw.includes('pos') || paymentRaw.includes('kredi') || paymentRaw.includes('kart')) {
            payment = 'POS';
          }

          // Process Exam Codes (e.g., "101, 105") -> Match to Exam Names
          const requestedCodes = examCodesStr.split(',').map(s => s.trim()).filter(s => s !== '');
          const matchedExams = exams
            .filter(e => requestedCodes.includes(e.code) || requestedCodes.includes(e.code.toString()))
            .map(e => e.name);

          const newComp: Company = {
            id: Math.random().toString(36).substr(2, 9),
            name: name,
            hazardClass: hazard,
            assignedDoctor: doctor,
            assignedSpecialist: specialist,
            defaultPaymentMethod: payment,
            defaultExams: matchedExams 
          };

          onAddCompany(newComp);
          successCount++;
        }

        alert(`${successCount} adet firma ve ilişkili tetkikleri başarıyla yüklendi.`);
      } catch (error) {
        console.error("Excel okuma hatası:", error);
        alert("Dosya okunurken bir hata oluştu.");
      } finally {
        if(fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.readAsBinaryString(file);
  };

  // --- End Bulk Import Logic ---

  // --- Backup & Restore Logic ---
  const handleBackup = () => {
    const jsonString = exportFullData();
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    a.download = `osgb_yedek_${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm("DİKKAT: Yedek dosyasını yüklediğinizde MEVCUT TÜM VERİLER SİLİNECEK ve yerine yedektekiler gelecektir. Devam etmek istiyor musunuz?")) {
        if(backupInputRef.current) backupInputRef.current.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        const content = event.target?.result;
        if (typeof content === 'string') {
            const success = restoreFullData(content);
            if (success) {
                alert("Yedek başarıyla yüklendi. Sayfa yenileniyor...");
                window.location.reload();
            } else {
                alert("Yedek yüklenirken bir hata oluştu. Dosya bozuk olabilir.");
            }
        }
    };
    reader.readAsText(file);
    if(backupInputRef.current) backupInputRef.current.value = '';
  };
  // --- End Backup Logic ---

  const handleAddExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eName || !ePrice || !eCode) return;
    
    // Check for duplicate code
    if(exams.some(ex => ex.code === eCode)) {
        alert("Bu tetkik kodu zaten kullanılıyor!");
        return;
    }

    const newExam: ExamDefinition = {
      id: Math.random().toString(36).substr(2, 9),
      code: eCode,
      name: eName,
      price: parseFloat(ePrice),
      cost: parseFloat(eCost) || 0
    };
    onAddExam(newExam);
    setEName('');
    setECode('');
    setEPrice('');
    setECost('');
  };

  const handleUpdateExamField = (id: string, field: keyof ExamDefinition, value: string) => {
    const exam = exams.find(e => e.id === id);
    if (exam) {
      const updated = { ...exam };
      if (field === 'price') updated.price = parseFloat(value);
      if (field === 'cost') updated.cost = parseFloat(value);
      if (field === 'code') updated.code = value;
      // Name update could be added here if needed
      onUpdateExam(updated);
    }
  };

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-sm overflow-hidden">
      <div className="flex border-b border-slate-700 overflow-x-auto">
        <button
          onClick={() => setActiveTab('general')}
          className={`px-6 py-4 text-center font-medium text-sm transition-colors whitespace-nowrap ${activeTab === 'general' ? 'bg-slate-900/50 text-blue-400 border-b-2 border-blue-500' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
        >
          Genel Ayarlar
        </button>
        <button
          onClick={() => setActiveTab('companies')}
          className={`px-6 py-4 text-center font-medium text-sm transition-colors whitespace-nowrap ${activeTab === 'companies' ? 'bg-slate-900/50 text-blue-400 border-b-2 border-blue-500' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
        >
          Firmalar
        </button>
        <button
          onClick={() => setActiveTab('institutions')}
          className={`px-6 py-4 text-center font-medium text-sm transition-colors whitespace-nowrap ${activeTab === 'institutions' ? 'bg-slate-900/50 text-blue-400 border-b-2 border-blue-500' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
        >
          Anlaşmalı Kurumlar
        </button>
        <button
          onClick={() => setActiveTab('exams')}
          className={`px-6 py-4 text-center font-medium text-sm transition-colors whitespace-nowrap ${activeTab === 'exams' ? 'bg-slate-900/50 text-blue-400 border-b-2 border-blue-500' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
        >
          Tetkikler
        </button>
        <button
          onClick={() => setActiveTab('backup')}
          className={`px-6 py-4 text-center font-medium text-sm transition-colors whitespace-nowrap ${activeTab === 'backup' ? 'bg-slate-900/50 text-emerald-400 border-b-2 border-emerald-500' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
        >
          Veri Yedekleme
        </button>
      </div>

      <div className="p-6">
        {activeTab === 'general' && (
          <div className="space-y-6">
             <div className="bg-slate-900/30 p-6 rounded-lg border border-slate-700 max-w-2xl">
                <div className="flex items-center mb-4">
                   <div className="p-2 bg-indigo-500/10 rounded mr-3">
                      <Sliders className="w-5 h-5 text-indigo-500" />
                   </div>
                   <h3 className="text-lg font-bold text-white">Sistem Parametreleri</h3>
                </div>
                
                <form onSubmit={handleUpdateGeneralSettings} className="space-y-6">
                   {/* EKG Age Limit */}
                   <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-slate-800 rounded border border-slate-600">
                      <div>
                         <label className="block text-sm font-medium text-white">EKG Zorunluluk Yaşı</label>
                         <p className="text-xs text-slate-400 mt-1">Bu yaş ve üzerindeki personel için EKG tetkiki otomatik olarak seçilir.</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input 
                          type="number" 
                          min="18"
                          max="100"
                          value={ekgAgeLimit} 
                          onChange={(e) => setEkgAgeLimit(parseInt(e.target.value) || 0)}
                          className="w-20 px-3 py-2 bg-slate-900 border border-slate-500 rounded text-white text-center font-bold focus:ring-blue-500 outline-none" 
                        />
                        <span className="text-sm text-slate-400">Yaş</span>
                      </div>
                   </div>

                   {/* Company Logo Upload */}
                   <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 p-4 bg-slate-800 rounded border border-slate-600">
                      <div className="flex-1">
                         <label className="block text-sm font-medium text-white">Firma Logosu</label>
                         <p className="text-xs text-slate-400 mt-1">Bu logo Z raporu çıktısında ve sol menüde kullanılacaktır.</p>
                      </div>
                      <div className="flex flex-col items-center">
                          <div className="w-32 h-32 border-2 border-dashed border-slate-600 rounded-lg flex items-center justify-center bg-slate-900 overflow-hidden relative group">
                             {logo ? (
                                <img src={logo} alt="Logo Preview" className="w-full h-full object-contain p-2" />
                             ) : (
                                <ImageIcon className="w-8 h-8 text-slate-600" />
                             )}
                             <input 
                               type="file" 
                               accept="image/*" 
                               className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                               onChange={handleLogoUpload}
                               ref={logoInputRef}
                             />
                             {!logo && <div className="absolute bottom-2 text-[10px] text-slate-500">Yükle</div>}
                          </div>
                          
                          {logo && (
                             <button 
                               type="button" 
                               onClick={handleRemoveLogo}
                               className="mt-2 text-xs text-red-400 hover:text-red-300 flex items-center"
                             >
                                <Trash2 className="w-3 h-3 mr-1" />
                                Kaldır
                             </button>
                          )}
                      </div>
                   </div>

                   <div className="flex justify-end pt-2">
                      <button type="submit" className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-colors shadow-lg shadow-blue-900/20">
                         <Save className="w-4 h-4" />
                         <span>Ayarları Kaydet</span>
                      </button>
                   </div>
                </form>
             </div>
          </div>
        )}

        {activeTab === 'backup' && (
            <div className="space-y-6">
                <div className="bg-slate-900/30 p-6 rounded-lg border border-slate-700">
                    <div className="flex items-center mb-6">
                        <div className="p-3 bg-emerald-500/10 rounded-lg mr-4">
                            <Database className="w-8 h-8 text-emerald-500" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">Sistem Yedekleme ve Geri Yükleme</h3>
                            <p className="text-sm text-slate-400">Firmaları, sevk kayıtlarını ve kasa hareketlerini başka bilgisayara taşımak için bu alanı kullanın.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Yedek Alma */}
                        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 flex flex-col items-center text-center hover:border-blue-500 transition-colors">
                            <Download className="w-12 h-12 text-blue-500 mb-4" />
                            <h4 className="text-lg font-bold text-white mb-2">Yedek Al (Export)</h4>
                            <p className="text-sm text-slate-400 mb-6">Tüm verileri (Firmalar, Sevkler, Kasa, Ayarlar) tek bir dosya (.json) olarak bilgisayarınıza indirin.</p>
                            <button 
                                onClick={() => handleBackup()}
                                className="mt-auto flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-bold shadow-lg shadow-blue-900/20 transition-all active:scale-95"
                            >
                                <FileDown className="w-5 h-5" />
                                <span>Yedeği Bilgisayara İndir</span>
                            </button>
                        </div>

                        {/* Yedek Yükleme */}
                        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 flex flex-col items-center text-center hover:border-orange-500 transition-colors">
                            <RefreshCw className="w-12 h-12 text-orange-500 mb-4" />
                            <h4 className="text-lg font-bold text-white mb-2">Yedek Yükle (Import)</h4>
                            <p className="text-sm text-slate-400 mb-2">Daha önce alınan .json uzantılı yedek dosyasını seçerek verileri geri yükleyin.</p>
                            
                            <div className="bg-orange-500/10 border border-orange-500/20 p-3 rounded-lg mb-6 flex items-start text-left">
                                <AlertTriangle className="w-5 h-5 text-orange-500 mr-2 shrink-0 mt-0.5" />
                                <span className="text-xs text-orange-200">
                                    <strong>DİKKAT:</strong> Yedek yükleme işlemi, şu anki tüm verileri siler ve üzerine yazar. Bu işlem geri alınamaz.
                                </span>
                            </div>

                            <label className="mt-auto cursor-pointer flex items-center space-x-2 bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg font-bold border border-slate-600 transition-all active:scale-95">
                                <Upload className="w-5 h-5" />
                                <span>Yedek Dosyasını Seç ve Yükle</span>
                                <input 
                                    type="file" 
                                    accept=".json"
                                    ref={backupInputRef}
                                    onChange={handleRestore}
                                    className="hidden" 
                                />
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'companies' && (
          <div className="space-y-8">
            
            {/* Bulk Import Section */}
            {!editingCompanyId && (
                <div className="bg-slate-900/50 p-4 rounded-lg border border-dashed border-slate-600 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-emerald-500/10 rounded">
                    <Upload className="w-6 h-6 text-emerald-500" />
                    </div>
                    <div>
                        <h5 className="text-sm font-bold text-white">Toplu Firma Yükleme (Excel)</h5>
                        <p className="text-xs text-slate-400">Şablonu indirin, <strong>2. Sayfadaki tetkik kodlarına bakarak</strong> doldurun ve yükleyin.</p>
                    </div>
                </div>
                <div className="flex space-x-3">
                    <button 
                    onClick={downloadTemplate}
                    type="button"
                    className="flex items-center space-x-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-xs text-slate-300 transition-colors"
                    >
                        <FileDown className="w-4 h-4" />
                        <span>Şablon (Kodlu) İndir</span>
                    </button>
                    <label className="flex items-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium cursor-pointer transition-colors shadow-lg shadow-blue-900/20">
                        <Upload className="w-4 h-4" />
                        <span>Excel Yükle</span>
                        <input 
                        type="file" 
                        accept=".xlsx, .xls" 
                        className="hidden" 
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        />
                    </label>
                </div>
                </div>
            )}

            {/* Add/Edit Company Form */}
            <form onSubmit={handleCompanySubmit} className={`bg-slate-900/30 p-4 rounded-lg border ${editingCompanyId ? 'border-orange-500/50 shadow-lg shadow-orange-900/20' : 'border-slate-700'} space-y-4 transition-all duration-300`}>
              <h4 className={`text-sm font-bold flex items-center ${editingCompanyId ? 'text-orange-400' : 'text-white'}`}>
                {editingCompanyId ? <Edit2 className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />} 
                {editingCompanyId ? 'Firma Bilgilerini Düzenle' : 'Tek Firma Ekle'}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input required placeholder="Firma Adı" value={cName} onChange={e => setCName(e.target.value)} className="bg-slate-800 border-slate-600 rounded px-3 py-2 text-white text-sm focus:ring-blue-500 outline-none" />
                <select value={cHazard} onChange={e => setCHazard(e.target.value as HazardClass)} className="bg-slate-800 border-slate-600 rounded px-3 py-2 text-white text-sm outline-none">
                  {Object.values(HazardClass).map(h => <option key={h} value={h}>{h}</option>)}
                </select>
                <input placeholder="İşyeri Hekimi" value={cDoctor} onChange={e => setCDoctor(e.target.value)} className="bg-slate-800 border-slate-600 rounded px-3 py-2 text-white text-sm focus:ring-blue-500 outline-none" />
                <input placeholder="İSG Uzmanı" value={cSpecialist} onChange={e => setCSpecialist(e.target.value)} className="bg-slate-800 border-slate-600 rounded px-3 py-2 text-white text-sm focus:ring-blue-500 outline-none" />
                
                {/* Forced Institution Dropdown */}
                <select 
                  value={cPreferredInst} 
                  onChange={e => setCPreferredInst(e.target.value)} 
                  className="bg-slate-800 border-slate-600 rounded px-3 py-2 text-white text-sm outline-none"
                >
                    <option value="">Anlaşmalı Kurum (Seçiniz)</option>
                    <option value="">Serbest (İstenilen yere gidebilir)</option>
                    {institutions.map(inst => (
                      <option key={inst.id} value={inst.id}>{inst.name}</option>
                    ))}
                </select>

                {/* Payment Method Selector */}
                <div className="flex space-x-2">
                   <button 
                    type="button"
                    onClick={() => setCPaymentMethod('INVOICE')}
                    className={`flex-1 py-2 rounded text-sm font-medium border flex items-center justify-center space-x-2 transition-all ${cPaymentMethod === 'INVOICE' ? 'bg-blue-600/20 border-blue-500 text-blue-200' : 'bg-slate-800 border-slate-600 text-slate-400'}`}
                   >
                     <Receipt className="w-4 h-4" />
                     <span>Fatura</span>
                   </button>
                   <button 
                    type="button"
                    onClick={() => setCPaymentMethod('CASH')}
                    className={`flex-1 py-2 rounded text-sm font-medium border flex items-center justify-center space-x-2 transition-all ${cPaymentMethod === 'CASH' ? 'bg-emerald-600/20 border-emerald-500 text-emerald-200' : 'bg-slate-800 border-slate-600 text-slate-400'}`}
                   >
                     <Banknote className="w-4 h-4" />
                     <span>Nakit</span>
                   </button>
                   <button 
                    type="button"
                    onClick={() => setCPaymentMethod('POS')}
                    className={`flex-1 py-2 rounded text-sm font-medium border flex items-center justify-center space-x-2 transition-all ${cPaymentMethod === 'POS' ? 'bg-purple-600/20 border-purple-500 text-purple-200' : 'bg-slate-800 border-slate-600 text-slate-400'}`}
                   >
                     <CreditCard className="w-4 h-4" />
                     <span>Pos</span>
                   </button>
                </div>
              </div>

              {/* Exam Selection for Company */}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Firma Standart Tetkikleri</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                   {exams.map(exam => (
                     <div 
                      key={exam.id}
                      onClick={() => toggleCompanyExam(exam.name)}
                      className={`cursor-pointer px-3 py-2 rounded border flex items-center justify-between transition-all ${cSelectedExams.includes(exam.name) ? 'bg-blue-600/20 border-blue-500 text-blue-200' : 'bg-slate-800 border-slate-600 text-slate-400 hover:bg-slate-700'}`}
                     >
                       <span className="text-xs truncate mr-2">{exam.name}</span>
                       {cSelectedExams.includes(exam.name) && <Check className="w-3 h-3 text-blue-400" />}
                     </div>
                   ))}
                </div>
              </div>

              {/* Save / Cancel Buttons */}
              <div className="flex justify-end space-x-3">
                {editingCompanyId && (
                    <button 
                        type="button" 
                        onClick={handleCancelEdit}
                        className="bg-slate-700 hover:bg-slate-600 text-slate-300 px-4 py-2 rounded text-sm flex items-center"
                    >
                        <XCircle className="w-4 h-4 mr-1" /> Vazgeç
                    </button>
                )}
                <button 
                    type="submit" 
                    className={`${editingCompanyId ? 'bg-orange-600 hover:bg-orange-500' : 'bg-blue-600 hover:bg-blue-500'} text-white px-6 py-2 rounded text-sm font-bold shadow-lg transition-colors flex items-center`}
                >
                    {editingCompanyId ? <Save className="w-4 h-4 mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
                    {editingCompanyId ? 'Güncelle' : 'Ekle'}
                </button>
              </div>
            </form>

            {/* Company List Controls & Headers */}
            <div className="flex items-center justify-between">
               <div className="flex items-center space-x-3">
                 <button 
                   onClick={handleSelectAllCompanies}
                   className="flex items-center space-x-2 text-sm text-slate-400 hover:text-white transition-colors"
                 >
                    {selectedCompanyIds.length > 0 && selectedCompanyIds.length === companies.length ? (
                       <CheckSquare className="w-4 h-4 text-blue-500" />
                    ) : (
                       <Square className="w-4 h-4" />
                    )}
                    <span>Tümünü Seç</span>
                 </button>
                 <span className="text-sm text-slate-400">| Toplam {companies.length} Firma</span>
               </div>
               
               {selectedCompanyIds.length > 0 && (
                 <button 
                   onClick={handleBulkDelete}
                   className="flex items-center space-x-2 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/40 border border-red-500/30 text-red-400 rounded text-xs font-bold transition-all animate-pulse"
                 >
                   <Trash2 className="w-3.5 h-3.5" />
                   <span>Seçilenleri Sil ({selectedCompanyIds.length})</span>
                 </button>
               )}
            </div>

            {/* Company List */}
            <div className="space-y-3">
              {companies.map(company => (
                <div key={company.id} className={`flex flex-col md:flex-row items-start md:items-center justify-between p-4 border rounded-lg gap-4 transition-all ${selectedCompanyIds.includes(company.id) ? 'bg-blue-900/10 border-blue-500/50' : 'bg-slate-700/30 border-slate-700'}`}>
                  <div className="flex items-center space-x-4 w-full md:w-auto">
                    {/* Checkbox */}
                    <div 
                      onClick={(e) => { e.stopPropagation(); handleToggleSelectCompany(company.id); }}
                      className="cursor-pointer text-slate-500 hover:text-blue-500"
                    >
                       {selectedCompanyIds.includes(company.id) ? <CheckSquare className="w-5 h-5 text-blue-500" /> : <Square className="w-5 h-5" />}
                    </div>

                    <div className="p-2 bg-slate-800 rounded hidden md:block">
                      <Building2 className="w-5 h-5 text-slate-400" />
                    </div>
                    
                    <div>
                      <h5 className="font-medium text-white flex items-center">
                        {company.name}
                        {company.defaultPaymentMethod === 'CASH' ? (
                          <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-emerald-900/30 text-emerald-400 border border-emerald-500/20 rounded uppercase">Nakit</span>
                        ) : company.defaultPaymentMethod === 'POS' ? (
                          <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-purple-900/30 text-purple-400 border border-purple-500/20 rounded uppercase">Pos</span>
                        ) : (
                          <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-blue-900/30 text-blue-400 border border-blue-500/20 rounded uppercase">Fatura</span>
                        )}
                        {company.forcedInstitutionId && (
                           <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-purple-900/30 text-purple-400 border border-purple-500/20 rounded uppercase flex items-center">
                             <MapPin className="w-3 h-3 mr-1" />
                             {institutions.find(i => i.id === company.forcedInstitutionId)?.name || 'Kurum'}
                           </span>
                        )}
                      </h5>
                      <p className="text-xs text-slate-400">{company.assignedDoctor} • {company.assignedSpecialist}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {company.defaultExams.map((ex, i) => (
                           <span key={i} className="text-[10px] px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded border border-slate-600">{ex}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
                    <span className="text-xs bg-slate-800 px-2 py-1 rounded border border-slate-600 text-slate-300 mr-2">{company.hazardClass}</span>
                    <button 
                        onClick={() => handleEditCompany(company)} 
                        className="text-slate-500 hover:text-blue-400 p-1.5 hover:bg-blue-500/10 rounded transition-colors"
                        title="Düzenle"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={() => onDeleteCompany(company.id)} 
                        className="text-slate-500 hover:text-red-400 p-1.5 hover:bg-red-500/10 rounded transition-colors"
                        title="Sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'institutions' && (
          <div className="space-y-8">
             <form onSubmit={handleAddInstitution} className="bg-slate-900/30 p-4 rounded-lg border border-slate-700 space-y-4">
                <h4 className="text-sm font-bold text-white flex items-center">
                  <Plus className="w-4 h-4 mr-2" /> Sağlık Kurumu Ekle
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <input required placeholder="Kurum Adı (Örn: Merkez Hastanesi)" value={iName} onChange={e => setIName(e.target.value)} className="bg-slate-800 border-slate-600 rounded px-3 py-2 text-white text-sm focus:ring-blue-500 outline-none" />
                   <input placeholder="Telefon / İletişim" value={iPhone} onChange={e => setIPhone(e.target.value)} className="bg-slate-800 border-slate-600 rounded px-3 py-2 text-white text-sm focus:ring-blue-500 outline-none" />
                </div>
                <div className="flex justify-end">
                  <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-sm">Ekle</button>
                </div>
             </form>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {institutions.map(inst => (
                 <div key={inst.id} className="flex items-center justify-between p-4 bg-slate-700/30 border border-slate-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                       <div className="p-2 bg-purple-500/10 rounded">
                         <MapPin className="w-5 h-5 text-purple-500" />
                       </div>
                       <div>
                         <h5 className="font-medium text-white text-sm">{inst.name}</h5>
                         <p className="text-xs text-slate-400">{inst.phone}</p>
                       </div>
                    </div>
                    <button onClick={() => onDeleteInstitution(inst.id)} className="text-slate-500 hover:text-red-400 p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                 </div>
               ))}
               {institutions.length === 0 && <p className="text-slate-500 text-sm col-span-2 text-center py-4">Kayıtlı kurum bulunamadı.</p>}
             </div>
          </div>
        )}

        {activeTab === 'exams' && (
          <div className="space-y-8">
            {/* Add Exam Form */}
            <form onSubmit={handleAddExam} className="bg-slate-900/30 p-4 rounded-lg border border-slate-700 space-y-4">
              <h4 className="text-sm font-bold text-white flex items-center">
                <Plus className="w-4 h-4 mr-2" /> Yeni Tetkik Ekle
              </h4>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="w-full md:w-24">
                   <input required placeholder="Kod (101)" value={eCode} onChange={e => setECode(e.target.value)} className="w-full bg-slate-800 border-slate-600 rounded px-3 py-2 text-white text-sm focus:ring-blue-500 outline-none" />
                </div>
                <input required placeholder="Tetkik Adı (Örn: Portör)" value={eName} onChange={e => setEName(e.target.value)} className="flex-1 bg-slate-800 border-slate-600 rounded px-3 py-2 text-white text-sm focus:ring-blue-500 outline-none" />
                <input required type="number" placeholder="Satış (TL)" value={ePrice} onChange={e => setEPrice(e.target.value)} className="w-full md:w-32 bg-slate-800 border-slate-600 rounded px-3 py-2 text-white text-sm focus:ring-blue-500 outline-none" />
                <input type="number" placeholder="Maliyet (TL)" value={eCost} onChange={e => setECost(e.target.value)} className="w-full md:w-32 bg-slate-800 border-slate-600 rounded px-3 py-2 text-white text-sm focus:ring-blue-500 outline-none" />
                <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-sm whitespace-nowrap">Ekle</button>
              </div>
            </form>

            {/* Exam List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {exams.map(exam => (
                <div key={exam.id} className="flex items-center justify-between p-4 bg-slate-700/30 border border-slate-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="px-2 py-1 bg-slate-800 rounded border border-slate-600 text-xs text-blue-400 font-mono">
                       {exam.code}
                    </div>
                    <div>
                       <span className="font-medium text-white text-sm block">{exam.name}</span>
                       <span className="text-[10px] text-slate-500 block">Maliyet: {exam.cost ? `₺${exam.cost}` : '-'}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex flex-col space-y-1 items-end">
                        <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 text-[10px]">Satış ₺</span>
                        <input 
                            type="number" 
                            defaultValue={exam.price} 
                            onBlur={(e) => handleUpdateExamField(exam.id, 'price', e.target.value)}
                            className="w-20 pl-8 pr-2 py-1 bg-slate-800 border border-slate-600 rounded text-xs text-white text-right focus:border-blue-500 outline-none"
                        />
                        </div>
                        <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-red-500/50 text-[10px]">Mal. ₺</span>
                        <input 
                            type="number" 
                            defaultValue={exam.cost || 0} 
                            onBlur={(e) => handleUpdateExamField(exam.id, 'cost', e.target.value)}
                            className="w-20 pl-8 pr-2 py-1 bg-slate-800 border border-slate-600 rounded text-xs text-slate-400 text-right focus:border-red-500 outline-none"
                        />
                        </div>
                    </div>
                    
                    <button onClick={() => onDeleteExam(exam.id)} className="text-slate-500 hover:text-red-400 p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};