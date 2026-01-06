import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ArrowLeft, Building2, User, Activity, Stethoscope, ShieldCheck, Wallet, Receipt, Save, XCircle, Search, Check, ChevronDown, X, Info, Plus, MapPin, Hash, Lock, Calendar } from 'lucide-react';
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
  // Step 2: Employee State
  const [fullName, setFullName] = useState('');
  const [tcNo, setTcNo] = useState('');
  const [birthDate, setBirthDate] = useState('');
  
  // Step 1: Searchable Company Dropdown State
  const [companySearchTerm, setCompanySearchTerm] = useState('');
  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);
  const [selectedCompanyData, setSelectedCompanyData] = useState<Company | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Institution Selection
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string>('');
  const [isInstitutionLocked, setIsInstitutionLocked] = useState(false);

  // Step 3: Exam Search State
  const [examSearchTerm, setExamSearchTerm] = useState('');

  const [selectedExamIds, setSelectedExamIds] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [estimatedPrice, setEstimatedPrice] = useState(0);
  const [estimatedCost, setEstimatedCost] = useState(0);
  
  // Payment Method State
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'INVOICE'>('INVOICE');

  // Step Validation States
  // 1. Step is Complete if a company is selected
  const isStep1Complete = selectedCompanyData !== null;
  
  // 2. Step is Complete if Name > 3 chars, TC is 11 digits, and BirthDate is filled
  const isStep2Complete = fullName.length >= 3 && tcNo.length === 11 && birthDate !== '';

  // Calculate Age
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

  // Mandatory EKG Logic
  const isEkgMandatory = patientAge >= settings.ekgLimitAge;

  // Effect to Enforce EKG
  useEffect(() => {
     if (isEkgMandatory) {
        // Assume exam name is "EKG" based on defaults. If not present, add it.
        // We look for any exam that has 'EKG' in its name to be safe, or exact match.
        // Based on initialData.ts, name is 'EKG'.
        const ekgExamName = 'EKG';
        
        // Only add if not already selected
        if (!selectedExamIds.includes(ekgExamName)) {
            setSelectedExamIds(prev => [...prev, ekgExamName]);
        }
     }
  }, [isEkgMandatory, selectedExamIds]);

  // Filter companies based on search
  const filteredCompanies = companies.filter(c => 
    c.name.toLowerCase().includes(companySearchTerm.toLowerCase())
  );

  // Filter exams based on search
  const filteredExams = exams.filter(e => 
    e.name.toLowerCase().includes(examSearchTerm.toLowerCase())
  );

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCompanyDropdownOpen(false);
        if (selectedCompanyData) {
            setCompanySearchTerm(selectedCompanyData.name);
        } else {
            setCompanySearchTerm('');
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedCompanyData]);

  // Recalculate price and cost when exams change
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

  const handleSelectCompany = (company: Company) => {
      setSelectedCompanyData(company);
      setCompanySearchTerm(company.name);
      setIsCompanyDropdownOpen(false);
      
      // Auto-fill logic
      setSelectedExamIds(company.defaultExams);
      setPaymentMethod(company.defaultPaymentMethod || 'INVOICE');

      // Institution Logic
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
    // If exam is EKG and it is mandatory, prevent removal
    if (isEkgMandatory && examName === 'EKG') {
        return; // Do nothing
    }

    setSelectedExamIds(prev => 
      prev.includes(examName) ? prev.filter(e => e !== examName) : [...prev, examName]
    );
  };

  const getHazardClassStyles = (hazard: HazardClass) => {
    switch (hazard) {
      case HazardClass.VERY_DANGEROUS: 
        return { 
          bg: 'bg-red-500/10', 
          border: 'border-red-500/30',
          badge: 'bg-red-500 text-white'
        };
      case HazardClass.DANGEROUS: 
        return { 
          bg: 'bg-orange-500/10', 
          border: 'border-orange-500/30',
          badge: 'bg-orange-500 text-white'
        };
      case HazardClass.LESS: 
        return { 
          bg: 'bg-emerald-500/10', 
          border: 'border-emerald-500/30',
          badge: 'bg-emerald-500 text-white'
        };
      default: 
        return { 
          bg: 'bg-slate-700/50', 
          border: 'border-slate-600',
          badge: 'bg-slate-600 text-white'
        };
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !selectedCompanyData) return;

    const newReferral: Referral = {
      id: Math.random().toString(36).substr(2, 9),
      employee: {
        id: Math.random().toString(36).substr(2, 9),
        fullName,
        tcNo,
        birthDate,
        company: selectedCompanyData.name
      },
      exams: selectedExamIds,
      status: Status.PENDING,
      referralDate: new Date().toISOString(),
      notes,
      doctorName: selectedCompanyData.assignedDoctor,
      specialistName: selectedCompanyData.assignedSpecialist,
      totalPrice: estimatedPrice,
      totalCost: estimatedCost, // Save cost
      paymentMethod: paymentMethod,
      targetInstitutionId: selectedInstitutionId || undefined
    };

    onSubmit(newReferral);
  };

  return (
    <div className="h-full flex flex-col lg:overflow-hidden overflow-y-auto animate-fadeIn bg-slate-950">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-1 pt-1 shrink-0">
         <div className="flex items-center space-x-4">
            <button onClick={onClose} className="p-2 bg-slate-900 border border-slate-700 hover:border-slate-500 rounded-lg text-slate-400 hover:text-white transition-all shadow-sm">
               <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
               <h1 className="text-xl font-bold text-white tracking-tight">Yeni Sevk Kaydı</h1>
               <p className="text-xs text-slate-400 hidden md:block">
                 Önce firma seçimi yapınız, ardından personel bilgilerini giriniz.
               </p>
            </div>
         </div>
      </div>

      {/* Main Layout */}
      <form id="referralForm" onSubmit={handleSubmit} className="flex-1 grid grid-cols-12 gap-4 lg:gap-6 lg:min-h-0 h-auto pb-2">
          
          {/* LEFT COLUMN: Main Form Flow */}
          <div className="col-span-12 lg:col-span-9 flex flex-col gap-4 lg:overflow-y-auto custom-scrollbar pr-0 lg:pr-2 pb-10">
             
             {/* 1. STEP: FIRMA & KURUM (Now First) */}
             <div className={`transition-all duration-300 rounded-xl border p-4 md:p-5 shadow-lg relative ${isStep1Complete ? 'bg-slate-900 border-blue-500/50' : 'bg-slate-900/50 border-blue-500'}`}>
                <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                   <div className="flex items-center space-x-2 text-slate-200">
                      <div className={`p-1.5 rounded-lg transition-colors ${isStep1Complete ? 'bg-blue-500 text-white' : 'bg-blue-500/10 text-blue-500'}`}>
                          <Building2 className="w-4 h-4" />
                      </div>
                      <span className={`font-bold text-sm ${isStep1Complete ? 'text-blue-400' : ''}`}>1. Firma ve Kurum Seçimi</span>
                   </div>
                   {isStep1Complete && <Check className="w-5 h-5 text-blue-500" />}
                </div>

                {/* Company Search Bar */}
                <div ref={dropdownRef} className="relative mb-4">
                    <div className="relative group">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 z-10" />
                      <input
                        autoFocus
                        type="text"
                        required
                        value={companySearchTerm}
                        onChange={(e) => {
                            setCompanySearchTerm(e.target.value);
                            setIsCompanyDropdownOpen(true);
                            if(selectedCompanyData && e.target.value !== selectedCompanyData.name) {
                                setSelectedCompanyData(null);
                            }
                        }}
                        onClick={() => setIsCompanyDropdownOpen(true)}
                        placeholder="Firma ara..."
                        className={`w-full pl-9 pr-8 py-3 bg-slate-950 border text-white text-sm rounded-lg focus:ring-1 focus:ring-blue-500 outline-none transition-all ${!selectedCompanyData && companySearchTerm ? 'border-blue-500' : 'border-slate-700'}`}
                      />
                      {selectedCompanyData ? (
                         <button type="button" onClick={handleClearCompany} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-red-400">
                             <X className="w-4 h-4" />
                         </button>
                      ) : (
                         <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none" />
                      )}
                    </div>

                    {isCompanyDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-50 custom-scrollbar divide-y divide-slate-800">
                        {filteredCompanies.length > 0 ? (
                          filteredCompanies.map(c => (
                            <div
                              key={c.id}
                              onClick={() => handleSelectCompany(c)}
                              className="px-4 py-3 hover:bg-slate-800 cursor-pointer flex items-center justify-between transition-colors group border-b border-slate-800/50 last:border-0"
                            >
                              <div className="flex flex-col">
                                  <span className="text-sm text-slate-200 font-medium group-hover:text-white transition-colors">{c.name}</span>
                                  <span className="text-[10px] text-slate-500">{c.assignedDoctor}</span>
                              </div>
                              <div className="flex items-center space-x-3">
                                   <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                                       c.hazardClass === HazardClass.VERY_DANGEROUS ? 'text-red-400 bg-red-900/20 border border-red-500/20' :
                                       c.hazardClass === HazardClass.DANGEROUS ? 'text-orange-400 bg-orange-900/20 border border-orange-500/20' :
                                       'text-emerald-400 bg-emerald-900/20 border border-emerald-500/20'
                                   }`}>
                                      {c.hazardClass === HazardClass.VERY_DANGEROUS ? 'Çok Tehlikeli' : c.hazardClass === HazardClass.DANGEROUS ? 'Tehlikeli' : 'Az Tehlikeli'}
                                   </span>
                                  {selectedCompanyData?.id === c.id && <Check className="w-4 h-4 text-blue-500" />}
                              </div>
                            </div>
                          ))
                        ) : (
                           <div className="px-4 py-3 text-sm text-slate-500">Sonuç bulunamadı.</div>
                        )}
                      </div>
                    )}
                </div>

                {/* Combined Details Card */}
                {selectedCompanyData && (
                  <div className={`rounded-xl border overflow-hidden animate-fadeIn ${getHazardClassStyles(selectedCompanyData.hazardClass).border} bg-slate-900/40`}>
                      {/* Header Bar of the Card */}
                      <div className={`px-4 py-2 flex items-center justify-between border-b ${getHazardClassStyles(selectedCompanyData.hazardClass).bg} ${getHazardClassStyles(selectedCompanyData.hazardClass).border}`}>
                          <div className="flex items-center space-x-2">
                             <Building2 className="w-4 h-4 opacity-70" />
                             <span className="font-bold text-sm text-white truncate max-w-[150px] md:max-w-none">{selectedCompanyData.name}</span>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded shadow-sm whitespace-nowrap ${getHazardClassStyles(selectedCompanyData.hazardClass).badge}`}>
                              {selectedCompanyData.hazardClass.toUpperCase()}
                          </span>
                      </div>

                      <div className="flex flex-col md:flex-row">
                          {/* Left: Doctors Info */}
                          <div className="p-4 flex-1 space-y-3 border-b md:border-b-0 md:border-r border-slate-800">
                               <div className="flex items-start space-x-3">
                                   <div className="mt-0.5 p-1.5 bg-slate-800 rounded text-blue-400">
                                       <Stethoscope className="w-4 h-4" />
                                   </div>
                                   <div>
                                       <span className="text-[10px] uppercase text-slate-500 font-bold">İşyeri Hekimi</span>
                                       <p className="text-sm text-slate-200">{selectedCompanyData.assignedDoctor}</p>
                                   </div>
                               </div>
                               <div className="flex items-start space-x-3">
                                   <div className="mt-0.5 p-1.5 bg-slate-800 rounded text-emerald-400">
                                       <ShieldCheck className="w-4 h-4" />
                                   </div>
                                   <div>
                                       <span className="text-[10px] uppercase text-slate-500 font-bold">İSG Uzmanı</span>
                                       <p className="text-sm text-slate-200">{selectedCompanyData.assignedSpecialist}</p>
                                   </div>
                               </div>
                          </div>

                          {/* Right: Institution Selector */}
                          <div className="p-4 w-full md:w-72 bg-slate-950/30 flex flex-col justify-center">
                                <label className="text-[10px] text-slate-400 uppercase font-bold mb-2 flex items-center">
                                    <MapPin className="w-3 h-3 mr-1.5 text-purple-400" />
                                    Sevk Edilecek Kurum
                                </label>
                                
                                <div className="relative group">
                                    <select 
                                        value={selectedInstitutionId} 
                                        onChange={e => !isInstitutionLocked && setSelectedInstitutionId(e.target.value)}
                                        disabled={isInstitutionLocked}
                                        className={`w-full pl-3 pr-8 py-2.5 bg-slate-900 border text-xs text-white rounded-lg outline-none appearance-none font-medium transition-all ${isInstitutionLocked ? 'border-purple-500/50 bg-purple-900/10 cursor-not-allowed text-purple-200 shadow-[0_0_10px_rgba(168,85,247,0.1)]' : 'border-slate-700 hover:border-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20'}`}
                                    >
                                        <option value="">Seçim Yok (Serbest)</option>
                                        {institutions.map(inst => (
                                            <option key={inst.id} value={inst.id}>{inst.name}</option>
                                        ))}
                                    </select>
                                    {!isInstitutionLocked && <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none group-hover:text-slate-300 transition-colors" />}
                                    {isInstitutionLocked && <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-purple-500 pointer-events-none" />}
                                </div>

                                {isInstitutionLocked ? (
                                        <div className="mt-2 flex items-start space-x-1.5 text-[10px] text-purple-300 bg-purple-500/10 px-2 py-1.5 rounded border border-purple-500/20">
                                        <Info className="w-3 h-3 mt-0.5 shrink-0" />
                                        <span>Firma anlaşması gereği bu kurum zorunludur.</span>
                                        </div>
                                ) : (
                                        <div className="mt-2 text-[10px] text-slate-500 flex items-center">
                                        <Info className="w-3 h-3 mr-1" />
                                        Firma kısıtlaması yok.
                                        </div>
                                )}
                          </div>
                      </div>
                  </div>
                )}
             </div>

             {/* 2. STEP: PERSONEL (Now Second - Dependent on Step 1) */}
             <div className={`transition-all duration-500 ${isStep1Complete ? 'opacity-100 translate-y-0' : 'opacity-40 translate-y-4 pointer-events-none grayscale'}`}>
                 <div className={`rounded-xl border border-slate-800 p-4 md:p-5 shadow-lg relative ${isStep2Complete ? 'bg-slate-900 border-indigo-500/50' : 'bg-slate-900/50'}`}>
                    <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                       <div className="flex items-center space-x-2 text-slate-200">
                         <div className={`p-1.5 rounded-lg transition-colors ${isStep2Complete ? 'bg-indigo-500 text-white' : 'bg-indigo-500/10 text-indigo-500'}`}>
                            <User className="w-4 h-4" />
                         </div>
                         <span className={`font-bold text-sm ${isStep2Complete ? 'text-indigo-400' : ''}`}>2. Personel Bilgileri</span>
                       </div>
                       {!isStep1Complete ? <Lock className="w-4 h-4 text-slate-600" /> : isStep2Complete && <Check className="w-5 h-5 text-indigo-500" />}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="relative col-span-1 md:col-span-2">
                         <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                         <input 
                          required
                          disabled={!isStep1Complete}
                          type="text" 
                          value={fullName}
                          onChange={e => setFullName(e.target.value)}
                          className="w-full pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-700 text-white text-sm rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder-slate-600 disabled:cursor-not-allowed disabled:bg-slate-900"
                          placeholder="Ad Soyad"
                        />
                      </div>

                      <div className="relative">
                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input 
                          required
                          disabled={!isStep1Complete}
                          type="text" 
                          maxLength={11}
                          value={tcNo}
                          onChange={e => setTcNo(e.target.value.replace(/\D/g,''))}
                          className="w-full pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-700 text-white text-sm rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder-slate-600 disabled:cursor-not-allowed disabled:bg-slate-900"
                          placeholder="TC Kimlik No"
                        />
                      </div>

                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input 
                          required
                          disabled={!isStep1Complete}
                          type="date"
                          value={birthDate}
                          onChange={e => setBirthDate(e.target.value)}
                          className="w-full pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-700 text-white text-sm rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder-slate-600 disabled:cursor-not-allowed disabled:bg-slate-900 [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-50"
                        />
                      </div>
                    </div>
                 </div>
             </div>

             {/* 3. STEP: EXAMS (Conditional Render / Style) */}
             <div className={`transition-all duration-500 ${isStep2Complete ? 'opacity-100 translate-y-0' : 'opacity-40 translate-y-4 pointer-events-none grayscale'}`}>
                 <div className="bg-slate-900/80 backdrop-blur-sm rounded-xl border border-slate-800 p-4 md:p-5 shadow-lg">
                    <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-2">
                       <div className="flex items-center space-x-2 text-slate-200">
                          <div className={`p-1.5 rounded-lg ${isStep2Complete ? 'bg-pink-500/10 text-pink-500' : 'bg-slate-700 text-slate-500'}`}>
                             <Activity className="w-4 h-4" />
                          </div>
                          <span className={`font-bold text-sm ${isStep2Complete ? 'text-white' : 'text-slate-500'}`}>3. Tetkik Seçimi</span>
                       </div>
                       {!isStep2Complete ? <Lock className="w-4 h-4 text-slate-600" /> : <div className="text-xs text-slate-500">{selectedExamIds.length} tetkik seçili</div>}
                    </div>

                    {/* Selected Exams (Badges) */}
                    <div className="mb-6">
                       <label className="text-xs font-medium text-slate-400 block mb-2">Yapılacak İşlemler</label>
                       {selectedExamIds.length > 0 ? (
                         <div className="flex flex-wrap gap-2">
                           {selectedExamIds.map(id => {
                              const exam = exams.find(e => e.name === id);
                              const isEkgAndMandatory = isEkgMandatory && id === 'EKG';
                              
                              return (
                                <div key={id} className={`group flex items-center pl-3 pr-2 py-2 border rounded-lg text-sm transition-all shadow-sm ${isEkgAndMandatory ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-200' : 'bg-blue-600/10 border-blue-500/30 hover:border-blue-500/60 text-blue-200'}`}>
                                   <span className="mr-2 font-medium">{id}</span>
                                   <div className="flex flex-col text-[10px] leading-tight mr-2 font-mono">
                                       <span className={isEkgAndMandatory ? 'text-indigo-400' : 'text-blue-400/70'}>Satış: ₺{exam?.price}</span>
                                       <span className="text-red-400/50">Mal: ₺{exam?.cost || 0}</span>
                                   </div>
                                   
                                   {isEkgAndMandatory ? (
                                      <div className="flex items-center space-x-1 px-2 py-0.5 rounded bg-indigo-500/20 border border-indigo-500/30 text-[10px] text-indigo-300 cursor-help" title={`Personel yaşı (${patientAge}) ${settings.ekgLimitAge} ve üzeri olduğu için zorunludur.`}>
                                        <Lock className="w-3 h-3" />
                                        <span>Zorunlu</span>
                                      </div>
                                   ) : (
                                     <button 
                                       type="button" 
                                       onClick={() => toggleExam(id)}
                                       className="p-1 hover:bg-blue-500/20 rounded-full text-blue-400 hover:text-white transition-colors"
                                     >
                                        <X className="w-3.5 h-3.5" />
                                     </button>
                                   )}
                                </div>
                              );
                           })}
                         </div>
                       ) : (
                         <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-800 rounded-lg text-slate-600 bg-slate-900/30">
                            <Activity className="w-6 h-6 mb-2 opacity-20" />
                            <span className="text-xs italic">Henüz tetkik seçilmedi. Firma seçildiğinde otomatik doldurulur.</span>
                         </div>
                       )}
                    </div>

                    {/* Add More Exams (Small Grid) */}
                    <div className="bg-slate-950/50 rounded-lg p-3 border border-slate-800">
                       <div className="flex items-center space-x-2 mb-3">
                          <Search className="w-3.5 h-3.5 text-slate-500" />
                          <input 
                            type="text" 
                            disabled={!isStep2Complete}
                            value={examSearchTerm}
                            onChange={e => setExamSearchTerm(e.target.value)}
                            placeholder="Listede olmayan tetkik ekle..."
                            className="bg-transparent border-none text-xs text-white placeholder-slate-600 focus:ring-0 w-full outline-none disabled:cursor-not-allowed"
                          />
                       </div>
                       <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-40 overflow-y-auto custom-scrollbar">
                          {filteredExams.filter(e => !selectedExamIds.includes(e.name)).map(exam => (
                             <button
                               key={exam.id}
                               type="button"
                               onClick={() => toggleExam(exam.name)}
                               className="flex items-center justify-between px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 rounded text-xs text-slate-300 transition-all text-left group"
                             >
                                <span className="truncate mr-1">{exam.name}</span>
                                <Plus className="w-3 h-3 opacity-0 group-hover:opacity-100 text-blue-400" />
                             </button>
                          ))}
                          {filteredExams.length === 0 && (
                             <span className="col-span-full text-center text-xs text-slate-600 py-2">Tetkik bulunamadı.</span>
                          )}
                       </div>
                    </div>
                 </div>
             </div>
          </div>

          {/* RIGHT COLUMN: Finance & Actions (Span 3) */}
          <div className={`col-span-12 lg:col-span-3 lg:h-fit lg:sticky lg:top-4 h-auto transition-all duration-700 ${isStep2Complete ? 'opacity-100 translate-x-0' : 'opacity-40 translate-x-4 pointer-events-none blur-[1px]'}`}>
             <div className="bg-slate-900/80 backdrop-blur-sm rounded-xl border border-slate-800 p-4 md:p-5 shadow-lg flex flex-col gap-6">
                <div className="flex items-center space-x-2 text-slate-200 border-b border-slate-800 pb-2">
                   <div className="p-1.5 bg-emerald-500/10 rounded-lg">
                      <Wallet className="w-4 h-4 text-emerald-500" />
                   </div>
                   <span className="font-bold text-sm">4. Finansal Özet</span>
                </div>

                {/* Payment Method Toggle */}
                <div className="bg-slate-950 rounded-lg p-1 flex border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('INVOICE')}
                    className={`flex-1 py-2 rounded text-[10px] font-bold transition-all flex flex-col items-center justify-center space-y-1 ${paymentMethod === 'INVOICE' ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    <Receipt className="w-4 h-4" />
                    <span>CARİ / FATURA</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CASH')}
                    className={`flex-1 py-2 rounded text-[10px] font-bold transition-all flex flex-col items-center justify-center space-y-1 ${paymentMethod === 'CASH' ? 'bg-emerald-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    <Wallet className="w-4 h-4" />
                    <span>NAKİT / ELDEN</span>
                  </button>
                </div>

                {/* Price Display */}
                <div className={`p-4 rounded-xl border text-center transition-all ${paymentMethod === 'CASH' ? 'bg-emerald-900/20 border-emerald-500/50' : 'bg-slate-950 border-slate-800'}`}>
                   <span className="text-[10px] text-slate-400 font-medium block mb-1 uppercase tracking-wider">
                      {paymentMethod === 'CASH' ? 'Tahsil Edilecek' : 'Cari Bakiye'}
                   </span>
                   <div className="flex items-center justify-center">
                      <span className="text-lg font-light text-slate-500 mr-1">₺</span>
                      <span className={`text-3xl font-bold tracking-tight ${paymentMethod === 'CASH' ? 'text-emerald-400' : 'text-blue-400'}`}>
                        {estimatedPrice.toLocaleString('tr-TR')}
                      </span>
                   </div>
                   {estimatedCost > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-800/50">
                          <span className="text-[10px] text-red-400/70 block">
                              Tahmini Kurum Ödemesi (Maliyet): ₺{estimatedCost}
                          </span>
                      </div>
                   )}
                </div>

                {/* Notes Input */}
                <div>
                   <label className="text-xs font-medium text-slate-500 block mb-1">Notlar</label>
                   <textarea 
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      rows={3}
                      className="w-full p-3 bg-slate-950 border border-slate-700 text-white rounded-lg focus:ring-1 focus:ring-slate-500 outline-none text-xs resize-none"
                      placeholder="İşlem notu..."
                   />
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-3 mt-2">
                    <button 
                      type="button"
                      onClick={onClose}
                      className="py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-medium rounded-xl transition-all text-sm"
                    >
                      İptal
                    </button>
                    <button 
                      type="submit"
                      disabled={!isStep2Complete}
                      className={`py-3 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2 active:scale-95 text-sm ${paymentMethod === 'CASH' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/20'} ${!isStep2Complete ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <Save className="w-4 h-4" />
                      <span>KAYDET</span>
                    </button>
                </div>
             </div>
          </div>
      </form>
    </div>
  );
};