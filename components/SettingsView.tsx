/*
 * Project: OSGB Tetkik Takip Sistemi
 * Copyright (C) 2026 szgn_emin
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License.
 */
import React, { useState, useRef, useEffect } from 'react';
import { Company, ExamDefinition, HazardClass, MedicalInstitution, AppSettings, turkishIncludes } from '../types';
import { Trash2, Plus, Building2, Save, Check, Receipt, Upload, FileDown, MapPin, Sliders, CheckSquare, Square, Image as ImageIcon, Edit2, XCircle, Database, Download, RefreshCw, AlertTriangle, CreditCard, Banknote, Search, Cloud, Globe, Lock, ShieldCheck, Activity, Link, Eye, Copy } from 'lucide-react';
import * as XLSX from 'xlsx';

interface SettingsViewProps {
  onAddCompany: (c: Company) => void;
  onUpdateCompany: (c: Company) => void;
  onDeleteCompany: (id: string) => void;
  onBulkDeleteCompanies: (ids: string[]) => void;
  exams: ExamDefinition[];
  onAddExam: (e: ExamDefinition) => void;
  onUpdateExam: (e: ExamDefinition) => void;
  onDeleteExam: (id: string) => void;
  institutions: MedicalInstitution[];
  onAddInstitution: (i: MedicalInstitution) => void;
  onUpdateInstitution: (i: MedicalInstitution) => void;
  onDeleteInstitution: (id: string) => void;
  settings: AppSettings;
  onUpdateSettings: (s: AppSettings) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  companies,
  onAddCompany,
  onUpdateCompany,
  onDeleteCompany,
  onBulkDeleteCompanies,
  exams,
  onAddExam,
  onUpdateExam,
  onDeleteExam,
  institutions,
  onAddInstitution,
  onUpdateInstitution,
  onDeleteInstitution,
  settings,
  onUpdateSettings
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'companies' | 'exams' | 'institutions' | 'backup' | 'update'>('general');

  // Software update state
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'updating' | 'success' | 'error'>('idle');
  const [updateError, setUpdateError] = useState('');
  const [updateDetails, setUpdateDetails] = useState('');

  // General Settings State
  const [ekgAgeLimit, setEkgAgeLimit] = useState(settings.ekgLimitAge);
  const [logo, setLogo] = useState<string | undefined>(settings.companyLogo);
  const [printBgLogo, setPrintBgLogo] = useState<string | undefined>(settings.printBackgroundLogo);
  const [autoPrint, setAutoPrint] = useState(settings.autoPrintReferral);
  const [printPageSize, setPrintPageSize] = useState<'A4' | 'A5' | 'A6'>(settings.printPageSize || 'A4');
  const [isPasswordEnabled, setIsPasswordEnabled] = useState(settings.isPasswordEnabled || false);
  const [appPassword, setAppPassword] = useState(settings.appPassword || '');

