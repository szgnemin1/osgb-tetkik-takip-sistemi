import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  Plus, 
  Search,
  Activity,
  LogOut,
  Stethoscope,
  Wallet,
  FileText,
  Menu,
  X,
  Loader2
} from 'lucide-react';
import { ReferralList } from './components/ReferralList';
import { StatsCards } from './components/StatsCards';
import { EndOfDayReportModal } from './components/EndOfDayReportModal';
import { Referral, Status, Company, ExamDefinition, SafeTransaction, MedicalInstitution, AppSettings } from './types';
import { 
  loadReferrals, saveReferrals, 
  loadCompanies, saveCompanies,
  loadExams, saveExams,
  loadTransactions, saveTransactions,
  loadInstitutions, saveInstitutions,
  loadAppSettings, saveAppSettings
} from './services/storage';
import { PREDEFINED_COMPANIES, DEFAULT_EXAMS, DEFAULT_INSTITUTIONS } from './services/initialData';

// --- LAZY LOADING ---
// Bu bileşenler sadece ihtiyaç duyulduğunda yüklenecek, açılışı yavaşlatmayacak.
const NewReferralView = lazy(() => import('./components/NewReferralModal').then(module => ({ default: module.NewReferralView })));
const FinanceView = lazy(() => import('./components/FinanceView').then(module => ({ default: module.FinanceView })));
const SettingsView = lazy(() => import('./components/SettingsView').then(module => ({ default: module.SettingsView })));

// Loading Component
const PageLoader = () => (
  <div className="flex flex-col items-center justify-center h-full text-slate-500">
    <Loader2 className="w-8 h-8 animate-spin mb-2 text-blue-500" />
    <span className="text-xs font-medium">Yükleniyor...</span>
  </div>
);

