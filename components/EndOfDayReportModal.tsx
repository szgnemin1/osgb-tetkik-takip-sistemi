import React, { useMemo, useState } from 'react';
import { X, Printer, Calculator, Calendar, Building2, CalendarDays, CalendarRange, Stethoscope, Download, FileText } from 'lucide-react';
import { Referral, SafeTransaction, AppSettings } from '../types';

interface EndOfDayReportModalProps {
  onClose: () => void;
  referrals: Referral[];
  transactions: SafeTransaction[];
  settings?: AppSettings;
}

type ReportPeriod = 'daily' | 'weekly' | 'monthly';

export const EndOfDayReportModal: React.FC<EndOfDayReportModalProps> = ({ onClose, referrals, transactions, settings }) => {
  const [period, setPeriod] = useState<ReportPeriod>('daily');
  const now = new Date();

  // Calculate Date Range based on Period
  const dateRange = useMemo(() => {
    const end = new Date(); // Now
    const start = new Date(); 
    start.setHours(0, 0, 0, 0);

    if (period === 'weekly') {
      // Set to Monday of the current week
      const day = start.getDay() || 7; // Get current day (1=Mon, ..., 7=Sun)
      if (day !== 1) {
        start.setHours(-24 * (day - 1));
      }
    } else if (period === 'monthly') {
      // Set to 1st of the current month
      start.setDate(1);
    }
    // 'daily' is already set to start of today

    return { start, end };
  }, [period]);

  const reportData = useMemo(() => {
    // Filter referrals within range
    const filteredReferrals = referrals.filter(r => {
      const d = new Date(r.referralDate);
      return d >= dateRange.start && d <= dateRange.end;
    });

    // Filter transactions within range
    const filteredTransactions = transactions.filter(t => {
      const d = new Date(t.date);
      return d >= dateRange.start && d <= dateRange.end;
    });

    // Calculate Finances for the Period
    const totalIncome = filteredTransactions
      .filter(t => t.type === 'INCOME')
      .reduce((acc, curr) => acc + curr.amount, 0);

    const totalExpense = filteredTransactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((acc, curr) => acc + curr.amount, 0);

    // Calculate Total Balance (Absolute Current System State - All Time)
    const currentTotalBalance = transactions.reduce((acc, curr) => {
      return curr.type === 'INCOME' ? acc + curr.amount : acc - curr.amount;
    }, 0);

    // Referral Costs (Maliyet)
    const totalReferralCost = filteredReferrals.reduce((acc, curr) => acc + (curr.totalCost || 0), 0);
    const totalReferralPrice = filteredReferrals.reduce((acc, curr) => acc + (curr.totalPrice || 0), 0);
    const estimatedProfit = totalReferralPrice - totalReferralCost;

    // Opening Balance for this Period = Current Balance - (Net Change during this period)
    const periodNetChange = totalIncome - totalExpense;
    const openingBalance = currentTotalBalance - periodNetChange;

    return {
      referrals: filteredReferrals,
      transactions: filteredTransactions,
      totalIncome,
      totalExpense,
      openingBalance,
      closingBalance: currentTotalBalance,
      totalReferralCost,
      totalReferralPrice,
      estimatedProfit
    };
  }, [referrals, transactions, dateRange]);

  const getTitle = () => {
    switch(period) {
      case 'weekly': return 'HAFTALIK FAALİYET RAPORU';
      case 'monthly': return 'AYLIK FAALİYET RAPORU';
      default: return 'GÜN SONU RAPORU (Z RAPORU)';
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/90 z-50 overflow-y-auto print:bg-white print:overflow-visible">
      {/* --- Screen Controls (Hidden on Print) --- */}
      <div className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 py-3 flex justify-between items-center print:hidden shadow-lg">
        <div className="flex items-center space-x-4">
           <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
              <button 
                onClick={() => setPeriod('daily')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${period === 'daily' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                Günlük
              </button>
              <button 
                onClick={() => setPeriod('weekly')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${period === 'weekly' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                Haftalık
              </button>
              <button 
                onClick={() => setPeriod('monthly')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${period === 'monthly' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                Aylık
              </button>
           </div>
           <span className="text-slate-500 text-sm hidden md:inline">|</span>
           <span className="text-slate-400 text-sm hidden md:inline">
              Önizleme Modu
           </span>
        </div>
        <div className="flex items-center space-x-3">
           <button 
             onClick={handlePrint}
             className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg shadow-emerald-900/20 transition-all"
           >
             <Printer className="w-4 h-4" />
             <span>Yazdır / PDF</span>
           </button>
           <button 
             onClick={onClose}
             className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors"
           >
             <X className="w-5 h-5" />
           </button>
        </div>
      </div>

      {/* --- A4 Paper Container --- */}
      <div className="flex justify-center py-8 print:py-0 print:block">
        <div className="bg-white text-slate-900 w-[210mm] min-h-[297mm] shadow-2xl print:shadow-none print:w-full print:h-full print:m-0 box-border relative overflow-hidden">
           
           {/* Top Color Bar */}
           <div className="h-2 w-full bg-blue-900 print:bg-blue-900"></div>

           <div className="p-10 print:p-8 space-y-8">
              
              {/* Report Header */}
              <div className="flex justify-between items-start border-b-2 border-slate-100 pb-6">
                 <div className="flex items-center space-x-3">
                    {settings?.companyLogo ? (
                        <img src={settings.companyLogo} alt="Firma Logosu" className="h-16 w-auto object-contain" />
                    ) : (
                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                          <Stethoscope className="w-8 h-8 text-blue-900" />
                        </div>
                    )}
                    
                    {!settings?.companyLogo && (
                        <div>
                        <h1 className="text-xl font-bold text-slate-900 tracking-tight">OSGB PRO</h1>
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-widest">Tetkik Takip Sistemi</p>
                        </div>
                    )}
                 </div>
                 <div className="text-right">
                    <h2 className="text-lg font-bold text-slate-900 uppercase tracking-tight">{getTitle()}</h2>
                    <p className="text-xs text-slate-500 mt-1">Rapor No: #{Math.floor(Math.random() * 100000)}</p>
                    <p className="text-xs text-slate-500">Oluşturulma: {now.toLocaleDateString('tr-TR')} {now.toLocaleTimeString('tr-TR')}</p>
                 </div>
              </div>

              {/* Info Grid */}
              <div className="bg-slate-50 rounded border border-slate-200 p-4 flex justify-between items-center text-sm">
                  <div>
                     <span className="text-slate-500 font-medium block text-xs uppercase mb-1">Rapor Periyodu</span>
                     <span className="font-bold text-slate-800">
                        {dateRange.start.toLocaleDateString('tr-TR')} - {dateRange.end.toLocaleDateString('tr-TR')}
                     </span>
                  </div>
                  <div className="text-right">
                     <span className="text-slate-500 font-medium block text-xs uppercase mb-1">Şube / Birim</span>
                     <span className="font-bold text-slate-800">Merkez Ofis / Kasa</span>
                  </div>
              </div>

              {/* Financial Summary */}
              <div>
                 <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center">
                    <Calculator className="w-3.5 h-3.5 mr-1" />
                    Finansal Özet Tablosu
                 </h3>
                 <div className="grid grid-cols-4 gap-4">
                    <div className="p-4 rounded border border-slate-200 bg-white shadow-sm">
                       <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">AÇILIŞ BAKİYESİ</p>
                       <p className="text-lg font-bold text-slate-700">₺{reportData.openingBalance.toLocaleString('tr-TR')}</p>
                    </div>
                    <div className="p-4 rounded border border-emerald-100 bg-emerald-50/30 shadow-sm">
                       <p className="text-[10px] text-emerald-600 font-bold uppercase mb-1">GİRİŞLER (+)</p>
                       <p className="text-lg font-bold text-emerald-700">₺{reportData.totalIncome.toLocaleString('tr-TR')}</p>
                    </div>
                    <div className="p-4 rounded border border-red-100 bg-red-50/30 shadow-sm">
                       <p className="text-[10px] text-red-600 font-bold uppercase mb-1">ÇIKIŞLAR (-)</p>
                       <p className="text-lg font-bold text-red-700">₺{reportData.totalExpense.toLocaleString('tr-TR')}</p>
                    </div>
                    <div className="p-4 rounded border border-blue-200 bg-blue-50 shadow-sm relative overflow-hidden">
                       <div className="absolute right-0 top-0 p-2 opacity-10"><Calculator className="w-12 h-12" /></div>
                       <p className="text-[10px] text-blue-600 font-bold uppercase mb-1">GÜNCEL KASA</p>
                       <p className="text-xl font-bold text-blue-800">₺{reportData.closingBalance.toLocaleString('tr-TR')}</p>
                    </div>
                 </div>
              </div>

              {/* Transactions Table */}
              {reportData.transactions.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 mt-6 flex items-center">
                      <FileText className="w-3.5 h-3.5 mr-1" />
                      Kasa Hareket Dökümü
                  </h3>
                  <table className="w-full text-left text-xs border border-slate-200">
                     <thead className="bg-slate-100 text-slate-600">
                        <tr>
                           <th className="px-3 py-2 font-bold border-b border-slate-200">Saat</th>
                           <th className="px-3 py-2 font-bold border-b border-slate-200">Açıklama</th>
                           <th className="px-3 py-2 font-bold border-b border-slate-200 text-right">Giriş</th>
                           <th className="px-3 py-2 font-bold border-b border-slate-200 text-right">Çıkış</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                        {reportData.transactions.map(tx => (
                           <tr key={tx.id}>
                              <td className="px-3 py-1.5 text-slate-500 font-mono">
                                 {new Date(tx.date).toLocaleTimeString('tr-TR', {hour: '2-digit', minute:'2-digit'})}
                              </td>
                              <td className="px-3 py-1.5 text-slate-800 font-medium">
                                 {tx.description}
                              </td>
                              <td className="px-3 py-1.5 text-right font-mono text-emerald-600">
                                 {tx.type === 'INCOME' ? `₺${tx.amount.toLocaleString('tr-TR')}` : '-'}
                              </td>
                              <td className="px-3 py-1.5 text-right font-mono text-red-600">
                                 {tx.type === 'EXPENSE' ? `₺${tx.amount.toLocaleString('tr-TR')}` : '-'}
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
                </div>
              )}

              {/* Personnel Referrals Table */}
              <div>
                 <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 mt-6 flex items-center">
                    <Building2 className="w-3.5 h-3.5 mr-1" />
                    Personel Sevk Listesi ve Maliyet Tablosu
                 </h3>
                 <table className="w-full text-left text-xs border border-slate-200">
                    <thead className="bg-slate-100 text-slate-600">
                       <tr>
                          <th className="px-3 py-2 font-bold border-b border-slate-200">Tarih</th>
                          <th className="px-3 py-2 font-bold border-b border-slate-200">Personel</th>
                          <th className="px-3 py-2 font-bold border-b border-slate-200">Firma</th>
                          <th className="px-3 py-2 font-bold border-b border-slate-200">Ödeme</th>
                          <th className="px-3 py-2 font-bold border-b border-slate-200 text-right">Satış (Ciro)</th>
                          <th className="px-3 py-2 font-bold border-b border-slate-200 text-right">Kurum Ödemesi (Maliyet)</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                       {reportData.referrals.map(ref => (
                          <tr key={ref.id} className="text-slate-700">
                             <td className="px-3 py-1.5 text-slate-500 font-mono">
                                {new Date(ref.referralDate).toLocaleDateString('tr-TR')}
                             </td>
                             <td className="px-3 py-1.5 font-bold">{ref.employee.fullName}</td>
                             <td className="px-3 py-1.5">{ref.employee.company}</td>
                             <td className="px-3 py-1.5">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${ref.paymentMethod === 'CASH' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                                   {ref.paymentMethod === 'CASH' ? 'Nakit' : 'Cari'}
                                </span>
                             </td>
                             <td className="px-3 py-1.5 text-right font-mono font-medium text-blue-700">
                                ₺{ref.totalPrice?.toLocaleString('tr-TR')}
                             </td>
                             <td className="px-3 py-1.5 text-right font-mono font-medium text-red-600">
                                ₺{ref.totalCost?.toLocaleString('tr-TR') || '0'}
                             </td>
                          </tr>
                       ))}
                       {reportData.referrals.length === 0 && (
                          <tr><td colSpan={6} className="text-center py-4 text-slate-400 italic">Kayıt bulunamadı.</td></tr>
                       )}
                       {reportData.referrals.length > 0 && (
                           <tr className="bg-slate-50 font-bold border-t-2 border-slate-300">
                               <td colSpan={4} className="px-3 py-2 text-right uppercase text-slate-600">Genel Toplam</td>
                               <td className="px-3 py-2 text-right text-blue-700">₺{reportData.totalReferralPrice.toLocaleString('tr-TR')}</td>
                               <td className="px-3 py-2 text-right text-red-600">₺{reportData.totalReferralCost.toLocaleString('tr-TR')}</td>
                           </tr>
                       )}
                    </tbody>
                 </table>
                 
                 {/* Profit Summary */}
                 {reportData.referrals.length > 0 && (
                     <div className="mt-4 flex justify-end">
                         <div className="bg-slate-100 p-4 rounded-lg border border-slate-200 min-w-[250px]">
                             <div className="flex justify-between mb-2 text-xs">
                                 <span className="text-slate-500">Toplam Ciro:</span>
                                 <span className="font-bold">₺{reportData.totalReferralPrice.toLocaleString('tr-TR')}</span>
                             </div>
                             <div className="flex justify-between mb-2 text-xs">
                                 <span className="text-slate-500">Toplam Maliyet:</span>
                                 <span className="font-bold text-red-600">- ₺{reportData.totalReferralCost.toLocaleString('tr-TR')}</span>
                             </div>
                             <div className="border-t border-slate-300 pt-2 flex justify-between text-sm">
                                 <span className="font-bold text-slate-700">Tahmini Kâr:</span>
                                 <span className={`font-bold ${reportData.estimatedProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                     ₺{reportData.estimatedProfit.toLocaleString('tr-TR')}
                                 </span>
                             </div>
                         </div>
                     </div>
                 )}
              </div>
              
              {/* Signatures Footer */}
              <div className="mt-12 pt-8 border-t border-slate-200 grid grid-cols-2 gap-20">
                  <div className="text-center">
                     <p className="text-xs font-bold text-slate-900 uppercase mb-8">Teslim Eden (Kasa)</p>
                     <div className="h-px w-32 bg-slate-400 mx-auto"></div>
                     <p className="text-[10px] text-slate-500 mt-1">İmza / Tarih</p>
                  </div>
                  <div className="text-center">
                     <p className="text-xs font-bold text-slate-900 uppercase mb-8">Teslim Alan (Yönetici)</p>
                     <div className="h-px w-32 bg-slate-400 mx-auto"></div>
                     <p className="text-[10px] text-slate-500 mt-1">İmza / Tarih</p>
                  </div>
              </div>
              
              {/* Print Footer */}
              <div className="absolute bottom-4 left-0 right-0 text-center">
                 <p className="text-[10px] text-slate-400">Bu belge OSGB Pro sistemi tarafından elektronik ortamda oluşturulmuştur.</p>
              </div>

           </div>
        </div>
      </div>
    </div>
  );
};