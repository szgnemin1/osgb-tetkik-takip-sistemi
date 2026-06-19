import React, { useState, useMemo } from 'react';
import { 
  X, 
  Upload, 
  Check, 
  AlertTriangle, 
  Play, 
  HelpCircle, 
  FileText, 
  CheckCircle2, 
  Info,
  Building,
  CreditCard
} from 'lucide-react';
import { Company, ExamDefinition, MedicalInstitution, Referral, Status, SafeTransaction } from '../types';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  companies: Company[];
  exams: ExamDefinition[];
  institutions: MedicalInstitution[];
  onImportCompleted: () => void;
  saveReferralToDb: (referral: Referral) => Promise<void>;
  saveTransactionToDb: (transaction: SafeTransaction) => Promise<void>;
}

interface ParsedRow {
  rowId: string;
  originalText: string;
  dateStr: string;
  parsedDate: string;
  name: string;
  tcNo: string;
  rawExams: string;
  matchedExamNames: string[];
  totalPrice: number;
  totalCost: number;
  isValid: boolean;
  errors: string[];
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({
  isOpen,
  onClose,
  companies,
  exams,
  institutions,
  onImportCompleted,
  saveReferralToDb,
  saveTransactionToDb
}) => {
  const [inputText, setInputText] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [selectedInstitutionId, setSelectedInstitutionId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'POS' | 'INVOICE'>('INVOICE');
  const [defaultStatus, setDefaultStatus] = useState<Status>(Status.PENDING);
  
  // Progress & Execution State
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importMessage, setImportMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const selectedCompany = useMemo(() => {
    return companies.find(c => c.id === selectedCompanyId) || null;
  }, [companies, selectedCompanyId]);

  // When company changes, load company's default settings
  const handleCompanyChange = (companyId: string) => {
    setSelectedCompanyId(companyId);
    const comp = companies.find(c => c.id === companyId);
    if (comp) {
      setPaymentMethod(comp.defaultPaymentMethod || 'INVOICE');
      if (comp.forcedInstitutionId) {
        setSelectedInstitutionId(comp.forcedInstitutionId);
      } else if (institutions.length > 0 && !selectedInstitutionId) {
        setSelectedInstitutionId(institutions[0].id);
      }
    }
  };

  // Helper to normalize strings for robust Turkish character comparison
  const normalizeStr = (str: string): string => {
    return str
      .toLowerCase()
      .trim()
      .replace(/ı/g, 'i')
      .replace(/ş/g, 's')
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/[^a-z0-9]/g, ''); // Sadece alfanumerik karakterler
  };

  // Explicit Turkish Date parser
  const parseTurkishDate = (dateStr: string): string => {
    const trimmed = dateStr.trim();
    if (!trimmed) return new Date().toISOString();
    
    // Format: DD.MM.YYYY HH:mm or DD.MM.YYYY
    const parts = trimmed.split(' ');
    const dateParts = parts[0].split('.');
    if (dateParts.length === 3) {
      const day = parseInt(dateParts[0], 10);
      const month = parseInt(dateParts[1], 10) - 1; // 0-indexed month
      const year = parseInt(dateParts[2], 10);
      
      let hour = 12;
      let minute = 0;
      
      if (parts[1]) {
        const timeParts = parts[1].split(':');
        if (timeParts.length >= 2) {
           hour = parseInt(timeParts[0], 10);
           minute = parseInt(timeParts[1], 10);
        }
      }
      
      const d = new Date(year, month, day, hour, minute);
      if (!isNaN(d.getTime())) {
         return d.toISOString();
      }
    }
    
    // Fallback parsing
    const parsed = Date.parse(trimmed);
    if (!isNaN(parsed)) {
       return new Date(parsed).toISOString();
    }
    
    return new Date().toISOString();
  };

  // Parse Raw input text
  const handleParseInput = (text: string) => {
    setInputText(text);
    if (!text.trim()) {
      setParsedRows([]);
      return;
    }

    const lines = text.split('\n');
    const rows: ParsedRow[] = [];

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return; // Boş satırları atla

      // Başlık satırı kontrolü (Tarih, İsim, T.C. Kimlik kelimeleri geçiyorsa ve ilk satırlardaysa atla)
      const lowerLine = trimmedLine.toLowerCase();
      if (index === 0 && (lowerLine.includes('tarih') || lowerLine.includes('isim') || lowerLine.includes('t.c.') || lowerLine.includes('kimlik') || lowerLine.includes('tetkik'))) {
         return; // Başlık satırını atla
      }

      // Tab veya Noktalı virgül ile split et
      const parts = trimmedLine.split(/\t|;/).map(p => p.trim());
      
      let dateVal = '';
      let nameVal = '';
      let tcVal = '';
      let rawExamsVal = '';

      // Sütun sayısına göre en uygun yerleşimi heuristik olarak belirle
      if (parts.length >= 4) {
        dateVal = parts[0];
        nameVal = parts[1];
        tcVal = parts[2];
        rawExamsVal = parts[3];
      } else if (parts.length === 3) {
        // Tarih mi yoksa Tetkik mi eksik?
        const firstIsDateLike = /^[0-9./: ]+$/.test(parts[0]) && (parts[0].includes('.') || parts[0].includes('/') || parts[0].includes(':'));
        const secondIsTCLike = /^[0-9]+$/.test(parts[1]) && parts[1].length === 11;

        if (firstIsDateLike || secondIsTCLike) {
          // Tarih / İsim / TC formatı (Tetkik boş)
          dateVal = parts[0];
          nameVal = parts[1];
          tcVal = parts[2];
          rawExamsVal = '';
        } else {
          // İsim / TC / Tetkik formatı (Tarih yok)
          dateVal = '';
          nameVal = parts[0];
          tcVal = parts[1];
          rawExamsVal = parts[2];
        }
      } else if (parts.length === 2) {
        // İsim / TC formatı
        dateVal = '';
        nameVal = parts[0];
        tcVal = parts[1];
        rawExamsVal = '';
      } else {
        // Sadece İsim
        dateVal = '';
        nameVal = parts[0];
        tcVal = '';
        rawExamsVal = '';
      }

      // T.C. Kimlik Temizle ve Doğrula
      const cleanTc = tcVal.replace(/\s+/g, '');
      const isTcValid = /^[0-9]{11}$/.test(cleanTc);

      // Tetkikleri Ayıkla ve Eşleştir (koda yazılan akıllı eşleştirici)
      const matchedNames: string[] = [];
      let rowPrice = 0;
      let rowCost = 0;

      if (rawExamsVal) {
        // Tetkikleri virgüle, artıya veya noktalı virgüle göre parçala
        const examChunks = rawExamsVal.split(/[,+;]/).map(c => c.trim()).filter(Boolean);
        
        examChunks.forEach(chunk => {
          const normChunk = normalizeStr(chunk);
          if (!normChunk) return;

          // Veritabanındaki tetkiklerle akıllı eşleştirme (İsim, kod veya alt string)
          const matchedDef = exams.find(ex => {
            const normName = normalizeStr(ex.name);
            const normCode = normalizeStr(ex.code);
            return normName === normChunk || 
                   normCode === normChunk || 
                   normName.includes(normChunk) || 
                   normChunk.includes(normName);
          });

          if (matchedDef) {
            if (!matchedNames.includes(matchedDef.name)) {
              matchedNames.push(matchedDef.name);
              rowPrice += matchedDef.price;
              rowCost += (matchedDef.cost || 0);
            }
          }
        });
      }

      const rowErrors: string[] = [];
      if (!nameVal) rowErrors.push('İsim alanı boş olamaz.');
      if (cleanTc && !isTcValid) rowErrors.push('Geçersiz T.C. Kimlik numarası (11 haneli sayı olmalıdır).');

      rows.push({
        rowId: `row-${index}-${Math.random().toString(36).substr(2, 5)}`,
        originalText: trimmedLine,
        dateStr: dateVal,
        parsedDate: parseTurkishDate(dateVal),
        name: nameVal,
        tcNo: cleanTc,
        rawExams: rawExamsVal,
        matchedExamNames: matchedNames,
        totalPrice: rowPrice,
        totalCost: rowCost,
        isValid: rowErrors.length === 0,
        errors: rowErrors
      });
    });

