import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ArrowLeft, Building2, User, Stethoscope, ShieldCheck, Wallet, Receipt, Save, Search, Check, ChevronDown, X, MapPin, AlertCircle, CreditCard, Banknote } from 'lucide-react';
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
  const [selectedExamIds, setSelectedExamIds] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  
  // Financial State
  const [estimatedPrice, setEstimatedPrice] = useState(0);
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'POS' | 'INVOICE'>('INVOICE');

  // --- LOGIC & EFFECTS ---

  // Validation
  const isFormValid = 
    fullName.length >= 3 && 
    tcNo.length === 11 && 
    birthDate !== '' && 
    selectedCompanyData !== null && 
    selectedExamIds.length > 0 &&
    selectedInstitutionId !== ''; 

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

  // EKG Recommendation Logic (Yaş sınırına göre öneri/otomatik seçim)
  const isEkgRecommended = patientAge >= settings.ekgLimitAge;

  // Yaş değiştiğinde EKG'yi otomatik ekle (ama zorlama, kullanıcı kaldırabilsin)
  useEffect(() => {
     if (isEkgRecommended) {
        const ekgExamName = 'EKG';
        // Sadece yaş kriteri sağlandığında ve henüz listede yoksa ekle.
        // Kullanıcı manuel çıkarırsa tekrar eklememesi için dependency array'e selectedExamIds KOYMUYORUZ.
        // Sadece isEkgRecommended (yaş) değiştiğinde çalışır.
        setSelectedExamIds(prev => {
            if (!prev.includes(ekgExamName)) {
                return [...prev, ekgExamName];
            }
            return prev;
        });
     }
  }, [isEkgRecommended]); // Dependency: Sadece yaş durumu değiştiğinde tetiklenir.

  // Search Filters
  const filteredCompanies = companies.filter(c => 
    c.name.toLowerCase().includes(companySearchTerm.toLowerCase())
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
      
      // Set Payment Method based on Company Settings (Default but changeable)
      setPaymentMethod(company.defaultPaymentMethod || 'INVOICE');
      
      // Handle Institution Logic - Set default but allow change
      if (company.forcedInstitutionId) {
          setSelectedInstitutionId(company.forcedInstitutionId);
      } else {
          setSelectedInstitutionId('');
      }
  };

  const handleClearCompany = () => {
      setSelectedCompanyData(null);
      setCompanySearchTerm('');
      setSelectedExamIds([]);
      setSelectedInstitutionId('');
  };

  const toggleExam = (examName: string) => {
    // Kilit mantığı kaldırıldı: Kullanıcı her şeyi seçip kaldırabilir.
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

  const getPaymentMethodLabel = (pm: string) => {
      if (pm === 'CASH') return 'Nakit';
      if (pm === 'POS') return 'Pos';
      return 'Fatura';
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 relative overflow-hidden">
      
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900 shrink-0 h-16">
        <div className="flex items-center space-x-3">
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
              <h1 className="text-lg font-bold text-white tracking-tight">Yeni Sevk Girişi</h1>
              <p className="text-xs text-slate-400">Tek ekranda hızlı sevk oluşturma modülü</p>
          </div>
        </div>
        
        {/* Quick Tips */}
        <div className="hidden md:flex items-center space-x-4 text-xs text-slate-500">
           <div className="flex items-center"><span className="w-2 h-2 rounded-full bg-blue-500 mr-2"></span>Firma Varsayılanları</div>
           <div className="flex items-center"><span className="w-2 h-2 rounded-full bg-indigo-500 mr-2"></span>Yaş Gereği Önerilen</div>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="flex-1 p-4 overflow-hidden min-h-0">
        <div className="h-full grid grid-cols-1 lg:grid-cols-12 gap-4">
            
            {/* COLUMN 1: KİM? (Personel ve Firma) - %30 */}
            <div className="lg:col-span-4 flex flex-col space-y-4 overflow-y-auto custom-scrollbar pr-1 min-h-0">
                
                {/* 1. Firma Seçimi Kartı */}
                <div className={`bg-slate-900 border rounded-xl p-4 shadow-sm shrink-0 transition-colors ${!selectedCompanyData && isFormValid === false ? 'border-orange-500/50' : 'border-slate-800'}`}>
                    <div className="flex items-center mb-3">
                        <div className="p-1.5 bg-blue-500/10 rounded-lg mr-2">
                            <Building2 className="w-4 h-4 text-blue-500" />
                        </div>
                        <h3 className="font-bold text-slate-200 text-sm">Firma Bilgisi <span className="text-red-500">*</span></h3>
                    </div>

                    <div className="relative" ref={dropdownRef}>
                        <div className="relative">
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
                                placeholder="Firma adı yazın..."
                                className={`w-full pl-3 pr-8 py-2.5 bg-slate-950 border text-white text-sm rounded-lg focus:ring-2 focus:ring-blue-600 outline-none transition-all font-medium ${selectedCompanyData ? 'border-blue-500/50' : 'border-slate-700'}`}
                            />
                            {selectedCompanyData ? (
                                <button onClick={handleClearCompany} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-400"><X className="w-3.5 h-3.5" /></button>
                            ) : (
                                <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600 pointer-events-none" />
                            )}
                        </div>

                        {/* Dropdown */}
                        {isCompanyDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-slate-800 border border-slate-700 rounded-lg shadow-2xl z-50 custom-scrollbar">
                                {filteredCompanies.length > 0 ? (
                                    filteredCompanies.map(c => (
                                        <div key={c.id} onClick={() => handleSelectCompany(c)} className="px-3 py-2.5 hover:bg-slate-700 cursor-pointer border-b border-slate-700/50 last:border-0 group">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-slate-200 font-bold group-hover:text-white truncate max-w-[180px]">{c.name}</span>
                                                {getHazardBadge(c.hazardClass)}
                                            </div>
                                            <div className="text-xs text-slate-500 mt-0.5 flex items-center space-x-2">
                                                 <span>{c.assignedDoctor.split(' ')[0]}...</span>
                                                 <span className="w-0.5 h-0.5 rounded-full bg-slate-600"></span>
                                                 <span>{getPaymentMethodLabel(c.defaultPaymentMethod)}</span>
                                            </div>
                                        </div>
                                    ))
                                ) : <div className="p-3 text-xs text-slate-500 text-center">Sonuç bulunamadı.</div>}
                            </div>
                        )}
                    </div>
                    
                    {selectedCompanyData && (
                        <div className="mt-3 p-2 bg-slate-950/50 rounded-lg border border-slate-800/50">
                             <div className="flex items-center space-x-2 text-[11px] text-slate-400 mb-1">
                                <Stethoscope className="w-3 h-3" />
                                <span className="truncate">{selectedCompanyData.assignedDoctor}</span>
                             </div>
                             <div className="flex items-center space-x-2 text-[11px] text-slate-400">
                                <ShieldCheck className="w-3 h-3" />
                                <span className="truncate">{selectedCompanyData.assignedSpecialist}</span>
                             </div>
                        </div>
                    )}
                </div>

                {/* 2. Personel Bilgisi Kartı */}
                <div className={`bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm transition-all duration-300 shrink-0 ${!selectedCompanyData ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                    <div className="flex items-center mb-3">
                        <div className="p-1.5 bg-emerald-500/10 rounded-lg mr-2">
                            <User className="w-4 h-4 text-emerald-500" />
                        </div>
                        <h3 className="font-bold text-slate-200 text-sm">Personel Bilgisi</h3>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block ml-1">Ad Soyad <span className="text-red-500">*</span></label>
                            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-sm focus:border-emerald-500 outline-none placeholder-slate-600" placeholder="Örn: Ahmet Yılmaz" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block ml-1">TC Kimlik <span className="text-red-500">*</span></label>
                                <input maxLength={11} value={tcNo} onChange={e => setTcNo(e.target.value.replace(/\D/g,''))} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-sm focus:border-emerald-500 outline-none placeholder-slate-600" placeholder="11 Haneli" />
                            </div>
                            <div>
                                <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block ml-1">Doğum Tarihi <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-sm focus:border-emerald-500 outline-none" />
                                    {isEkgRecommended && (
                                        <div className="absolute -bottom-4 right-0 text-[9px] text-indigo-400 font-bold flex items-center">
                                            <AlertCircle className="w-2.5 h-2.5 mr-1" />
                                            {patientAge} Yaş (EKG Önerildi)
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* COLUMN 2: NE? (Tetkikler) - %45 */}
            <div className={`lg:col-span-5 flex flex-col transition-all duration-300 min-h-0 ${!selectedCompanyData ? 'opacity-40 pointer-events-none' : ''}`}>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-1 h-full flex flex-col shadow-sm overflow-hidden">
                    <div className="p-3 border-b border-slate-800 flex justify-between items-center shrink-0">
                        <h3 className="font-bold text-slate-200 flex items-center text-sm">
                            <span className="w-2 h-2 rounded-full bg-indigo-500 mr-2"></span>
                            İstenen Tetkikler <span className="text-red-500 ml-1">*</span>
                        </h3>
                        <div className="text-[10px] text-slate-500 bg-slate-800 px-2 py-0.5 rounded">
                            {selectedExamIds.length} seçildi
                        </div>
                    </div>
                    
                    <div className="p-3 flex-1 overflow-y-auto custom-scrollbar">
                        <div className="grid grid-cols-2 gap-2">
                            {exams.map(exam => {
                                const isSelected = selectedExamIds.includes(exam.name);
                                const isEkgAndMandatory = isEkgRecommended && exam.name === 'EKG';
                                
                                return (
                                    <button
                                        key={exam.id}
                                        type="button"
                                        onClick={() => toggleExam(exam.name)}
                                        className={`relative group p-3 rounded-lg border text-left transition-all duration-150 flex flex-col justify-between min-h-[70px] ${
                                            isSelected 
                                            ? 'bg-blue-600 border-blue-500 shadow-lg shadow-blue-900/40 transform scale-[1.01]' 
                                            : 'bg-slate-950 border-slate-800 hover:border-slate-600 hover:bg-slate-900'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start w-full">
                                            <span className={`text-xs font-bold leading-tight pr-3 ${isSelected ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>
                                                {exam.name}
                                            </span>
                                            {isSelected && (
                                                <div className="bg-white/20 p-0.5 rounded-full shrink-0">
                                                    <Check className="w-2.5 h-2.5 text-white" />
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="mt-1 flex items-end justify-between w-full">
                                            <span className={`text-[9px] font-mono px-1 py-0.5 rounded ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-500'}`}>
                                                {exam.code}
                                            </span>
                                            <span className={`text-xs font-bold ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                                                ₺{exam.price}
                                            </span>
                                        </div>

                                        {isEkgAndMandatory && (
                                            <div className="absolute -top-1.5 -right-1.5 bg-indigo-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow border-2 border-slate-900 flex items-center z-10">
                                                <AlertCircle className="w-2 h-2 mr-1" />
                                                Önerildi
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* COLUMN 3: NEREYE & ONAY - %25 */}
            <div className={`lg:col-span-3 flex flex-col h-full transition-all duration-300 min-h-0 ${!selectedCompanyData ? 'opacity-40 pointer-events-none' : ''}`}>
                
                {/* Scrollable Upper Section */}
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-4 mb-4">
                    {/* 1. Kurum Seçimi */}
                    <div className={`bg-slate-900 border rounded-xl p-4 shadow-sm transition-colors ${!selectedInstitutionId ? 'border-purple-500/50 shadow-purple-900/20' : 'border-slate-800'}`}>
                        <div className="flex items-center mb-3">
                            <div className="p-1.5 bg-purple-500/10 rounded-lg mr-2">
                                <MapPin className="w-4 h-4 text-purple-500" />
                            </div>
                            <h3 className="font-bold text-slate-200 text-sm">Sevk Kurumu <span className="text-red-500 ml-1">*</span></h3>
                        </div>
                        
                        <div className="relative">
                            <select 
                                value={selectedInstitutionId} 
                                onChange={e => setSelectedInstitutionId(e.target.value)}
                                className={`w-full px-3 py-2.5 bg-slate-950 border rounded-lg text-xs text-white outline-none appearance-none transition-colors truncate pr-8 ${!selectedInstitutionId ? 'border-purple-500/50 text-slate-400' : 'border-slate-700 focus:border-purple-500'}`}
                            >
                                <option value="">Kurum Seçiniz (Zorunlu)</option>
                                {institutions.map(inst => <option key={inst.id} value={inst.id}>{inst.name}</option>)}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                        </div>

                        {selectedCompanyData?.forcedInstitutionId && selectedCompanyData.forcedInstitutionId === selectedInstitutionId && (
                            <div className="mt-1.5 text-[9px] text-purple-400 font-medium flex items-center">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mr-1.5"></span>
                                Firma anlaşmalı kurum seçildi (Değiştirilebilir).
                            </div>
                        )}
                        
                        {!selectedInstitutionId && (
                            <div className="mt-1.5 text-[9px] text-red-400 font-medium flex items-center animate-pulse">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Lütfen kurum seçiniz.
                            </div>
                        )}
                    </div>

                    {/* 2. Not */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
                        <label className="text-[10px] uppercase font-bold text-slate-500 mb-2 block ml-1">Sevk Notu (Opsiyonel)</label>
                        <textarea 
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="Özel bir not ekleyin..."
                            rows={3}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:border-slate-500 outline-none resize-none"
                        />
                    </div>
                </div>

                {/* Sticky Bottom Section (Price & Save) */}
                <div className="mt-auto shrink-0">
                    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                            <Receipt className="w-20 h-20 text-white" />
                        </div>

                        {/* Ödeme Yöntemi */}
                        <div className="mb-3 relative z-10">
                            <span className="text-[10px] text-slate-400 font-medium uppercase mb-1 block">Ödeme Tipi</span>
                            <div className="flex flex-col gap-1.5">
                                <button
                                    onClick={() => setPaymentMethod('INVOICE')}
                                    className={`w-full flex items-center px-2 py-1.5 rounded border transition-all ${paymentMethod === 'INVOICE' ? 'bg-blue-600/20 border-blue-500 text-blue-200' : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:border-slate-600'}`}
                                >
                                    <Receipt className="w-3.5 h-3.5 mr-2" />
                                    <span className="text-xs font-bold">FATURA</span>
                                    {paymentMethod === 'INVOICE' && <Check className="w-3.5 h-3.5 ml-auto text-blue-400" />}
                                </button>
                                
                                <div className="grid grid-cols-2 gap-1.5">
                                    <button
                                        onClick={() => setPaymentMethod('CASH')}
                                        className={`flex items-center justify-center px-2 py-1.5 rounded border transition-all ${paymentMethod === 'CASH' ? 'bg-emerald-600/20 border-emerald-500 text-emerald-200' : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:border-slate-600'}`}
                                    >
                                        <Banknote className="w-3.5 h-3.5 mr-1.5" />
                                        <span className="text-[10px] font-bold">ELDEN (Nakit)</span>
                                    </button>
                                    <button
                                        onClick={() => setPaymentMethod('POS')}
                                        className={`flex items-center justify-center px-2 py-1.5 rounded border transition-all ${paymentMethod === 'POS' ? 'bg-purple-600/20 border-purple-500 text-purple-200' : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:border-slate-600'}`}
                                    >
                                        <CreditCard className="w-3.5 h-3.5 mr-1.5" />
                                        <span className="text-[10px] font-bold">ELDEN (Pos)</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Tutar */}
                        <div className="mb-4 relative z-10 pt-2 border-t border-slate-700/50">
                            <div className="text-2xl font-bold text-white tracking-tight">₺{estimatedPrice.toLocaleString('tr-TR')}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                                Maliyet: <span className="text-slate-400">₺{estimatedCost}</span>
                            </div>
                        </div>

                        {/* Buton */}
                        <button 
                            onClick={handleSubmit}
                            disabled={!isFormValid}
                            className={`w-full py-3 rounded-lg font-bold text-white shadow-lg flex items-center justify-center space-x-2 transition-all active:scale-95 relative z-10 ${
                                !isFormValid ? 'bg-slate-700 text-slate-500 cursor-not-allowed' :
                                paymentMethod === 'CASH' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/30' : 
                                paymentMethod === 'POS' ? 'bg-purple-600 hover:bg-purple-500 shadow-purple-900/30' :
                                'bg-blue-600 hover:bg-blue-500 shadow-blue-900/30'
                            }`}
                        >
                            <Save className="w-4 h-4" />
                            <span className="text-sm">
                                {!isFormValid && selectedInstitutionId === '' ? 'KURUM SEÇİNİZ' : 'KAYDI OLUŞTUR'}
                            </span>
                        </button>
                    </div>
                </div>

            </div>
        </div>
      </div>
    </div>
  );
};