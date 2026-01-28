import React, { useMemo, useState } from 'react';
import { X, FileSpreadsheet, Wallet, Building2, TrendingUp, TrendingDown, CreditCard, Banknote, Receipt, Users, MapPin, Calculator } from 'lucide-react';
import { Referral, SafeTransaction, AppSettings, MedicalInstitution } from '../types';
import * as XLSX from 'xlsx';

interface EndOfDayReportModalProps {
  onClose: () => void;
  referrals: Referral[];
  transactions: SafeTransaction[];
  settings?: AppSettings;
  institutions: MedicalInstitution[];
}

interface InstitutionStat {
  count: number;
  cost: number;
  name: string;
}

interface ReportData {
  referrals: Referral[];
  totalIncome: number;
  totalExpense: number;
  openingBalance: number;
  closingBalance: number;
  totalReferralCost: number;
  totalReferralPrice: number;
  estimatedProfit: number;
  institutionStats: Record<string, InstitutionStat>;
  companyStats: Record<string, { count: number, total: number }>;
  paymentStats: {
    cash: { count: number, total: number };
    pos: { count: number, total: number };
    invoice: { count: number, total: number };
  };
}

type ReportPeriod = 'daily' | 'weekly' | 'monthly';

export const EndOfDayReportModal: React.FC<EndOfDayReportModalProps> = ({ onClose, referrals, transactions, settings, institutions }) => {
  const [period, setPeriod] = useState<ReportPeriod>('daily');
  const now = new Date();

  // Calculate Date Range based on Period
  const dateRange = useMemo(() => {
    const end = new Date(); // Now
    const start = new Date(); 
    start.setHours(0, 0, 0, 0);

    if (period === 'weekly') {
      const day = start.getDay() || 7; 
      if (day !== 1) {
        start.setDate(start.getDate() - (day - 1));
      }
    } else if (period === 'monthly') {
      start.setDate(1);
    }
    return { start, end };
  }, [period]);

  const reportData = useMemo<ReportData>(() => {
    // Filter referrals
    const filteredReferrals = referrals.filter(r => {
      const d = new Date(r.referralDate);
      return d >= dateRange.start && d <= dateRange.end;
    });

    // Filter transactions
    const filteredTransactions = transactions.filter(t => {
      const d = new Date(t.date);
      return d >= dateRange.start && d <= dateRange.end;
    });

    // Finances
    const totalIncome = filteredTransactions
      .filter(t => t.type === 'INCOME')
      .reduce((acc, curr) => acc + curr.amount, 0);

    const totalExpense = filteredTransactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((acc, curr) => acc + curr.amount, 0);

    // Initial Stats
    const paymentStats = {
        cash: { count: 0, total: 0 },
        pos: { count: 0, total: 0 },
        invoice: { count: 0, total: 0 }
    };

    const institutionStats: Record<string, InstitutionStat> = {};
    const companyStats: Record<string, { count: number, total: number }> = {};
    
    let totalReferralCost = 0;
    let totalReferralPrice = 0;

    filteredReferrals.forEach(ref => {
        const price = ref.totalPrice || 0;
        const cost = ref.totalCost || 0;

        totalReferralPrice += price;
        totalReferralCost += cost;

        // Payment Stats
        if (ref.paymentMethod === 'CASH') {
            paymentStats.cash.count++;
            paymentStats.cash.total += price;
        } else if (ref.paymentMethod === 'POS') {
            paymentStats.pos.count++;
            paymentStats.pos.total += price;
        } else {
            paymentStats.invoice.count++;
            paymentStats.invoice.total += price;
        }

        // Institution Stats
        const instId = ref.targetInstitutionId || 'unknown';
        const instName = instId === 'unknown' ? 'Kurum Seçilmedi' : (institutions.find(i => i.id === instId)?.name || 'Bilinmeyen Kurum');
        
        if (!institutionStats[instId]) {
            institutionStats[instId] = { count: 0, cost: 0, name: instName };
        }
        institutionStats[instId].count++;
        institutionStats[instId].cost += cost;

        // Company Stats
        const compName = ref.employee.company;
        if (!companyStats[compName]) {
            companyStats[compName] = { count: 0, total: 0 };
        }
        companyStats[compName].count++;
        companyStats[compName].total += price;
    });

    const estimatedProfit = totalReferralPrice - totalReferralCost;

    // Balance Calculation
    const currentTotalBalance = transactions.reduce((acc, curr) => {
      return curr.type === 'INCOME' ? acc + curr.amount : acc - curr.amount;
    }, 0);
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
      estimatedProfit,
      institutionStats,
      companyStats,
      paymentStats
    };
  }, [referrals, transactions, dateRange, institutions]);

  const getTitle = () => {
    switch(period) {
      case 'weekly': return 'HAFTALIK FAALİYET RAPORU';
      case 'monthly': return 'AYLIK FAALİYET RAPORU';
      default: return 'GÜN SONU RAPORU';
    }
  };

  const handleDownloadExcel = () => {
    const wb = XLSX.utils.book_new();
    const dateStr = new Date().toISOString().split('T')[0];

    // --- 1. SHEET: ÖZET & DETAYLAR ---
    const summaryData = [
        ["RAPOR ÖZETİ"],
        ["Rapor Türü", getTitle()],
        ["Tarih Aralığı", `${dateRange.start.toLocaleDateString()} - ${dateRange.end.toLocaleDateString()}`],
        ["Oluşturulma", new Date().toLocaleString()],
        [], 
        ["FİNANSAL GENEL DURUM"],
        ["Toplam Ciro (Satış)", reportData.totalReferralPrice],
        ["Toplam Maliyet (Kurum Ödemesi)", reportData.totalReferralCost],
        ["Tahmini Brüt Kâr", reportData.estimatedProfit],
        [],
        ["ÖDEME YÖNTEMİ DAĞILIMI"],
        ["Yöntem", "Kişi Sayısı", "Toplam Tutar"],
        ["Nakit (Elden)", reportData.paymentStats.cash.count, reportData.paymentStats.cash.total],
        ["Kredi Kartı / POS", reportData.paymentStats.pos.count, reportData.paymentStats.pos.total],
        ["Fatura (Cari)", reportData.paymentStats.invoice.count, reportData.paymentStats.invoice.total],
        [],
        ["KURUM BAZLI BORÇ/MALİYET LİSTESİ"],
        ["Kurum Adı", "Sevk Edilen Kişi", "Ödenecek Tutar (Maliyet)"],
        ...Object.values(reportData.institutionStats).map((i: InstitutionStat) => [i.name, i.count, i.cost])
    ];

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    wsSummary['!cols'] = [{ wch: 35 }, { wch: 20 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, "Finansal_Ozet");

    // --- 2. SHEET: DETAYLI SEVK LİSTESİ ---
    const referralRows = reportData.referrals.map(r => ({
        "Tarih": new Date(r.referralDate).toLocaleDateString(),
        "Personel": r.employee.fullName,
        "TC No": r.employee.tcNo,
        "Firma": r.employee.company,
        "Kurum": r.targetInstitutionId ? (institutions.find(i => i.id === r.targetInstitutionId)?.name || "Bilinmiyor") : "-",
        "Ödeme Tipi": r.paymentMethod === 'CASH' ? 'NAKİT' : r.paymentMethod === 'POS' ? 'POS' : 'FATURA',
        "Tutar": r.totalPrice,
        "Maliyet": r.totalCost
    }));

    const wsReferrals = XLSX.utils.json_to_sheet(referralRows);
    wsReferrals['!cols'] = [{wch:12}, {wch:20}, {wch:15}, {wch:25}, {wch:25}, {wch:12}, {wch:10}, {wch:10}];
    XLSX.utils.book_append_sheet(wb, wsReferrals, "Sevk_Listesi");

    XLSX.writeFile(wb, `OSGB_Finans_Raporu_${dateStr}.xlsx`);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/90 z-50 overflow-hidden flex flex-col">
      
      {/* --- HEADER --- */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex justify-between items-center shrink-0 shadow-lg">
        <div className="flex items-center space-x-4">
           <div className="bg-indigo-600 p-2 rounded-lg shadow-lg shadow-indigo-900/40">
              <Calculator className="w-6 h-6 text-white" />
           </div>
           <div>
               <h2 className="text-xl font-bold text-white tracking-tight">Finansal Rapor & Analiz</h2>
               <p className="text-xs text-slate-400">Detaylı Ciro, Maliyet ve Kurum Ödemeleri</p>
           </div>
           
           <div className="h-8 w-px bg-slate-700 mx-4"></div>

           {/* Periyot Seçimi */}
           <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
              <button onClick={() => setPeriod('daily')} className={`px-4 py-1.5 rounded text-xs font-bold transition-all ${period === 'daily' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>Günlük</button>
              <button onClick={() => setPeriod('weekly')} className={`px-4 py-1.5 rounded text-xs font-bold transition-all ${period === 'weekly' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>Haftalık</button>
              <button onClick={() => setPeriod('monthly')} className={`px-4 py-1.5 rounded text-xs font-bold transition-all ${period === 'monthly' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>Aylık</button>
           </div>
           <span className="text-sm font-medium text-slate-300 ml-2">
               {dateRange.start.toLocaleDateString()} - {dateRange.end.toLocaleDateString()}
           </span>
        </div>

        <div className="flex items-center space-x-3">
           <button 
             onClick={handleDownloadExcel}
             className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-lg shadow-emerald-900/20 transition-all active:scale-95 border border-emerald-500/50"
           >
             <FileSpreadsheet className="w-5 h-5" />
             <span>Excel Raporu İndir</span>
           </button>
           <button 
             onClick={onClose}
             className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-300 px-5 py-2.5 rounded-lg text-sm font-bold border border-slate-700 transition-colors"
           >
             <X className="w-5 h-5" />
             <span>Kapat</span>
           </button>
        </div>
      </div>

      {/* --- DASHBOARD CONTENT --- */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar bg-slate-950">
        <div className="max-w-7xl mx-auto space-y-8">

            {/* 1. TOP SUMMARY CARDS (KAR/ZARAR) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm relative overflow-hidden group">
                    <div className="absolute right-0 top-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-6 -mt-6 group-hover:bg-blue-500/10 transition-all"></div>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Toplam Ciro (Satış)</p>
                    <h3 className="text-2xl font-bold text-white">₺{reportData.totalReferralPrice.toLocaleString()}</h3>
                    <div className="mt-3 flex items-center text-xs text-blue-400 font-medium">
                        <TrendingUp className="w-3 h-3 mr-1" /> Tüm İşlemler
                    </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm relative overflow-hidden group">
                     <div className="absolute right-0 top-0 w-24 h-24 bg-red-500/5 rounded-full -mr-6 -mt-6 group-hover:bg-red-500/10 transition-all"></div>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Toplam Maliyet</p>
                    <h3 className="text-2xl font-bold text-red-400">₺{reportData.totalReferralCost.toLocaleString()}</h3>
                    <div className="mt-3 flex items-center text-xs text-slate-500 font-medium">
                        Kurum Ödemeleri
                    </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm relative overflow-hidden group">
                    <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-6 -mt-6 group-hover:bg-emerald-500/10 transition-all"></div>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Tahmini Brüt Kâr</p>
                    <h3 className={`text-2xl font-bold ${reportData.estimatedProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        ₺{reportData.estimatedProfit.toLocaleString()}
                    </h3>
                    <div className="mt-3 flex items-center text-xs text-emerald-500 font-medium">
                        Net Kazanç
                    </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm relative overflow-hidden group">
                    <div className="absolute right-0 top-0 w-24 h-24 bg-purple-500/5 rounded-full -mr-6 -mt-6 group-hover:bg-purple-500/10 transition-all"></div>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Kasa Bakiyesi</p>
                    <h3 className="text-2xl font-bold text-white">₺{reportData.closingBalance.toLocaleString()}</h3>
                    <div className="mt-3 flex items-center text-xs text-purple-400 font-medium">
                        <Wallet className="w-3 h-3 mr-1" /> Mevcut Nakit Durumu
                    </div>
                </div>
            </div>

            {/* 2. DETAILED BREAKDOWN (PAYMENT TYPES & INSTITUTIONS) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* LEFT: PAYMENT BREAKDOWN */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                         <h3 className="text-lg font-bold text-white flex items-center">
                             <Wallet className="w-5 h-5 mr-2 text-indigo-500" />
                             Tahsilat & Ödeme Yöntemleri
                         </h3>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        {/* CASH */}
                        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <div className="p-3 bg-emerald-500/10 rounded-lg">
                                    <Banknote className="w-6 h-6 text-emerald-500" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-white">Elden Nakit</h4>
                                    <p className="text-xs text-slate-400">{reportData.paymentStats.cash.count} Kişi işlem yaptı</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-xl font-bold text-emerald-400">₺{reportData.paymentStats.cash.total.toLocaleString()}</p>
                            </div>
                        </div>

                        {/* POS */}
                        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <div className="p-3 bg-purple-500/10 rounded-lg">
                                    <CreditCard className="w-6 h-6 text-purple-500" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-white">Kredi Kartı / POS</h4>
                                    <p className="text-xs text-slate-400">{reportData.paymentStats.pos.count} Kişi işlem yaptı</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-xl font-bold text-purple-400">₺{reportData.paymentStats.pos.total.toLocaleString()}</p>
                            </div>
                        </div>

                        {/* INVOICE */}
                        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <div className="p-3 bg-blue-500/10 rounded-lg">
                                    <Receipt className="w-6 h-6 text-blue-500" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-white">Fatura / Cari</h4>
                                    <p className="text-xs text-slate-400">{reportData.paymentStats.invoice.count} Kişi (Vadeli)</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-xl font-bold text-blue-400">₺{reportData.paymentStats.invoice.total.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT: INSTITUTION DEBTS */}
                <div className="space-y-4">
                     <div className="flex items-center justify-between">
                         <h3 className="text-lg font-bold text-white flex items-center">
                             <Building2 className="w-5 h-5 mr-2 text-orange-500" />
                             Kurum Bazlı Sevk & Maliyetler
                         </h3>
                         <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-400">Ödenecek Toplam: ₺{reportData.totalReferralCost.toLocaleString()}</span>
                    </div>
                    
                    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-900/50 text-slate-400 text-xs uppercase font-semibold">
                                <tr>
                                    <th className="px-4 py-3">Kurum Adı</th>
                                    <th className="px-4 py-3 text-center">Kişi</th>
                                    <th className="px-4 py-3 text-right">Ödenecek (Maliyet)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700">
                                {Object.values(reportData.institutionStats).map((inst: InstitutionStat, idx) => (
                                    <tr key={idx} className="hover:bg-slate-700/20 transition-colors">
                                        <td className="px-4 py-3 text-sm font-medium text-white flex items-center">
                                            <MapPin className="w-3.5 h-3.5 mr-2 text-slate-500" />
                                            {inst.name}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-300 text-center">
                                            <span className="bg-slate-700 px-2 py-0.5 rounded text-xs">{inst.count}</span>
                                        </td>
                                        <td className="px-4 py-3 text-sm font-bold text-red-400 text-right">
                                            ₺{inst.cost.toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                                {Object.keys(reportData.institutionStats).length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="px-4 py-8 text-center text-slate-500 text-sm">
                                            Bu dönemde kurumlara maliyet oluşturan sevk bulunamadı.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            
            {/* 3. RECENT REFERRALS LIST */}
            <div>
                 <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                     <Users className="w-5 h-5 mr-2 text-slate-400" />
                     Dönem Sevk Listesi
                 </h3>
                 <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                             <thead className="bg-slate-900/50 text-slate-400 text-xs uppercase">
                                 <tr>
                                     <th className="px-4 py-3">Tarih</th>
                                     <th className="px-4 py-3">Personel</th>
                                     <th className="px-4 py-3">Firma</th>
                                     <th className="px-4 py-3">Ödeme</th>
                                     <th className="px-4 py-3 text-right">Tutar</th>
                                 </tr>
                             </thead>
                             <tbody className="divide-y divide-slate-700">
                                 {reportData.referrals.slice(0, 10).map(ref => (
                                     <tr key={ref.id} className="hover:bg-slate-700/20">
                                         <td className="px-4 py-2.5 text-slate-400 text-xs">{new Date(ref.referralDate).toLocaleDateString()}</td>
                                         <td className="px-4 py-2.5 text-white text-sm font-medium">{ref.employee.fullName}</td>
                                         <td className="px-4 py-2.5 text-slate-300 text-sm">{ref.employee.company}</td>
                                         <td className="px-4 py-2.5">
                                            {ref.paymentMethod === 'CASH' && <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded border border-emerald-500/20">NAKİT</span>}
                                            {ref.paymentMethod === 'POS' && <span className="text-[10px] bg-purple-500/10 text-purple-400 px-2 py-1 rounded border border-purple-500/20">POS</span>}
                                            {ref.paymentMethod === 'INVOICE' && <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-1 rounded border border-blue-500/20">FATURA</span>}
                                         </td>
                                         <td className="px-4 py-2.5 text-right text-white font-bold text-sm">₺{ref.totalPrice?.toLocaleString()}</td>
                                     </tr>
                                 ))}
                             </tbody>
                        </table>
                        {reportData.referrals.length > 10 && (
                            <div className="px-4 py-3 text-center text-xs text-slate-500 border-t border-slate-700">
                                ... ve {reportData.referrals.length - 10} kayıt daha (Tümünü görmek için Excel İndirin)
                            </div>
                        )}
                        {reportData.referrals.length === 0 && (
                            <div className="p-8 text-center text-slate-500">Kayıt bulunamadı.</div>
                        )}
                    </div>
                 </div>
            </div>

        </div>
      </div>
    </div>
  );
};