/*
 * Project: OSGB Tetkik Takip Sistemi
 * Copyright (C) 2026 szgn_emin
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License.
 */
import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  Plus, 
  Search,
  Activity,
  Stethoscope,
  Wallet,
  FileText,
  Menu,
  X,
  Loader2,
  LogOut
} from 'lucide-react';
import { ReferralList } from './components/ReferralList';
import { StatsCards } from './components/StatsCards';
import { EndOfDayReportModal } from './components/EndOfDayReportModal';
import { ReferralPrintTemplate } from './components/ReferralPrintTemplate';
import { Auth } from './components/Auth';
import { BulkImportModal } from './components/BulkImportModal';
import { Referral, Status, Company, ExamDefinition, SafeTransaction, MedicalInstitution, AppSettings } from './types';
import { 
  useServerData,
  saveReferralToDb, deleteReferralFromDb,
  saveCompanyToDb, deleteCompanyFromDb,
  saveExamToDb, deleteExamFromDb,
  saveInstitutionToDb, deleteInstitutionFromDb,
  saveTransactionToDb, deleteTransactionFromDb,
  saveSettingsToDb,
  setApiToken, getApiToken
} from './services/useServerData';

// --- LAZY LOADING ---
const NewReferralView = lazy(() => import('./components/NewReferralModal').then(module => ({ default: module.NewReferralView })));
const FinanceView = lazy(() => import('./components/FinanceView').then(module => ({ default: module.FinanceView })));
const SettingsView = lazy(() => import('./components/SettingsView').then(module => ({ default: module.SettingsView })));

