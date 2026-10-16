/*
 * Project: OSGB Tetkik Takip Sistemi
 * Copyright (C) 2026 szgn_emin
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License.
 */
import React, { useMemo, useState, useRef } from 'react';
import {
  X,
  FileSpreadsheet,
  Wallet,
  Building2,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Banknote,
  Receipt,
  Users,
  MapPin,
  Calculator,
  Calendar,
  Send,
  RefreshCw,
  Search,
  PieChart,
  BarChart3,
  Activity,
  Printer,
  Stethoscope
} from 'lucide-react';
import { Referral, SafeTransaction, AppSettings, MedicalInstitution, Company, ExamDefinition, turkishIncludes } from '../types';
import * as XLSX from 'xlsx';

interface EndOfDayReportModalProps {
  onClose: () => void;
  referrals: Referral[];
  transactions: SafeTransaction[];
  settings?: AppSettings;
  institutions: MedicalInstitution[];
  companies: Company[];
  exams?: ExamDefinition[];
}

interface InstitutionStat {
  count: number;
  revenue: number;
  cost: number;
  profit: number;
  name: string;
}

interface CompanyStat {
  name: string;
  count: number;
  cashTotal: number;
  posTotal: number;
  invoiceTotal: number;
  total: number;
  cost: number;
}

interface DailyPoint {
  dateKey: string;
  label: string;
  count: number;
  revenue: number;
  cost: number;
  profit: number;
  cash: number;
  pos: number;
  invoice: number;
}

interface ExamStat {
  name: string;
  count: number;
}

interface ReportData {
  referrals: Referral[];
  transactions: SafeTransaction[];
  expenseTransactions: SafeTransaction[];
  totalIncome: number;
  periodCashIncome: number;
  periodPosIncome: number;
  totalExpense: number;
  openingBalance: number;
  closingBalance: number;
  totalReferralCost: number;
  totalReferralPrice: number;
  estimatedProfit: number;
  institutionStats: Record<string, InstitutionStat>;
  companyStats: Record<string, CompanyStat>;
  dailyTrend: DailyPoint[];
  examStats: ExamStat[];
  paymentStats: {
    cash: { count: number; total: number };
    pos: { count: number; total: number };
    invoice: { count: number; total: number };
  };
}

type ReportPeriod = 'daily' | 'yesterday' | 'weekly' | 'monthly' | 'custom';
type TableTab = 'ALL' | 'CASH' | 'POS' | 'INVOICE' | 'EXPENSES';

