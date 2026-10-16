import React, { useState, useEffect } from 'react';
import { Search, FileText, Download, Eye, Building2, Lock, CheckCircle, Clock, AlertCircle, X, LogOut, ShieldCheck } from 'lucide-react';

interface CompanyInfo {
    id: string;
    name: string;
}

export const FirmaApp: React.FC = () => {
    const [token, setToken] = useState<string>(() => sessionStorage.getItem('firma_portal_jwt') || '');
    const [company, setCompany] = useState<CompanyInfo | null>(() => {
        const saved = sessionStorage.getItem('firma_portal_company');
        return saved ? JSON.parse(saved) : null;
    });
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => Boolean(sessionStorage.getItem('firma_portal_jwt')));

    // Login Form State
    const [companyList, setCompanyList] = useState<CompanyInfo[]>([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState('');
    const [password, setPassword] = useState('');
    const [loginLoading, setLoginLoading] = useState(false);
    const [loginError, setLoginError] = useState('');

    // Search & Results State
    const [tc, setTc] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [searchError, setSearchError] = useState('');

    // Load available companies for portal login dropdown
    useEffect(() => {
        if (!isAuthenticated) {
            fetch('/api/public/company-list')
                .then(r => r.json())
                .then(data => {
                    if (data.success && Array.isArray(data.companies)) {
                        setCompanyList(data.companies);
                        if (data.companies.length > 0 && !selectedCompanyId) {
                            setSelectedCompanyId(data.companies[0].id);
                        }
                    }
                })
                .catch(() => {});
        }
    }, [isAuthenticated]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoginError('');
        if (!selectedCompanyId) {
            setLoginError('Lütfen firmanızı seçiniz.');
            return;
        }
        if (!password.trim()) {
            setLoginError('Lütfen firma giriş şifrenizi giriniz.');
            return;
        }

        setLoginLoading(true);
        try {
            const res = await fetch('/api/public/company-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ companyId: selectedCompanyId, password })
            });
            const data = await res.json();
            if (data.success && data.token) {
                setToken(data.token);
                setCompany(data.company);
                sessionStorage.setItem('firma_portal_jwt', data.token);
                sessionStorage.setItem('firma_portal_company', JSON.stringify(data.company));
                setIsAuthenticated(true);
                setPassword('');
            } else {
                setLoginError(data.error || 'Giriş başarısız. Lütfen şifrenizi kontrol ediniz.');
            }
        } catch (err) {
            setLoginError('Sunucu bağlantı hatası oluştu.');
        }
        setLoginLoading(false);
    };

    const handleLogout = () => {
        sessionStorage.removeItem('firma_portal_jwt');
        sessionStorage.removeItem('firma_portal_company');
        setToken('');
        setCompany(null);
        setIsAuthenticated(false);
        setResults([]);
        setTc('');
        setSearched(false);
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        const cleanTc = tc.replace(/\D/g, '').trim();
        if (cleanTc.length !== 11) {
            setSearchError('Lütfen 11 haneli geçerli bir TC Kimlik Numarası giriniz.');
            return;
        }

        setSearchError('');
        setSearchLoading(true);
        setSearched(true);
        try {
            const res = await fetch(`/api/public/company-results/${cleanTc}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (res.status === 401 || res.status === 403) {
                handleLogout();
                return;
            }

            const data = await res.json();
            if (data.success) {
                setResults(data.results || []);
            } else {
                setSearchError(data.error || 'Sorgulama sırasında bir hata oluştu.');
                setResults([]);
            }
        } catch (err) {
            setSearchError('Sunucu ile bağlantı kurulamadı.');
            setResults([]);
        }
        setSearchLoading(false);
    };

    const handleDownload = async (pdfUrl: string, patientName?: string, tcNo?: string) => {
        if (!pdfUrl) return;
        const safeName = (patientName || 'Tetkik_Raporu').replace(/[^a-zA-Z0-9çÇğĞıİöÖşŞüÜ_ -]/g, '_');
        const filename = `${safeName}_${tcNo || ''}_Tetkik_Raporu.pdf`;

        try {
            const res = await fetch(pdfUrl);
            const blob = await res.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(blobUrl);
        } catch (e) {
            // Fallback direct link
            window.open(pdfUrl, '_blank');
        }
    };

    // --- GİRİŞ YAPILMAMIŞ EKRAN ---
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
                <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl max-w-md w-full border border-slate-700">
                    <div className="flex justify-center mb-6">
                        <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center border border-blue-500/30">
                            <Building2 className="w-8 h-8 text-blue-400" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-white text-center mb-2">Firma Sonuç Portalı</h2>
                    <p className="text-xs text-slate-400 text-center mb-6 leading-relaxed">
                        Çalışanlarınızın sağlık tetkik sonuçlarını sorgulamak ve raporlarını indirmek için firmanızı seçip şifrenizle giriş yapınız.
                    </p>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Firma Seçimi</label>
                            <select
                                value={selectedCompanyId}
                                onChange={e => setSelectedCompanyId(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500"
                                required
                            >
                                <option value="" disabled>Firma Seçiniz</option>
                                {companyList.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                            {companyList.length === 0 && (
                                <p className="text-[11px] text-slate-500 mt-1">Portal şifresi tanımlanmış firma bulunamadı. Lütfen OSGB yöneticiniz ile iletişime geçiniz.</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Firma Giriş Şifresi</label>
                            <div className="relative">
                                <input
                                    type="password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500"
                                    placeholder="Firma Şifrenizi Giriniz"
                                    required
                                />
                                <Lock className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
                            </div>
                        </div>

                        {loginError && (
                            <div className="p-3 bg-red-900/30 border border-red-500/50 rounded-xl">
                                <p className="text-xs text-red-300 text-center font-medium">{loginError}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loginLoading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-600/30 disabled:opacity-50 text-sm"
                        >
                            {loginLoading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // --- GİRİŞ YAPILMIŞ EKRAN ---
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
                                    Yetkili Firma Paneli
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

            {/* Main Area: SADECE TC ARAMA YERİ */}
            <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
                
                {/* Arama Kutusu */}
                <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200">
                    <h2 className="text-lg font-bold text-slate-900 mb-1">
                        Personel Sonuç Sorgula
                    </h2>
                    <p className="text-xs text-slate-500 mb-6">
                        Sonucunu görüntülemek veya indirmek istediğiniz personelin 11 haneli T.C. Kimlik Numarasını giriniz.
                    </p>

                    <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                maxLength={11}
                                autoFocus
                                value={tc}
                                onChange={e => {
                                    setTc(e.target.value.replace(/\D/g, ''));
                                    if (searchError) setSearchError('');
                                }}
                                placeholder="11 Haneli T.C. Kimlik Numarası"
                                className="w-full pl-12 pr-10 py-3.5 border border-slate-300 rounded-xl text-slate-900 text-lg tracking-widest font-mono placeholder:font-sans placeholder:tracking-normal placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            {tc && (
                                <button
                                    type="button"
                                    onClick={() => { setTc(''); setResults([]); setSearched(false); }}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full"
                                    title="Temizle"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        <button
                            type="submit"
                            disabled={searchLoading || tc.length !== 11}
                            className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-all shadow-md shadow-blue-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            <Search className="w-4 h-4" />
                            <span>{searchLoading ? 'Sorgulanıyor...' : 'Sorgula'}</span>
                        </button>
                    </form>
                </div>

                {/* Hata Uyarısı */}
                {searchError && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-3 text-red-700 text-sm">
                        <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
                        <span>{searchError}</span>
                    </div>
                )}

                {/* Sonuç Bulunamadı */}
                {searched && !searchLoading && results.length === 0 && !searchError && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
                        <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-3 text-amber-500 border border-amber-100">
                            <AlertCircle className="w-7 h-7" />
                        </div>
                        <h3 className="text-base font-bold text-slate-800 mb-1">Kayıt Bulunamadı</h3>
                        <p className="text-xs text-slate-500 max-w-md mx-auto">
                            <strong>{tc}</strong> T.C. Kimlik Numaralı personelin firmanız kapsamında kayıtlı herhangi bir tetkik sonucu bulunamadı.
                        </p>
                    </div>
                )}

                {/* Bulunan Sonuçlar - SADE VE TEMİZ SATIR TASARIMI */}
                {results.length > 0 && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                Sorgulama Sonuçları ({results.length} Kayıt)
                            </span>
                        </div>

                        {results.map((r: any) => {
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
                                    {/* Sol Taraf: Personel Bilgileri & Durum */}
                                    <div className="space-y-1.5 flex-1">
                                        <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
                                            <span className="text-base font-bold text-slate-900">
                                                {r.name || 'İsimsiz Personel'}
                                            </span>
                                            {isCompleted ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                    <CheckCircle className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                                                    Sonuç Hazır
                                                </span>
                                            ) : isPartial ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                                    <CheckCircle className="w-3.5 h-3.5 mr-1 text-blue-600" />
                                                    Kısmi Sonuç ({completedExams.length}/{completedExams.length + pendingExams.length})
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                                    <Clock className="w-3.5 h-3.5 mr-1 text-amber-600" />
                                                    Sonuç Bekleniyor
                                                </span>
                                            )}
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

                                        {/* Tetkikler Özeti */}
                                        {Array.isArray(r.exams) && r.exams.length > 0 && (
                                            <div className="flex flex-wrap gap-1 pt-1">
                                                {r.exams.map((ex: string, idx: number) => {
                                                    const isExCompleted = completedExams.includes(ex);
                                                    return (
                                                        <span
                                                            key={idx}
                                                            className={`text-[11px] px-2 py-0.5 rounded-md font-medium border ${
                                                                isExCompleted 
                                                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                                                                    : 'bg-slate-100 text-slate-600 border-slate-200'
                                                            }`}
                                                        >
                                                            {ex} {isExCompleted && '✓'}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    {/* Sağ Taraf: SADECE İKİ BUTON (GÖRÜNTÜLE & İNDİR) */}
                                    <div className="flex items-center space-x-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 flex-shrink-0">
                                        {hasPdf ? (
                                            <>
                                                {/* 1. GÖRÜNTÜLE BUTONU */}
                                                <a
                                                    href={r.pdfUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors shadow-sm gap-1.5"
                                                >
                                                    <Eye className="w-4 h-4 text-slate-600" />
                                                    <span>Görüntüle</span>
                                                </a>

                                                {/* 2. İNDİR BUTONU */}
                                                <button
                                                    onClick={() => handleDownload(r.pdfUrl, r.name, r.tc)}
                                                    className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm gap-1.5"
                                                >
                                                    <Download className="w-4 h-4" />
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
        </div>
    );
};