const App: React.FC = () => {
  // Added 'create_referral' to navigation state
  const [activeTab, setActiveTab] = useState<'dashboard' | 'referrals' | 'finance' | 'settings' | 'create_referral'>('dashboard');
  
  // Mobile Menu State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Data States
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [exams, setExams] = useState<ExamDefinition[]>([]);
  const [institutions, setInstitutions] = useState<MedicalInstitution[]>([]);
  const [transactions, setTransactions] = useState<SafeTransaction[]>([]);
  const [appSettings, setAppSettings] = useState<AppSettings>({ ekgLimitAge: 40 });
  
  // isModalOpen removed as it is now a page
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Initial load
  useEffect(() => {
    setReferrals(loadReferrals());
    setCompanies(loadCompanies(PREDEFINED_COMPANIES));
    setExams(loadExams(DEFAULT_EXAMS));
    setInstitutions(loadInstitutions(DEFAULT_INSTITUTIONS));
    setTransactions(loadTransactions());
    setAppSettings(loadAppSettings());
  }, []);

  // Save Effects
  useEffect(() => saveReferrals(referrals), [referrals]);
  useEffect(() => saveCompanies(companies), [companies]);
  useEffect(() => saveExams(exams), [exams]);
  useEffect(() => saveInstitutions(institutions), [institutions]);
  useEffect(() => saveTransactions(transactions), [transactions]);
  useEffect(() => saveAppSettings(appSettings), [appSettings]);

  // Handlers
  const handleCreateReferral = (referral: Referral) => {
    // 1. Add Referral (Always)
    setReferrals(prev => [referral, ...prev]);
    
    // 2. Add to Safe ONLY if Payment Method is CASH or POS
    if ((referral.paymentMethod === 'CASH' || referral.paymentMethod === 'POS') && referral.totalPrice && referral.totalPrice > 0) {
      const typeLabel = referral.paymentMethod === 'CASH' ? 'Nakit' : 'Pos';
      const newTransaction: SafeTransaction = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'INCOME',
        amount: referral.totalPrice,
        description: `Sevk Geliri (${typeLabel}): ${referral.employee.fullName} (${referral.employee.company})`,
        date: new Date().toISOString()
      };
      setTransactions(prev => [...prev, newTransaction]);
    }
    
    // Redirect back to referrals list after creation
    setActiveTab('referrals');
  };

  const handleUpdateStatus = (id: string, newStatus: Status) => {
    setReferrals(prev => prev.map(r => 
      r.id === id ? { ...r, status: newStatus } : r
    ));
  };

  const handleDelete = (id: string) => {
    if(window.confirm('Bu kaydı silmek istediğinize emin misiniz?')) {
      setReferrals(prev => prev.filter(r => r.id !== id));
    }
  };

  // Settings Handlers
  const handleAddCompany = (c: Company) => setCompanies(prev => [...prev, c]);
  const handleUpdateCompany = (updated: Company) => {
    setCompanies(prev => prev.map(c => c.id === updated.id ? updated : c));
  };
  const handleDeleteCompany = (id: string) => setCompanies(prev => prev.filter(c => c.id !== id));
  // New Bulk Delete Handler
  const handleBulkDeleteCompanies = (ids: string[]) => {
      setCompanies(prev => prev.filter(c => !ids.includes(c.id)));
  };
  
  const handleAddExam = (e: ExamDefinition) => setExams(prev => [...prev, e]);
  const handleUpdateExam = (updated: ExamDefinition) => setExams(prev => prev.map(e => e.id === updated.id ? updated : e));
  const handleDeleteExam = (id: string) => setExams(prev => prev.filter(e => e.id !== id));

  const handleAddInstitution = (i: MedicalInstitution) => setInstitutions(prev => [...prev, i]);
  const handleDeleteInstitution = (id: string) => setInstitutions(prev => prev.filter(i => i.id !== id));

  const handleUpdateSettings = (newSettings: AppSettings) => setAppSettings(newSettings);

  // Finance Handlers
  const handleAddTransaction = (t: SafeTransaction) => setTransactions(prev => [...prev, t]);
  const handleResetSafe = () => {
    if(window.confirm('DİKKAT! Tüm kasa geçmişini silmek üzeresiniz. Bakiye sıfırlanacaktır. Bu işlem geri alınamaz. Onaylıyor musunuz?')) {
      setTransactions([]);
    }
  };

  const filteredReferrals = useMemo(() => {
    return referrals.filter(r => 
      r.employee.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.employee.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.employee.tcNo.includes(searchTerm)
    );
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

  // Handle nav click (close mobile menu)
  const handleNavClick = (tab: typeof activeTab) => {
      setActiveTab(tab);
      setIsMobileMenuOpen(false);
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 overflow-hidden">
      
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 text-white flex flex-col shadow-xl transition-transform duration-300 md:relative md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} print:hidden`}>
        <div className="p-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            {appSettings.companyLogo ? (
               <img src={appSettings.companyLogo} alt="Logo" className="w-10 h-10 object-contain rounded bg-white p-0.5" />
            ) : (
               <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-900/20">
                  <Stethoscope className="w-6 h-6 text-white" />
               </div>
            )}
            <div>
                <h1 className="text-xl font-bold tracking-tight">OSGB Pro</h1>
                <p className="text-xs text-slate-400">Tetkik Takip Sistemi</p>
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
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative bg-slate-950">
        {/* Header */}
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
                 activeTab === 'create_referral' ? 'Yeni Sevk Girişi' :
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
                  onClick={() => setActiveTab('create_referral')}
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

        {/* Content Area - DYNAMIC PADDING ADJUSTMENT HERE */}
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
                  />
              </div>
            )}

            {activeTab === 'create_referral' && (
              <NewReferralView
                onClose={() => setActiveTab('referrals')}
                onSubmit={handleCreateReferral}
                companies={companies}
                exams={exams}
                institutions={institutions}
                settings={appSettings}
              />
            )}

            {activeTab === 'finance' && (
              <FinanceView 
                transactions={transactions}
                onAddTransaction={handleAddTransaction}
                onResetSafe={handleResetSafe}
              />
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
                  onDeleteInstitution={handleDeleteInstitution}
                  settings={appSettings}
                  onUpdateSettings={handleUpdateSettings}
              />
            )}
          </Suspense>
        </div>
      </main>

      {/* End of Day Report Modal - Still a modal */}
      {isReportModalOpen && (
        <EndOfDayReportModal
          onClose={() => setIsReportModalOpen(false)}
          referrals={referrals}
          transactions={transactions}
          settings={appSettings}
          institutions={institutions}
        />
      )}
    </div>
  );
};

export default App;