export const EndOfDayReportModal: React.FC<EndOfDayReportModalProps> = ({
  onClose,
  referrals,
  transactions,
  institutions,
  companies,
  exams = []
}) => {
  const [period, setPeriod] = useState<ReportPeriod>('daily');
  const [selectedCompany, setSelectedCompany] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTableTab, setActiveTableTab] = useState<TableTab>('ALL');
  const reportContainerRef = useRef<HTMLDivElement>(null);

  // Custom Date Range State
  const [customStart, setCustomStart] = useState(new Date().toISOString().split('T')[0]);
  const [customEnd, setCustomEnd] = useState(new Date().toISOString().split('T')[0]);

  // Telegram status state
  const [telegramStatus, setTelegramStatus] = useState<{
    type: 'idle' | 'loading' | 'success' | 'error';
    message: string;
  }>({ type: 'idle', message: '' });

  // Calculate Date Range based on Period
  const dateRange = useMemo(() => {
    if (period === 'custom') {
      const start = new Date(customStart);
      start.setHours(0, 0, 0, 0);

      const end = new Date(customEnd);
      end.setHours(23, 59, 59, 999);

      return { start, end };
    }

    if (period === 'yesterday') {
      const start = new Date();
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);

      const end = new Date(start);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }

    const end = new Date();
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
  }, [period, customStart, customEnd]);

  const reportData = useMemo<ReportData>(() => {
    const filteredReferrals = referrals.filter(r => {
      if (r.isExternalRecord) return false;
      const d = new Date(r.referralDate);
      const inDateRange = d >= dateRange.start && d <= dateRange.end;
      const inCompany = selectedCompany === 'ALL' || r.employee.company === selectedCompany;
      const matchesSearch =
        !searchQuery.trim() ||
        turkishIncludes(r.employee.fullName || '', searchQuery) ||
        turkishIncludes(r.employee.tcNo || '', searchQuery) ||
        turkishIncludes(r.employee.company || '', searchQuery);
      return inDateRange && inCompany && matchesSearch;
    });

    const filteredTransactions = transactions.filter(t => {
      const d = new Date(t.date);
      return d >= dateRange.start && d <= dateRange.end;
    });

    const expenseTransactions = filteredTransactions.filter(t => t.type === 'EXPENSE');

    const totalIncome = filteredTransactions
      .filter(t => t.type === 'INCOME')
      .reduce((acc, curr) => acc + curr.amount, 0);

    const periodCashIncome = filteredTransactions
      .filter(t => t.type === 'INCOME' && (t.paymentMethod === 'CASH' || !t.paymentMethod))
      .reduce((acc, curr) => acc + curr.amount, 0);

    const periodPosIncome = filteredTransactions
      .filter(t => t.type === 'INCOME' && t.paymentMethod === 'POS')
      .reduce((acc, curr) => acc + curr.amount, 0);

    const totalExpense = expenseTransactions.reduce((acc, curr) => acc + curr.amount, 0);

    const paymentStats = {
      cash: { count: 0, total: 0 },
      pos: { count: 0, total: 0 },
      invoice: { count: 0, total: 0 }
    };

    const institutionStats: Record<string, InstitutionStat> = {};
    const companyStats: Record<string, CompanyStat> = {};
    const examCounter: Record<string, number> = {};
    const dailyMap: Record<string, DailyPoint> = {};

    // For daily/yesterday period, build last 7 days trend so bar chart is always rich and informative
    if (period === 'daily' || period === 'yesterday') {
      for (let i = 6; i >= 0; i--) {
        const dt = new Date();
        dt.setDate(dt.getDate() - i);
        const key = dt.toISOString().split('T')[0];
        const label = dt.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
        dailyMap[key] = { dateKey: key, label, count: 0, revenue: 0, cost: 0, profit: 0, cash: 0, pos: 0, invoice: 0 };
      }
      // Populate last 7 days from all non-external referrals matching company filter
      referrals.forEach(ref => {
        if (ref.isExternalRecord || !ref.referralDate) return;
        if (selectedCompany !== 'ALL' && ref.employee.company !== selectedCompany) return;
        const key = new Date(ref.referralDate).toISOString().split('T')[0];
        if (dailyMap[key]) {
          const p = ref.totalPrice || 0;
          const c = ref.totalCost || 0;
          dailyMap[key].count++;
          dailyMap[key].revenue += p;
          dailyMap[key].cost += c;
          dailyMap[key].profit += p - c;
          if (ref.paymentMethod === 'CASH') dailyMap[key].cash += p;
          else if (ref.paymentMethod === 'POS') dailyMap[key].pos += p;
          else dailyMap[key].invoice += p;
        }
      });
    }

    let totalReferralCost = 0;
    let totalReferralPrice = 0;

    filteredReferrals.forEach(ref => {
      if (ref.isExternalRecord) return;
      const price = ref.totalPrice || 0;
      const cost = ref.totalCost || 0;

      totalReferralPrice += price;
      totalReferralCost += cost;

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

      // Daily trend for multi-day periods
      if (period !== 'daily' && period !== 'yesterday' && ref.referralDate) {
        const dt = new Date(ref.referralDate);
        const key = dt.toISOString().split('T')[0];
        const label = dt.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
        if (!dailyMap[key]) {
          dailyMap[key] = { dateKey: key, label, count: 0, revenue: 0, cost: 0, profit: 0, cash: 0, pos: 0, invoice: 0 };
        }
        dailyMap[key].count++;
        dailyMap[key].revenue += price;
        dailyMap[key].cost += cost;
        dailyMap[key].profit += price - cost;
        if (ref.paymentMethod === 'CASH') dailyMap[key].cash += price;
        else if (ref.paymentMethod === 'POS') dailyMap[key].pos += price;
        else dailyMap[key].invoice += price;
      }

      // Exam stats
      (ref.exams || []).forEach(ex => {
        if (!ex) return;
        const examDef = exams.find(e => e.id === ex || e.code === ex || e.name === ex);
        const resolvedName = examDef ? examDef.name : ex;
        examCounter[resolvedName] = (examCounter[resolvedName] || 0) + 1;
      });

      // Institution Stats
      const instId = ref.targetInstitutionId || 'unknown';
      const instName =
        instId === 'unknown'
          ? 'Kurum Seçilmedi'
          : institutions.find(i => i.id === instId)?.name || 'Bilinmeyen Kurum';

      if (!institutionStats[instId]) {
        institutionStats[instId] = { count: 0, revenue: 0, cost: 0, profit: 0, name: instName };
      }
      institutionStats[instId].count++;
      institutionStats[instId].revenue += price;
      institutionStats[instId].cost += cost;
      institutionStats[instId].profit += price - cost;

      // Company Stats
      const compName = ref.employee.company || 'Belirtilmemiş';
      if (!companyStats[compName]) {
        companyStats[compName] = {
          name: compName,
          count: 0,
          cashTotal: 0,
          posTotal: 0,
          invoiceTotal: 0,
          total: 0,
          cost: 0
        };
      }
      companyStats[compName].count++;
      companyStats[compName].total += price;
      companyStats[compName].cost += cost;
      if (ref.paymentMethod === 'CASH') companyStats[compName].cashTotal += price;
      else if (ref.paymentMethod === 'POS') companyStats[compName].posTotal += price;
      else companyStats[compName].invoiceTotal += price;
    });

    const estimatedProfit = totalReferralPrice - totalReferralCost;

    const currentTotalCashBalance = transactions.reduce((acc, curr) => {
      if (curr.type === 'INCOME') {
        return curr.paymentMethod === 'CASH' || !curr.paymentMethod ? acc + curr.amount : acc;
      }
      return acc - curr.amount;
    }, 0);

    const periodNetCashChange = periodCashIncome - totalExpense;
    const openingBalance = currentTotalCashBalance - periodNetCashChange;

    const dailyTrend = Object.values(dailyMap).sort((a, b) => a.dateKey.localeCompare(b.dateKey)).slice(-14);
    const examStats = Object.entries(examCounter)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    return {
      referrals: filteredReferrals,
      transactions: filteredTransactions,
      expenseTransactions,
      totalIncome,
      periodCashIncome,
      periodPosIncome,
      totalExpense,
      openingBalance,
      closingBalance: currentTotalCashBalance,
      totalReferralCost,
      totalReferralPrice,
      estimatedProfit,
      institutionStats,
      companyStats,
      dailyTrend,
      examStats,
      paymentStats
    };
  }, [referrals, transactions, dateRange, institutions, selectedCompany, searchQuery, period]);

  const tableReferrals = useMemo(() => {
    if (activeTableTab === 'CASH') return reportData.referrals.filter(r => r.paymentMethod === 'CASH');
    if (activeTableTab === 'POS') return reportData.referrals.filter(r => r.paymentMethod === 'POS');
    if (activeTableTab === 'INVOICE') return reportData.referrals.filter(r => r.paymentMethod === 'INVOICE');
    return reportData.referrals;
  }, [reportData.referrals, activeTableTab]);

  const getTitle = () => {
    switch (period) {
      case 'yesterday':
        return 'DÜNKÜ Z RAPORU';
      case 'weekly':
        return 'HAFTALIK Z RAPORU';
      case 'monthly':
        return 'AYLIK Z RAPORU';
      case 'custom':
        return 'ÖZEL TARİHLİ Z RAPORU';
      default:
        return 'GÜN SONU Z RAPORU';
    }
  };

  const getExamName = (examKey: string): string => {
    if (!examKey) return '';
    const def = exams.find(e => e.id === examKey || e.code === examKey || e.name === examKey);
    return def ? def.name : examKey;
  };

  const getExamNames = (examKeys?: string[]): string => {
    if (!examKeys || !Array.isArray(examKeys) || examKeys.length === 0) return '-';
    return examKeys.map(getExamName).filter(Boolean).join(', ');
  };

  const autoFitColumns = (sheetData: any[][]) => {
    const colWidths: number[] = [];
    sheetData.forEach(row => {
      if (!Array.isArray(row)) return;
      row.forEach((cell, colIdx) => {
        let str = '';
        if (cell === null || cell === undefined) str = '';
        else if (typeof cell === 'object' && cell.v !== undefined) {
          if (typeof cell.v === 'number') {
            str = cell.z?.includes('%') ? `${(cell.v * 100).toFixed(1)}%` : cell.v.toLocaleString('tr-TR');
          } else {
            str = String(cell.v);
          }
        } else {
          str = String(cell);
        }
        colWidths[colIdx] = Math.max(colWidths[colIdx] || 10, Math.min(str.length + 4, 60));
      });
    });
    return colWidths.map(w => ({ wch: w }));
  };

  const handleDownloadExcel = () => {
    const wb = XLSX.utils.book_new();
    const dateStr = new Date().toISOString().split('T')[0];

    // --- SAYFA 1: FİNANSAL Z RAPORU ÖZETİ (YÖNETİCİ & MUHASEBE GÖSTERGELERİ) ---
    const totalExamsCount = reportData.examStats.reduce((sum, item) => sum + item.count, 0);
    const summaryRows: any[][] = [
      ['OSGB TETKİK VE SEVK TAKİP - FİNANSAL Z RAPORU VE MUTABAKAT TABLOSU'],
      ['Rapor Başlığı:', getTitle()],
      ['Rapor Dönemi:', `${dateRange.start.toLocaleDateString('tr-TR')} - ${dateRange.end.toLocaleDateString('tr-TR')}`],
      ['Seçili Firma Filtresi:', selectedCompany === 'ALL' ? 'Tüm Firmalar' : selectedCompany],
      ['Rapor Oluşturma Zamanı:', new Date().toLocaleString('tr-TR')],
      [],
      ['1. GENEL CİRO VE KÂRLILIK GÖSTERGELERİ'],
      ['Metrik / Gösterge', 'Tutar / Miktar', 'Birim / Açıklama'],
      ['Toplam Sevk Edilen Personel Sayısı', reportData.referrals.length, 'Kişi'],
      ['Toplam Sevk Satış Cirosu (TL)', { t: 'n', v: reportData.totalReferralPrice, z: '#,##0.00' }, 'Müşterilerden beklenen / tahsil edilen toplam ciro'],
      ['Toplam Kurum (Hastane) Maliyeti (TL)', { t: 'n', v: reportData.totalReferralCost, z: '#,##0.00' }, 'Hastanelere ödenecek toplam hakediş'],
      ['Tahmini Net Brüt Kâr (TL)', { t: 'n', v: reportData.estimatedProfit, z: '#,##0.00' }, 'Toplam Ciro - Kurum Maliyeti'],
      ['Genel Kâr Marjı (%)', { t: 'n', v: reportData.totalReferralPrice > 0 ? (reportData.estimatedProfit / reportData.totalReferralPrice) : 0, z: '0.0%' }, 'Net Kâr / Satış Cirosu Oranı'],
      [],
      ['2. NAKİT KASA (ÇEKMECE) MUTABAKATI (MUHASEBE & KASA GÖREVLİSİ AYRIMI)'],
      ['* DİKKAT: POS / Kredi Kartı ve Cari / Fatura tahsilatları banka ve cari hesaplara işler, elden nakit kasasına dahil edilmez.'],
      ['Kasa Hareketi Kalemi', 'Tutar (TL)', 'Muhasebe Açıklaması'],
      ['Dönem Başı Devreden Nakit Bakiye (TL)', { t: 'n', v: reportData.openingBalance, z: '#,##0.00' }, 'Dönem başındaki nakit çekmece mevcudu'],
      ['(+) Dönem İçi Elden Nakit Girişi (TL)', { t: 'n', v: reportData.periodCashIncome, z: '#,##0.00' }, 'Kasaya giren nakit tahsilatlar (+)'],
      ['(-) Dönem İçi Kasadan Nakit Çıkış / Gider (TL)', { t: 'n', v: reportData.totalExpense, z: '#,##0.00' }, 'Kasadan ödenen nakit harcamalar (-)'],
      ['(=) Güncel Net Nakit Kasa Bakiyesi (TL)', { t: 'n', v: reportData.closingBalance, z: '#,##0.00' }, 'ÇEKMECEDE OLMASI GEREKEN NAKİT MEVCUDU'],
      [],
      ['3. TAHSİLAT KANALLARI DAĞILIMI (ÖDEME ŞEKİLLERİ)'],
      ['Tahsilat Kanalı', 'İşlem / Kişi Sayısı', 'Toplam Tutar (TL)', 'Ciro Payı (%)', 'Nakit Kasaya Etkisi'],
      [
        'Elden Nakit Tahsilat',
        reportData.paymentStats.cash.count,
        { t: 'n', v: reportData.paymentStats.cash.total, z: '#,##0.00' },
        { t: 'n', v: reportData.totalReferralPrice > 0 ? reportData.paymentStats.cash.total / reportData.totalReferralPrice : 0, z: '0.0%' },
        'Nakit Kasaya İşlendi (+)'
      ],
      [
        'Kredi Kartı / POS Tahsilatı',
        reportData.paymentStats.pos.count,
        { t: 'n', v: reportData.paymentStats.pos.total, z: '#,##0.00' },
        { t: 'n', v: reportData.totalReferralPrice > 0 ? reportData.paymentStats.pos.total / reportData.totalReferralPrice : 0, z: '0.0%' },
        'Banka Hesabına Yatar (Nakit Kasaya İşlemez)'
      ],
      [
        'Fatura / Cari (Vadeli Borç)',
        reportData.paymentStats.invoice.count,
        { t: 'n', v: reportData.paymentStats.invoice.total, z: '#,##0.00' },
        { t: 'n', v: reportData.totalReferralPrice > 0 ? reportData.paymentStats.invoice.total / reportData.totalReferralPrice : 0, z: '0.0%' },
        'Cari Alacak / Şirket Borcu (Nakit Kasaya İşlemez)'
      ],
      [
        'GENEL TOPLAM',
        reportData.referrals.length,
        { t: 'n', v: reportData.totalReferralPrice, z: '#,##0.00' },
        { t: 'n', v: 1, z: '0.0%' },
        'Toplam Satış Cirosu'
      ],
      [],
      ['4. KURUM (HASTANE / TIP MERKEZİ) BAZLI HAKEDİŞ VE MALİYET DAĞILIMI'],
      ['Kurum / Hastane Adı', 'Sevk Sayısı (Kişi)', 'Satış Cirosu (TL)', 'Kuruma Ödenecek Maliyet (TL)', 'Net Kârımız (TL)', 'Kâr Marjı (%)'],
      ...Object.values(reportData.institutionStats).map(inst => [
        inst.name,
        inst.count,
        { t: 'n', v: inst.revenue, z: '#,##0.00' },
        { t: 'n', v: inst.cost, z: '#,##0.00' },
        { t: 'n', v: inst.profit, z: '#,##0.00' },
        { t: 'n', v: inst.revenue > 0 ? (inst.profit / inst.revenue) : 0, z: '0.0%' }
      ]),
      [
        'KURUMLAR TOPLAMI',
        reportData.referrals.length,
        { t: 'n', v: reportData.totalReferralPrice, z: '#,##0.00' },
        { t: 'n', v: reportData.totalReferralCost, z: '#,##0.00' },
        { t: 'n', v: reportData.estimatedProfit, z: '#,##0.00' },
        { t: 'n', v: reportData.totalReferralPrice > 0 ? (reportData.estimatedProfit / reportData.totalReferralPrice) : 0, z: '0.0%' }
      ],
      [],
      ['5. EN ÇOK SEVK YAPILAN İLK 10 FİRMA CİRO VE TAHSİLAT DAĞILIMI'],
      ['Firma Adı', 'Personel Sayısı', 'Toplam Ciro (TL)', 'Elden Nakit (TL)', 'POS / Kart (TL)', 'Cari / Fatura (TL)', 'Maliyet (TL)', 'Net Kâr (TL)'],
      ...Object.values(reportData.companyStats)
        .sort((a, b) => b.total - a.total)
        .slice(0, 10)
        .map(comp => [
          comp.name,
          comp.count,
          { t: 'n', v: comp.total, z: '#,##0.00' },
          { t: 'n', v: comp.cashTotal, z: '#,##0.00' },
          { t: 'n', v: comp.posTotal, z: '#,##0.00' },
          { t: 'n', v: comp.invoiceTotal, z: '#,##0.00' },
          { t: 'n', v: comp.cost, z: '#,##0.00' },
          { t: 'n', v: comp.total - comp.cost, z: '#,##0.00' }
        ]),
      [],
      ['6. EN ÇOK YAPILAN TETKİKLER VE İŞLEM PAYLARI'],
      ['Tetkik / İşlem Adı', 'Yapılma Adedi', 'Toplam İşlemdeki Payı (%)'],
      ...reportData.examStats.map(ex => [
        ex.name,
        ex.count,
        { t: 'n', v: totalExamsCount > 0 ? (ex.count / totalExamsCount) : 0, z: '0.0%' }
      ])
    ];

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    wsSummary['!cols'] = autoFitColumns(summaryRows);
    XLSX.utils.book_append_sheet(wb, wsSummary, '1_Finansal_Z_Ozeti');

    // --- SAYFA 2: SEVK VE HASTA DETAY LİSTESİ ---
    const referralHeaders = [
      'Sıra No',
      'Sevk Tarihi',
      'Saat',
      'Personel Adı Soyadı',
      'TC Kimlik No',
      'Firma / İşyeri',
      'Sevk Edilen Kurum / Hastane',
      'Sevk Edilen Tetkikler',
      'Ödeme Yöntemi',
      'Satış Tutarı (TL)',
      'Kurum Maliyeti (TL)',
      'Net Kâr (TL)',
      'Sonuç Durumu',
      'Notlar / Açıklama'
    ];

    const referralRows: any[][] = [
      referralHeaders,
      ...reportData.referrals.map((r, idx) => {
        const d = r.referralDate ? new Date(r.referralDate) : null;
        const dateFormatted = d ? d.toLocaleDateString('tr-TR') : '-';
        const timeFormatted = d ? d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '-';
        const instName = r.targetInstitutionId
          ? institutions.find(i => i.id === r.targetInstitutionId)?.name || 'Bilinmiyor'
          : '-';
        const paymentLabel =
          r.paymentMethod === 'CASH'
            ? 'ELDEN NAKİT (Kasa)'
            : r.paymentMethod === 'POS'
              ? 'POS / KART (Banka)'
              : 'FATURA / CARİ';

        const price = r.totalPrice || 0;
        const cost = r.totalCost || 0;
        const profit = price - cost;

        let statusText = 'Bekliyor';
        if (r.status === 'COMPLETED') statusText = 'Tamamlandı';
        else if (r.status === 'PARTIAL') statusText = 'Kısmi Sonuç';
        else if (r.status === 'AT_HOSPITAL') statusText = 'Hastanede';
        else if (r.status === 'AWAITING_RESULT') statusText = 'Sonuç Bekleniyor';
        else if (r.status === 'CANCELLED') statusText = 'İptal';

        return [
          idx + 1,
          dateFormatted,
          timeFormatted,
          r.employee.fullName || '-',
          r.employee.tcNo || '-',
          r.employee.company || '-',
          instName,
          getExamNames(r.exams),
          paymentLabel,
          { t: 'n', v: price, z: '#,##0.00' },
          { t: 'n', v: cost, z: '#,##0.00' },
          { t: 'n', v: profit, z: '#,##0.00' },
          statusText,
          r.notes || '-'
        ];
      }),
      [],
      [
        'GENEL TOPLAM',
        `${reportData.referrals.length} Kişi`,
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        { t: 'n', v: reportData.totalReferralPrice, z: '#,##0.00' },
        { t: 'n', v: reportData.totalReferralCost, z: '#,##0.00' },
        { t: 'n', v: reportData.estimatedProfit, z: '#,##0.00' },
        '',
        ''
      ]
    ];

    const wsReferrals = XLSX.utils.aoa_to_sheet(referralRows);
    wsReferrals['!cols'] = autoFitColumns(referralRows);
    XLSX.utils.book_append_sheet(wb, wsReferrals, '2_Sevk_ve_Hasta_Listesi');

    // --- SAYFA 3: KASA VE GİDER HAREKETLERİ ---
    const txHeaders = [
      'Sıra No',
      'Tarih',
      'Saat',
      'Hareket Türü',
      'Ödeme / Hesap Türü',
      'Kategori',
      'Açıklama',
      'Gelir / Giriş (+TL)',
      'Gider / Çıkış (-TL)',
      'Nakit Kasaya Etkisi'
    ];

    const txRows: any[][] = [
      txHeaders,
      ...reportData.transactions.map((t, idx) => {
        const d = t.date ? new Date(t.date) : null;
        const dateFormatted = d ? d.toLocaleDateString('tr-TR') : '-';
        const timeFormatted = d ? d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '-';

        const isIncome = t.type === 'INCOME';
        const isCash = t.paymentMethod === 'CASH' || !t.paymentMethod;
        const channelLabel =
          !isIncome
            ? 'Nakit Kasadan Çıkış'
            : t.paymentMethod === 'POS'
              ? 'Banka / POS (Kredi Kartı)'
              : t.paymentMethod === 'INVOICE'
                ? 'Cari / Fatura'
                : 'Nakit Kasa (Çekmece)';

        const impactText =
          !isIncome
            ? 'Kasadan Azaldı (-)'
            : isCash
              ? 'Kasaya Arttı (+)'
              : 'Nakit Kasaya İşlemez (Banka/Cari)';

        return [
          idx + 1,
          dateFormatted,
          timeFormatted,
          isIncome ? 'GELİR (+)' : 'GİDER (-)',
          channelLabel,
          t.category || '-',
          t.description || '-',
          isIncome ? { t: 'n', v: t.amount || 0, z: '#,##0.00' } : { t: 'n', v: 0, z: '#,##0.00' },
          !isIncome ? { t: 'n', v: t.amount || 0, z: '#,##0.00' } : { t: 'n', v: 0, z: '#,##0.00' },
          impactText
        ];
      }),
      [],
      [
        'GENEL TOPLAM',
        `${reportData.transactions.length} İşlem`,
        '',
        '',
        '',
        '',
        '',
        { t: 'n', v: reportData.totalIncome, z: '#,##0.00' },
        { t: 'n', v: reportData.totalExpense, z: '#,##0.00' },
        `Net Nakit Kasa Değişimi: ${(reportData.periodCashIncome - reportData.totalExpense).toLocaleString('tr-TR')} TL`
      ]
    ];

    const wsTx = XLSX.utils.aoa_to_sheet(txRows);
    wsTx['!cols'] = autoFitColumns(txRows);
    XLSX.utils.book_append_sheet(wb, wsTx, '3_Kasa_ve_Gider_Defteri');

    // --- SAYFA 4: KURUM HAKEDİŞ VE MUTABAKAT TABLOSU ---
    const instHeaders = [
      'Sıra No',
      'Anlaşmalı Kurum / Hastane Adı',
      'Sevk Sayısı (Kişi)',
      'Toplam Satış Cirosu (TL)',
      'Kuruma Ödenecek Hakediş (TL)',
      'OSGB Net Kârı (TL)',
      'Kâr Marjı (%)',
      'Sevk Payı (%)'
    ];

    const sortedInsts = Object.values(reportData.institutionStats).sort((a, b) => b.count - a.count);
    const instRows: any[][] = [
      instHeaders,
      ...sortedInsts.map((inst, idx) => [
        idx + 1,
        inst.name,
        inst.count,
        { t: 'n', v: inst.revenue, z: '#,##0.00' },
        { t: 'n', v: inst.cost, z: '#,##0.00' },
        { t: 'n', v: inst.profit, z: '#,##0.00' },
        { t: 'n', v: inst.revenue > 0 ? (inst.profit / inst.revenue) : 0, z: '0.0%' },
        { t: 'n', v: reportData.referrals.length > 0 ? (inst.count / reportData.referrals.length) : 0, z: '0.0%' }
      ]),
      [],
      [
        'GENEL TOPLAM',
        `${sortedInsts.length} Kurum`,
        reportData.referrals.length,
        { t: 'n', v: reportData.totalReferralPrice, z: '#,##0.00' },
        { t: 'n', v: reportData.totalReferralCost, z: '#,##0.00' },
        { t: 'n', v: reportData.estimatedProfit, z: '#,##0.00' },
        { t: 'n', v: reportData.totalReferralPrice > 0 ? (reportData.estimatedProfit / reportData.totalReferralPrice) : 0, z: '0.0%' },
        { t: 'n', v: 1, z: '0.0%' }
      ]
    ];

    const wsInst = XLSX.utils.aoa_to_sheet(instRows);
    wsInst['!cols'] = autoFitColumns(instRows);
    XLSX.utils.book_append_sheet(wb, wsInst, '4_Kurum_Hakedis_Mutabakati');

    // --- SAYFA 5: FİRMA CİRO VE TAHSİLAT MUTABAKATI ---
    const compHeaders = [
      'Sıra No',
      'Firma / Müşteri Adı',
      'Sevk Edilen Personel',
      'Toplam Ciro (TL)',
      'Elden Nakit (TL)',
      'POS / Kredi Kartı (TL)',
      'Cari / Fatura (TL)',
      'Kurum Maliyeti (TL)',
      'Net Kâr (TL)',
      'Kâr Marjı (%)'
    ];

    const sortedComps = Object.values(reportData.companyStats).sort((a, b) => b.total - a.total);
    const compRows: any[][] = [
      compHeaders,
      ...sortedComps.map((comp, idx) => [
        idx + 1,
        comp.name,
        comp.count,
        { t: 'n', v: comp.total, z: '#,##0.00' },
        { t: 'n', v: comp.cashTotal, z: '#,##0.00' },
        { t: 'n', v: comp.posTotal, z: '#,##0.00' },
        { t: 'n', v: comp.invoiceTotal, z: '#,##0.00' },
        { t: 'n', v: comp.cost, z: '#,##0.00' },
        { t: 'n', v: comp.total - comp.cost, z: '#,##0.00' },
        { t: 'n', v: comp.total > 0 ? ((comp.total - comp.cost) / comp.total) : 0, z: '0.0%' }
      ]),
      [],
      [
        'GENEL TOPLAM',
        `${sortedComps.length} Firma`,
        reportData.referrals.length,
        { t: 'n', v: reportData.totalReferralPrice, z: '#,##0.00' },
        { t: 'n', v: reportData.paymentStats.cash.total, z: '#,##0.00' },
        { t: 'n', v: reportData.paymentStats.pos.total, z: '#,##0.00' },
        { t: 'n', v: reportData.paymentStats.invoice.total, z: '#,##0.00' },
        { t: 'n', v: reportData.totalReferralCost, z: '#,##0.00' },
        { t: 'n', v: reportData.estimatedProfit, z: '#,##0.00' },
        { t: 'n', v: reportData.totalReferralPrice > 0 ? (reportData.estimatedProfit / reportData.totalReferralPrice) : 0, z: '0.0%' }
      ]
    ];

    const wsComp = XLSX.utils.aoa_to_sheet(compRows);
    wsComp['!cols'] = autoFitColumns(compRows);
    XLSX.utils.book_append_sheet(wb, wsComp, '5_Firma_Ciro_Mutabakati');

    XLSX.writeFile(wb, `OSGB_Z_Raporu_Detayli_${dateStr}.xlsx`);
  };

  const handleSendTelegram = async () => {
    setTelegramStatus({ type: 'loading', message: "Z Raporu hazırlanıyor ve Telegram'a gönderiliyor..." });
    try {
      const { getApiToken } = await import('../services/useServerData');
      const baseUrl = import.meta.env.BASE_URL || '/';

      const body: any = {
        company: selectedCompany === 'ALL' ? undefined : selectedCompany,
        period: period === 'yesterday' ? 'custom' : period,
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString()
      };

      const res = await fetch(`${baseUrl}api/telegram/send-now`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getApiToken()}`
        },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (res.ok) {
        setTelegramStatus({ type: 'success', message: data.message || "Rapor Telegram'a başarıyla gönderildi!" });
        setTimeout(() => setTelegramStatus({ type: 'idle', message: '' }), 5000);
      } else {
        setTelegramStatus({ type: 'error', message: data.error || 'Rapor gönderilemedi.' });
      }
    } catch (err: any) {
      setTelegramStatus({ type: 'error', message: `Hata: ${err.message}` });
    }
  };

  const sortedInstitutions = useMemo(
    () => (Object.values(reportData.institutionStats) as InstitutionStat[]).sort((a, b) => b.count - a.count),
    [reportData.institutionStats]
  );

  const sortedCompanies = useMemo(
    () => (Object.values(reportData.companyStats) as CompanyStat[]).sort((a, b) => b.total - a.total),
    [reportData.companyStats]
  );

  const profitMargin =
    reportData.totalReferralPrice > 0
      ? Math.round((reportData.estimatedProfit / reportData.totalReferralPrice) * 100)
      : 0;

  // Donut Chart Calculations (Payment Distribution)
  const paymentChartData = useMemo(() => {
    const cashVal = reportData.paymentStats.cash.total;
    const posVal = reportData.paymentStats.pos.total;
    const invVal = reportData.paymentStats.invoice.total;
    const sum = cashVal + posVal + invVal;

    const cashPct = sum > 0 ? Math.round((cashVal / sum) * 100) : 0;
    const posPct = sum > 0 ? Math.round((posVal / sum) * 100) : 0;
    const invPct = sum > 0 ? Math.max(0, 100 - cashPct - posPct) : 0;

    // SVG Circle r=56 => circumference = 2 * pi * 56 = 351.86
    const C = 351.86;
    const cashLen = sum > 0 ? (cashVal / sum) * C : 0;
    const posLen = sum > 0 ? (posVal / sum) * C : 0;
    const invLen = sum > 0 ? (invVal / sum) * C : 0;

    return {
      sum,
      cashPct,
      posPct,
      invPct,
      C,
      cashLen,
      posLen,
      invLen
    };
  }, [reportData.paymentStats]);

  const maxDailyValue = useMemo(() => {
    const m = Math.max(...reportData.dailyTrend.map(d => Math.max(d.revenue, d.cost, 1)), 1);
    return m;
  }, [reportData.dailyTrend]);

  const maxExamCount = useMemo(() => {
    return Math.max(...reportData.examStats.map(e => e.count), 1);
  }, [reportData.examStats]);

  return (
    <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-50 overflow-hidden flex flex-col">
      {/* --- TOP HEADER BAR --- */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 md:px-8 py-3.5 shrink-0 shadow-xl">
        <div className="max-w-7xl mx-auto flex flex-col gap-3">
          {/* Row 1: Title & Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-indigo-500 to-blue-600 p-2.5 rounded-xl shadow-lg shadow-indigo-900/40 border border-indigo-400/20">
                <Calculator className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-lg md:text-xl font-extrabold text-white tracking-tight">{getTitle()}</h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                    {dateRange.start.toLocaleDateString('tr-TR')} — {dateRange.end.toLocaleDateString('tr-TR')}
                  </span>
                  <span className="hidden sm:inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    {reportData.referrals.length} Sevk Kaydı
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Grafikli Finansal Analiz, Nakit Çekmece, POS (Banka), Cari (Fatura) ve Kurum Mutabakat Ekranı
                </p>
              </div>
            </div>

            <div className="flex items-center flex-wrap gap-2">
              {telegramStatus.type !== 'idle' && (
                <div
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
                    telegramStatus.type === 'success'
                      ? 'text-emerald-300 bg-emerald-500/15 border border-emerald-500/30'
                      : telegramStatus.type === 'loading'
                        ? 'text-sky-300 bg-sky-500/15 border border-sky-500/30'
                        : 'text-red-300 bg-red-500/15 border border-red-500/30'
                  }`}
                >
                  <span>{telegramStatus.message}</span>
                </div>
              )}

              <button
                onClick={() => window.print()}
                className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-2 rounded-xl text-xs md:text-sm font-bold border border-slate-700 transition-all cursor-pointer"
                title="Raporu Yazdır"
              >
                <Printer className="w-4 h-4 text-indigo-400" />
                <span className="hidden sm:inline">Yazdır</span>
              </button>

              <button
                onClick={handleDownloadExcel}
                className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs md:text-sm font-bold shadow-lg shadow-emerald-900/20 transition-all active:scale-95 border border-emerald-500/40 cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Z Raporu Excel İndir</span>
              </button>

              <button
                onClick={handleSendTelegram}
                disabled={telegramStatus.type === 'loading'}
                className="flex items-center space-x-2 bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded-xl text-xs md:text-sm font-bold shadow-lg shadow-sky-900/20 transition-all active:scale-95 border border-sky-500/40 disabled:opacity-50 cursor-pointer"
              >
                {telegramStatus.type === 'loading' ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>Telegram&apos;a Gönder</span>
              </button>

              <button
                onClick={onClose}
                className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3.5 py-2 rounded-xl text-xs md:text-sm font-bold border border-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span>Kapat</span>
              </button>
            </div>
          </div>

          {/* Row 2: Period Selector, Custom Date Inputs, Company Filter, Search */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex bg-slate-950 rounded-xl p-1 border border-slate-800">
                <button
                  onClick={() => setPeriod('daily')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    period === 'daily' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Bugün
                </button>
                <button
                  onClick={() => setPeriod('yesterday')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    period === 'yesterday' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Dün
                </button>
                <button
                  onClick={() => setPeriod('weekly')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    period === 'weekly' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Bu Hafta
                </button>
                <button
                  onClick={() => setPeriod('monthly')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    period === 'monthly' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Bu Ay
                </button>
                <button
                  onClick={() => setPeriod('custom')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center cursor-pointer ${
                    period === 'custom' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5 mr-1.5" /> Özel Tarih
                </button>
              </div>

              {period === 'custom' && (
                <div className="flex items-center space-x-2 bg-slate-950 px-2.5 py-1 rounded-xl border border-indigo-500/40">
                  <input
                    type="date"
                    value={customStart}
                    onChange={e => setCustomStart(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white outline-none focus:border-indigo-500"
                  />
                  <span className="text-slate-500 text-xs font-bold">→</span>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={e => setCustomEnd(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white outline-none focus:border-indigo-500"
                  />
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-56">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Personel, TC veya firma ara..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none"
                />
              </div>

              <select
                value={selectedCompany}
                onChange={e => setSelectedCompany(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-white text-xs rounded-xl focus:border-indigo-500 px-3 py-1.5 outline-none cursor-pointer max-w-[220px]"
              >
                <option value="ALL">🏢 Tüm Firmalar ({companies.length})</option>
                {companies.map(c => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* --- MAIN SCROLLABLE DASHBOARD --- */}
      <div ref={reportContainerRef} className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar bg-slate-950">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* 1. EXECUTIVE SUMMARY CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Toplam Ciro */}
            <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Toplam Sevk Cirosu</span>
                <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                  <TrendingUp className="w-4 h-4 text-blue-400" />
                </div>
              </div>
              <h3 className="text-2xl md:text-3xl font-extrabold text-white">
                ₺{reportData.totalReferralPrice.toLocaleString('tr-TR')}
              </h3>
              <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-400">Toplam İşlem:</span>
                <span className="font-bold text-blue-400">{reportData.referrals.length} Personel</span>
              </div>
            </div>

            {/* Card 2: Toplam Maliyet */}
            <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Kurum Maliyetleri</span>
                <div className="p-2 bg-red-500/10 rounded-lg border border-red-500/20">
                  <TrendingDown className="w-4 h-4 text-red-400" />
                </div>
              </div>
              <h3 className="text-2xl md:text-3xl font-extrabold text-red-400">
                ₺{reportData.totalReferralCost.toLocaleString('tr-TR')}
              </h3>
              <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-400">Hastanelere Ödenecek:</span>
                <span className="font-bold text-slate-300">{sortedInstitutions.length} Kurum</span>
              </div>
            </div>

            {/* Card 3: Tahmini Brüt Kâr */}
            <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Net Brüt Kâr</span>
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    profitMargin >= 0
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                      : 'bg-red-500/15 text-red-300 border border-red-500/30'
                  }`}
                >
                  %{profitMargin} Marj
                </span>
              </div>
              <h3
                className={`text-2xl md:text-3xl font-extrabold ${
                  reportData.estimatedProfit >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                ₺{reportData.estimatedProfit.toLocaleString('tr-TR')}
              </h3>
              <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-400">Ciro - Kurum Maliyeti</span>
                <span className="font-bold text-emerald-400">Net Kazanç</span>
              </div>
            </div>

            {/* Card 4: Çekmece Net Nakit Kasa Mutabakatı */}
            <div className="bg-gradient-to-br from-emerald-950/50 to-slate-900 border border-emerald-500/40 p-5 rounded-2xl shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-emerald-300 text-xs font-extrabold uppercase tracking-wider flex items-center gap-1">
                  💵 Çekmece Nakit Kasa
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  POS Hariç
                </span>
              </div>
              <h3 className="text-2xl md:text-3xl font-extrabold text-white">
                ₺{reportData.closingBalance.toLocaleString('tr-TR')}
              </h3>
              <div className="mt-2.5 pt-2 border-t border-emerald-500/20 space-y-1 text-[11px]">
                <div className="flex justify-between text-slate-300">
                  <span>Dönem Nakit Giriş:</span>
                  <span className="font-bold text-emerald-400">+₺{reportData.periodCashIncome.toLocaleString('tr-TR')}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Dönem Nakit Çıkış (Gider):</span>
                  <span className="font-bold text-red-400">-₺{reportData.totalExpense.toLocaleString('tr-TR')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. VISUAL CHARTS SECTION (DONUT CHART + DAILY BAR CHART) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left (5 cols): Tahsilat Kanalı Pasta / Halka Grafiği (Donut Chart) */}
            <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm md:text-base font-bold text-white flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-indigo-400" />
                    <span>Tahsilat Dağılım Grafiği</span>
                  </h3>
                  <span className="text-[11px] text-slate-400 font-medium">Tıklayarak Filtrele</span>
                </div>
                <p className="text-xs text-slate-400 mb-4">
                  Nakit (Kasa), POS (Banka) ve Cari (Fatura) oranları
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-6 my-auto">
                {/* Interactive SVG Donut */}
                <div className="relative w-40 h-40 shrink-0 flex items-center justify-center">
                  <svg className="w-40 h-40 -rotate-90 transform" viewBox="0 0 140 140">
                    <circle
                      cx="70"
                      cy="70"
                      r="56"
                      fill="transparent"
                      stroke="#1e293b"
                      strokeWidth="16"
                    />
                    {paymentChartData.sum > 0 && (
                      <>
                        {/* Cash Segment (Emerald) */}
                        <circle
                          cx="70"
                          cy="70"
                          r="56"
                          fill="transparent"
                          stroke="#10b981"
                          strokeWidth="16"
                          strokeDasharray={`${paymentChartData.cashLen} ${paymentChartData.C}`}
                          strokeDashoffset={0}
                          className="transition-all duration-500 cursor-pointer hover:opacity-80"
                          onClick={() => setActiveTableTab('CASH')}
                        />
                        {/* POS Segment (Purple) */}
                        <circle
                          cx="70"
                          cy="70"
                          r="56"
                          fill="transparent"
                          stroke="#a855f7"
                          strokeWidth="16"
                          strokeDasharray={`${paymentChartData.posLen} ${paymentChartData.C}`}
                          strokeDashoffset={-paymentChartData.cashLen}
                          className="transition-all duration-500 cursor-pointer hover:opacity-80"
                          onClick={() => setActiveTableTab('POS')}
                        />
                        {/* Invoice Segment (Blue) */}
                        <circle
                          cx="70"
                          cy="70"
                          r="56"
                          fill="transparent"
                          stroke="#3b82f6"
                          strokeWidth="16"
                          strokeDasharray={`${paymentChartData.invLen} ${paymentChartData.C}`}
                          strokeDashoffset={-(paymentChartData.cashLen + paymentChartData.posLen)}
                          className="transition-all duration-500 cursor-pointer hover:opacity-80"
                          onClick={() => setActiveTableTab('INVOICE')}
                        />
                      </>
                    )}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Toplam</span>
                    <span className="text-sm font-extrabold text-white">
                      ₺{paymentChartData.sum.toLocaleString('tr-TR')}
                    </span>
                    <span className="text-[10px] text-slate-400">{reportData.referrals.length} Sevk</span>
                  </div>
                </div>

                {/* Legend Cards */}
                <div className="flex-1 w-full space-y-2.5">
                  <div
                    onClick={() => setActiveTableTab('CASH')}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      activeTableTab === 'CASH'
                        ? 'bg-emerald-950/50 border-emerald-500'
                        : 'bg-slate-950/60 border-slate-800 hover:border-emerald-500/40'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0"></span>
                      <div>
                        <div className="text-xs font-bold text-white">💵 Elden Nakit (Kasada)</div>
                        <div className="text-[10px] text-emerald-400">
                          {reportData.paymentStats.cash.count} Kişi • %{paymentChartData.cashPct}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs font-extrabold text-emerald-400">
                      ₺{reportData.paymentStats.cash.total.toLocaleString('tr-TR')}
                    </div>
                  </div>

                  <div
                    onClick={() => setActiveTableTab('POS')}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      activeTableTab === 'POS'
                        ? 'bg-purple-950/50 border-purple-500'
                        : 'bg-slate-950/60 border-slate-800 hover:border-purple-500/40'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-3 h-3 rounded-full bg-purple-500 shrink-0"></span>
                      <div>
                        <div className="text-xs font-bold text-white">💳 POS / Banka (Ayrı)</div>
                        <div className="text-[10px] text-purple-400">
                          {reportData.paymentStats.pos.count} Kişi • %{paymentChartData.posPct}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs font-extrabold text-purple-400">
                      ₺{reportData.paymentStats.pos.total.toLocaleString('tr-TR')}
                    </div>
                  </div>

                  <div
                    onClick={() => setActiveTableTab('INVOICE')}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      activeTableTab === 'INVOICE'
                        ? 'bg-blue-950/50 border-blue-500'
                        : 'bg-slate-950/60 border-slate-800 hover:border-blue-500/40'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-3 h-3 rounded-full bg-blue-500 shrink-0"></span>
                      <div>
                        <div className="text-xs font-bold text-white">🧾 Fatura / Cari</div>
                        <div className="text-[10px] text-blue-400">
                          {reportData.paymentStats.invoice.count} Kişi • %{paymentChartData.invPct}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs font-extrabold text-blue-400">
                      ₺{reportData.paymentStats.invoice.total.toLocaleString('tr-TR')}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right (7 cols): Günlük Ciro, Maliyet ve Net Kâr Sütun Grafiği (Bar Chart) */}
            <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div>
                  <h3 className="text-sm md:text-base font-bold text-white flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-blue-400" />
                    <span>
                      {period === 'daily' || period === 'yesterday'
                        ? 'Son 7 Günlük Ciro & Kâr Trend Grafiği'
                        : 'Dönem İçi Günlük Ciro & Kâr Grafiği'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Sütunların üzerine gelerek o güne ait detaylı sevk, ciro, maliyet ve kâr rakamlarını görebilirsiniz
                  </p>
                </div>

                <div className="flex items-center gap-3 text-[11px] font-semibold">
                  <span className="flex items-center gap-1.5 text-blue-400">
                    <span className="w-2.5 h-2.5 rounded-sm bg-blue-500"></span> Ciro
                  </span>
                  <span className="flex items-center gap-1.5 text-red-400">
                    <span className="w-2.5 h-2.5 rounded-sm bg-red-500"></span> Maliyet
                  </span>
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span> Net Kâr
                  </span>
                </div>
              </div>

              {reportData.dailyTrend.length === 0 ? (
                <div className="h-44 flex items-center justify-center text-slate-500 text-xs">
                  Grafik için seçili dönemde veri bulunamadı.
                </div>
              ) : (
                <div className="h-48 flex items-end gap-2 md:gap-3 pt-6 pb-1 px-2 border-b border-slate-800 overflow-x-auto custom-scrollbar">
                  {reportData.dailyTrend.map(point => {
                    const revHeight = Math.max(4, Math.round((point.revenue / maxDailyValue) * 125));
                    const costHeight = Math.max(4, Math.round((point.cost / maxDailyValue) * 125));
                    const profitHeight = Math.max(4, Math.round((Math.max(0, point.profit) / maxDailyValue) * 125));

                    return (
                      <div
                        key={point.dateKey}
                        className="flex-1 min-w-[46px] flex flex-col items-center group relative"
                      >
                        {/* Hover Tooltip */}
                        <div className="opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity absolute -top-20 z-20 bg-slate-950 border border-slate-700 shadow-2xl rounded-xl px-3 py-2 text-[10px] whitespace-nowrap">
                          <div className="font-bold text-white border-b border-slate-800 pb-1 mb-1">
                            📅 {point.label} ({point.count} Sevk)
                          </div>
                          <div className="text-blue-400 font-semibold">Ciro: ₺{point.revenue.toLocaleString('tr-TR')}</div>
                          <div className="text-red-400 font-semibold">Maliyet: ₺{point.cost.toLocaleString('tr-TR')}</div>
                          <div className="text-emerald-400 font-bold">Net Kâr: ₺{point.profit.toLocaleString('tr-TR')}</div>
                        </div>

                        {/* Top count pill */}
                        <span className="text-[10px] font-bold text-slate-400 mb-1">
                          {point.count > 0 ? `${point.count}` : ''}
                        </span>

                        {/* Bars group */}
                        <div className="flex items-end justify-center gap-1 w-full h-[128px]">
                          <div
                            style={{ height: `${point.revenue > 0 ? revHeight : 3}px` }}
                            className="w-2.5 md:w-3 bg-gradient-to-t from-blue-600 to-blue-400 rounded-t transition-all duration-300 group-hover:brightness-125"
                          />
                          <div
                            style={{ height: `${point.cost > 0 ? costHeight : 3}px` }}
                            className="w-2.5 md:w-3 bg-gradient-to-t from-red-600 to-red-400 rounded-t transition-all duration-300 group-hover:brightness-125"
                          />
                          <div
                            style={{ height: `${point.profit > 0 ? profitHeight : 3}px` }}
                            className="w-2.5 md:w-3 bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t transition-all duration-300 group-hover:brightness-125"
                          />
                        </div>

                        {/* X-axis label */}
                        <span className="text-[10px] text-slate-400 font-medium mt-2 truncate">{point.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 3. KURUM MALİYETLERİ, FİRMA DAĞILIMI & EN ÇOK YAPILAN TETKİKLER GRAFİĞİ (3 COLUMNS) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Col 1 (5 cols): Institution Breakdown with visual progress bars */}
            <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-orange-400" />
                  <span>Kurum (Hastane) Sevk &amp; Maliyet Tablosu</span>
                </h3>
                <span className="text-[11px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-0.5 rounded-lg">
                  Borç: ₺{reportData.totalReferralCost.toLocaleString('tr-TR')}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-950/60 text-slate-400 text-[11px] uppercase font-bold">
                    <tr>
                      <th className="px-4 py-3">Kurum</th>
                      <th className="px-3 py-3 text-center">Sevk</th>
                      <th className="px-3 py-3 text-right">Ciro</th>
                      <th className="px-3 py-3 text-right">Maliyet</th>
                      <th className="px-4 py-3 text-right">Kâr</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 text-xs">
                    {sortedInstitutions.map((inst, idx) => {
                      const pct =
                        reportData.referrals.length > 0
                          ? Math.round((inst.count / reportData.referrals.length) * 100)
                          : 0;
                      return (
                        <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-white flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                              <span>{inst.name}</span>
                            </div>
                            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
                              <div
                                className="bg-orange-500 h-full rounded-full"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className="bg-slate-800 text-slate-200 px-2 py-0.5 rounded font-bold">
                              {inst.count} (%{pct})
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right text-slate-300 font-medium">
                            ₺{inst.revenue.toLocaleString('tr-TR')}
                          </td>
                          <td className="px-3 py-3 text-right font-bold text-red-400">
                            ₺{inst.cost.toLocaleString('tr-TR')}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-emerald-400">
                            ₺{inst.profit.toLocaleString('tr-TR')}
                          </td>
                        </tr>
                      );
                    })}
                    {sortedInstitutions.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-500 text-xs">
                          Seçili dönemde kurum sevki bulunamadı.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Col 2 (4 cols): Company Breakdown */}
            <div className="lg:col-span-4 bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-400" />
                  <span>Firma Bazlı Ciro Tablosu</span>
                </h3>
                <span className="text-[11px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-0.5 rounded-lg">
                  {sortedCompanies.length} Firma
                </span>
              </div>

              <div className="overflow-x-auto max-h-64 custom-scrollbar">
                <table className="w-full text-left">
                  <thead className="bg-slate-950/60 text-slate-400 text-[11px] uppercase font-bold sticky top-0">
                    <tr>
                      <th className="px-4 py-3">Firma Adı</th>
                      <th className="px-3 py-3 text-center">Kişi</th>
                      <th className="px-4 py-3 text-right">Toplam Ciro</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 text-xs">
                    {sortedCompanies.map((comp, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-2.5 font-semibold text-white truncate max-w-[160px]" title={comp.name}>
                          {comp.name}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className="bg-slate-800 text-slate-200 px-2 py-0.5 rounded font-bold">{comp.count}</span>
                        </td>
                        <td className="px-4 py-2.5 text-right font-bold text-emerald-400">
                          ₺{comp.total.toLocaleString('tr-TR')}
                        </td>
                      </tr>
                    ))}
                    {sortedCompanies.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-4 py-8 text-center text-slate-500 text-xs">
                          Seçili dönemde firma kaydı bulunamadı.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Col 3 (3 cols): En Çok Yapılan Tetkikler Yatay Bar Grafiği */}
            <div className="lg:col-span-3 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-emerald-400" />
                  <span>Tetkik Yoğunluk Grafiği</span>
                </h3>
              </div>

              <div className="space-y-2.5 flex-1 overflow-y-auto max-h-56 custom-scrollbar pr-1">
                {reportData.examStats.map((ex, i) => {
                  const widthPct = Math.round((ex.count / maxExamCount) * 100);
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-200 font-medium truncate max-w-[160px]" title={ex.name}>
                          {ex.name}
                        </span>
                        <span className="text-emerald-400 font-bold">{ex.count} Adet</span>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                          style={{ width: `${widthPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {reportData.examStats.length === 0 && (
                  <div className="text-center text-slate-500 text-xs py-8">Tetkik verisi bulunamadı.</div>
                )}
              </div>
            </div>
          </div>

          {/* 4. DETAILED INTERACTIVE LIST (ALL REFERRALS & CASH EXPENSES) */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm md:text-base font-bold text-white">
                  Dönem İçi Detaylı Sevk &amp; Kasa Hareket Tablosu
                </h3>
                <p className="text-xs text-slate-400">
                  Aşağıdaki sekmelerden Nakit, POS, Fatura sevklerini veya Kasadan yapılan Gider çıkışlarını filtreleyebilirsiniz.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setActiveTableTab('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTableTab === 'ALL'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  📋 Tüm Sevkler ({reportData.referrals.length})
                </button>
                <button
                  onClick={() => setActiveTableTab('CASH')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTableTab === 'CASH'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-950 text-emerald-400 hover:bg-slate-800 border border-emerald-500/30'
                  }`}
                >
                  💵 Elden Nakit ({reportData.paymentStats.cash.count})
                </button>
                <button
                  onClick={() => setActiveTableTab('POS')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTableTab === 'POS'
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-950 text-purple-400 hover:bg-slate-800 border border-purple-500/30'
                  }`}
                >
                  💳 POS / Banka ({reportData.paymentStats.pos.count})
                </button>
                <button
                  onClick={() => setActiveTableTab('INVOICE')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTableTab === 'INVOICE'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-950 text-blue-400 hover:bg-slate-800 border border-blue-500/30'
                  }`}
                >
                  🧾 Fatura / Cari ({reportData.paymentStats.invoice.count})
                </button>
                <button
                  onClick={() => setActiveTableTab('EXPENSES')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTableTab === 'EXPENSES'
                      ? 'bg-red-600 text-white'
                      : 'bg-slate-950 text-red-400 hover:bg-slate-800 border border-red-500/30'
                  }`}
                >
                  💸 Kasa Giderleri ({reportData.expenseTransactions.length})
                </button>
              </div>
            </div>

            {activeTableTab === 'EXPENSES' ? (
              <div className="overflow-x-auto max-h-96 custom-scrollbar">
                <table className="w-full text-left">
                  <thead className="bg-slate-950/80 text-slate-400 text-[11px] uppercase font-bold sticky top-0">
                    <tr>
                      <th className="px-5 py-3">Tarih / Saat</th>
                      <th className="px-5 py-3">Gider / Çıkış Açıklaması</th>
                      <th className="px-5 py-3">Çıktığı Kasa</th>
                      <th className="px-5 py-3 text-right">Çıkış Tutarı</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 text-xs">
                    {reportData.expenseTransactions.map(tx => (
                      <tr key={tx.id} className="hover:bg-slate-800/40">
                        <td className="px-5 py-3 text-slate-300">
                          {new Date(tx.date).toLocaleDateString('tr-TR')}{' '}
                          <span className="text-slate-500">
                            {new Date(tx.date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-white font-semibold">{tx.description}</td>
                        <td className="px-5 py-3">
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-500/15 text-red-300 border border-red-500/30">
                            💸 Nakit Kasadan Çıkış
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right font-extrabold text-red-400">
                          - ₺{tx.amount.toLocaleString('tr-TR')}
                        </td>
                      </tr>
                    ))}
                    {reportData.expenseTransactions.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-5 py-10 text-center text-slate-500">
                          Seçili dönemde nakit kasadan herhangi bir gider/çıkış yapılmamış.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[420px] custom-scrollbar">
                <table className="w-full text-left">
                  <thead className="bg-slate-950/90 text-slate-400 text-[11px] uppercase font-bold sticky top-0">
                    <tr>
                      <th className="px-4 py-3">Tarih</th>
                      <th className="px-4 py-3">Personel / TC</th>
                      <th className="px-4 py-3">Firma</th>
                      <th className="px-4 py-3">Kurum</th>
                      <th className="px-4 py-3">Ödeme &amp; Kasa Durumu</th>
                      <th className="px-4 py-3 text-right">Satış Tutarı</th>
                      <th className="px-4 py-3 text-right">Maliyet</th>
                      <th className="px-4 py-3 text-right">Net Kâr</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 text-xs">
                    {tableReferrals.map(ref => {
                      const instName = ref.targetInstitutionId
                        ? institutions.find(i => i.id === ref.targetInstitutionId)?.name || '-'
                        : '-';
                      const price = ref.totalPrice || 0;
                      const cost = ref.totalCost || 0;
                      const profit = price - cost;
                      return (
                        <tr key={ref.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="px-4 py-2.5 text-slate-300 whitespace-nowrap">
                            {new Date(ref.referralDate).toLocaleDateString('tr-TR')}{' '}
                            <span className="text-slate-500 text-[10px]">
                              {new Date(ref.referralDate).toLocaleTimeString('tr-TR', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="text-white font-semibold">{ref.employee.fullName}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{ref.employee.tcNo}</div>
                          </td>
                          <td className="px-4 py-2.5 text-slate-300 font-medium">{ref.employee.company}</td>
                          <td className="px-4 py-2.5 text-slate-400">{instName}</td>
                          <td className="px-4 py-2.5">
                            {ref.paymentMethod === 'CASH' && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                💵 Elden Nakit (Kasada)
                              </span>
                            )}
                            {ref.paymentMethod === 'POS' && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                                💳 POS / Banka (Kasaya Girmez)
                              </span>
                            )}
                            {ref.paymentMethod === 'INVOICE' && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                                🧾 Fatura / Cari
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right font-bold text-white">
                            ₺{price.toLocaleString('tr-TR')}
                          </td>
                          <td className="px-4 py-2.5 text-right text-red-400 font-medium">
                            ₺{cost.toLocaleString('tr-TR')}
                          </td>
                          <td
                            className={`px-4 py-2.5 text-right font-bold ${
                              profit >= 0 ? 'text-emerald-400' : 'text-red-400'
                            }`}
                          >
                            ₺{profit.toLocaleString('tr-TR')}
                          </td>
                        </tr>
                      );
                    })}
                    {tableReferrals.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                          Bu filtreye uygun sevk kaydı bulunamadı.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {tableReferrals.length > 0 && (
                    <tfoot className="bg-slate-950 border-t border-slate-800 text-xs font-extrabold text-white sticky bottom-0">
                      <tr>
                        <td colSpan={5} className="px-4 py-3 text-right text-slate-400 uppercase">
                          Listelenen ({tableReferrals.length} Kayıt) Toplamı:
                        </td>
                        <td className="px-4 py-3 text-right text-white">
                          ₺
                          {tableReferrals
                            .reduce((sum, r) => sum + (r.totalPrice || 0), 0)
                            .toLocaleString('tr-TR')}
                        </td>
                        <td className="px-4 py-3 text-right text-red-400">
                          ₺
                          {tableReferrals
                            .reduce((sum, r) => sum + (r.totalCost || 0), 0)
                            .toLocaleString('tr-TR')}
                        </td>
                        <td className="px-4 py-3 text-right text-emerald-400">
                          ₺
                          {tableReferrals
                            .reduce((sum, r) => sum + ((r.totalPrice || 0) - (r.totalCost || 0)), 0)
                            .toLocaleString('tr-TR')}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