const PageLoader = () => (
  <div className="flex flex-col items-center justify-center h-full text-slate-500">
    <Loader2 className="w-8 h-8 animate-spin mb-2 text-blue-500" />
    <span className="text-xs font-medium">Yükleniyor...</span>
  </div>
);

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'referrals' | 'finance' | 'settings' | 'create_referral'>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const token = sessionStorage.getItem('api_token');
    if (token) {
      setApiToken(token);
      return true;
    }
    return false;
  });

  // Data States from Server
  const { referrals, companies, exams, institutions, transactions, appSettings, loading, reloadData } = useServerData(isAuthenticated);
  
  const [editingReferral, setEditingReferral] = useState<Referral | null>(null);
  const [printingReferral, setPrintingReferral] = useState<Referral | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [logoClickCount, setLogoClickCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  // Secret keyboard shortcut to open bulk import: Ctrl+Shift+B, Alt+Shift+B, or Ctrl+Alt+B
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'b') ||
        (e.altKey && e.shiftKey && e.key.toLowerCase() === 'b')
      ) {
        e.preventDefault();
        setIsBulkModalOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (printingReferral) {
      const timer = setTimeout(() => {
        window.print();
        setTimeout(() => setPrintingReferral(null), 100);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [printingReferral]);

  const filteredReferrals = useMemo(() => {
    return referrals
      .filter(r => 
        r?.employee?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r?.employee?.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r?.employee?.tcNo?.includes(searchTerm)
      )
      .sort((a, b) => new Date(b.referralDate).getTime() - new Date(a.referralDate).getTime());
  }, [referrals, searchTerm]);

  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const totalIncome = transactions
      .filter(t => t.type === 'INCOME')
      .reduce((acc, curr) => acc + curr.amount, 0);

    return {
      total: referrals.length,
      today: referrals.filter(r => r.referralDate.startsWith(todayStr)).length,
      totalIncome: totalIncome
    };
  }, [referrals, transactions]);

  // Auth lock screen
  if (!isAuthenticated) {
    return <Auth onAuthenticated={() => setIsAuthenticated(true)} />;
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-slate-950 items-center justify-center">
        <PageLoader />
      </div>
    );
  }

  const handleLogout = async () => {
    try {
      setApiToken('');
      sessionStorage.removeItem('api_token');
      setIsAuthenticated(false);
    } catch(err) {
      console.error(err);
    }
  };

  // Handlers
  const handleSaveReferral = async (referral: Referral, shouldPrint: boolean = false) => {
    await saveReferralToDb(referral);
    
    if (editingReferral) {
        // Find existing transaction and update/replace it if payment is involved
        const txToDelete = transactions.filter(t => t.referralId === referral.id);
        for (const t of txToDelete) {
           await deleteTransactionFromDb(t.id);
        }
    } 

    if ((referral.paymentMethod === 'CASH' || referral.paymentMethod === 'POS') && referral.totalPrice && referral.totalPrice > 0) {
        const typeLabel = referral.paymentMethod === 'CASH' ? 'Nakit' : 'Pos';
        const newTransaction: SafeTransaction = {
            id: Math.random().toString(36).substr(2, 9),
            type: 'INCOME',
            amount: referral.totalPrice,
            description: `Sevk Geliri (${typeLabel}): ${referral.employee.fullName} (${referral.employee.company})`,
            date: referral.referralDate,
            paymentMethod: referral.paymentMethod,
            referralId: referral.id
        };
        await saveTransactionToDb(newTransaction);
    }
    
    setEditingReferral(null);
    await reloadData();
    
    if (shouldPrint || appSettings?.autoPrintReferral) {
      setPrintingReferral(referral);
    }
    setActiveTab('referrals');
  };

  const handleEditReferral = (referral: Referral) => {
      setEditingReferral(referral);
      setActiveTab('create_referral');
  };

  const handleCloseReferralForm = () => {
      setEditingReferral(null);
      setActiveTab('referrals');
  };

  const handleUpdateStatus = async (id: string, newStatus: Status) => {
    const referral = referrals.find(r => r.id === id);
    if (referral) {
       await saveReferralToDb({ ...referral, status: newStatus });
       await reloadData();
    }
  };

  const handleDelete = async (id: string) => {
    if(window.confirm('Bu kaydı silmek istediğinize emin misiniz?')) {
      await deleteReferralFromDb(id);
      const txs = transactions.filter(t => t.referralId === id);
      for(const t of txs) {
         await deleteTransactionFromDb(t.id);
      }
      await reloadData();
    }
  };

  const handlePrintReferral = (referral: Referral) => {
    setPrintingReferral(referral);
  };

  // Settings Handlers
  const handleAddCompany = async (c: Company) => { await saveCompanyToDb(c); await reloadData(); };
  const handleUpdateCompany = async (updated: Company) => { await saveCompanyToDb(updated); await reloadData(); };
  const handleDeleteCompany = async (id: string) => { await deleteCompanyFromDb(id); await reloadData(); };
  const handleBulkDeleteCompanies = async (ids: string[]) => {
      for(const id of ids) {
         await deleteCompanyFromDb(id);
      }
      await reloadData();
  };
  
  const handleAddExam = async (e: ExamDefinition) => { await saveExamToDb(e); await reloadData(); };
  const handleUpdateExam = async (updated: ExamDefinition) => {
    try {
      const oldExam = exams.find(ex => ex.id === updated.id);
      if (oldExam && oldExam.name !== updated.name) {
        const oldName = oldExam.name;
        const newName = updated.name;
        
        // Propagate to companies defaultExams list
        for (const comp of companies) {
          if (comp.defaultExams.includes(oldName)) {
            const updatedDefaultExams = comp.defaultExams.map(n => n === oldName ? newName : n);
            await saveCompanyToDb({ ...comp, defaultExams: updatedDefaultExams });
          }
        }
        
        // Propagate to referrals exams list
        for (const ref of referrals) {
          if (ref.exams && ref.exams.includes(oldName)) {
            const updatedExams = ref.exams.map(n => n === oldName ? newName : n);
            await saveReferralToDb({ ...ref, exams: updatedExams });
          }
        }
      }
      await saveExamToDb(updated);
      await reloadData();
    } catch (err) {
      console.error("Exam update and propagation error:", err);
    }
  };
  const handleDeleteExam = async (id: string) => { await deleteExamFromDb(id); await reloadData(); };

  const handleAddInstitution = async (i: MedicalInstitution) => { await saveInstitutionToDb(i); await reloadData(); };
  const handleUpdateInstitution = async (updated: MedicalInstitution) => { await saveInstitutionToDb(updated); await reloadData(); };
  const handleDeleteInstitution = async (id: string) => { await deleteInstitutionFromDb(id); await reloadData(); };

  const handleUpdateSettings = async (newSettings: AppSettings) => { await saveSettingsToDb(newSettings); await reloadData(); };

  // Finance Handlers
  const handleAddTransaction = async (t: SafeTransaction) => { await saveTransactionToDb(t); await reloadData(); };
  const handleResetSafe = async () => {
    if(window.confirm('DİKKAT! Tüm kasa geçmişini silmek üzeresiniz. Bakiye sıfırlanacaktır. Bu işlem geri alınamaz. Onaylıyor musunuz?')) {
       for(const tx of transactions) {
          await deleteTransactionFromDb(tx.id);
       }
       await reloadData();
    }
  };

  const handleNavClick = (tab: typeof activeTab) => {
      if (tab === 'create_referral') {
          setEditingReferral(null); 
      }
      setActiveTab(tab);
      setIsMobileMenuOpen(false);
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 overflow-hidden print:h-auto print:overflow-visible print:block print:bg-white">
      
      <style type="text/css">
        {`
          @media print {
            @page {
              size: ${appSettings.printPageSize || 'A4'} portrait;
              margin: 10mm;
            }
            body {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              text-rendering: optimizeLegibility !important;
              -webkit-font-smoothing: antialiased !important;
              -moz-osx-font-smoothing: grayscale !important;
            }
            img, svg {
              image-rendering: high-quality !important;
            }
            * {
              text-shadow: none !important;
              box-shadow: none !important;
            }
          }
        `}
      </style>

      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 text-white flex flex-col shadow-xl transition-transform duration-300 md:relative md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} print:hidden`}>
        <div className="p-6 flex items-center justify-between border-b border-slate-800">
          <div 
            className="flex items-center space-x-3 cursor-pointer select-none"
            onClick={() => {
              setLogoClickCount(prev => {
                const next = prev + 1;
                if (next >= 5) {
                  setIsBulkModalOpen(true);
                  return 0;
                }
                return next;
              });
            }}
            title="Sürüm bilgileri ve toplu giriş"
          >
            {appSettings.companyLogo ? (
               <img src={appSettings.companyLogo} alt="Logo" className="w-10 h-10 object-contain rounded bg-white p-0.5" />
            ) : (
               <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-900/20">
                  <Stethoscope className="w-6 h-6 text-white" />
               </div>
            )}
            <div>
                <h1 className="text-xl font-bold tracking-tight">OSGB Pro</h1>
                <p className="text-xs text-slate-400">Tetkik Takip</p>
            </div>
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => handleNavClick('dashboard')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="font-medium">Genel Bakış</span>
          </button>
          
          <button 
            onClick={() => handleNavClick('referrals')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'referrals' || activeTab === 'create_referral' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <Users className="w-5 h-5" />
            <span className="font-medium">Personel Takibi</span>
          </button>

          <button 
            onClick={() => handleNavClick('finance')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'finance' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <Wallet className="w-5 h-5" />
            <span className="font-medium">Kasa & Finans</span>
          </button>

          <button 
            onClick={() => handleNavClick('settings')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${activeTab === 'settings' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <Settings className="w-5 h-5" />
            <span className="font-medium">Ayarlar</span>
          </button>
        </nav>
        
        <div className="p-4 border-t border-slate-800">
           <button 
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
           >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Güvenli Çıkış</span>
           </button>
        </div>
      </aside>

      <main className={`flex-1 flex flex-col h-full overflow-hidden relative bg-slate-950 ${printingReferral ? 'print:hidden' : ''}`}>
        <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 md:px-8 shadow-sm z-10 print:hidden shrink-0">
          <div className="flex items-center">
              <button 
                onClick={() => setIsMobileMenuOpen(true)}
                className="mr-4 md:hidden text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                  <Menu className="w-6 h-6" />
              </button>
              <h2 className="text-lg md:text-xl font-semibold text-white truncate">
                {activeTab === 'dashboard' ? 'Kontrol Paneli' : 
                 activeTab === 'referrals' ? 'Tetkik & Sevk Listesi' : 
                 activeTab === 'create_referral' ? (editingReferral ? 'Sevk Kaydını Düzenle' : 'Yeni Sevk Girişi') :
                 activeTab === 'finance' ? 'Kasa Yönetimi' : 'Ayarlar'}
              </h2>
          </div>

          <div className="flex items-center space-x-4">
            {activeTab !== 'create_referral' && (
              <>
                <div className="relative hidden md:block">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input 
                    type="text"
                    placeholder="Personel, Firma, TC No..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64 transition-all placeholder-slate-500"
                  />
                </div>
                <button 
                  onClick={() => {
                      setEditingReferral(null);
                      setActiveTab('create_referral');
                  }}
                  className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 md:px-4 md:py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-900/20 active:transform active:scale-95 whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden md:inline">Yeni Sevk Oluştur</span>
                  <span className="md:hidden">Yeni Sevk</span>
                </button>
              </>
            )}
          </div>
        </header>

        <div className={`flex-1 ${activeTab === 'create_referral' ? 'overflow-hidden p-0' : 'overflow-auto p-4 md:p-8 custom-scrollbar'} print:p-0 print:overflow-visible`}>
          <Suspense fallback={<PageLoader />}>
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-3 md:gap-0">
                  <h3 className="text-lg font-bold text-white hidden md:block">Günlük Özet</h3>
                  <button 
                    onClick={() => setIsReportModalOpen(true)}
                    className="w-full md:w-auto flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Gün Sonu Raporu Al (Z Raporu)</span>
                  </button>
                </div>

                <StatsCards stats={stats} />
                
                <div className="mt-8">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                    <Activity className="w-5 h-5 mr-2 text-blue-500" />
                    Son Hareketler
                  </h3>
                  <ReferralList 
                    referrals={filteredReferrals.slice(0, 5)} 
                    institutions={institutions}
                    onUpdateStatus={handleUpdateStatus} 
                    onDelete={handleDelete}
                    onEdit={handleEditReferral}
                    onPrint={handlePrintReferral}
                    compact
                  />
                </div>
              </div>
            )}

            {activeTab === 'referrals' && (
              <div className="h-full flex flex-col">
                 <ReferralList 
                    referrals={filteredReferrals} 
                    institutions={institutions}
                    onUpdateStatus={handleUpdateStatus} 
                    onDelete={handleDelete}
                    onEdit={handleEditReferral}
                    onPrint={handlePrintReferral}
                  />
              </div>
            )}

            {activeTab === 'create_referral' && (
              <NewReferralView
                onClose={handleCloseReferralForm}
                onSubmit={handleSaveReferral}
                companies={companies}
                exams={exams}
                institutions={institutions}
                settings={appSettings}
                initialData={editingReferral}
              />
            )}

            {activeTab === 'finance' && (
              <div className="space-y-6">
                <div className="flex justify-end mb-4">
                  <button 
                    onClick={() => setIsReportModalOpen(true)}
                    className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-lg"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Gün Sonu Raporu Al (Z Raporu)</span>
                  </button>
                </div>
                <FinanceView 
                  transactions={transactions}
                  onAddTransaction={handleAddTransaction}
                  onResetSafe={handleResetSafe}
                />
              </div>
            )}

            {activeTab === 'settings' && (
              <SettingsView 
                  companies={companies}
                  onAddCompany={handleAddCompany}
                  onUpdateCompany={handleUpdateCompany}
                  onDeleteCompany={handleDeleteCompany}
                  onBulkDeleteCompanies={handleBulkDeleteCompanies}
                  exams={exams}
                  onAddExam={handleAddExam}
                  onUpdateExam={handleUpdateExam}
                  onDeleteExam={handleDeleteExam}
                  institutions={institutions}
                  onAddInstitution={handleAddInstitution}
                  onUpdateInstitution={handleUpdateInstitution}
                  onDeleteInstitution={handleDeleteInstitution}
                  settings={appSettings}
                  onUpdateSettings={handleUpdateSettings}
              />
            )}
          </Suspense>
        </div>
      </main>

      {isReportModalOpen && (
        <EndOfDayReportModal
          onClose={() => setIsReportModalOpen(false)}
          referrals={referrals}
          transactions={transactions}
          settings={appSettings}
          institutions={institutions}
          companies={companies}
        />
      )}

      {isBulkModalOpen && (
        <BulkImportModal
          isOpen={isBulkModalOpen}
          onClose={() => setIsBulkModalOpen(false)}
          companies={companies}
          exams={exams}
          institutions={institutions}
          onImportCompleted={reloadData}
          saveReferralToDb={saveReferralToDb}
          saveTransactionToDb={saveTransactionToDb}
        />
      )}

      {printingReferral && (
        <ReferralPrintTemplate
          referral={printingReferral}
          institution={institutions.find(i => i.id === printingReferral.targetInstitutionId)}
          settings={appSettings}
        />
      )}
    </div>
  );
};

export default App;
