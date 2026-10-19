import React, { useState, useEffect } from 'react';
import { Search, FileText, Activity, Lock, RefreshCw, Clock, CheckCircle, AlertTriangle, Building2, X, Eye, Download, LogOut, ShieldCheck, AlertCircle } from 'lucide-react';

interface CompanyInfo {
    id: string;
    name: string;
}

export const SonucApp: React.FC = () => {
    const [token, setToken] = useState<string>(() => sessionStorage.getItem('sonuc_portal_jwt') || '');
    const [role, setRole] = useState<'admin' | 'company'>(() => (sessionStorage.getItem('sonuc_portal_role') as any) || 'admin');
    const [company, setCompany] = useState<CompanyInfo | null>(() => {
        const saved = sessionStorage.getItem('sonuc_portal_company');
        return saved ? JSON.parse(saved) : null;
    });
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => Boolean(sessionStorage.getItem('sonuc_portal_jwt')));

    // Login State
    const [password, setPassword] = useState('');
    const [loginLoading, setLoginLoading] = useState(false);
    const [error, setError] = useState('');

    // Admin View State
    const [adminSearchTerm, setAdminSearchTerm] = useState('');
    const [adminResults, setAdminResults] = useState<any[]>([]);
    const [adminLoading, setAdminLoading] = useState(false);

    // Company View State
    const [companyTc, setCompanyTc] = useState('');
    const [companyResults, setCompanyResults] = useState<any[]>([]);
    const [companyLoading, setCompanyLoading] = useState(false);
    const [companySearched, setCompanySearched] = useState(false);
    const [companyError, setCompanyError] = useState('');

    const authFetch = async (url: string, options: RequestInit = {}) => {
        const currentToken = token || sessionStorage.getItem('sonuc_portal_jwt') || '';
        const headers: Record<string, string> = {
            ...(options.headers as object),
        };
        if (!headers['Content-Type'] && options.method && options.method !== 'GET') {
            headers['Content-Type'] = 'application/json';
        }
        if (currentToken) {
            headers['Authorization'] = `Bearer ${currentToken}`;
        }
        const res = await fetch(url, { ...options, headers });
        if (res.status === 401) {
            handleLogout();
            setError('Oturum süreniz doldu, lütfen tekrar giriş yapın.');
            throw new Error('Unauthorized');
        }
        return res;
    };

    const handleLogout = () => {
        sessionStorage.removeItem('sonuc_portal_jwt');
        sessionStorage.removeItem('sonuc_portal_role');
        sessionStorage.removeItem('sonuc_portal_company');
        setToken('');
        setRole('admin');
        setCompany(null);
        setIsAuthenticated(false);
        setPassword('');
        setAdminResults([]);
        setCompanyResults([]);
        setCompanyTc('');
        setCompanySearched(false);
    };

    const parseDateScore = (d?: any): number => {
        if (!d) return 0;
        if (d instanceof Date) return d.getTime();
        const str = String(d).trim();
        const parts = str.split(' ')[0].split('.');
        if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const year = parseInt(parts[2], 10);
            const dateObj = new Date(year, month, day);
            if (!isNaN(dateObj.getTime())) return dateObj.getTime();
        }
        const t = new Date(str).getTime();
        return isNaN(t) ? 0 : t;
    };

    // Load Admin Results (Only when logged in as admin)
    const loadAdminAllResults = async () => {
        setAdminLoading(true);
        setError('');
        try {
            const res = await authFetch('/api/public/all-results');
            const data = await res.json();
            if (data.success) {
                const sorted = (data.results || []).sort((a: any, b: any) => parseDateScore(b.date) - parseDateScore(a.date));
                setAdminResults(sorted);
            } else {
                setError(data.error || 'Sonuçlar yüklenemedi.');
            }
        } catch (err: any) {
            if (err.message !== 'Unauthorized') {
                setError('Sunucu bağlantı hatası.');
            }
        }
        setAdminLoading(false);
    };

    useEffect(() => {
        if (isAuthenticated && role === 'admin') {
            loadAdminAllResults();
        }
    }, [isAuthenticated, role, token]);

    // Single Unified Login Handler
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!password.trim()) {
            setError('Lütfen şifrenizi giriniz.');
            return;
        }

        setLoginLoading(true);
        try {
            const res = await fetch('/api/public/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: password.trim() })
            });
            const data = await res.json();
            if (data.success && data.token) {
                setToken(data.token);
                sessionStorage.setItem('sonuc_portal_jwt', data.token);

                if (data.role === 'company' && data.company) {
                    setRole('company');
                    setCompany(data.company);
                    sessionStorage.setItem('sonuc_portal_role', 'company');
                    sessionStorage.setItem('sonuc_portal_company', JSON.stringify(data.company));
                } else {
                    setRole('admin');
                    setCompany(null);
                    sessionStorage.setItem('sonuc_portal_role', 'admin');
                    sessionStorage.removeItem('sonuc_portal_company');
                }

                setIsAuthenticated(true);
                setPassword('');
            } else {
                setError(data.error || 'Hatalı şifre.');
            }
        } catch (err) {
            setError('Sunucu bağlantı hatası.');
        }
        setLoginLoading(false);
    };

    // Admin Search Handler
    const handleAdminSearchSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const query = adminSearchTerm.trim();
        if (query.length === 11 && /^\d+$/.test(query)) {
            setAdminLoading(true);
            setError('');
            try {
                const res = await authFetch(`/api/public/results/${query}`);
                const data = await res.json();
                if (data.success) {
                    const sorted = (data.results || []).sort((a: any, b: any) => parseDateScore(b.date) - parseDateScore(a.date));
                    setAdminResults(sorted);
                } else {
                    setError(data.error || 'Sonuç bulunamadı.');
                }
            } catch (err: any) {
                if (err.message !== 'Unauthorized') setError('Sunucu bağlantı hatası.');
            }
            setAdminLoading(false);
        }
    };

    // Company Search Handler (Only TC search!)
    const handleCompanySearch = async (e: React.FormEvent) => {
        e.preventDefault();
        const cleanTc = companyTc.replace(/\D/g, '').trim();
        if (cleanTc.length !== 11) {
            setCompanyError('Lütfen 11 haneli geçerli bir TC Kimlik Numarası giriniz.');
            return;
        }

        setCompanyError('');
        setCompanyLoading(true);
        setCompanySearched(true);
        try {
            const res = await authFetch(`/api/public/results/${cleanTc}`);
            const data = await res.json();
            if (data.success) {
                const sorted = (data.results || []).sort((a: any, b: any) => parseDateScore(b.date) - parseDateScore(a.date));
                setCompanyResults(sorted);
            } else {
                setCompanyError(data.error || 'Sorgulama sırasında bir hata oluştu.');
                setCompanyResults([]);
            }
        } catch (err: any) {
            if (err.message !== 'Unauthorized') {
                setCompanyError('Sunucu bağlantı hatası.');
                setCompanyResults([]);
            }
        }
        setCompanyLoading(false);
    };

    // State for In-App PDF Preview Modal & Loading Indicators
    const [previewPdf, setPreviewPdf] = useState<{ url: string; title: string; filename: string } | null>(null);
    const [pdfActionLoading, setPdfActionLoading] = useState<string | null>(null);

    // Secure PDF View Handler (Blob URL based, Zero tokens exposed in URL)
    const handleViewPdf = async (pdfUrl: string, patientName?: string, tcNo?: string) => {
        if (!pdfUrl) return;
        const cleanUrl = pdfUrl.split('?')[0];
        setPdfActionLoading(`view-${cleanUrl}`);
        try {
            const res = await authFetch(cleanUrl);
            if (!res.ok) {
                alert('Tetkik raporu yüklenemedi veya erişim yetkiniz bulunmuyor.');
                return;
            }
            const blob = await res.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const safeName = (patientName || 'Tetkik_Raporu').replace(/[^a-zA-Z0-9çÇğĞıİöÖşŞüÜ_ -]/g, '_');
            const filename = `${safeName}_${tcNo || ''}_Tetkik_Raporu.pdf`;
            setPreviewPdf({
                url: blobUrl,
                title: `${patientName || 'Hasta'} (${tcNo || ''})`,
                filename
            });
        } catch (e) {
            console.error('PDF görüntüleme hatası:', e);
            alert('PDF raporu yüklenirken bir sorun oluştu.');
        } finally {
            setPdfActionLoading(null);
        }
    };

    // Secure PDF Download Handler (Programmatic, never exposes URL query tokens)
    const handleDownloadPdf = async (pdfUrl: string, patientName?: string, tcNo?: string) => {
        if (!pdfUrl) return;
        const cleanUrl = pdfUrl.split('?')[0];
        setPdfActionLoading(`download-${cleanUrl}`);
        const safeName = (patientName || 'Tetkik_Raporu').replace(/[^a-zA-Z0-9çÇğĞıİöÖşŞüÜ_ -]/g, '_');
        const filename = `${safeName}_${tcNo || ''}_Tetkik_Raporu.pdf`;

        try {
            const res = await authFetch(cleanUrl);
            if (!res.ok) {
                alert('Tetkik raporu indirilemedi veya erişim yetkiniz bulunmuyor.');
                return;
            }
            const blob = await res.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
        } catch (e) {
            console.error('PDF indirme hatası:', e);
            alert('PDF raporu indirilirken bir sorun oluştu.');
        } finally {
            setPdfActionLoading(null);
        }
    };

    // Render In-App PDF Preview Modal
    const renderPdfModal = () => {
        if (!previewPdf) return null;
        return (
            <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 md:p-6 animate-in fade-in duration-150">
                <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl h-[92vh] flex flex-col shadow-2xl overflow-hidden">
                    {/* Modal Header */}
                    <div className="bg-slate-800 border-b border-slate-700 px-4 md:px-6 py-3 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                                <FileText className="w-4 h-4 text-blue-400" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-white leading-tight">
                                    {previewPdf.title}
                                </h3>
                                <p className="text-[11px] text-slate-400">Resmi Tetkik Sonuç Raporu</p>
                            </div>
                        </div>

                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => window.open(previewPdf.url, '_blank')}
                                className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium text-slate-200 bg-slate-700 hover:bg-slate-600 border border-slate-600 transition-colors gap-1.5"
                                title="Yeni Sekmede Aç"
                            >
                                <Eye className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Yeni Sekmede Aç</span>
                            </button>

                            <a
                                href={previewPdf.url}
                                download={previewPdf.filename}
                                className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors gap-1.5"
                            >
                                <Download className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">İndir</span>
                            </a>

                            <button
                                onClick={() => {
                                    window.URL.revokeObjectURL(previewPdf.url);
                                    setPreviewPdf(null);
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors ml-1"
                                title="Kapat"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Modal PDF Body */}
                    <div className="flex-1 bg-slate-950 w-full h-full relative">
                        <iframe
                            src={previewPdf.url}
                            className="w-full h-full border-0"
                            title={previewPdf.title}
                        />
                    </div>
                </div>
            </div>
        );
    };

    // Quick filter for admin view
    const filteredAdminResults = adminResults.filter(r => {
        if (!adminSearchTerm.trim()) return true;
        const term = adminSearchTerm.trim().toLocaleLowerCase('tr-TR');
        const tc = (r.tc || '').trim();
        const name = (r.name || '').toLocaleLowerCase('tr-TR');
        const comp = (r.company || '').toLocaleLowerCase('tr-TR');
        const inst = (r.institutionName || '').toLocaleLowerCase('tr-TR');
        return tc.includes(term) || name.includes(term) || comp.includes(term) || inst.includes(term);
    });

    // ==========================================
    // 1. GİRİŞ YAPILMAMIŞ EKRAN (TEK ŞİFRE ALANI)
    // ==========================================
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
                <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl max-w-sm w-full border border-slate-700">
                    <div className="flex justify-center mb-6">
                        <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center border border-blue-500/30">
                            <Lock className="w-8 h-8 text-blue-400" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-white text-center mb-2">Sonuç Portalı</h2>
                    <p className="text-xs text-slate-400 text-center mb-6 leading-relaxed">
                        Tetkik sonuçlarını görüntülemek için şifrenizi giriniz.
                    </p>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <input
                                type="password"
                                value={password}
                                onChange={e => {
                                    setPassword(e.target.value);
                                    if (error) setError('');
                                }}
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-blue-500 text-center tracking-widest text-lg font-mono placeholder:font-sans placeholder:tracking-normal placeholder:text-slate-500"
                                placeholder="Portal Şifresi"
                                autoFocus
                                required
                            />
                        </div>

                        {error && (
                            <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-xl">
                                <p className="text-xs text-red-300 text-center font-medium">{error}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loginLoading || !password.trim()}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-600/30 disabled:opacity-50 text-sm"
                        >
                            {loginLoading ? 'Kontrol Ediliyor...' : 'Giriş Yap'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // ==========================================
    // 2. FİRMA YETKİLİSİ GÖRÜNÜMÜ (ROLE: COMPANY)
    // ==========================================
    if (role === 'company') {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col">
                {/* Header */}
                <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                            <div className="p-2 bg-blue-50 rounded-xl border border-blue-100">
                                <Building2 className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <div className="flex items-center space-x-2">
                                    <h1 className="text-lg font-bold text-slate-900 leading-tight">
                                        {company?.name || 'Firma Portalı'}
                                    </h1>
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        <ShieldCheck className="w-3 h-3 mr-1 text-emerald-600" />
                                        Firma Yetkili Girişi
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500">
                                    Personel Tetkik ve Sağlık Raporu Sorgulama
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="inline-flex items-center text-xs font-semibold text-slate-600 hover:text-red-600 px-3 py-2 rounded-xl border border-slate-200 hover:border-red-200 hover:bg-red-50 transition-colors gap-1.5"
                        >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>Çıkış Yap</span>
                        </button>
                    </div>
                </header>

                {/* Main: SADECE TC ARAMA YERİ */}
                <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
                    {/* Arama Alanı */}
                    <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200">
                        <h2 className="text-lg font-bold text-slate-900 mb-1">
                            Personel Sonuç Sorgula
                        </h2>
                        <p className="text-xs text-slate-500 mb-6">
                            Sonucunu görüntülemek veya indirmek istediğiniz personelin 11 haneli T.C. Kimlik Numarasını giriniz.
                        </p>

                        <form onSubmit={handleCompanySearch} className="flex flex-col sm:flex-row gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    maxLength={11}
                                    autoFocus
                                    value={companyTc}
                                    onChange={e => {
                                        setCompanyTc(e.target.value.replace(/\D/g, ''));
                                        if (companyError) setCompanyError('');
                                    }}
                                    placeholder="11 Haneli T.C. Kimlik Numarası"
                                    className="w-full pl-12 pr-10 py-3.5 border border-slate-300 rounded-xl text-slate-900 text-lg tracking-widest font-mono placeholder:font-sans placeholder:tracking-normal placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                {companyTc && (
                                    <button
                                        type="button"
                                        onClick={() => { setCompanyTc(''); setCompanyResults([]); setCompanySearched(false); }}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full"
                                        title="Temizle"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                            <button
                                type="submit"
                                disabled={companyLoading || companyTc.length !== 11}
                                className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-all shadow-md shadow-blue-600/20 disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap"
                            >
                                <Search className="w-4 h-4" />
                                <span>{companyLoading ? 'Sorgulanıyor...' : 'Sorgula'}</span>
                            </button>
                        </form>
                    </div>

                    {companyError && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-3 text-red-700 text-sm">
                            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
                            <span>{companyError}</span>
                        </div>
                    )}

                    {/* Sonuç Yok */}
                    {companySearched && !companyLoading && companyResults.length === 0 && !companyError && (
                        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
                            <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-3 text-amber-500 border border-amber-100">
                                <AlertCircle className="w-7 h-7" />
                            </div>
                            <h3 className="text-base font-bold text-slate-800 mb-1">Kayıt Bulunamadı</h3>
                            <p className="text-xs text-slate-500 max-w-md mx-auto">
                                <strong>{companyTc}</strong> T.C. Kimlik Numaralı personelin firmanız kapsamında kayıtlı herhangi bir tetkik sonucu bulunamadı.
                            </p>
                        </div>
                    )}

                    {/* Sade Satır Tasarımı ve 2 Buton (Görüntüle & İndir) */}
                    {companyResults.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between px-1">
                                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                    Sorgulama Sonuçları ({companyResults.length} Kayıt)
                                </span>
                            </div>

                            {companyResults.map((r: any) => {
                                const hasPdf = Boolean(r.pdfUrl);
                                const isCompleted = r.status === 'COMPLETED';
                                const completedExams: string[] = Array.isArray(r.completedExams) ? r.completedExams : (isCompleted ? (r.exams || []) : []);
                                const pendingExams: string[] = Array.isArray(r.pendingExams) ? r.pendingExams : [];
                                const isPartial = r.status === 'PARTIAL' || (completedExams.length > 0 && pendingExams.length > 0);

                                return (
                                    <div
                                        key={r.id}
                                        className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                                    >
                                        {/* Sol Taraf: Personel Bilgisi */}
                                        <div className="space-y-1.5 flex-1">
                                            <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
                                                <span className="text-base font-bold text-slate-900">
                                                    {r.name || 'İsimsiz Personel'}
                                                </span>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                                                <span className="font-mono font-medium text-slate-600">
                                                    TC: {r.tc}
                                                </span>
                                                {r.date && (
                                                    <span>
                                                        Tarih: {new Date(r.date).toLocaleDateString('tr-TR')}
                                                    </span>
                                                )}
                                                {r.institutionName && (
                                                    <span className="text-slate-600 font-medium">
                                                        Kurum: {r.institutionName}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Sağ Taraf: SADECE İKİ BUTON (GÖRÜNTÜLE & İNDİR) */}
                                        <div className="flex items-center space-x-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 flex-shrink-0">
                                            {hasPdf ? (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleViewPdf(r.pdfUrl, r.name, r.tc)}
                                                        disabled={pdfActionLoading === `view-${r.pdfUrl.split('?')[0]}`}
                                                        className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors shadow-sm gap-1.5 disabled:opacity-50"
                                                    >
                                                        {pdfActionLoading === `view-${r.pdfUrl.split('?')[0]}` ? (
                                                            <RefreshCw className="w-4 h-4 text-slate-600 animate-spin" />
                                                        ) : (
                                                            <Eye className="w-4 h-4 text-slate-600" />
                                                        )}
                                                        <span>Görüntüle</span>
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => handleDownloadPdf(r.pdfUrl, r.name, r.tc)}
                                                        disabled={pdfActionLoading === `download-${r.pdfUrl.split('?')[0]}`}
                                                        className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm gap-1.5 disabled:opacity-50"
                                                    >
                                                        {pdfActionLoading === `download-${r.pdfUrl.split('?')[0]}` ? (
                                                            <RefreshCw className="w-4 h-4 text-white animate-spin" />
                                                        ) : (
                                                            <Download className="w-4 h-4" />
                                                        )}
                                                        <span>İndir</span>
                                                    </button>
                                                </>
                                            ) : (
                                                <span className="inline-flex items-center px-3.5 py-2 rounded-xl text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 gap-1.5">
                                                    <Clock className="w-4 h-4 text-amber-500" />
                                                    <span>Rapor Henüz Hazır Değil</span>
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </main>
                {renderPdfModal()}
            </div>
        );
    }

    // ==========================================
    // 3. ADMIN / OSGB GENEL GÖRÜNÜMÜ (ROLE: ADMIN)
    // ==========================================
    return (
        <div className="min-h-screen bg-slate-50">
            {/* Top Header */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-50 rounded-xl border border-blue-100">
                            <Activity className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900 leading-tight">
                                Tetkik Sonuç Portalı
                            </h1>
                            <p className="text-xs text-slate-500">
                                Tüm sonuçlar en yeniden eskiye doğru sıralanmaktadır
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={loadAdminAllResults}
                            disabled={adminLoading}
                            className="inline-flex items-center px-3 py-1.5 border border-slate-300 text-xs font-semibold rounded-lg text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
                            title="Listeyi Yenile"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 text-slate-500 ${adminLoading ? 'animate-spin' : ''}`} />
                            Yenile
                        </button>
                        <button 
                            onClick={handleLogout} 
                            className="text-xs font-semibold text-slate-500 hover:text-red-600 px-3 py-1.5 rounded-lg border border-transparent hover:border-slate-200 transition-colors"
                        >
                            Çıkış Yap
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                {/* Search Bar - Full Width */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200">
                    <form className="flex flex-col sm:flex-row gap-3" onSubmit={handleAdminSearchSubmit}>
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                id="tc"
                                type="text"
                                className="block w-full pl-12 pr-10 py-3.5 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base placeholder:text-slate-400"
                                placeholder="TC Kimlik No, İsim veya Firma Ara..."
                                value={adminSearchTerm}
                                onChange={e => setAdminSearchTerm(e.target.value)}
                            />
                            {adminSearchTerm && (
                                <button
                                    type="button"
                                    onClick={() => { setAdminSearchTerm(''); loadAdminAllResults(); }}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full"
                                    title="Aramayı Temizle"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        <button
                            type="submit"
                            disabled={adminLoading}
                            className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-all shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50"
                        >
                            <Search className="w-4 h-4" />
                            <span>{adminLoading ? 'Aranıyor...' : 'Ara'}</span>
                        </button>
                    </form>
                </div>

                {error && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl shadow-sm">
                        <p className="text-sm text-red-700 font-medium">{error}</p>
                    </div>
                )}

                {/* Results Count & Header */}
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center space-x-2">
                        <span className="text-sm font-bold text-slate-800">Kayıtlı Tetkik ve Raporlar</span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                            {filteredAdminResults.length} Kayıt
                        </span>
                        {adminSearchTerm && (
                            <span className="text-xs text-slate-500 italic">
                                ("{adminSearchTerm}" filtresine göre)
                            </span>
                        )}
                    </div>
                </div>

                {/* Empty State */}
                {!adminLoading && filteredAdminResults.length === 0 && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                            <FileText className="w-8 h-8" />
                        </div>
                        <h3 className="text-base font-bold text-slate-800 mb-1">Kayıt Bulunamadı</h3>
                        <p className="text-sm text-slate-500 max-w-sm mx-auto mb-4">
                            {adminSearchTerm 
                                ? 'Aradığınız kriterlere uygun herhangi bir tetkik kaydı bulunamadı.' 
                                : 'Sistemde henüz kayıtlı bir tetkik bulunmamaktadır.'}
                        </p>
                        {adminSearchTerm && (
                            <button
                                onClick={() => { setAdminSearchTerm(''); loadAdminAllResults(); }}
                                className="inline-flex items-center px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
                            >
                                Tüm Kayıtları Göster
                            </button>
                        )}
                    </div>
                )}

                {/* Full Width Unified Results List (Sorted Newest to Oldest) */}
                {filteredAdminResults.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <ul className="divide-y divide-slate-100">
                            {filteredAdminResults.map(r => {
                                const hasPdf = Boolean(r.pdfUrl);
                                const isCompleted = r.status === 'COMPLETED';
                                const completedExams: string[] = Array.isArray(r.completedExams) 
                                    ? r.completedExams 
                                    : (isCompleted ? (r.exams || []) : []);
                                const pendingExams: string[] = Array.isArray(r.pendingExams)
                                    ? r.pendingExams
                                    : (r.exams ? r.exams.filter((e: string) => !completedExams.includes(e)) : []);
                                const isPartial = r.status === 'PARTIAL' || (completedExams.length > 0 && pendingExams.length > 0);

                                return (
                                    <li key={r.id} className="p-4 sm:p-6 hover:bg-slate-50/80 transition-colors">
                                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                                            {/* SOL: Hasta Bilgileri ve Genel Durum */}
                                            <div className="flex-1 space-y-2">
                                                <div className="flex items-center space-x-2.5 flex-wrap gap-y-1.5">
                                                    <span className="text-base sm:text-lg font-bold text-slate-900">
                                                        {r.name || 'İsimsiz Hasta'}
                                                    </span>
                                                    {r.isExternalRecord && (
                                                        <span 
                                                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-sm"
                                                            title="Bu işlem için sistemde sevk kaydı açılmamıştı; kurum portalından doğrudan çekilip indirildi."
                                                        >
                                                            <AlertTriangle className="w-3 h-3 mr-1 text-amber-700 flex-shrink-0" />
                                                            Sevk Kaydı Yok (Kurumdan Alındı)
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-500">
                                                    {r.tc && (
                                                        <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-semibold border border-slate-200">
                                                            TC: {r.tc}
                                                        </span>
                                                    )}
                                                    {r.institutionName && (
                                                        <span className="flex items-center text-blue-700 font-medium bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                                            <Building2 className="flex-shrink-0 mr-1.5 h-3.5 w-3.5 text-blue-600" />
                                                            {r.institutionName}
                                                        </span>
                                                    )}
                                                    {r.company && (
                                                        <span className="text-slate-600">
                                                            <span className="text-slate-400 font-medium">Firma:</span> {r.company}
                                                        </span>
                                                    )}
                                                    {r.date && (
                                                        <span className="flex items-center text-slate-500">
                                                            <Activity className="flex-shrink-0 mr-1.5 h-3.5 w-3.5 text-slate-400" />
                                                            {new Date(r.date).toLocaleDateString('tr-TR')}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* SAĞ TARAF: PDF RAPOR BUTONU / DURUM */}
                                            <div className="flex-shrink-0 self-start lg:self-center">
                                                {hasPdf ? (
                                                    <div className="flex items-center space-x-2">
                                                        <button 
                                                            type="button"
                                                            onClick={() => handleViewPdf(r.pdfUrl, r.name, r.tc)}
                                                            disabled={pdfActionLoading === `view-${r.pdfUrl.split('?')[0]}`}
                                                            className="inline-flex items-center px-3.5 py-2 border border-slate-300 text-xs font-semibold rounded-xl text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-sm gap-1.5 disabled:opacity-50"
                                                        >
                                                            {pdfActionLoading === `view-${r.pdfUrl.split('?')[0]}` ? (
                                                                <RefreshCw className="w-4 h-4 text-slate-600 animate-spin" />
                                                            ) : (
                                                                <Eye className="w-4 h-4 text-slate-600" />
                                                            )}
                                                            <span>Görüntüle</span>
                                                        </button>
                                                        <button 
                                                            type="button"
                                                            onClick={() => handleDownloadPdf(r.pdfUrl, r.name, r.tc)}
                                                            disabled={pdfActionLoading === `download-${r.pdfUrl.split('?')[0]}`}
                                                            className="inline-flex items-center px-4 py-2 border border-transparent text-xs font-semibold rounded-xl shadow-sm text-white bg-blue-600 hover:bg-blue-700 transition-colors gap-1.5 disabled:opacity-50"
                                                        >
                                                            {pdfActionLoading === `download-${r.pdfUrl.split('?')[0]}` ? (
                                                                <RefreshCw className="w-4 h-4 text-white animate-spin" />
                                                            ) : (
                                                                <Download className="w-4 h-4" />
                                                            )}
                                                            <span>İndir</span>
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="inline-flex items-center px-3.5 py-2 border border-dashed border-amber-300 text-xs font-semibold rounded-xl text-amber-800 bg-amber-50 whitespace-nowrap gap-1.5">
                                                        <Clock className="w-4 h-4 text-amber-600" />
                                                        Rapor Bekleniyor
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )}
            </div>
            {renderPdfModal()}
        </div>
    );
};
