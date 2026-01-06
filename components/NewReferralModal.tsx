import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ArrowLeft, Building2, User, Activity, Stethoscope, ShieldCheck, Wallet, Receipt, Save, Search, Check, ChevronDown, X, Info, Plus, MapPin, Hash, Lock, Calendar, Trash2, AlertCircle, ArrowDown } from 'lucide-react';
import { Referral, Status, Company, HazardClass, ExamDefinition, MedicalInstitution, AppSettings } from '../types';

interface NewReferralViewProps {
  onClose: () => void;
  onSubmit: (referral: Referral) => void;
  companies: Company[];
  exams: ExamDefinition[];
  institutions: MedicalInstitution[];
  settings: AppSettings;
}

export const NewReferralView: React.FC<NewReferralViewProps> = ({ onClose, onSubmit, companies, exams, institutions, settings }) => {
  // --- STATE MANAGEMENT ---
  
  // Personel State
  const [fullName, setFullName] = useState('');
  const [tcNo, setTcNo] = useState('');
  const [birthDate, setBirthDate] = useState('');
  
  // Company Search State
  const [companySearchTerm, setCompanySearchTerm] = useState('');
  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);
  const [selectedCompanyData, setSelectedCompanyData] = useState<Company | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Institution & Exam State
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string>('');
  const [isInstitutionLocked, setIsInstitutionLocked] = useState(false);
  const [examSearchTerm, setExamSearchTerm] = useState('');
  const [selectedExamIds, setSelectedExamIds] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  
  // Financial State
  const [estimatedPrice, setEstimatedPrice] = useState(0);
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'INVOICE'>('INVOICE');

  // --- LOGIC & EFFECTS ---

  // Validation
  const isStep1Complete = selectedCompanyData !== null;
  const isFormValid = fullName.length >= 3 && tcNo.length === 11 && birthDate !== '' && selectedCompanyData !== null;

  // Age Calculation
  const patientAge = useMemo(() => {
     if(!birthDate) return 0;
     const today = new Date();
     const birth = new Date(birthDate);
     let age = today.getFullYear() - birth.getFullYear();
     const m = today.getMonth() - birth.getMonth();
     if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
     }
     return age;
  }, [birthDate]);

  // Mandatory EKG
  const isEkgMandatory = patientAge >= settings.ekgLimitAge;

  useEffect(() => {
     if (isEkgMandatory) {
        const ekgExamName = 'EKG';
        if (!selectedExamIds.includes(ekgExamName)) {
            setSelectedExamIds(prev => [...prev, ekgExamName]);
        }
     }
  }, [isEkgMandatory, selectedExamIds]);

  // Search Filters
  const filteredCompanies = companies.filter(c => 
    c.name.toLowerCase().includes(companySearchTerm.toLowerCase())
  );
  
  const filteredExams = exams.filter(e => 
    e.name.toLowerCase().includes(examSearchTerm.toLowerCase())
  );

  // Dropdown Click Outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCompanyDropdownOpen(false);
        if (selectedCompanyData) setCompanySearchTerm(selectedCompanyData.name);
        else setCompanySearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedCompanyData]);

  // Price Calculation
  useEffect(() => {
    let totalPrice = 0;
    let totalCost = 0;
    selectedExamIds.forEach(id => {
      const exam = exams.find(e => e.name === id);
      if (exam) {
        totalPrice += exam.price;
        totalCost += (exam.cost || 0);
      }
    });
    setEstimatedPrice(totalPrice);
    setEstimatedCost(totalCost);
  }, [selectedExamIds, exams]);

  // Handlers
  const handleSelectCompany = (company: Company) => {
      setSelectedCompanyData(company);
      setCompanySearchTerm(company.name);
      setIsCompanyDropdownOpen(false);
      
      // Load Defaults
      setSelectedExamIds(company.defaultExams);
      
      // Set Payment Method based on Company Settings (LOCKED)
      setPaymentMethod(company.defaultPaymentMethod || 'INVOICE');
      
      // Handle Institution Logic
      if (company.forcedInstitutionId) {
          setSelectedInstitutionId(company.forcedInstitutionId);
          setIsInstitutionLocked(true);
      } else {
          setSelectedInstitutionId('');
          setIsInstitutionLocked(false);
      }
  };

  const handleClearCompany = () => {
      setSelectedCompanyData(null);
      setCompanySearchTerm('');
      setSelectedExamIds([]);
      setSelectedInstitutionId('');
      setIsInstitutionLocked(false);
  };

  const toggleExam = (examName: string) => {
    if (isEkgMandatory && examName === 'EKG') return;
    setSelectedExamIds(prev => 
      prev.includes(examName) ? prev.filter(e => e !== examName) : [...prev, examName]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    const newReferral: Referral = {
      id: Math.random().toString(36).substr(2, 9),
      employee: {
        id: Math.random().toString(36).substr(2, 9),
        fullName,
        tcNo,
        birthDate,
        company: selectedCompanyData!.name
      },
      exams: selectedExamIds,
      status: Status.PENDING,
      referralDate: new Date().toISOString(),
      notes,
      doctorName: selectedCompanyData!.assignedDoctor,
      specialistName: selectedCompanyData!.assignedSpecialist,
      totalPrice: estimatedPrice,
      totalCost: estimatedCost,
      paymentMethod: paymentMethod,
      targetInstitutionId: selectedInstitutionId || undefined
    };
    onSubmit(newReferral);
  };

  const getHazardBadge = (hazard: HazardClass) => {
    const styles = {
        [HazardClass.VERY_DANGEROUS]: 'bg-red-500 text-white',
        [HazardClass.DANGEROUS]: 'bg-orange-500 text-white',
        [HazardClass.LESS]: 'bg-emerald-500 text-white'
    };
    return (
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${styles[hazard]}`}>
            {hazard}
        </span>
    );
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 relative">
      {/* --- Top Bar --- */}
      <div className="flex items-center space-x-3 px-4 py-4 border-b border-slate-900 bg-slate-950 sticky top-0 z-10">
        <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
            <h1 className="text-lg font-bold text-white tracking-tight">Yeni Sevk Kaydı</h1>
            <p className="text-xs text-slate-400">İşlem adımlarını sırasıyla tamamlayınız.</p>
        </div>
      </div>

      {/* --- Main Scrollable Content --- */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 pb-32 space-y-8">
         <div className="max-w-4xl mx-auto space-y-8">
            
            {/* 1. ADIM: FİRMA VE KİŞİ BİLGİSİ */}
            <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-6 shadow-sm relative">
                <div className="absolute -left-3 top-6 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold text-white ring-4 ring-slate-950">1</div>
                <h3 className="text-sm font-bold text-slate-200 mb-6 pl-2">Firma ve Personel Bilgisi</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-2">
                    {/* Firma Arama */}
                    <div className="md:col-span-2 relative" ref={dropdownRef}>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5 ml-1">Firma Seçimi</label>
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 z-10" />
                            <input
                                autoFocus
                                type="text"
                                value={companySearchTerm}
                                onChange={(e) => {
                                    setCompanySearchTerm(e.target.value);
                                    setIsCompanyDropdownOpen(true);
                                    if(selectedCompanyData && e.target.value !== selectedCompanyData.name) setSelectedCompanyData(null);
                                }}
                                onClick={() => setIsCompanyDropdownOpen(true)}
                                placeholder="Firma adı ile arama yapın..."
                                className={`w-full pl-9 pr-8 py-3 bg-slate-950 border text-white text-sm rounded-lg focus:ring-1 focus:ring-blue-500 outline-none transition-all ${selectedCompanyData ? 'border-blue-500/50 bg-blue-900/10' : 'border-slate-700'}`}
                            />
                            {selectedCompanyData ? (
                                <button type="button" onClick={handleClearCompany} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-red-400 p-1"><X className="w-4 h-4" /></button>
                            ) : (
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none" />
                            )}
                        </div>

                        {/* Dropdown */}
                        {isCompanyDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-slate-900 border border-slate-700 rounded-lg shadow-2xl z-50 custom-scrollbar divide-y divide-slate-800">
                                {filteredCompanies.length > 0 ? (
                                    filteredCompanies.map(c => (
                                        <div key={c.id} onClick={() => handleSelectCompany(c)} className="px-4 py-3 hover:bg-slate-800 cursor-pointer flex items-center justify-between group">
                                            <div>
                                                <div className="text-sm text-slate-200 font-medium">{c.name}</div>
                                                <div className="text-xs text-slate-500">{c.assignedDoctor}</div>
                                            </div>
                                            {getHazardBadge(c.hazardClass)}
                                        </div>
                                    ))
                                ) : <div className="px-4 py-3 text-sm text-slate-500">Sonuç yok.</div>}
                            </div>
                        )}
                    </div>

                    {/* Personel Bilgileri - Firma Seçilince Açılır */}
                    <div className={`md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4 transition-all duration-500 ${isStep1Complete ? 'opacity-100 translate-y-0' : 'opacity-40 translate-y-2 pointer-events-none grayscale'}`}>
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1.5 ml-1">Ad Soyad</label>
                            <input required type="text" value={fullName} onChange={e => setFullName(e.target.value)} className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white text-sm focus:border-blue-500 outline-none" placeholder="Örn: Ahmet Yılmaz" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1.5 ml-1">TC Kimlik No</label>
                            <input required maxLength={11} value={tcNo} onChange={e => setTcNo(e.target.value.replace(/\D/g,''))} className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white text-sm focus:border-blue-500 outline-none" placeholder="11 Haneli" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1.5 ml-1">Doğum Tarihi</label>
                            <input required type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white text-sm focus:border-blue-500 outline-none" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Aradaki Ok İşareti */}
            {isStep1Complete && (
                <div className="flex justify-center -my-2 animate-bounce">
                    <ArrowDown className="w-5 h-5 text-slate-700" />
                </div>
            )}

            {/* 2. ADIM: ATANMIŞ UZMANLAR & KURUM */}
            {isStep1Complete && selectedCompanyData && (
                <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-6 shadow-sm relative animate-fadeIn">
                     <div className="absolute -left-3 top-6 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center text-xs font-bold text-white ring-4 ring-slate-950">2</div>
                     <h3 className="text-sm font-bold text-slate-200 mb-6 pl-2">Görevli ve Kurum Bilgisi</h3>
                    
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-2">
                        {/* Sol Taraf: Uzmanlar */}
                        <div className="space-y-3">
                            <label className="block text-xs font-medium text-slate-400 ml-1">Atanmış Görevliler</label>
                            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-start space-x-3">
                                <div className="p-2 bg-blue-500/10 rounded-lg">
                                    <Stethoscope className="w-5 h-5 text-blue-400" />
                                </div>
                                <div>
                                    <span className="block text-[10px] text-slate-500 font-bold uppercase">İşyeri Hekimi</span>
                                    <span className="text-sm text-slate-200 font-medium">{selectedCompanyData.assignedDoctor}</span>
                                </div>
                            </div>
                            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-start space-x-3">
                                <div className="p-2 bg-emerald-500/10 rounded-lg">
                                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                                </div>
                                <div>
                                    <span className="block text-[10px] text-slate-500 font-bold uppercase">İSG Uzmanı</span>
                                    <span className="text-sm text-slate-200 font-medium">{selectedCompanyData.assignedSpecialist}</span>
                                </div>
                            </div>
                        </div>

                        {/* Sağ Taraf: Kurum */}
                        <div>
                             <label className="block text-xs font-medium text-slate-400 mb-3 ml-1">Sevk Edilecek Kurum</label>
                             <div className="relative">
                                <MapPin className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isInstitutionLocked ? 'text-purple-500' : 'text-slate-500'}`} />
                                <select 
                                    value={selectedInstitutionId} 
                                    onChange={e => !isInstitutionLocked && setSelectedInstitutionId(e.target.value)}
                                    disabled={isInstitutionLocked}
                                    className={`w-full pl-9 pr-8 py-3 bg-slate-950 border rounded-lg text-sm text-white outline-none appearance-none ${isInstitutionLocked ? 'border-purple-500/50 text-purple-200 cursor-not-allowed' : 'border-slate-700'}`}
                                >
                                    <option value="">Kurum Seçiniz (Serbest)</option>
                                    {institutions.map(inst => <option key={inst.id} value={inst.id}>{inst.name}</option>)}
                                </select>
                                {isInstitutionLocked && <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-purple-500" />}
                             </div>
                             {isInstitutionLocked ? (
                                 <div className="mt-2 text-xs text-purple-400 flex items-center">
                                     <Lock className="w-3 h-3 mr-1" />
                                     Firma anlaşması gereği bu kurum zorunludur.
                                 </div>
                             ) : (
                                 <div className="mt-2 text-xs text-slate-500">
                                     Personel tetkik için bu kuruma yönlendirilecektir.
                                 </div>
                             )}
                        </div>
                    </div>
                </div>
            )}

            {/* Aradaki Ok İşareti */}
            {isStep1Complete && (
                <div className="flex justify-center -my-2 animate-bounce animation-delay-200">
                    <ArrowDown className="w-5 h-5 text-slate-700" />
                </div>
            )}

            {/* 3. ADIM: TETKİK SEÇİMİ */}
            <div className={`bg-slate-900/50 rounded-xl border border-slate-800 p-6 shadow-sm relative transition-all duration-500 ${isStep1Complete ? 'opacity-100 translate-y-0' : 'opacity-40 translate-y-4 pointer-events-none'}`}>
                 <div className="absolute -left-3 top-6 w-6 h-6 bg-emerald-600 rounded-full flex items-center justify-center text-xs font-bold text-white ring-4 ring-slate-950">3</div>
                 
                 <div className="flex items-center justify-between mb-6 pl-2 border-b border-slate-800 pb-4">
                    <h3 className="text-sm font-bold text-slate-200">İstenen Tetkikler</h3>
                    <div className="relative w-64">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                        <input 
                          type="text" 
                          placeholder="Listede tetkik ara..." 
                          value={examSearchTerm}
                          onChange={e => setExamSearchTerm(e.target.value)}
                          className="w-full pl-8 py-1.5 bg-slate-950 border border-slate-700 rounded text-xs text-white focus:border-emerald-500 outline-none"
                        />
                    </div>
                 </div>

                 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pl-2">
                    {filteredExams.map(exam => {
                        const isSelected = selectedExamIds.includes(exam.name);
                        const isEkgAndMandatory = isEkgMandatory && exam.name === 'EKG';
                        
                        return (
                            <button
                                key={exam.id}
                                type="button"
                                onClick={() => toggleExam(exam.name)}
                                className={`relative p-3 rounded-lg border text-left transition-all duration-200 group flex flex-col justify-between min-h-[80px] ${
                                    isSelected 
                                    ? 'bg-blue-600/10 border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.1)]' 
                                    : 'bg-slate-800/50 border-slate-700 hover:border-slate-500 hover:bg-slate-800'
                                }`}
                            >
                                <div className="flex justify-between items-start w-full">
                                    <span className={`text-xs font-bold leading-tight ${isSelected ? 'text-white' : 'text-slate-300'}`}>{exam.name}</span>
                                    {isSelected && <Check className="w-3.5 h-3.5 text-blue-400 shrink-0 ml-1" />}
                                </div>
                                
                                <div className="mt-2 flex items-end justify-between w-full">
                                    <span className="text-[10px] text-slate-500 font-mono bg-slate-950/50 px-1.5 py-0.5 rounded">{exam.code}</span>
                                    <span className={`text-xs font-medium ${isSelected ? 'text-blue-300' : 'text-slate-400'}`}>₺{exam.price}</span>
                                </div>

                                {isEkgAndMandatory && (
                                    <div className="absolute -top-1.5 -right-1.5 bg-indigo-500 text-white text-[9px] px-1.5 py-0.5 rounded-full shadow-sm flex items-center border border-slate-900">
                                        <Lock className="w-2.5 h-2.5 mr-0.5" /> Zorunlu
                                    </div>
                                )}
                            </button>
                        );
                    })}
                 </div>
                 
                 <div className="mt-6 pl-2 pt-4 border-t border-slate-800/50">
                    <label className="text-xs font-medium text-slate-500 block mb-1">Sevk Notu / Açıklama</label>
                    <textarea 
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="Sevk belgesinde görünecek özel bir not ekleyin..."
                        rows={1}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-white focus:border-slate-500 outline-none resize-none"
                    />
                 </div>
            </div>

         </div>
      </div>

      {/* --- BOTTOM BAR: FINANS VE ONAY (Sticky) --- */}
      <div className="absolute bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 p-4 shadow-[0_-5px_20px_rgba(0,0,0,0.3)] z-20">
         <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
             
             {/* Sol: Ödeme Yöntemi (SABİT / KİLİTLİ) */}
             <div className="flex items-center space-x-4 w-full md:w-auto">
                 <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 mb-1 ml-1 uppercase tracking-wide font-bold">Ödeme Yöntemi</span>
                    <div className="bg-slate-950 p-1.5 rounded-lg border border-slate-800 w-full md:w-64">
                       {selectedCompanyData ? (
                           <div className={`w-full py-2 px-4 rounded-md border flex items-center justify-between transition-all cursor-not-allowed
                                ${paymentMethod === 'INVOICE' 
                                    ? 'bg-blue-500/10 border-blue-500/30 text-blue-200' 
                                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                                }`}>
                                <div className="flex items-center space-x-2">
                                    {paymentMethod === 'INVOICE' ? <Receipt className="w-4 h-4" /> : <Wallet className="w-4 h-4" />}
                                    <span className="text-xs font-bold">{paymentMethod === 'INVOICE' ? 'FATURA (Cari)' : 'NAKİT'}</span>
                                </div>
                                <div className="flex items-center space-x-1 text-[10px] opacity-60">
                                    <Lock className="w-3 h-3" />
                                    <span>Sabit</span>
                                </div>
                           </div>
                       ) : (
                           <div className="w-full py-2 px-4 text-center text-xs text-slate-500 italic border border-transparent">
                               Firma seçimi bekleniyor...
                           </div>
                       )}
                    </div>
                    {selectedCompanyData && (
                        <span className="text-[10px] text-slate-500 mt-1 ml-1">* Firma ayarı gereği bu yöntem geçerlidir.</span>
                    )}
                 </div>
             </div>

             {/* Orta: Tutar */}
             <div className="flex flex-col items-center md:items-end">
                <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Toplam Tutar</span>
                <div className={`text-3xl font-bold tracking-tight ${paymentMethod === 'CASH' ? 'text-emerald-400' : 'text-blue-400'}`}>
                    ₺{estimatedPrice.toLocaleString('tr-TR')}
                </div>
                {estimatedCost > 0 && <span className="text-[10px] text-red-400/60">Maliyet: ₺{estimatedCost}</span>}
             </div>

             {/* Sağ: Buton */}
             <button 
                onClick={handleSubmit}
                disabled={!isFormValid}
                className={`w-full md:w-auto px-8 py-3 rounded-xl text-white font-bold shadow-lg flex items-center justify-center space-x-2 transition-all active:scale-95 ${
                    !isFormValid ? 'bg-slate-800 text-slate-500 cursor-not-allowed' :
                    paymentMethod === 'CASH' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/20'
                }`}
            >
                <Save className="w-5 h-5" />
                <span>KAYDET VE OLUŞTUR</span>
            </button>
         </div>
      </div>
    </div>
  );
};