  // Company Form State
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);
  const [cName, setCName] = useState('');
  const [companySearchQuery, setCompanySearchQuery] = useState('');
  const [cHazard, setCHazard] = useState<HazardClass>(HazardClass.LESS);
  const [cDoctor, setCDoctor] = useState('');
  const [cSpecialist, setCSpecialist] = useState('');
  const [cPaymentMethod, setCPaymentMethod] = useState<'CASH' | 'POS' | 'INVOICE'>('INVOICE');
  const [cSelectedExams, setCSelectedExams] = useState<string[]>([]);
  const [cPreferredInst, setCPreferredInst] = useState<string>(''); // For forced institution
  
  // Company Selection State (Bulk Delete)
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);
  
  // File Import Ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const printBgLogoInputRef = useRef<HTMLInputElement>(null);


  // Exam Form State
  const [eName, setEName] = useState('');
  const [eCode, setECode] = useState('');
  const [ePrice, setEPrice] = useState('');
  const [eCost, setECost] = useState(''); // New Cost State

  // Institution Form State
  const [editingInstitutionId, setEditingInstitutionId] = useState<string | null>(null);
  const [iName, setIName] = useState('');
  const [iPhone, setIPhone] = useState('');
  const [iAddress, setIAddress] = useState('');
  const [iLocationUrl, setILocationUrl] = useState('');

  const toggleCompanyExam = (examName: string) => {
    setCSelectedExams(prev => 
      prev.includes(examName) ? prev.filter(e => e !== examName) : [...prev, examName]
    );
  };

  // Password Change State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');

  // Backup & External Sync State
  const backupInputRef = useRef<HTMLInputElement>(null);
  const [backupConfig, setBackupConfig] = useState<{ clientId: string; backupApiKey: string; webhookUrl: string }>({ clientId: '', backupApiKey: '', webhookUrl: '' });
  const [webhookUrlInput, setWebhookUrlInput] = useState('');
  const [webhookTestStatus, setWebhookTestStatus] = useState<{ type: 'idle' | 'success' | 'error'; message: string }>({ type: 'idle', message: '' });
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [googleFiles, setGoogleFiles] = useState<any[]>([]);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  // Load configuration on mount
  useEffect(() => {
    const fetchBackupConfig = async () => {
      try {
        const { getApiToken } = await import('../services/useServerData');
        const baseUrl = import.meta.env.BASE_URL || '/';
        const res = await fetch(`${baseUrl}api/backup/config`, {
          headers: { 'Authorization': `Bearer ${getApiToken()}` }
        });
        if (res.ok) {
          const cfg = await res.json();
          setBackupConfig(cfg);
          setWebhookUrlInput(cfg.webhookUrl || '');
        }
      } catch (err) {
        console.error("Yedekleme yapılandırması alınamadı:", err);
      }
    };
    
    fetchBackupConfig();
    
    // Dynamically load Google GSI Client Script
    if (!document.getElementById('google-gsi-client')) {
      const script = document.createElement('script');
      script.id = 'google-gsi-client';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }
  }, []);

  const handleConnectGoogleDrive = () => {
    setGoogleError(null);
    if (!backupConfig.clientId) {
      setGoogleError("Google Drive OAuth İstemci ID'si sisteme eklenmemiş. Lütfen AI Studio veya sunucu ortam ayarlarınızı kontrol edin.");
      return;
    }
    
    try {
      // @ts-ignore
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: backupConfig.clientId,
        scope: 'https://www.googleapis.com/auth/drive.file',
        callback: (response: any) => {
          if (response && response.access_token) {
            setGoogleAccessToken(response.access_token);
            // Immediately load backups
            handleListGoogleBackupFiles(response.access_token);
          } else {
            setGoogleError("Google kimlik doğrulama işlemi tamamlanamadı.");
          }
        },
        error_callback: (err: any) => {
          setGoogleError(`GSI Bağlantı Hatası: ${err.message || 'Bilinmeyen Hata'}`);
        }
      });
      client.requestAccessToken({ prompt: 'consent' });
    } catch (err: any) {
      setGoogleError(`GSI Yüklenemedi veya Başlatılamadı: ${err.message}`);
    }
  };

  const handleDisconnectGoogleDrive = () => {
    setGoogleAccessToken(null);
    setGoogleFiles([]);
    setGoogleError(null);
  };

  const handleListGoogleBackupFiles = async (token = googleAccessToken) => {
    if (!token) return;
    setGoogleLoading(true);
    setGoogleError(null);
    try {
      const response = await fetch(
        'https://www.googleapis.com/drive/v3/files?q=name contains "osgb_yedek_" and mimeType = "application/json"&orderBy=createdTime desc&fields=files(id, name, createdTime, size)',
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      if (!response.ok) {
        throw new Error('Dosyalar listelenemedi.');
      }
      const data = await response.json();
      setGoogleFiles(data.files || []);
    } catch (err: any) {
      setGoogleError(`Yedekleri listelerken hata oluştu: ${err.message}`);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleUploadBackupToGoogle = async () => {
    if (!googleAccessToken) return;
    setGoogleLoading(true);
    setGoogleError(null);
    try {
      const { getApiToken } = await import('../services/useServerData');
      const baseUrl = import.meta.env.BASE_URL || '/';
      const res = await fetch(`${baseUrl}api/data`, {
        headers: { 'Authorization': `Bearer ${getApiToken()}` }
      });
      if (!res.ok) throw new Error('Sunucu verisi çekilemedi.');
      const dbData = await res.json();

      const metadata = {
        name: `osgb_yedek_${new Date().toISOString().split('T')[0]}_${Date.now()}.json`,
        mimeType: 'application/json',
      };
      
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', new Blob([JSON.stringify(dbData, null, 2)], { type: 'application/json' }));
      
      const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${googleAccessToken}` },
        body: form,
      });

      if (!uploadRes.ok) {
        throw new Error('Yedek Google Drive\'a yüklenemedi.');
      }

      alert("Mevcut veritabanı başarıyla Google Drive'a yedeklendi!");
      handleListGoogleBackupFiles();
    } catch (err: any) {
      setGoogleError(`Yedek yüklenirken hata oluştu: ${err.message}`);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleRestoreFromGoogle = async (fileId: string, fileName: string) => {
    if (!googleAccessToken) return;
    
    if (!window.confirm(`DİKKAT: "${fileName}" isimli yedeği Google Drive'dan geri yüklemek istediğinize emin misiniz? Bu işlem mevcut verileri silecektir.`)) {
      return;
    }

    setGoogleLoading(true);
    setGoogleError(null);
    try {
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { 'Authorization': `Bearer ${googleAccessToken}` }
      });
      
      if (!response.ok) {
        throw new Error('Yedek dosyası indirilemedi.');
      }
      
      const backupData = await response.json();
      
      const { getApiToken } = await import('../services/useServerData');
      const baseUrl = import.meta.env.BASE_URL || '/';
      const resRestore = await fetch(`${baseUrl}api/backup/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getApiToken()}`
        },
        body: JSON.stringify(backupData)
      });
      
      if (!resRestore.ok) throw new Error('Sıfır yedek dosyası yükleme başarısız.');
      
      alert("Yedek Google Drive'dan başarıyla indirildi ve yüklendi! Sistem yenileniyor...");
      window.location.reload();
    } catch (err: any) {
      setGoogleError(`Yedek kurtarma başarısız: ${err.message}`);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSaveWebhookSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onUpdateSettings({
        ...settings,
        webhookUrl: webhookUrlInput
      });
      setBackupConfig(prev => ({ ...prev, webhookUrl: webhookUrlInput }));
      alert("Yedekleme webhook ayarları başarıyla kaydedildi!");
    } catch (err: any) {
      alert("Ayar kaydedilirken bir hata oluştu: " + err.message);
    }
  };

  const handleTestWebhook = async () => {
    setWebhookTestStatus({ type: 'idle', message: 'Bağlantı test ediliyor, lütfen bekleyen...' });
    try {
      const { getApiToken } = await import('../services/useServerData');
      const baseUrl = import.meta.env.BASE_URL || '/';
      const res = await fetch(`${baseUrl}api/backup/test-webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getApiToken()}`
        },
        body: JSON.stringify({ url: webhookUrlInput })
      });
      
      const data = await res.json();
      if (res.ok) {
        setWebhookTestStatus({ type: 'success', message: `Başarılı! ${data.message || ''}` });
      } else {
        setWebhookTestStatus({ type: 'error', message: `Hata: ${data.error || 'Test bağlantısı başarısız oldu'}` });
      }
    } catch (err: any) {
      setWebhookTestStatus({ type: 'error', message: `Bağlantı hatası: ${err.message || 'Sunucuyla iletişim kurulamadı'}` });
    }
  };

  const handleDownloadBackup = async () => {
    try {
      const { getApiToken } = await import('../services/useServerData');
      const baseUrl = import.meta.env.BASE_URL || '/';
      const res = await fetch(`${baseUrl}api/data`, {
        headers: {
          'Authorization': `Bearer ${getApiToken()}`
        }
      });
      if (!res.ok) throw new Error('Data fetch failed');
      const data = await res.json();
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `osgb_yedek_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert("Yedek indirilirken bir hata oluştu.");
    }
  };

  const handleRestoreBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm('DİKKAT: Bu işlem mevcut tüm verilerinizi (Firmalar, Tetkikler, Sevk Geçmişi vb.) SİLECEK ve yedek dosyasındakilerle değiştirecektir. İşleme devam etmek istediğinize emin misiniz?')) {
        if (backupInputRef.current) backupInputRef.current.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const jsonStr = evt.target?.result as string;
        const backupData = JSON.parse(jsonStr);
        
        const { getApiToken } = await import('../services/useServerData');
        const baseUrl = import.meta.env.BASE_URL || '/';
        const res = await fetch(`${baseUrl}api/backup/restore`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getApiToken()}`
          },
          body: JSON.stringify(backupData)
        });
        
        if (!res.ok) throw new Error('Yedek yükleme başarısız');
        
        alert("Yedek başarıyla geri yüklendi! Sistem yenileniyor...");
        window.location.reload();
      } catch (err) {
        alert("Yedek geri yüklenirken hata oluştu veya geçersiz dosya biçimi.");
      } finally {
        if (backupInputRef.current) backupInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError('');
    setPwdSuccess('');
    
    if (!oldPassword || !newPassword) return;
    
    try {
      const { getApiToken, setApiToken } = await import('../services/useServerData');
      const baseUrl = import.meta.env.BASE_URL || '/';
      const res = await fetch(`${baseUrl}api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getApiToken()}`
        },
        body: JSON.stringify({ oldPassword, newPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        setPwdError(data.error || 'Şifre değiştirilemedi');
      } else {
        setPwdSuccess('Şifre başarıyla değiştirildi.');
        setApiToken(data.token);
        sessionStorage.setItem('api_token', data.token);
        setOldPassword('');
        setNewPassword('');
      }
    } catch (err) {
      setPwdError('Bir hata oluştu');
    }
  };

  const handleTriggerUpdate = async () => {
    if (!window.confirm("Yazılım sürümünü web üzerinden güncellemek istediğinize emin misiniz? Güncelleme işlemi sırasında Git deposundaki en son kodlar çekilecek, paketler kurulacak ve sistem otomatik olarak yeniden derlenecektir. Bu işlem yaklaşık 30-40 saniye sürebilir.")) {
      return;
    }

    setUpdateStatus('updating');
    setUpdateError('');
    setUpdateDetails('');

    try {
      const { getApiToken } = await import('../services/useServerData');
      const baseUrl = import.meta.env.BASE_URL || '/';
      const res = await fetch(`${baseUrl}api/app/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getApiToken()}`
        }
      });

      const data = await res.json();

      if (!res.ok) {
        setUpdateStatus('error');
        setUpdateError(data.error || 'Güncelleme hatası oluştu.');
        setUpdateDetails(data.details || '');
      } else {
        setUpdateStatus('success');
        
        let countdown = 10;
        const interval = setInterval(() => {
           countdown--;
           if (countdown <= 0) {
             clearInterval(interval);
             window.location.reload();
           }
        }, 1000);
      }
    } catch (err: any) {
      setUpdateStatus('error');
      setUpdateError('Sunucu bağlantı hatası veya zaman aşımı yaşandı.');
      setUpdateDetails(err.message || '');
    }
  };

  const handleUpdateGeneralSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({ 
        ...settings, 
        ekgLimitAge: ekgAgeLimit,
        companyLogo: logo,
        printBackgroundLogo: printBgLogo,
        autoPrintReferral: autoPrint,
        printPageSize: printPageSize,
        isPasswordEnabled: isPasswordEnabled,
        appPassword: appPassword
    });
    alert("Ayarlar güncellendi.");
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2000000) { // 2MB limit
          alert("Logo dosyası 2MB'dan küçük olmalıdır.");
          return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
      setLogo(undefined);
      if(logoInputRef.current) logoInputRef.current.value = '';
  };

  const handlePrintBgLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2000000) { // 2MB limit
          alert("Arka plan logo dosyası 2MB'dan küçük olmalıdır.");
          return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPrintBgLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePrintBgLogo = () => {
    setPrintBgLogo(undefined);
    if(printBgLogoInputRef.current) printBgLogoInputRef.current.value = '';
  };

  // Populate form for editing
  const handleEditCompany = (company: Company) => {
    setEditingCompanyId(company.id);
    setCName(company.name);
    setCHazard(company.hazardClass);
    setCDoctor(company.assignedDoctor);
    setCSpecialist(company.assignedSpecialist);
    setCPaymentMethod(company.defaultPaymentMethod);
    setCSelectedExams(company.defaultExams);
    setCPreferredInst(company.forcedInstitutionId || '');
    // Scroll to form (simple implementation)
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingCompanyId(null);
    setCName('');
    setCDoctor('');
    setCSpecialist('');
    setCPaymentMethod('INVOICE');
    setCSelectedExams([]);
    setCPreferredInst('');
  };

  const handleCompanySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cName) return;

    if (editingCompanyId) {
      // UPDATE Existing
      const updatedCompany: Company = {
        id: editingCompanyId,
        name: cName,
        hazardClass: cHazard,
        assignedDoctor: cDoctor || 'Belirlenmedi',
        assignedSpecialist: cSpecialist || 'Belirlenmedi',
        defaultExams: cSelectedExams,
        defaultPaymentMethod: cPaymentMethod,
        forcedInstitutionId: cPreferredInst || undefined
      };
      onUpdateCompany(updatedCompany);
      handleCancelEdit(); // Reset form
    } else {
      // ADD New
      const newCompany: Company = {
        id: Math.random().toString(36).substr(2, 9),
        name: cName,
        hazardClass: cHazard,
        assignedDoctor: cDoctor || 'Belirlenmedi',
        assignedSpecialist: cSpecialist || 'Belirlenmedi',
        defaultExams: cSelectedExams,
        defaultPaymentMethod: cPaymentMethod,
        forcedInstitutionId: cPreferredInst || undefined
      };
      onAddCompany(newCompany);
      handleCancelEdit(); // Reset form using same helper
    }
  };

  const handleCancelInstitutionEdit = () => {
    setEditingInstitutionId(null);
    setIName('');
    setIPhone('');
    setIAddress('');
    setILocationUrl('');
  };

  const handleEditInstitution = (inst: MedicalInstitution) => {
    setEditingInstitutionId(inst.id);
    setIName(inst.name);
    setIPhone(inst.phone || '');
    setIAddress(inst.address || '');
    setILocationUrl(inst.locationUrl || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleInstitutionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if(!iName) return;

    if (editingInstitutionId) {
      onUpdateInstitution({
        id: editingInstitutionId,
        name: iName,
        phone: iPhone,
        address: iAddress,
        locationUrl: iLocationUrl
      });
    } else {
      onAddInstitution({
        id: Math.random().toString(36).substr(2, 9),
        name: iName,
        phone: iPhone,
        address: iAddress,
        locationUrl: iLocationUrl
      });
    }
    handleCancelInstitutionEdit();
  };
  
  // Bulk Delete Logic
  const handleToggleSelectCompany = (id: string) => {
    setSelectedCompanyIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllCompanies = () => {
    if (selectedCompanyIds.length === companies.length) {
      setSelectedCompanyIds([]);
    } else {
      setSelectedCompanyIds(companies.map(c => c.id));
    }
  };

  const handleBulkDelete = () => {
    if (selectedCompanyIds.length === 0) return;
    if (window.confirm(`Seçili ${selectedCompanyIds.length} firmayı silmek istediğinize emin misiniz?`)) {
      onBulkDeleteCompanies(selectedCompanyIds);
      setSelectedCompanyIds([]);
    }
  };

  const filteredCompanies = companies.filter(c => 
    turkishIncludes(c.name, companySearchQuery) ||
    turkishIncludes(c.assignedDoctor, companySearchQuery) ||
    turkishIncludes(c.assignedSpecialist, companySearchQuery)
  );

  // --- Bulk Import / Template Logic (Excel .xlsx) ---

  const downloadTemplate = () => {
    // Sheet 1: Firmalar (Template to fill)
    const headers = ["Firma Adı", "Tehlike Sınıfı (Az/Tehlikeli/Çok)", "Hekim Adı", "Uzman Adı", "Ödeme (Nakit/Pos/Fatura)", "Tetkik Kodları (Virgül ile)"];
    const exampleRow = ["Örnek Metal A.Ş.", "Tehlikeli", "Dr. Ahmet Yılmaz", "Uzm. Ayşe Demir", "Fatura", "101, 103, 105"];
    const wsFirmalar = XLSX.utils.aoa_to_sheet([headers, exampleRow]);
    
    wsFirmalar['!cols'] = [
      { wch: 30 }, // Firma Adı
      { wch: 25 }, // Tehlike
      { wch: 20 }, // Hekim
      { wch: 20 }, // Uzman
      { wch: 20 }, // Ödeme
      { wch: 30 }  // Tetkik Kodları
    ];

    // Sheet 2: Tetkik Referans (Read-only reference)
    const refHeaders = ["Tetkik Kodu", "Tetkik Adı", "Satış Fiyatı", "Maliyet"];
    const refRows = exams.map(e => [e.code, e.name, e.price, e.cost || 0]);
    const wsRef = XLSX.utils.aoa_to_sheet([refHeaders, ...refRows]);
    wsRef['!cols'] = [{ wch: 15 }, { wch: 30 }, { wch: 10 }, { wch: 10 }];

    // Create Workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsFirmalar, "Firma_Listesi");
    XLSX.utils.book_append_sheet(wb, wsRef, "Tetkik_Referans_Listesi");

    // Write file
    XLSX.writeFile(wb, "firma_yukleme_sablonu.xlsx");
  };

  const downloadCurrentCompaniesExcel = () => {
    const headers = ["Firma Adı", "Tehlike Sınıfı (Az/Tehlikeli/Çok)", "Hekim Adı", "Uzman Adı", "Ödeme (Nakit/Pos/Fatura)", "Tetkik Kodları (Virgül ile)"];
    
    const rows = companies.map(c => [
      c.name,
      c.hazardClass, // HazardClass string values map directly to names
      c.assignedDoctor,
      c.assignedSpecialist,
      c.defaultPaymentMethod === 'CASH' ? 'Nakit' : c.defaultPaymentMethod === 'POS' ? 'Pos' : 'Fatura',
      c.defaultExams.map(exName => {
        const exam = exams.find(e => e.name === exName);
        return exam ? exam.code : '';
      }).filter(code => code !== '').join(', ')
    ]);

    const wsFirmalar = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    wsFirmalar['!cols'] = [
      { wch: 30 }, { wch: 25 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 30 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsFirmalar, "Mevcut_Firmalar");
    
    // Also include reference sheet
    const refHeaders = ["Tetkik Kodu", "Tetkik Adı"];
    const refRows = exams.map(e => [e.code, e.name]);
    const wsRef = XLSX.utils.aoa_to_sheet([refHeaders, ...refRows]);
    XLSX.utils.book_append_sheet(wb, wsRef, "Tetkik_Kodlari");

    XLSX.writeFile(wb, "osgb_firma_listesi_duzenlenebilir.xlsx");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      if (!bstr) return;

      try {
        const wb = XLSX.read(bstr, { type: 'binary' });
        
        // Use the first sheet
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        
        // Convert to JSON array
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

        let addedCount = 0;
        let updatedCount = 0;

        // Skip header row
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          if (!row || row.length === 0 || !row[0]) continue;

          const name = String(row[0]).trim();
          const hazardRaw = String(row[1] || '').toLowerCase();
          const doctor = String(row[2] || 'Belirlenmedi').trim();
          const specialist = String(row[3] || 'Belirlenmedi').trim();
          const paymentRaw = String(row[4] || '').toLowerCase();
          const examCodesStr = String(row[5] || '').trim();

          // Hazard Class
          let hazard = HazardClass.LESS;
          if (hazardRaw.includes('çok') || hazardRaw.includes('cok')) hazard = HazardClass.VERY_DANGEROUS;
          else if (hazardRaw.includes('az')) hazard = HazardClass.LESS;
          else if (hazardRaw.includes('tehlikeli')) hazard = HazardClass.DANGEROUS;

          // Payment
          let payment: 'CASH' | 'POS' | 'INVOICE' = 'INVOICE';
          if (paymentRaw.includes('nakit') || paymentRaw.includes('elden') || paymentRaw.includes('kasa')) {
            payment = 'CASH';
          } else if (paymentRaw.includes('pos') || paymentRaw.includes('kredi') || paymentRaw.includes('kart')) {
            payment = 'POS';
          }

          // Process Exam Codes
          const requestedCodes = examCodesStr.split(',').map(s => s.trim()).filter(s => s !== '');
          const matchedExams = exams
            .filter(e => requestedCodes.includes(e.code) || requestedCodes.includes(e.code.toString()))
            .map(e => e.name);

          // Check if exists for UPDATE
          const existing = companies.find(c => c.name.toLowerCase() === name.toLowerCase());
          
          if (existing) {
            const updatedComp: Company = {
              ...existing,
              hazardClass: hazard,
              assignedDoctor: doctor,
              assignedSpecialist: specialist,
              defaultPaymentMethod: payment,
              defaultExams: matchedExams 
            };
            onUpdateCompany(updatedComp);
            updatedCount++;
          } else {
            const newComp: Company = {
              id: Math.random().toString(36).substr(2, 9),
              name: name,
              hazardClass: hazard,
              assignedDoctor: doctor,
              assignedSpecialist: specialist,
              defaultPaymentMethod: payment,
              defaultExams: matchedExams 
            };
            onAddCompany(newComp);
            addedCount++;
          }
        }

        alert(`${addedCount} adet yeni firma eklendi, ${updatedCount} adet firma güncellendi.`);
      } catch (error) {
        console.error("Excel okuma hatası:", error);
        alert("Dosya okunurken bir hata oluştu.");
      } finally {
        if(fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.readAsBinaryString(file);
  };

  // --- End Bulk Import Logic ---



  const handleAddExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eName || !ePrice || !eCode) return;
    
    // Check for duplicate code
    if(exams.some(ex => ex.code === eCode)) {
        alert("Bu tetkik kodu zaten kullanılıyor!");
        return;
    }

    const newExam: ExamDefinition = {
      id: Math.random().toString(36).substr(2, 9),
      code: eCode,
      name: eName,
      price: parseFloat(ePrice),
      cost: parseFloat(eCost) || 0
    };
    onAddExam(newExam);
    setEName('');
    setECode('');
    setEPrice('');
    setECost('');
  };

  const handleUpdateExamField = (id: string, field: keyof ExamDefinition, value: string) => {
    const exam = exams.find(e => e.id === id);
    if (exam && value.trim()) {
      const updated = { ...exam };
      if (field === 'price') updated.price = parseFloat(value);
      if (field === 'cost') updated.cost = parseFloat(value);
      if (field === 'code') updated.code = value;
      if (field === 'name') updated.name = value.trim();
      onUpdateExam(updated);
    }
  };

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-sm overflow-hidden">
      <div className="flex border-b border-slate-700 overflow-x-auto">
        <button
          onClick={() => setActiveTab('general')}
          className={`px-6 py-4 text-center font-medium text-sm transition-colors whitespace-nowrap ${activeTab === 'general' ? 'bg-slate-900/50 text-blue-400 border-b-2 border-blue-500' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
        >
          Genel Ayarlar
        </button>
        <button
          onClick={() => setActiveTab('companies')}
          className={`px-6 py-4 text-center font-medium text-sm transition-colors whitespace-nowrap ${activeTab === 'companies' ? 'bg-slate-900/50 text-blue-400 border-b-2 border-blue-500' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
        >
          Firmalar
        </button>
        <button
          onClick={() => setActiveTab('institutions')}
          className={`px-6 py-4 text-center font-medium text-sm transition-colors whitespace-nowrap ${activeTab === 'institutions' ? 'bg-slate-900/50 text-blue-400 border-b-2 border-blue-500' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
        >
          Anlaşmalı Kurumlar
        </button>
        <button
          onClick={() => setActiveTab('exams')}
          className={`px-6 py-4 text-center font-medium text-sm transition-colors whitespace-nowrap ${activeTab === 'exams' ? 'bg-slate-900/50 text-blue-400 border-b-2 border-blue-500' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
        >
          Tetkikler
        </button>
        <button
          onClick={() => setActiveTab('backup')}
          className={`px-6 py-4 text-center font-medium text-sm transition-colors whitespace-nowrap ${activeTab === 'backup' ? 'bg-slate-900/50 text-blue-400 border-b-2 border-blue-500' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
        >
          Yedekleme
        </button>
        <button
          onClick={() => setActiveTab('update')}
          className={`px-6 py-4 text-center font-medium text-sm transition-colors whitespace-nowrap ${activeTab === 'update' ? 'bg-slate-900/50 text-blue-400 border-b-2 border-blue-500' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
        >
          Yazılım Güncelleme
        </button>

      </div>

      <div className="p-6">
        {activeTab === 'general' && (
          <div className="space-y-6">
             <div className="bg-slate-900/30 p-6 rounded-lg border border-slate-700 max-w-2xl">
                <div className="flex items-center mb-4">
                   <div className="p-2 bg-indigo-500/10 rounded mr-3">
                      <Sliders className="w-5 h-5 text-indigo-500" />
                   </div>
                   <h3 className="text-lg font-bold text-white">Sistem Parametreleri</h3>
                </div>
                
                <form onSubmit={handleUpdateGeneralSettings} className="space-y-6">
                   {/* EKG Age Limit */}
                   <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-slate-800 rounded border border-slate-600">
                      <div>
                         <label className="block text-sm font-medium text-white">EKG Zorunluluk Yaşı</label>
                         <p className="text-xs text-slate-400 mt-1">Bu yaş ve üzerindeki personel için EKG tetkiki otomatik olarak seçilir.</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input 
                          type="number" 
                          min="18"
                          max="100"
                          value={ekgAgeLimit} 
                          onChange={(e) => setEkgAgeLimit(parseInt(e.target.value) || 0)}
                          className="w-20 px-3 py-2 bg-slate-900 border border-slate-500 rounded text-white text-center font-bold focus:ring-blue-500 outline-none" 
                        />
                        <span className="text-sm text-slate-400">Yaş</span>
                      </div>
                   </div>

                   {/* Company Logo Upload */}
                   <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 p-4 bg-slate-800 rounded border border-slate-600">
                      <div className="flex-1">
                         <label className="block text-sm font-medium text-white">Firma Logosu</label>
                         <p className="text-xs text-slate-400 mt-1">Bu logo Z raporu çıktısında ve sol menüde kullanılacaktır.</p>
                      </div>
                      <div className="flex flex-col items-center">
                          <div className="w-32 h-32 border-2 border-dashed border-slate-600 rounded-lg flex items-center justify-center bg-slate-900 overflow-hidden relative group">
                             {logo ? (
                                <img src={logo} alt="Logo Preview" className="w-full h-full object-contain p-2" />
                             ) : (
                                <ImageIcon className="w-8 h-8 text-slate-600" />
                             )}
                             <input 
                               type="file" 
                               accept="image/*" 
                               className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                               onChange={handleLogoUpload}
                               ref={logoInputRef}
                             />
                             {!logo && <div className="absolute bottom-2 text-[10px] text-slate-500">Yükle</div>}
                          </div>
                          
                          {logo && (
                             <button 
                               type="button" 
                               onClick={handleRemoveLogo}
                               className="mt-2 text-xs text-red-400 hover:text-red-300 flex items-center"
                             >
                                <Trash2 className="w-3 h-3 mr-1" />
                                Kaldır
                             </button>
                          )}
                      </div>
                   </div>

                   {/* Print Background Logo Upload */}
                   <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 p-4 bg-slate-800 rounded border border-slate-600">
                      <div className="flex-1">
                         <label className="block text-sm font-medium text-white">Çıktı Arka Plan Logosu (Filigran)</label>
                         <p className="text-xs text-slate-400 mt-1">Bu logo sevk kağıdı çıktısında arka planda silik (filigran) olarak görünecektir.</p>
                      </div>
                      <div className="flex flex-col items-center">
                          <div className="w-32 h-32 border-2 border-dashed border-slate-600 rounded-lg flex items-center justify-center bg-slate-900 overflow-hidden relative group">
                             {printBgLogo ? (
                                <img src={printBgLogo} alt="Print Background Logo Preview" className="w-full h-full object-contain p-2 opacity-50" />
                             ) : (
                                <ImageIcon className="w-8 h-8 text-slate-600" />
                             )}
                             <input 
                               type="file" 
                               accept="image/*" 
                               className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                               onChange={handlePrintBgLogoUpload}
                               ref={printBgLogoInputRef}
                             />
                             {!printBgLogo && <div className="absolute bottom-2 text-[10px] text-slate-500">Yükle</div>}
                          </div>
                          
                          {printBgLogo && (
                             <button 
                               type="button" 
                               onClick={handleRemovePrintBgLogo}
                               className="mt-2 text-xs text-red-400 hover:text-red-300 flex items-center"
                             >
                                <Trash2 className="w-3 h-3 mr-1" />
                                Kaldır
                             </button>
                          )}
                      </div>
                   </div>

                   {/* Auto Print Toggle */}
                   <div className="flex items-center justify-between p-4 bg-slate-800 rounded border border-slate-600">
                      <div>
                         <label className="block text-sm font-medium text-white">Otomatik Yazdırma</label>
                         <p className="text-xs text-slate-400 mt-1">Yeni sevk kaydı oluşturulduğunda otomatik olarak yazdırma ekranını açar.</p>
                      </div>
                      <button 
                          type="button"
                          onClick={() => setAutoPrint(!autoPrint)}
                          className={`w-12 h-6 rounded-full relative transition-colors ${autoPrint ? 'bg-emerald-500' : 'bg-slate-600'}`}
                      >
                          <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${autoPrint ? 'translate-x-6' : 'translate-x-0'}`} />
                      </button>
                   </div>

                   {/* Print Page Size */}
                   <div className="flex items-center justify-between p-4 bg-slate-800 rounded border border-slate-600">
                      <div>
                         <label className="block text-sm font-medium text-white">Çıktı Sayfa Boyutu</label>
                         <p className="text-xs text-slate-400 mt-1">Sevk kağıdı yazdırılırken kullanılacak kağıt boyutu.</p>
                      </div>
                      <select
                          value={printPageSize}
                          onChange={(e) => setPrintPageSize(e.target.value as 'A4' | 'A5' | 'A6')}
                          className="bg-slate-900 border border-slate-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none"
                      >
                          <option value="A4">A4 (Standart)</option>
                          <option value="A5">A5 (Yarım Sayfa)</option>
                          <option value="A6">A6 (Çeyrek Sayfa)</option>
                      </select>
                   </div>

                   {/* END Auto Print & Print Size */}

                   <div className="flex justify-end pt-2">
                      <button type="submit" className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-colors shadow-lg shadow-blue-900/20">
                         <Save className="w-4 h-4" />
                         <span>Ayarları Kaydet</span>
                      </button>
                   </div>
                </form>
             </div>

             <div className="bg-slate-900/30 p-6 rounded-lg border border-slate-700 max-w-2xl mt-8">
                <div className="flex items-center mb-4">
                   <div className="p-2 bg-orange-500/10 rounded mr-3">
                      <Sliders className="w-5 h-5 text-orange-500" />
                   </div>
                   <h3 className="text-lg font-bold text-white">Sistem Şifresini Değiştir</h3>
                </div>
                
                <form onSubmit={handlePasswordChange} className="space-y-6">
                    {pwdError && (
                      <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded text-sm">
                        {pwdError}
                      </div>
                    )}
                    {pwdSuccess && (
                      <div className="bg-emerald-500/10 border border-emerald-500/50 text-emerald-500 p-3 rounded text-sm">
                        {pwdSuccess}
                      </div>
                    )}

                    <div className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-slate-400 mb-1">Mevcut Şifre</label>
                          <input 
                              type="password" 
                              value={oldPassword} 
                              onChange={(e) => setOldPassword(e.target.value)}
                              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm focus:ring-blue-500 outline-none" 
                              required
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-400 mb-1">Yeni Şifre</label>
                          <input 
                              type="password" 
                              value={newPassword} 
                              onChange={(e) => setNewPassword(e.target.value)}
                              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm focus:ring-blue-500 outline-none" 
                              required
                          />
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button type="submit" className="flex items-center space-x-2 bg-orange-600 hover:bg-orange-500 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-colors shadow-lg shadow-orange-900/20">
                         <Save className="w-4 h-4" />
                         <span>Şifreyi Güncelle</span>
                      </button>
                   </div>
                </form>
             </div>
          </div>
        )}

        {activeTab === 'companies' && (
          <div className="space-y-8">
            
            {/* Bulk Import Section */}
            {!editingCompanyId && (
                <div className="bg-slate-900/50 p-4 rounded-lg border border-dashed border-slate-600 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-emerald-500/10 rounded">
                    <Upload className="w-6 h-6 text-emerald-500" />
                    </div>
                    <div>
                        <h5 className="text-sm font-bold text-white">Toplu Firma Yükleme (Excel)</h5>
                        <p className="text-xs text-slate-400">Şablonu indirin, <strong>2. Sayfadaki tetkik kodlarına bakarak</strong> doldurun ve yükleyin.</p>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                    <button 
                      onClick={downloadTemplate}
                      type="button"
                      className="flex items-center justify-center space-x-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-xs text-slate-300 transition-colors"
                    >
                        <FileDown className="w-4 h-4" />
                        <span>Boş Şablon İndir</span>
                    </button>
                    <button 
                      onClick={downloadCurrentCompaniesExcel}
                      type="button"
                      className="flex items-center justify-center space-x-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-xs text-blue-300 transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        <span>Mevcut Listeyi İndir (Düzenlemek için)</span>
                    </button>
                    <label className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium cursor-pointer transition-colors shadow-lg shadow-blue-900/20">
                        <Upload className="w-4 h-4" />
                        <span>Verileri Yükle / Güncelle</span>
                        <input 
                        type="file" 
                        accept=".xlsx, .xls" 
                        className="hidden" 
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        />
                    </label>
                </div>
                </div>
            )}

            {/* Add/Edit Company Form */}
            <form onSubmit={handleCompanySubmit} className={`bg-slate-900/30 p-4 rounded-lg border ${editingCompanyId ? 'border-orange-500/50 shadow-lg shadow-orange-900/20' : 'border-slate-700'} space-y-4 transition-all duration-300`}>
              <h4 className={`text-sm font-bold flex items-center ${editingCompanyId ? 'text-orange-400' : 'text-white'}`}>
                {editingCompanyId ? <Edit2 className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />} 
                {editingCompanyId ? 'Firma Bilgilerini Düzenle' : 'Tek Firma Ekle'}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input required placeholder="Firma Adı" value={cName} onChange={e => setCName(e.target.value)} className="bg-slate-800 border-slate-600 rounded px-3 py-2 text-white text-sm focus:ring-blue-500 outline-none" />
                <select value={cHazard} onChange={e => setCHazard(e.target.value as HazardClass)} className="bg-slate-800 border-slate-600 rounded px-3 py-2 text-white text-sm outline-none">
                  {Object.values(HazardClass).map(h => <option key={h} value={h}>{h}</option>)}
                </select>
                <input placeholder="İşyeri Hekimi" value={cDoctor} onChange={e => setCDoctor(e.target.value)} className="bg-slate-800 border-slate-600 rounded px-3 py-2 text-white text-sm focus:ring-blue-500 outline-none" />
                <input placeholder="İSG Uzmanı" value={cSpecialist} onChange={e => setCSpecialist(e.target.value)} className="bg-slate-800 border-slate-600 rounded px-3 py-2 text-white text-sm focus:ring-blue-500 outline-none" />
                
                {/* Forced Institution Dropdown */}
                <select 
                  value={cPreferredInst} 
                  onChange={e => setCPreferredInst(e.target.value)} 
                  className="bg-slate-800 border-slate-600 rounded px-3 py-2 text-white text-sm outline-none"
                >
                    <option value="">Anlaşmalı Kurum (Seçiniz)</option>
                    <option value="">Serbest (İstenilen yere gidebilir)</option>
                    {institutions.map(inst => (
                      <option key={inst.id} value={inst.id}>{inst.name}</option>
                    ))}
                </select>

                {/* Payment Method Selector */}
                <div className="flex space-x-2">
                   <button 
                    type="button"
                    onClick={() => setCPaymentMethod('INVOICE')}
                    className={`flex-1 py-2 rounded text-sm font-medium border flex items-center justify-center space-x-2 transition-all ${cPaymentMethod === 'INVOICE' ? 'bg-blue-600/20 border-blue-500 text-blue-200' : 'bg-slate-800 border-slate-600 text-slate-400'}`}
                   >
                     <Receipt className="w-4 h-4" />
                     <span>Fatura</span>
                   </button>
                   <button 
                    type="button"
                    onClick={() => setCPaymentMethod('CASH')}
                    className={`flex-1 py-2 rounded text-sm font-medium border flex items-center justify-center space-x-2 transition-all ${cPaymentMethod === 'CASH' ? 'bg-emerald-600/20 border-emerald-500 text-emerald-200' : 'bg-slate-800 border-slate-600 text-slate-400'}`}
                   >
                     <Banknote className="w-4 h-4" />
                     <span>Nakit</span>
                   </button>
                   <button 
                    type="button"
                    onClick={() => setCPaymentMethod('POS')}
                    className={`flex-1 py-2 rounded text-sm font-medium border flex items-center justify-center space-x-2 transition-all ${cPaymentMethod === 'POS' ? 'bg-purple-600/20 border-purple-500 text-purple-200' : 'bg-slate-800 border-slate-600 text-slate-400'}`}
                   >
                     <CreditCard className="w-4 h-4" />
                     <span>Pos</span>
                   </button>
                </div>
              </div>

              {/* Exam Selection for Company */}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Firma Standart Tetkikleri</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                   {exams.map(exam => (
                     <div 
                      key={exam.id}
                      onClick={() => toggleCompanyExam(exam.name)}
                      className={`cursor-pointer px-3 py-2 rounded border flex items-center justify-between transition-all ${cSelectedExams.includes(exam.name) ? 'bg-blue-600/20 border-blue-500 text-blue-200' : 'bg-slate-800 border-slate-600 text-slate-400 hover:bg-slate-700'}`}
                     >
                       <span className="text-xs truncate mr-2">{exam.name}</span>
                       {cSelectedExams.includes(exam.name) && <Check className="w-3 h-3 text-blue-400" />}
                     </div>
                   ))}
                </div>
              </div>

              {/* Save / Cancel Buttons */}
              <div className="flex justify-end space-x-3">
                {editingCompanyId && (
                    <button 
                        type="button" 
                        onClick={handleCancelEdit}
                        className="bg-slate-700 hover:bg-slate-600 text-slate-300 px-4 py-2 rounded text-sm flex items-center"
                    >
                        <XCircle className="w-4 h-4 mr-1" /> Vazgeç
                    </button>
                )}
                <button 
                    type="submit" 
                    className={`${editingCompanyId ? 'bg-orange-600 hover:bg-orange-500' : 'bg-blue-600 hover:bg-blue-500'} text-white px-6 py-2 rounded text-sm font-bold shadow-lg transition-colors flex items-center`}
                >
                    {editingCompanyId ? <Save className="w-4 h-4 mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
                    {editingCompanyId ? 'Güncelle' : 'Ekle'}
                </button>
              </div>
            </form>

            <div className="pt-4 border-t border-slate-700">
               <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input 
                    type="text" 
                    placeholder="Firma adı, hekim veya uzman ara..." 
                    value={companySearchQuery}
                    onChange={(e) => setCompanySearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
               </div>
            </div>

            {/* Company List Controls & Headers */}
            <div className="flex items-center justify-between">
               <div className="flex items-center space-x-3">
                 <button 
                   onClick={handleSelectAllCompanies}
                   className="flex items-center space-x-2 text-sm text-slate-400 hover:text-white transition-colors"
                 >
                    {selectedCompanyIds.length > 0 && selectedCompanyIds.length === companies.length ? (
                       <CheckSquare className="w-4 h-4 text-blue-500" />
                    ) : (
                       <Square className="w-4 h-4" />
                    )}
                    <span>Tümünü Seç</span>
                 </button>
                 <span className="text-sm text-slate-400">| Toplam {filteredCompanies.length} Firma</span>
               </div>
               
               {selectedCompanyIds.length > 0 && (
                 <button 
                   onClick={handleBulkDelete}
                   className="flex items-center space-x-2 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/40 border border-red-500/30 text-red-400 rounded text-xs font-bold transition-all animate-pulse"
                 >
                   <Trash2 className="w-3.5 h-3.5" />
                   <span>Seçilenleri Sil ({selectedCompanyIds.length})</span>
                 </button>
               )}
            </div>

            {/* Company List */}
            <div className="space-y-3">
              {filteredCompanies.map(company => (
                <div key={company.id} className={`flex flex-col md:flex-row items-start md:items-center justify-between p-4 border rounded-lg gap-4 transition-all ${selectedCompanyIds.includes(company.id) ? 'bg-blue-900/10 border-blue-500/50' : 'bg-slate-700/30 border-slate-700'}`}>
                  <div className="flex items-center space-x-4 w-full md:w-auto">
                    {/* Checkbox */}
                    <div 
                      onClick={(e) => { e.stopPropagation(); handleToggleSelectCompany(company.id); }}
                      className="cursor-pointer text-slate-500 hover:text-blue-500"
                    >
                       {selectedCompanyIds.includes(company.id) ? <CheckSquare className="w-5 h-5 text-blue-500" /> : <Square className="w-5 h-5" />}
                    </div>

                    <div className="p-2 bg-slate-800 rounded hidden md:block">
                      <Building2 className="w-5 h-5 text-slate-400" />
                    </div>
                    
                    <div>
                      <h5 className="font-medium text-white flex items-center">
                        {company.name}
                        {company.defaultPaymentMethod === 'CASH' ? (
                          <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-emerald-900/30 text-emerald-400 border border-emerald-500/20 rounded uppercase">Nakit</span>
                        ) : company.defaultPaymentMethod === 'POS' ? (
                          <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-purple-900/30 text-purple-400 border border-purple-500/20 rounded uppercase">Pos</span>
                        ) : (
                          <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-blue-900/30 text-blue-400 border border-blue-500/20 rounded uppercase">Fatura</span>
                        )}
                        {company.forcedInstitutionId && (
                           <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-purple-900/30 text-purple-400 border border-purple-500/20 rounded uppercase flex items-center">
                             <MapPin className="w-3 h-3 mr-1" />
                             {institutions.find(i => i.id === company.forcedInstitutionId)?.name || 'Kurum'}
                           </span>
                        )}
                      </h5>
                      <p className="text-xs text-slate-400">{company.assignedDoctor} • {company.assignedSpecialist}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {company.defaultExams.map((ex, i) => (
                           <span key={i} className="text-[10px] px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded border border-slate-600">{ex}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
                    <span className="text-xs bg-slate-800 px-2 py-1 rounded border border-slate-600 text-slate-300 mr-2">{company.hazardClass}</span>
                    <button 
                        onClick={() => handleEditCompany(company)} 
                        className="text-slate-500 hover:text-blue-400 p-1.5 hover:bg-blue-500/10 rounded transition-colors"
                        title="Düzenle"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={() => onDeleteCompany(company.id)} 
                        className="text-slate-500 hover:text-red-400 p-1.5 hover:bg-red-500/10 rounded transition-colors"
                        title="Sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'institutions' && (
          <div className="space-y-8">
             <form onSubmit={handleInstitutionSubmit} className="bg-slate-900/30 p-4 rounded-lg border border-slate-700 space-y-4">
                <h4 className="text-sm font-bold text-white flex items-center">
                  {editingInstitutionId ? <Edit2 className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                  {editingInstitutionId ? 'Sağlık Kurumunu Düzenle' : 'Sağlık Kurumu Ekle'}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <input required placeholder="Kurum Adı (Örn: Merkez Hastanesi)" value={iName} onChange={e => setIName(e.target.value)} className="bg-slate-800 border-slate-600 rounded px-3 py-2 text-white text-sm focus:ring-blue-500 outline-none" />
                   <input placeholder="Telefon / İletişim" value={iPhone} onChange={e => setIPhone(e.target.value)} className="bg-slate-800 border-slate-600 rounded px-3 py-2 text-white text-sm focus:ring-blue-500 outline-none" />
                   <input placeholder="Detaylı Adres Tarifi" value={iAddress} onChange={e => setIAddress(e.target.value)} className="bg-slate-800 border-slate-600 rounded px-3 py-2 text-white text-sm focus:ring-blue-500 outline-none" />
                   <input placeholder="Konum Linki (Google Maps vb.)" value={iLocationUrl} onChange={e => setILocationUrl(e.target.value)} className="bg-slate-800 border-slate-600 rounded px-3 py-2 text-white text-sm focus:ring-blue-500 outline-none" />
                </div>
                <div className="flex justify-end space-x-3">
                  {editingInstitutionId && (
                    <button type="button" onClick={handleCancelInstitutionEdit} className="text-slate-400 hover:text-white px-4 py-2 rounded text-sm">Vazgeç</button>
                  )}
                  <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-sm">
                    {editingInstitutionId ? 'Güncelle' : 'Ekle'}
                  </button>
                </div>
             </form>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {institutions.map(inst => (
                 <div key={inst.id} className="flex items-center justify-between p-4 bg-slate-700/30 border border-slate-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                       <div className="p-2 bg-purple-500/10 rounded">
                         <MapPin className="w-5 h-5 text-purple-500" />
                       </div>
                       <div>
                         <h5 className="font-medium text-white text-sm">{inst.name}</h5>
                         <p className="text-xs text-slate-400">{inst.phone}</p>
                         {inst.address && <p className="text-xs text-slate-500 mt-1 line-clamp-1">{inst.address}</p>}
                       </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button onClick={() => handleEditInstitution(inst)} className="text-slate-500 hover:text-blue-400 p-1.5 hover:bg-blue-500/10 rounded transition-colors" title="Düzenle">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => onDeleteInstitution(inst.id)} className="text-slate-500 hover:text-red-400 p-1.5 hover:bg-red-500/10 rounded transition-colors" title="Sil">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                 </div>
               ))}
               {institutions.length === 0 && <p className="text-slate-500 text-sm col-span-2 text-center py-4">Kayıtlı kurum bulunamadı.</p>}
             </div>
          </div>
        )}

        {activeTab === 'exams' && (
          <div className="space-y-6">
             <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-xs text-blue-300 leading-relaxed flex items-start gap-2.5">
                <Sliders className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div>
                   <strong>İpucu:</strong> Tetkiklerin adını, kodunu, satış fiyatını veya maliyetini doğrudan altısıra listesindeki kutulara tıklayarak güncelleyebilirsiniz. Yapılan değişiklikler otomatik kaydedilecektir. Tetkik ismi güncellendiğinde, o tetkiki varsayılan olarak kullanan firmalar ile geçmiş sevk kayıtlarındaki tetkik isimleri de veri bütünlüğünü korumak için otomatik olarak güncellenecektir.
                </div>
             </div>

            {/* Add Exam Form */}
            <form onSubmit={handleAddExam} className="bg-slate-900/30 p-4 rounded-lg border border-slate-700 space-y-4">
              <h4 className="text-sm font-bold text-white flex items-center">
                <Plus className="w-4 h-4 mr-2" /> Yeni Tetkik Ekle
              </h4>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="w-full md:w-24">
                   <input required placeholder="Kod (101)" value={eCode} onChange={e => setECode(e.target.value)} className="w-full bg-slate-800 border-slate-600 rounded px-3 py-2 text-white text-sm focus:ring-blue-500 outline-none" />
                </div>
                <input required placeholder="Tetkik Adı (Örn: Portör)" value={eName} onChange={e => setEName(e.target.value)} className="flex-1 bg-slate-800 border-slate-600 rounded px-3 py-2 text-white text-sm focus:ring-blue-500 outline-none" />
                <input required type="number" placeholder="Satış (TL)" value={ePrice} onChange={e => setEPrice(e.target.value)} className="w-full md:w-32 bg-slate-800 border-slate-600 rounded px-3 py-2 text-white text-sm focus:ring-blue-500 outline-none" />
                <input type="number" placeholder="Maliyet (TL)" value={eCost} onChange={e => setECost(e.target.value)} className="w-full md:w-32 bg-slate-800 border-slate-600 rounded px-3 py-2 text-white text-sm focus:ring-blue-500 outline-none" />
                <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-sm whitespace-nowrap">Ekle</button>
              </div>
            </form>

            {/* Exam List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {exams.map(exam => (
                <div key={exam.id} className="flex items-center justify-between p-4 bg-slate-700/30 border border-slate-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="px-2 py-1 bg-slate-800 rounded border border-slate-600 text-xs text-blue-400 font-mono">
                       {exam.code}
                    </div>
                    <div className="flex-1 min-w-0">
                       <input 
                           type="text" 
                           defaultValue={exam.name} 
                           onBlur={(e) => handleUpdateExamField(exam.id, 'name', e.target.value)}
                           onKeyDown={(e) => {
                             if (e.key === 'Enter') {
                               handleUpdateExamField(exam.id, 'name', (e.target as HTMLInputElement).value);
                               (e.target as HTMLInputElement).blur();
                             }
                           }}
                           title="Tetkik adını değiştirmek için buraya tıklayıp yazabilirsiniz"
                           className="bg-transparent border-b border-transparent hover:border-slate-500 hover:bg-slate-800/40 focus:border-blue-500 focus:bg-slate-800 text-sm font-medium text-white px-1.5 py-0.5 rounded outline-none w-full transition-all"
                       />
                       <span className="text-[10px] text-slate-500 block pl-1.5">Maliyet: {exam.cost ? `₺${exam.cost}` : '-'}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex flex-col space-y-1 items-end">
                        <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 text-[10px]">Satış ₺</span>
                        <input 
                            type="number" 
                            defaultValue={exam.price} 
                            onBlur={(e) => handleUpdateExamField(exam.id, 'price', e.target.value)}
                            className="w-20 pl-8 pr-2 py-1 bg-slate-800 border border-slate-600 rounded text-xs text-white text-right focus:border-blue-500 outline-none"
                        />
                        </div>
                        <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-red-500/50 text-[10px]">Mal. ₺</span>
                        <input 
                            type="number" 
                            defaultValue={exam.cost || 0} 
                            onBlur={(e) => handleUpdateExamField(exam.id, 'cost', e.target.value)}
                            className="w-20 pl-8 pr-2 py-1 bg-slate-800 border border-slate-600 rounded text-xs text-slate-400 text-right focus:border-red-500 outline-none"
                        />
                        </div>
                    </div>
                    <button onClick={() => onDeleteExam(exam.id)} className="text-slate-500 hover:text-red-400 p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'backup' && (
          <div className="space-y-6 max-w-4xl">
             {/* SECTION 1: MANUAL BACKUP */}
             <div className="bg-slate-900/40 p-6 rounded-lg border border-slate-700">
                <div className="flex items-center mb-4">
                   <div className="p-2 bg-emerald-500/10 rounded mr-3">
                      <Database className="w-5 h-5 text-emerald-500" />
                   </div>
                   <h3 className="text-lg font-bold text-white">Yerel Manuel Yedekleme</h3>
                </div>
                
                <p className="text-slate-400 text-sm mb-6">
                   Sistemdeki tüm verileri (firmalar, tetkikler, kurumlar, kasa hareketleri vb.) JSON formatında bilgisayarınıza indirebilir veya daha önce aldığınız bir manuel yedeği sisteme doğrudan geri yükleyebilirsiniz.
                </p>

                <div className="flex flex-wrap gap-4 mt-6">
                    <button 
                        onClick={handleDownloadBackup}
                        className="flex items-center justify-center space-x-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white px-5 py-3 rounded-lg text-sm font-bold transition-colors shadow-lg cursor-pointer"
                    >
                        <Download className="w-4 h-4" />
                        <span>Tüm Verileri Bilgisayara İndir</span>
                    </button>
                    
                    <label className="flex items-center justify-center space-x-2 bg-orange-600 hover:bg-orange-500 border border-orange-500/50 text-white px-5 py-3 rounded-lg text-sm font-bold transition-colors shadow-lg shadow-orange-900/20 cursor-pointer">
                        <Upload className="w-4 h-4" />
                        <span>Dosyadan Geri Yükle</span>
                        <input 
                            type="file" 
                            accept=".json" 
                            className="hidden" 
                            ref={backupInputRef}
                            onChange={handleRestoreBackup}
                        />
                    </label>
                </div>

                <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-red-100 shrink-0 mt-0.5" />
                    <div>
                        <h4 className="text-sm font-bold text-red-400">Önemli Uyarı</h4>
                        <p className="text-xs text-red-300 mt-1 leading-relaxed">
                            Yedeği geri yüklediğinizde <strong>mevcut sistemdeki tüm veriler tamamen silinir</strong> ve yerine yeni dosyadaki veriler yazılır. Bu işlem geri alınamaz.
                        </p>
                    </div>
                </div>
             </div>

             {/* SECTION 2: GOOGLE DRIVE BACKUP */}
             <div className="bg-slate-900/40 p-6 rounded-lg border border-slate-700">
                <div className="flex items-center justify-between mb-4">
                   <div className="flex items-center">
                      <div className="p-2 bg-blue-500/10 rounded mr-3">
                         <Cloud className="w-5 h-5 text-blue-500" />
                      </div>
                      <div>
                         <h3 className="text-lg font-bold text-white flex items-center">
                            Google Drive Bulut Entegrasyonu
                            <span className="ml-2 text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full font-normal border border-blue-500/20">Google Workspace</span>
                         </h3>
                      </div>
                   </div>
                   
                   {googleAccessToken ? (
                      <div className="flex items-center space-x-2">
                         <span className="flex h-2 w-2 relative">
                           <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                           <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                         </span>
                         <span className="text-xs font-bold text-emerald-500">Bağlantı Aktif</span>
                         <button 
                            onClick={handleDisconnectGoogleDrive}
                            className="text-xs text-slate-400 hover:text-red-400 font-bold transition-colors ml-2"
                         >
                            Bağlantıyı Kes
                         </button>
                      </div>
                   ) : (
                      <span className="text-xs font-bold text-slate-500">Bağlantı Yok</span>
                   )}
                </div>

                <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                   OSGB veritabanınızı doğrudan kendi kişisel veya kurumsal Google Drive hesabınızda güvenli bir şekilde saklayın. Sunucu sıfırlansa bile Google Drive'daki güncel yedek listenizi görüntüleyip tek tıklamayla sistemi geri yükleyebilirsiniz.
                </p>

                {googleError && (
                  <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-4 rounded-lg leading-relaxed flex items-center justify-between">
                     <span>{googleError}</span>
                     <button onClick={() => setGoogleError(null)} className="text-red-400 hover:text-white ml-2">Kapat</button>
                  </div>
                )}

                {!googleAccessToken ? (
                   <div className="flex flex-col items-center justify-center p-8 bg-slate-950/40 border border-dashed border-slate-700 rounded-lg text-center">
                      <Cloud className="w-10 h-10 text-slate-600 mb-2" />
                      <p className="text-slate-400 text-xs mb-4 max-w-sm">
                         Sunucudan bağımsız, tam korumalı yedekleme sistemini başlatmak için Google Drive hesabınızla güvenli bağlantı kurun.
                      </p>
                      <button
                         onClick={handleConnectGoogleDrive}
                         className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-lg text-sm shadow-lg shadow-blue-900/20 transition-all transform hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                      >
                         <ShieldCheck className="w-4 h-4" />
                         <span>Google Drive ile Oturum Aç</span>
                      </button>
                   </div>
                ) : (
                   <div className="space-y-6">
                      <div className="flex gap-4">
                         <button
                            disabled={googleLoading}
                            onClick={handleUploadBackupToGoogle}
                            className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold px-5 py-3 rounded-lg text-sm transition-colors cursor-pointer"
                         >
                            {googleLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Cloud className="w-4 h-4" />}
                            <span>Yeni Yedek Oluştur ve Drive'a Yükle</span>
                         </button>
                         
                         <button
                            disabled={googleLoading}
                            onClick={() => handleListGoogleBackupFiles()}
                            className="flex items-center justify-center space-x-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 px-4 py-3 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
                         >
                            <RefreshCw className={`w-4 h-4 ${googleLoading ? 'animate-spin' : ''}`} />
                            <span>Listeyi Yenile</span>
                         </button>
                      </div>

                      <div>
                         <h4 className="text-sm font-bold text-white mb-3 flex items-center">
                            <Database className="w-4 h-4 text-slate-400 mr-2" />
                            Google Drive'daki Son Yedekleriniz ({googleFiles.length})
                         </h4>

                         {googleLoading && googleFiles.length === 0 ? (
                            <div className="flex justify-center items-center py-8 text-slate-500 text-xs">
                               <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                               Yedek listesi taranıyor...
                            </div>
                          ) : googleFiles.length === 0 ? (
                            <div className="text-center py-8 bg-slate-950/20 rounded-lg border border-slate-800/50 text-slate-500 text-xs">
                               Google Drive'da henüz yedek dosyanız yok. İlk yedeğinizi oluşturmak için yukarıdaki düğmeyi kullanın.
                            </div>
                          ) : (
                            <div className="bg-slate-950/40 rounded-lg border border-slate-800 overflow-hidden divide-y divide-slate-800/50">
                               {googleFiles.map((f: any) => (
                                  <div key={f.id} className="flex items-center justify-between p-4 hover:bg-slate-900/40 transition-colors">
                                     <div className="space-y-0.5">
                                        <span className="text-xs font-mono font-semibold text-slate-200 block truncate max-w-sm sm:max-w-md">{f.name}</span>
                                        <div className="flex items-center space-x-2 text-[10px] text-slate-400 font-mono">
                                           <span>{new Date(f.createdTime).toLocaleString('tr-TR')}</span>
                                           <span>•</span>
                                           <span>{(parseInt(f.size || '0') / 1024).toFixed(1)} KB</span>
                                        </div>
                                     </div>
                                     
                                     <button
                                        disabled={googleLoading}
                                        onClick={() => handleRestoreFromGoogle(f.id, f.name)}
                                        className="text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded font-bold transition-all cursor-pointer"
                                     >
                                        Sistem Kur / Geri Yükle
                                     </button>
                                  </div>
                               ))}
                            </div>
                          )}
                      </div>
                   </div>
                )}
             </div>

             {/* SECTION 3: WEBHOOK INTEGRATION */}
             <div className="bg-slate-900/40 p-6 rounded-lg border border-slate-700">
                <div className="flex items-center mb-4">
                   <div className="p-2 bg-indigo-500/10 rounded mr-3">
                      <Globe className="w-5 h-5 text-indigo-500" />
                   </div>
                   <h3 className="text-lg font-bold text-white">Gerçek Zamanlı Webhook Bildirimleri</h3>
                </div>

                <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                   Sistemde veri değiştiğinde (sevk kaydı ekleme, günceleme, silme vb.) veritabanı yedeğinin şifrelenmiş güvenli bir kopyasını anında başka bir harici sunucu veya özel yedekleme API'sine POST isteğiyle otomatik ulaştırın.
                </p>

                <form onSubmit={handleSaveWebhookSettings} className="space-y-4">
                   <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-300 block">Yedekleme Webhook Hedef Adresi (URL)</label>
                      <div className="flex gap-2">
                         <input
                            type="url"
                            placeholder="https://sunucuzuz.com/api/backup-receiver"
                            className="flex-1 bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder-slate-600 font-mono"
                            value={webhookUrlInput}
                            onChange={(e) => setWebhookUrlInput(e.target.value)}
                         />
                         <button
                            type="submit"
                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold p-3 rounded-lg text-sm transition-colors cursor-pointer whitespace-nowrap"
                         >
                            Ayarları Kaydet
                         </button>
                      </div>
                   </div>
                </form>

                {webhookUrlInput && (
                   <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-xs text-slate-400">Webhook kurulumunu test etmek için uyarı bildirimi gönderin:</span>
                      <button
                         type="button"
                         onClick={handleTestWebhook}
                         className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white px-3 py-1.5 rounded font-bold transition-all cursor-pointer"
                      >
                         Bağlantıyı Test Et
                      </button>
                   </div>
                )}

                {webhookTestStatus.type !== 'idle' && (
                   <div className={`mt-3 p-3 rounded text-xs leading-relaxed ${
                      webhookTestStatus.type === 'success' 
                      ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' 
                      : 'bg-red-500/10 border border-red-500/30 text-red-400'
                   }`}>
                      {webhookTestStatus.message}
                   </div>
                )}
             </div>

             {/* SECTION 4: SECURE RSS/JSON API FEED */}
             <div className="bg-slate-900/40 p-6 rounded-lg border border-slate-700">
                <div className="flex items-center mb-4">
                   <div className="p-2 bg-violet-500/10 rounded mr-3">
                      <Lock className="w-5 h-5 text-violet-500" />
                   </div>
                   <h3 className="text-lg font-bold text-white flex items-center">
                      Güvenli Harici JSON Veri Akışı (RSS Feed)
                      <span className="ml-2 text-xs text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full font-normal border border-violet-500/20">API Entegrasyonu</span>
                   </h3>
                </div>

                <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                   Harici otomatik yedekleyici programlar veya entegrasyon botları kullanıyorsanız aşağıdaki size özel gizli URL'ye HTTP GET isteği göndererek verileri her zaman güncel olarak anında çekebilirsiniz. Token veya şifre girmenize gerek yoktur.
                </p>

                <div className="space-y-4">
                   <div className="space-y-1">
                      <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">Benzersiz Güvenli Akış URL'niz:</span>
                      <div className="flex bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs text-violet-300 break-all select-all items-center justify-between">
                         <span className="truncate pr-4">
                            {`${window.location.origin}${import.meta.env.BASE_URL || '/'}api/backup/feed?key=${backupConfig.backupApiKey || '...'}`}
                         </span>
                         <button
                            onClick={() => {
                               navigator.clipboard.writeText(`${window.location.origin}${import.meta.env.BASE_URL || '/'}api/backup/feed?key=${backupConfig.backupApiKey || ''}`);
                               alert("Yedek Akış URL'si panoya kopyalandı!");
                            }}
                            className="ml-4 p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
                            title="URL'yi Kopyala"
                         >
                            <Copy className="w-4 h-4" />
                         </button>
                      </div>
                   </div>

                   <div className="text-[11px] text-slate-500 flex items-start space-x-1.5 leading-relaxed">
                      <ShieldCheck className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-500" />
                      <span>
                         Güvenlik Notu: Bu URL'deki anahtar (API parametresi) doğrudan sisteme girmek için kullanılan şifreyi barındırmaz ve şifrenin sızmasını engeller. Bu akış, sadece veritabanı yedeğinin okunmasına izin verir.
                      </span>
                   </div>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'update' && (
          <div className="space-y-6">
             <div className="bg-slate-900/30 p-6 rounded-lg border border-slate-700 max-w-2xl">
                <div className="flex items-center mb-4">
                   <div className="p-2 bg-blue-500/10 rounded mr-3">
                      <RefreshCw className={`w-5 h-5 text-blue-500 ${updateStatus === 'updating' ? 'animate-spin' : ''}`} />
                   </div>
                   <h3 className="text-lg font-bold text-white">Yazılım Sürüm Güncelleme</h3>
                </div>
                
                <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                  Sunucuda kurulu olan <strong>OSGB Tetkik Sevk Takip Sistemi</strong> yazılımını doğrudan GitHub veya kurulduğu repo üzerinden en son sürüme güvenli bir şekilde güncelleyebilirsiniz. Bu işlem terminale bağlanıp manual git/build komutları çalıştırma zorunluluğunu ortadan kaldırır.
                </p>

                {updateStatus === 'idle' && (
                  <div className="bg-slate-800 p-4 border border-slate-700 rounded-lg mb-6">
                    <h5 className="font-bold text-white text-xs mb-2 uppercase tracking-wide">Yürütülecek İşlemler Sırasıyla:</h5>
                    <ul className="text-xs text-slate-300 space-y-2 list-decimal list-inside pl-1">
                      <li>Uzak Git deposundan (git pull) en son kaynak kodlar çekilir.</li>
                      <li>Bağımlılıklar (npm install) kontrol edilir ve güncellenir.</li>
                      <li>Proje üretim modunda (npm run build) sıfırdan yeniden derlenir.</li>
                      <li>Mevcut sunucu yeni kararlı dosyalarla otomatik yeniden başlatılır.</li>
                    </ul>
                  </div>
                )}

                {updateStatus === 'updating' && (
                  <div className="bg-slate-900/50 p-6 border border-blue-500/30 rounded-lg mb-6 space-y-4">
                     <div className="flex items-center space-x-3 text-blue-400">
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span className="text-sm font-semibold">Güncelleme yürütülüyor, lütfen bekleyiniz...</span>
                     </div>
                     <p className="text-xs text-slate-400">
                       Bu işlem internet hızına ve sunucu kaynaklarına bağlı olarak 15-45 saniye sürebilir. Lütfen sayfayı kapatmayın veya yenilemeyin.
                     </p>
                     <div className="h-1 w-full bg-slate-800 overflow-hidden rounded relative">
                        <div className="h-full bg-blue-500 animate-pulse w-3/4 duration-1000 rounded"></div>
                     </div>
                  </div>
                )}

                {updateStatus === 'success' && (
                  <div className="bg-emerald-500/10 p-6 border border-emerald-500/30 rounded-lg mb-6 space-y-3">
                     <div className="flex items-center space-x-3 text-emerald-400">
                        <Check className="w-5 h-5 text-emerald-400 bg-emerald-500/20 rounded p-0.5" />
                        <span className="text-sm font-bold">Harika! Yazılım Başarıyla Güncellendi.</span>
                     </div>
                     <p className="text-xs text-emerald-300 leading-relaxed">
                       Tüm güncellemeler başarıyla sunucuya kuruldu, yeni build başarıyla oluşturuldu ve sunucu servis arka planında yeniden başlatıldı. Tarayıcınız birkaç saniye içinde otomatik olarak taze sayfayı yükleyecektir...
                     </p>
                  </div>
                )}

                {updateStatus === 'error' && (
                  <div className="bg-red-500/10 p-6 border border-red-500/30 rounded-lg mb-6 space-y-3">
                     <div className="flex items-center space-x-3 text-red-400">
                        <AlertTriangle className="w-5 h-5 text-red-400 bg-red-500/20 rounded p-0.5" />
                        <span className="text-sm font-bold">Güncelleme Sırasında Hata Oluştu!</span>
                     </div>
                     <p className="text-xs text-red-300 font-medium">
                       Hata Mesajı: {updateError}
                     </p>
                     {updateDetails && (
                       <pre className="text-[10px] p-3 bg-black/40 border border-red-500/10 rounded text-red-400 font-mono max-h-40 overflow-auto whitespace-pre-wrap leading-relaxed">
                         {updateDetails}
                       </pre>
                     )}
                     <div className="pt-2">
                        <p className="text-[11px] text-slate-400">
                          Not: Eğer yerel değişiklikler yaptıysanız git pull çakışma yapmış olabilir veya sunucu ağ bağlantısında bir problem oluşmuş olabilir.
                        </p>
                     </div>
                  </div>
                )}

                {updateStatus !== 'updating' && updateStatus !== 'success' && (
                  <div className="flex justify-start">
                     <button 
                         onClick={handleTriggerUpdate}
                         className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 rounded-lg text-sm font-bold transition-all shadow-lg shadow-blue-900/20 active:scale-95"
                     >
                         <RefreshCw className="w-4 h-4" />
                         <span>Sürümü Resmi Repodan Şimdi Güncelle</span>
                     </button>
                  </div>
                )}
             </div>
          </div>
        )}
      </div>
    </div>
  );
};