    setParsedRows(rows);
  };

  // Run the batch import
  const handleStartImport = async () => {
    if (!selectedCompanyId) {
      alert("Lütfen tüm kayıtların ekleneceği firmayı seçin.");
      return;
    }
    if (!selectedInstitutionId) {
      alert("Lütfen sevk edilecek kurumu seçin.");
      return;
    }
    if (parsedRows.length === 0) {
      alert("Lütfen önce sevk bilgilerini yapıştırın ve eşleştirin.");
      return;
    }

    const validRows = parsedRows.filter(r => r.isValid);
    if (validRows.length === 0) {
      alert("İçe aktarılacak geçerli bir kayıt bulunamadı. Lütfen hataları giderin.");
      return;
    }

    if (!window.confirm(`${validRows.length} adet geçerli kaydı şimdi veritabanına aktarmak istiyor musunuz?`)) {
      return;
    }

    setIsProcessing(true);
    setImportProgress(0);
    setIsSuccess(false);

    try {
      const company = companies.find(c => c.id === selectedCompanyId)!;

      for (let i = 0; i < validRows.length; i++) {
        const row = validRows[i];

        // Tetkik bulunamadıysa firmanın varsayılan tetkiklerini aktaralım
        const finalExams = row.matchedExamNames.length > 0 ? row.matchedExamNames : company.defaultExams;
        
        let customPrice = row.totalPrice;
        let customCost = row.totalCost;

        // Eğer tetkikler varsayılana döndüyse fiyatları tekrar hesaplayalım
        if (row.matchedExamNames.length === 0) {
           finalExams.forEach(examName => {
              const exDef = exams.find(e => e.name === examName);
              if (exDef) {
                customPrice += exDef.price;
                customCost += (exDef.cost || 0);
              }
           });
        }

        const referralId = Math.random().toString(36).substr(2, 9);
        const employeeId = Math.random().toString(36).substr(2, 9);

        const newReferral: Referral = {
          id: referralId,
          employee: {
            id: employeeId,
            fullName: row.name,
            tcNo: row.tcNo,
            company: company.name
          },
          exams: finalExams,
          status: defaultStatus,
          referralDate: row.parsedDate,
          notes: row.rawExams ? `Toplu Ekleme ile Eklendi (Kullanıcı metni: ${row.rawExams})` : 'Toplu Ekleme ile Eklendi',
          doctorName: company.assignedDoctor,
          specialistName: company.assignedSpecialist,
          totalPrice: customPrice,
          totalCost: customCost,
          paymentMethod: paymentMethod,
          targetInstitutionId: selectedInstitutionId
        };

        // 1. Save Referral
        await saveReferralToDb(newReferral);

        // 2. Save Transaction if Cash or Pos
        if ((paymentMethod === 'CASH' || paymentMethod === 'POS') && customPrice > 0) {
          const typeLabel = paymentMethod === 'CASH' ? 'Nakit' : 'Pos';
          const newTransaction: SafeTransaction = {
            id: Math.random().toString(36).substr(2, 9),
            type: 'INCOME',
            amount: customPrice,
            description: `Sevk Geliri (${typeLabel} - Toplu Giriş): ${row.name} (${company.name})`,
            date: row.parsedDate,
            paymentMethod: paymentMethod,
            referralId: referralId
          };
          await saveTransactionToDb(newTransaction);
        }

        // Update progress UI
        const percent = Math.round(((i + 1) / validRows.length) * 100);
        setImportProgress(percent);
        setImportMessage(`Kayıt aktarılıyor: ${row.name} (${i + 1}/${validRows.length})`);
      }

      setImportMessage(`Başarıyla tamamlandı! Toplam ${validRows.length} kayıt aktarıldı.`);
      setIsSuccess(true);
      setTimeout(() => {
        onImportCompleted();
        onClose();
        // Reset state
        setInputText('');
        setParsedRows([]);
        setIsSuccess(false);
        setIsProcessing(false);
      }, 2000);

    } catch (err: any) {
      console.error(err);
      alert(`Toplu ekleme sırasında bir sunucu hatası oluştu: ${err.message}`);
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 rounded-xl shadow-2xl border border-slate-700 w-full max-w-5xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/70 rounded-t-xl">
          <div className="flex items-center space-x-3">
             <div className="p-2 bg-blue-600/10 rounded border border-blue-500/20">
                <Upload className="w-5 h-5 text-blue-400" />
             </div>
             <div>
                <h3 className="text-lg font-bold text-white">Yazılım Üzerinden Toplu Sevk Girişi (Excel / Metin)</h3>
                <p className="text-xs text-slate-400">Excel'deki satırları doğrudan buraya kopyalayarak saniyeler içinde toplu sevk oluşturun.</p>
             </div>
          </div>
          <button 
            disabled={isProcessing}
            onClick={onClose} 
            className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded transition-colors disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* Format Helper */}
          <div className="bg-slate-800/40 border border-slate-700/50 p-4 rounded-lg flex items-start gap-3.5">
             <HelpCircle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
             <div className="text-xs text-slate-300 leading-relaxed space-y-2">
                <p>
                  <strong>Kopyala-Yapıştır Formatı:</strong> Excel tablonuzdan aşağıdaki sütunları seçip kopyalayın ve aşağıdaki alana yapıştırın. Sütunların sırası:
                </p>
                <div className="bg-slate-950 p-2 rounded-md font-mono text-blue-300 border border-slate-800 text-[11px] select-all inline-block">
                  Tarih / Saat [Örn: 19.06.2026 13:45] <span className="text-slate-600 font-sans">⇥ (Sekme)</span> İsim <span className="text-slate-600 font-sans">⇥</span> T.C. Kimlik <span className="text-slate-600 font-sans">⇥</span> Tetkikler [Örn: Hemogram, EKG]
                </div>
                <p className="text-slate-400 text-[11px]">
                  * İpucu: Eğer satırda tetkik metni boş bırakılırsa, personellere seçtiğiniz firmanın varsayılan tetkikleri paket olarak otomatik olarak atanır.
                </p>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
             {/* Company Selector */}
             <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                   <Building className="w-3.5 h-3.5 text-blue-400" />
                   Firma seçin *
                </label>
                <select
                  disabled={isProcessing}
                  required
                  value={selectedCompanyId}
                  onChange={(e) => handleCompanyChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 text-sm outline-none cursor-pointer"
                >
                  <option value="">-- Firma Seçin --</option>
                  {companies.map(c => (
                     <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
             </div>

             {/* Target Institution Selector */}
             <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                   <Info className="w-3.5 h-3.5 text-blue-400" />
                   Sevk Edilecek Kurum *
                </label>
                <select
                  disabled={isProcessing}
                  value={selectedInstitutionId}
                  onChange={(e) => setSelectedInstitutionId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 text-sm outline-none cursor-pointer"
                >
                  <option value="">-- Kurum Seçin --</option>
                  {institutions.map(inst => (
                     <option key={inst.id} value={inst.id}>{inst.name}</option>
                  ))}
                </select>
             </div>

             {/* Payment Method Selector */}
             <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                   <CreditCard className="w-3.5 h-3.5 text-blue-400" />
                   Ödeme Tipi
                </label>
                <select
                  disabled={isProcessing}
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 text-sm outline-none cursor-pointer"
                >
                  <option value="INVOICE">Cari / Fatura</option>
                  <option value="CASH">Nakit Ödeme</option>
                  <option value="POS">Kredi Kartı / POS</option>
                </select>
             </div>

             {/* Default Status Selector */}
             <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                   Kayıt Sevk Statüsü
                </label>
                <select
                  disabled={isProcessing}
                  value={defaultStatus}
                  onChange={(e) => setDefaultStatus(e.target.value as Status)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 text-sm outline-none cursor-pointer"
                >
                  <option value={Status.PENDING}>Bekliyor (Gitmedi)</option>
                  <option value={Status.AT_HOSPITAL}>Hastanede / Tetkikte</option>
                  <option value={Status.AWAITING_RESULT}>Sonuç Bekleniyor</option>
                </select>
             </div>
          </div>

          {/* Text Area Input */}
          <div className="space-y-2">
             <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Pano Verisini Yapıştırın (Excel Satırları)
             </label>
             <textarea
               disabled={isProcessing}
               rows={6}
               value={inputText}
               onChange={(e) => handleParseInput(e.target.value)}
               placeholder="Excel'den hücreleri kopyalayıp buraya yapıştırın (Örn: 19.06.2026 14:00	Ahmet Yılmaz	11122233344	Hemogram, Akciğer Grafisi)"
               className="w-full font-mono p-3 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:ring-2 focus:ring-blue-500 outline-none text-xs leading-relaxed custom-scrollbar"
             />
          </div>

          {/* Parsed Result Preview */}
          {parsedRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex justify-between items-center bg-slate-950 px-4 py-2 border border-slate-800 rounded-lg">
                <span className="text-xs font-bold text-blue-400 flex items-center gap-1">
                   <Info className="w-4 h-4" />
                   Eşleşme Önizlemesi ({parsedRows.length} satır ayrıştırıldı. {parsedRows.filter(r => r.isValid).length} geçerli)
                </span>
                {selectedCompany && (
                   <span className="text-[11px] text-slate-400">
                      Boş tetkikler için atanacak varsayılan paket: <strong>{company.defaultExams.join(', ') || 'Yok'}</strong>
                   </span>
                )}
              </div>

              <div className="border border-slate-800 rounded-xl bg-slate-950/20 overflow-hidden">
                <div className="overflow-x-auto max-h-72 custom-scrollbar">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-900 text-slate-400 uppercase tracking-widest text-[10px] border-b border-slate-800">
                        <th className="px-4 py-3">Durum</th>
                        <th className="px-4 py-3">Sevk Zamanı</th>
                        <th className="px-4 py-3">T.C. Kimlik No</th>
                        <th className="px-4 py-3">İsim Soyisim</th>
                        <th className="px-4 py-3">Eşleşen Tetkikler (Kod/İsim)</th>
                        <th className="px-4 py-3 text-right">Tutar / Maliyet</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {parsedRows.map((row) => (
                        <tr key={row.rowId} className={`hover:bg-slate-800/20 ${!row.isValid ? 'bg-red-500/5' : ''}`}>
                          <td className="px-4 py-2.5">
                            {row.isValid ? (
                              <span className="text-emerald-500 flex items-center gap-1.5 font-semibold">
                                 <Check className="w-4 h-4" /> Tamam
                              </span>
                            ) : (
                              <span className="text-red-400 flex items-center gap-1 text-[11px]" title={row.errors.join(', ')}>
                                 <AlertTriangle className="w-3.5 h-3.5" /> Hata
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-slate-300 font-mono">
                            {row.dateStr ? (
                              <span>{row.dateStr}</span>
                            ) : (
                              <span className="text-slate-500 italic">Şu anki tarih</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-slate-300 font-mono">{row.tcNo || <span className="text-red-400">Eksik!</span>}</td>
                          <td className="px-4 py-2.5 text-white font-medium">{row.name}</td>
                          <td className="px-4 py-2.5">
                             {row.matchedExamNames.length > 0 ? (
                               <div className="flex flex-wrap gap-1.5">
                                 {row.matchedExamNames.map((exName, idx) => (
                                   <span key={idx} className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded text-[10px] font-medium">
                                      {exName}
                                   </span>
                                 ))}
                               </div>
                             ) : (
                               <span className="text-amber-500 italic text-[11px]">
                                 {selectedCompany ? 'Firma Varsayılanları Atanacak' : 'Tetkiksiz Sevk'}
                               </span>
                             )}
                          </td>
                          <td className="px-4 py-2.5 text-right font-semibold">
                            {row.matchedExamNames.length > 0 ? (
                              <div className="space-y-0.5">
                                <p className="text-emerald-400">₺{row.totalPrice.toLocaleString('tr-TR')}</p>
                                <p className="text-slate-500 text-[9px]">Mal: ₺{row.totalCost.toLocaleString('tr-TR')}</p>
                              </div>
                            ) : (
                              <span className="text-slate-500">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Execution overlay inside modal while processing */}
          {isProcessing && (
            <div className="bg-slate-950/90 border border-blue-500/20 p-6 rounded-xl flex flex-col items-center justify-center space-y-4">
              <div className="flex items-center space-x-3 text-blue-400">
                <CheckCircle2 className="w-6 h-6 animate-pulse" />
                <span className="font-bold text-sm text-white">{importMessage}</span>
              </div>
              <div className="w-full max-w-md bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full transition-all duration-300"
                  style={{ width: `${importProgress}%` }}
                />
              </div>
              <span className="text-xs text-slate-400 font-mono font-semibold">% {importProgress} Tamamlandı</span>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-950/80 border-t border-slate-800 flex justify-between items-center rounded-b-xl">
           <div className="text-xs text-slate-500">
              * T.C. Kimliklerin sistem tarafından doğrulanabilmesi için 11 haneli sayı olmaları zorunludur.
           </div>
           <div className="flex space-x-3">
              <button
                disabled={isProcessing}
                onClick={onClose}
                className="px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 rounded-lg transition-colors font-medium disabled:opacity-50"
              >
                İptal
              </button>
              <button
                disabled={isProcessing || !selectedCompanyId || !selectedInstitutionId || parsedRows.filter(r => r.isValid).length === 0}
                onClick={handleStartImport}
                className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600 text-white px-5 py-2 rounded-lg text-sm font-bold transition-all shadow-lg active:scale-95"
              >
                <Play className="w-4 h-4" />
                <span>Kayıtları Aktarmaya Başla ({parsedRows.filter(r => r.isValid).length})</span>
              </button>
           </div>
        </div>

      </div>
    </div>
  );
};
