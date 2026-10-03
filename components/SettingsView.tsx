/*
 * Project: OSGB Tetkik Takip Sistemi
 * Copyright (C) 2026 szgn_emin
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License.
 */
import React, { useState, useRef, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Company, ExamDefinition, HazardClass, MedicalInstitution, AppSettings, turkishIncludes } from '../types';
import { Trash2, Plus, Building2, Save, Check, Receipt, Upload, FileDown, MapPin, Sliders, CheckSquare, Square, Image as ImageIcon, Edit2, XCircle, Database, Download, RefreshCw, AlertTriangle, CreditCard, Banknote, Search, Cloud, Globe, Lock, ShieldCheck, Activity, Link, Eye, Copy, Send, Bell, FileSpreadsheet, Clock, MessageSquare, Smartphone } from 'lucide-react';
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
    const [enableAdminOtp, setEnableAdminOtp] = useState(settings.enableAdminOtp || false);
  const [appPassword, setAppPassword] = useState(settings.appPassword || '');

  // Telegram Settings State
  const [telegramBotToken, setTelegramBotToken] = useState(settings.telegramBotToken || '');
  const [telegramChatId, setTelegramChatId] = useState(settings.telegramChatId || '');
  const [isTelegramEnabled, setIsTelegramEnabled] = useState(settings.isTelegramEnabled || false);
  const [telegramTestStatus, setTelegramTestStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error'; message: string }>({ type: 'idle', message: '' });
  const [telegramReportPeriod, setTelegramReportPeriod] = useState<'none' | 'daily' | 'weekly' | 'monthly_custom'>(settings.telegramReportPeriod || 'none');
  const [telegramCustomReportDay, setTelegramCustomReportDay] = useState<number>(settings.telegramCustomReportDay || 20);
  const [telegramCustomReportStartDay, setTelegramCustomReportStartDay] = useState<number>(settings.telegramCustomReportStartDay || 20);
  const [telegramCustomReportEndDay, setTelegramCustomReportEndDay] = useState<number>(settings.telegramCustomReportEndDay || 19);
  const [telegramReportHour, setTelegramReportHour] = useState<number>(settings.telegramReportHour !== undefined ? settings.telegramReportHour : 21);
  const [telegramReportPeriod2, setTelegramReportPeriod2] = useState<'none' | 'daily' | 'weekly' | 'monthly_custom'>(settings.telegramReportPeriod2 || 'none');
  const [telegramCustomReportDay2, setTelegramCustomReportDay2] = useState<number>(settings.telegramCustomReportDay2 || 20);
  const [telegramCustomReportStartDay2, setTelegramCustomReportStartDay2] = useState<number>(settings.telegramCustomReportStartDay2 || 20);
  const [telegramCustomReportEndDay2, setTelegramCustomReportEndDay2] = useState<number>(settings.telegramCustomReportEndDay2 || 19);
  const [telegramReportHour2, setTelegramReportHour2] = useState<number>(settings.telegramReportHour2 !== undefined ? settings.telegramReportHour2 : 21);
  const [telegramSendStatus, setTelegramSendStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error'; message: string }>({ type: 'idle', message: '' });


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
  const [iSendWhatsapp, setISendWhatsapp] = useState(false);
  const [iWhatsappTemplate, setIWhatsappTemplate] = useState('SayÄ±n {hasta_adi}, {kurum_adi} kurumuna sevkiniz oluÅŸturulmuÅŸtur. Konum: {konum_linki}');

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

  // WhatsApp Web State
  const [waReady, setWaReady] = useState(false);
  const [waQr, setWaQr] = useState('');

  useEffect(() => {
    let interval: any;
    if (activeTab === 'whatsapp') {
      const fetchWaStatus = async () => {
        try {
          const { getApiToken } = await import('../services/useServerData');
          const baseUrl = import.meta.env.BASE_URL || '/';
          const res = await fetch(`${baseUrl}api/whatsapp/status`, {
             headers: { 'Authorization': `Bearer ${getApiToken()}` }
          });
          if (res.ok) {
            const data = await res.json();
            setWaReady(data.ready);
            setWaQr(data.qr);
          }
        } catch(e) {}
      };
      fetchWaStatus();
      interval = setInterval(fetchWaStatus, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTab]);

  const handleWaLogout = async () => {
      if(!window.confirm('WhatsApp baÄŸlantÄ±sÄ±nÄ± kesmek istediÄŸinize emin misiniz?')) return;
      try {
          const { getApiToken } = await import('../services/useServerData');
          const baseUrl = import.meta.env.BASE_URL || '/';
          await fetch(`${baseUrl}api/whatsapp/logout`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${getApiToken()}` }
          });
          setWaReady(false);
          setWaQr('');
      } catch(e) {}
  };

  const handleSaveTelegramSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onUpdateSettings({
        ...settings,
        telegramBotToken,
        telegramChatId,
        isTelegramEnabled,
        telegramReportPeriod,
        telegramCustomReportDay,
        telegramCustomReportStartDay,
        telegramCustomReportEndDay,
        telegramReportHour,
        telegramReportPeriod2,
        telegramCustomReportDay2,
        telegramCustomReportStartDay2,
        telegramCustomReportEndDay2,
        telegramReportHour2
      });
      alert("Telegram entegrasyon ayarlarÄ± baÅŸarÄ±yla kaydedildi!");
    } catch (err: any) {
      alert("Ayar kaydedilirken bir hata oluÅŸtu: " + err.message);
    }
  };

  const handleTestTelegramBot = async () => {
    if (!telegramBotToken || !telegramChatId) {
      setTelegramTestStatus({ type: 'error', message: 'LÃ¼tfen hem Bot Token hem de Chat ID girin.' });
      return;
    }
    setTelegramTestStatus({ type: 'loading', message: 'Telegram botu test ediliyor, lÃ¼tfen bekleyin...' });
    try {
      const { getApiToken } = await import('../services/useServerData');
      const baseUrl = import.meta.env.BASE_URL || '/';
      const res = await fetch(`${baseUrl}api/telegram/test-bot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getApiToken()}`
        },
        body: JSON.stringify({ token: telegramBotToken, chatId: telegramChatId })
      });
      const data = await res.json();
      if (res.ok) {
        setTelegramTestStatus({ type: 'success', message: data.message || 'BaÅŸarÄ±lÄ±!' });
      } else {
        setTelegramTestStatus({ type: 'error', message: data.error || 'Test baÅŸarÄ±sÄ±z oldu.' });
      }
    } catch (err: any) {
      setTelegramTestStatus({ type: 'error', message: `BaÄŸlantÄ± hatasÄ±: ${err.message}` });
    }
  };

  const handleSendTelegramReportNow = async (period: 'daily' | 'weekly' | 'all' | 'monthly_custom') => {
    if (!telegramBotToken || !telegramChatId) {
      setTelegramSendStatus({ type: 'error', message: 'LÃ¼tfen hem Bot Token hem de Chat ID girin.' });
      return;
    }
    setTelegramSendStatus({ type: 'loading', message: 'Excel raporu oluÅŸturuluyor ve gÃ¶nderiliyor...' });
    try {
      const { getApiToken } = await import('../services/useServerData');
      const baseUrl = import.meta.env.BASE_URL || '/';
      const res = await fetch(`${baseUrl}api/telegram/send-now`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getApiToken()}`
        },
        body: JSON.stringify({ period })
      });
      const data = await res.json();
      if (res.ok) {
        setTelegramSendStatus({ type: 'success', message: data.message || 'Excel raporu baÅŸarÄ±yla Telegram botunuza gÃ¶nderildi!' });
      } else {
        setTelegramSendStatus({ type: 'error', message: data.error || 'Rapor gÃ¶nderilemedi.' });
      }
    } catch (err: any) {
      setTelegramSendStatus({ type: 'error', message: `BaÄŸlantÄ± hatasÄ±: ${err.message}` });
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
      alert("Yedek indirilirken bir hata oluÅŸtu.");
    }
  };

  const handleRestoreBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm('DÄ°KKAT: Bu iÅŸlem mevcut tÃ¼m verilerinizi (Firmalar, Tetkikler, Sevk GeÃ§miÅŸi vb.) SÄ°LECEK ve yedek dosyasÄ±ndakilerle deÄŸiÅŸtirecektir. Ä°ÅŸleme devam etmek istediÄŸinize emin misiniz?')) {
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
        
        if (!res.ok) throw new Error('Yedek yÃ¼kleme baÅŸarÄ±sÄ±z');
        
        alert("Yedek baÅŸarÄ±yla geri yÃ¼klendi! Sistem yenileniyor...");
        window.location.reload();
      } catch (err) {
        alert("Yedek geri yÃ¼klenirken hata oluÅŸtu veya geÃ§ersiz dosya biÃ§imi.");
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
        setPwdError(data.error || 'Åifre deÄŸiÅŸtirilemedi');
      } else {
        setPwdSuccess('Åifre baÅŸarÄ±yla deÄŸiÅŸtirildi.');
        setApiToken(data.token);
        sessionStorage.setItem('api_token', data.token);
        setOldPassword('');
        setNewPassword('');
      }
    } catch (err) {
      setPwdError('Bir hata oluÅŸtu');
    }
  };

  const handleTriggerUpdate = async () => {
    if (!window.confirm("YazÄ±lÄ±m sÃ¼rÃ¼mÃ¼nÃ¼ web Ã¼zerinden gÃ¼ncellemek istediÄŸinize emin misiniz? GÃ¼ncelleme iÅŸlemi sÄ±rasÄ±nda Git deposundaki en son kodlar Ã§ekilecek, paketler kurulacak ve sistem otomatik olarak yeniden derlenecektir. Bu iÅŸlem yaklaÅŸÄ±k 30-40 saniye sÃ¼rebilir.")) {
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
        setUpdateError(data.error || 'GÃ¼ncelleme hatasÄ± oluÅŸtu.');
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
      setUpdateError('Sunucu baÄŸlantÄ± hatasÄ± veya zaman aÅŸÄ±mÄ± yaÅŸandÄ±.');
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
          enableAdminOtp: enableAdminOtp,
        appPassword: appPassword
    });
    alert("Ayarlar gÃ¼ncellendi.");
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2000000) { // 2MB limit
          alert("Logo dosyasÄ± 2MB'dan kÃ¼Ã§Ã¼k olmalÄ±dÄ±r.");
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
          alert("Arka plan logo dosyasÄ± 2MB'dan kÃ¼Ã§Ã¼k olmalÄ±dÄ±r.");
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
        sendWhatsapp: iSendWhatsapp,
        whatsappTemplate: iWhatsappTemplate,
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
    setISendWhatsapp(false);
    setIWhatsappTemplate('SayÄ±n {hasta_adi}, {kurum_adi} kurumuna sevkiniz oluÅŸturulmuÅŸtur. Konum: {konum_linki}');
  };

  const handleEditInstitution = (inst: MedicalInstitution) => {
    setEditingInstitutionId(inst.id);
    setIName(inst.name);
    setIPhone(inst.phone || '');
    setIAddress(inst.address || '');
    setILocationUrl(inst.locationUrl || '');
    setISendWhatsapp(inst.sendWhatsapp || false);
    setIWhatsappTemplate(inst.whatsappTemplate || 'SayÄ±n {hasta_adi}, {kurum_adi} kurumuna sevkiniz oluÅŸturulmuÅŸtur. Konum: {konum_linki}');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleInstitutionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if(!iName) return;

    if (editingInstitutionId) {
      onUpdateInstitution({
        id: editingInstitutionId,
        sendWhatsapp: iSendWhatsapp,
        whatsappTemplate: iWhatsappTemplate,
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
    if (window.confirm(`SeÃ§ili ${selectedCompanyIds.length} firmayÄ± silmek istediÄŸinize emin misiniz?`)) {
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
    const headers = ["Firma AdÄ±", "Tehlike SÄ±nÄ±fÄ± (Az/Tehlikeli/Ã‡ok)", "Hekim AdÄ±", "Uzman AdÄ±", "Ã–deme (Nakit/Pos/Fatura)", "Tetkik KodlarÄ± (VirgÃ¼l ile)"];
    const exampleRow = ["Ã–rnek Metal A.Å.", "Tehlikeli", "Dr. Ahmet YÄ±lmaz", "Uzm. AyÅŸe Demir", "Fatura", "101, 103, 105"];
    const wsFirmalar = XLSX.utils.aoa_to_sheet([headers, exampleRow]);
    
    wsFirmalar['!cols'] = [
      { wch: 30 }, // Firma AdÄ±
      { wch: 25 }, // Tehlike
      { wch: 20 }, // Hekim
      { wch: 20 }, // Uzman
      { wch: 20 }, // Ã–deme
      { wch: 30 }  // Tetkik KodlarÄ±
    ];

    // Sheet 2: Tetkik Referans (Read-only reference)
    const refHeaders = ["Tetkik Kodu", "Tetkik AdÄ±", "SatÄ±ÅŸ FiyatÄ±", "Maliyet"];
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
    const headers = ["Firma AdÄ±", "Tehlike SÄ±nÄ±fÄ± (Az/Tehlikeli/Ã‡ok)", "Hekim AdÄ±", "Uzman AdÄ±", "Ã–deme (Nakit/Pos/Fatura)", "Tetkik KodlarÄ± (VirgÃ¼l ile)"];
    
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
    const refHeaders = ["Tetkik Kodu", "Tetkik AdÄ±"];
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
          if (hazardRaw.includes('Ã§ok') || hazardRaw.includes('cok')) hazard = HazardClass.VERY_DANGEROUS;
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

        alert(`${addedCount} adet yeni firma eklendi, ${updatedCount} adet firma gÃ¼ncellendi.`);
      } catch (error) {
        console.error("Excel okuma hatasÄ±:", error);
        alert("Dosya okunurken bir hata oluÅŸtu.");
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
        alert("Bu tetkik kodu zaten kullanÄ±lÄ±yor!");
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
          onClick={() => setActiveTab('whatsapp')}
          className={`px-6 py-4 text-center font-medium text-sm transition-colors whitespace-nowrap ${activeTab === 'whatsapp' ? 'bg-slate-900/50 text-blue-400 border-b-2 border-blue-500' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
        >
          WhatsApp Web
        </button>
        <button
          onClick={() => setActiveTab('institutions')}
          className={`px-6 py-4 text-center font-medium text-sm transition-colors whitespace-nowrap ${activeTab === 'institutions' ? 'bg-slate-900/50 text-blue-400 border-b-2 border-blue-500' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
        >
          AnlaÅŸmalÄ± Kurumlar
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
          YazÄ±lÄ±m GÃ¼ncelleme
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
                         <label className="block text-sm font-medium text-white">EKG Zorunluluk YaÅŸÄ±</label>
                         <p className="text-xs text-slate-400 mt-1">Bu yaÅŸ ve Ã¼zerindeki personel iÃ§in EKG tetkiki otomatik olarak seÃ§ilir.</p>
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
                        <span className="text-sm text-slate-400">YaÅŸ</span>
                      </div>
                   </div>

                   {/* Company Logo Upload */}
                   <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 p-4 bg-slate-800 rounded border border-slate-600">
                      <div className="flex-1">
                         <label className="block text-sm font-medium text-white">Firma Logosu</label>
                         <p className="text-xs text-slate-400 mt-1">Bu logo Z raporu Ã§Ä±ktÄ±sÄ±nda ve sol menÃ¼de kullanÄ±lacaktÄ±r.</p>
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
                             {!logo && <div className="absolute bottom-2 text-[10px] text-slate-500">YÃ¼kle</div>}
                          </div>
                          
                          {logo && (
                             <button 
                               type="button" 
                               onClick={handleRemoveLogo}
                               className="mt-2 text-xs text-red-400 hover:text-red-300 flex items-center"
                             >
                                <Trash2 className="w-3 h-3 mr-1" />
                                KaldÄ±r
                             </button>
                          )}
                      </div>
                   </div>

                   {/* Print Background Logo Upload */}
                   <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 p-4 bg-slate-800 rounded border border-slate-600">
                      <div className="flex-1">
                         <label className="block text-sm font-medium text-white">Ã‡Ä±ktÄ± Arka Plan Logosu (Filigran)</label>
                         <p className="text-xs text-slate-400 mt-1">Bu logo sevk kaÄŸÄ±dÄ± Ã§Ä±ktÄ±sÄ±nda arka planda silik (filigran) olarak gÃ¶rÃ¼necektir.</p>
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
                             {!printBgLogo && <div className="absolute bottom-2 text-[10px] text-slate-500">YÃ¼kle</div>}
                          </div>
                          
                          {printBgLogo && (
                             <button 
                               type="button" 
                               onClick={handleRemovePrintBgLogo}
                               className="mt-2 text-xs text-red-400 hover:text-red-300 flex items-center"
                             >
                                <Trash2 className="w-3 h-3 mr-1" />
                                KaldÄ±r
                             </button>
                          )}
                      </div>
                   </div>

                   {/* Auto Print Toggle */}
                   <div className="flex items-center justify-between p-4 bg-slate-800 rounded border border-slate-600">
                      <div>
                         <label className="block text-sm font-medium text-white">Otomatik YazdÄ±rma</label>
                         <p className="text-xs text-slate-400 mt-1">Yeni sevk kaydÄ± oluÅŸturulduÄŸunda otomatik olarak yazdÄ±rma ekranÄ±nÄ± aÃ§ar.</p>
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
                         <label className="block text-sm font-medium text-white">Ã‡Ä±ktÄ± Sayfa Boyutu</label>
                         <p className="text-xs text-slate-400 mt-1">Sevk kaÄŸÄ±dÄ± yazdÄ±rÄ±lÄ±rken kullanÄ±lacak kaÄŸÄ±t boyutu.</p>
                      </div>
                      <select
                          value={printPageSize}
                          onChange={(e) => setPrintPageSize(e.target.value as 'A4' | 'A5' | 'A6')}
                          className="bg-slate-900 border border-slate-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none"
                      >
                          <option value="A4">A4 (Standart)</option>
                          <option value="A5">A5 (YarÄ±m Sayfa)</option>
                          <option value="A6">A6 (Ã‡eyrek Sayfa)</option>
                      </select>
                   </div>

                   {/* END Auto Print & Print Size */}
                   {/* Security Settings */}
                   <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-slate-800 rounded border border-slate-600">
                      <div>
                         <label className="block text-sm font-medium text-white">Yönetici Paneli Koruması</label>
                         <p className="text-xs text-slate-400 mt-1">Kasa & Finans ve Ayarlar sekmelerine girerken WhatsApp üzerinden şifre (OTP) istensin.</p>
                      </div>
                      <label className="flex items-center space-x-2 cursor-pointer bg-slate-900 p-2 rounded-lg border border-slate-700">
                         <input 
                           type="checkbox" 
                           checked={enableAdminOtp}
                           onChange={(e) => setEnableAdminOtp(e.target.checked)}
                           className="w-4 h-4 rounded border-slate-600 text-blue-600 bg-slate-800"
                         />
                         <span className="text-sm text-white font-medium">OTP Koruması Açık</span>
                      </label>
                   </div>

                   <div className="flex justify-end pt-2">
                      <button type="submit" className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-colors shadow-lg shadow-blue-900/20">
                         <Save className="w-4 h-4" />
                         <span>AyarlarÄ± Kaydet</span>
                      </button>
                   </div>
                </form>
             </div>

             <div className="bg-slate-900/30 p-6 rounded-lg border border-slate-700 max-w-2xl mt-8">
                <div className="flex items-center mb-4">
                   <div className="p-2 bg-orange-500/10 rounded mr-3">
                      <Sliders className="w-5 h-5 text-orange-500" />
                   </div>
                   <h3 className="text-lg font-bold text-white">Sistem Åifresini DeÄŸiÅŸtir</h3>
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
                          <label className="block text-sm font-medium text-slate-400 mb-1">Mevcut Åifre</label>
                          <input 
                              type="password" 
                              value={oldPassword} 
                              onChange={(e) => setOldPassword(e.target.value)}
                              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white text-sm focus:ring-blue-500 outline-none" 
                              required
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-400 mb-1">Yeni Åifre</label>
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
                         <span>Åifreyi GÃ¼ncelle</span>
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
                        <h5 className="text-sm font-bold text-white">Toplu Firma YÃ¼kleme (Excel)</h5>
                        <p className="text-xs text-slate-400">Åablonu indirin, <strong>2. Sayfadaki tetkik kodlarÄ±na bakarak</strong> doldurun ve yÃ¼kleyin.</p>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                    <button 
                      onClick={downloadTemplate}
                      type="button"
                      className="flex items-center justify-center space-x-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-xs text-slate-300 transition-colors"
                    >
                        <FileDown className="w-4 h-4" />
                        <span>BoÅŸ Åablon Ä°ndir</span>
                    </button>
                    <button 
                      onClick={downloadCurrentCompaniesExcel}
                      type="button"
                      className="flex items-center justify-center space-x-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-xs text-blue-300 transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        <span>Mevcut Listeyi Ä°ndir (DÃ¼zenlemek iÃ§in)</span>
                    </button>
                    <label className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium cursor-pointer transition-colors shadow-lg shadow-blue-900/20">
                        <Upload className="w-4 h-4" />
                        <span>Verileri YÃ¼kle / GÃ¼ncelle</span>
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
                {editingCompanyId ? 'Firma Bilgilerini DÃ¼zenle' : 'Tek Firma Ekle'}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input required placeholder="Firma AdÄ±" value={cName} onChange={e => setCName(e.target.value)} className="bg-slate-800 border-slate-600 rounded px-3 py-2 text-white text-sm focus:ring-blue-500 outline-none" />
                <select value={cHazard} onChange={e => setCHazard(e.target.value as HazardClass)} className="bg-slate-800 border-slate-600 rounded px-3 py-2 text-white text-sm outline-none">
                  {Object.values(HazardClass).map(h => <option key={h} value={h}>{h}</option>)}
                </select>
                <input placeholder="Ä°ÅŸyeri Hekimi" value={cDoctor} onChange={e => setCDoctor(e.target.value)} className="bg-slate-800 border-slate-600 rounded px-3 py-2 text-white text-sm focus:ring-blue-500 outline-none" />
                <input placeholder="Ä°SG UzmanÄ±" value={cSpecialist} onChange={e => setCSpecialist(e.target.value)} className="bg-slate-800 border-slate-600 rounded px-3 py-2 text-white text-sm focus:ring-blue-500 outline-none" />
                
                {/* Forced Institution Dropdown */}
                <select 
                  value={cPreferredInst} 
                  onChange={e => setCPreferredInst(e.target.value)} 
                  className="bg-slate-800 border-slate-600 rounded px-3 py-2 text-white text-sm outline-none"
                >
                    <option value="">AnlaÅŸmalÄ± Kurum (SeÃ§iniz)</option>
                    <option value="">Serbest (Ä°stenilen yere gidebilir)</option>
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
                        <XCircle className="w-4 h-4 mr-1" /> VazgeÃ§
                    </button>
                )}
                <button 
                    type="submit" 
                    className={`${editingCompanyId ? 'bg-orange-600 hover:bg-orange-500' : 'bg-blue-600 hover:bg-blue-500'} text-white px-6 py-2 rounded text-sm font-bold shadow-lg transition-colors flex items-center`}
                >
                    {editingCompanyId ? <Save className="w-4 h-4 mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
                    {editingCompanyId ? 'GÃ¼ncelle' : 'Ekle'}
                </button>
              </div>
            </form>

            <div className="pt-4 border-t border-slate-700">
               <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input 
                    type="text" 
                    placeholder="Firma adÄ±, hekim veya uzman ara..." 
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
                    <span>TÃ¼mÃ¼nÃ¼ SeÃ§</span>
                 </button>
                 <span className="text-sm text-slate-400">| Toplam {filteredCompanies.length} Firma</span>
               </div>
               
               {selectedCompanyIds.length > 0 && (
                 <button 
                   onClick={handleBulkDelete}
                   className="flex items-center space-x-2 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/40 border border-red-500/30 text-red-400 rounded text-xs font-bold transition-all animate-pulse"
                 >
                   <Trash2 className="w-3.5 h-3.5" />
                   <span>SeÃ§ilenleri Sil ({selectedCompanyIds.length})</span>
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
                      <p className="text-xs text-slate-400">{company.assignedDoctor} â€¢ {company.assignedSpecialist}</p>
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
                        title="DÃ¼zenle"
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

        
        {activeTab === 'whatsapp' && (
          <div className="space-y-6 max-w-2xl">
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-sm">
               <div className="flex items-center space-x-3 mb-6">
                 <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500">
                    <Smartphone className="w-6 h-6" />
                 </div>
                 <div>
                    <h3 className="text-lg font-bold text-white">WhatsApp Web BaÄŸlantÄ±sÄ±</h3>
                    <p className="text-sm text-slate-400">Sistemin arka planda otomatik mesaj gÃ¶nderebilmesi iÃ§in telefonunuzu baÄŸlayÄ±n.</p>
                 </div>
               </div>
               
               <div className="bg-slate-950 p-6 rounded-lg border border-slate-800 text-center flex flex-col items-center">
                  {waReady ? (
                      <div className="space-y-4">
                          <div className="w-20 h-20 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
                              <Check className="w-10 h-10" />
                          </div>
                          <h4 className="text-xl font-bold text-emerald-400">WhatsApp BaÄŸlÄ±</h4>
                          <p className="text-slate-400 text-sm">Sistem aktif olarak mesaj gÃ¶nderebilir durumda.</p>
                          <button onClick={handleWaLogout} className="mt-4 px-6 py-2 bg-red-600/20 text-red-500 hover:bg-red-600/30 rounded-lg font-medium transition-colors">
                              BaÄŸlantÄ±yÄ± Kes
                          </button>
                      </div>
                  ) : waQr ? (
                      <div className="space-y-4">
                          <h4 className="text-md font-bold text-white">QR Kodu Okutun</h4>
                          <p className="text-slate-400 text-sm max-w-sm mx-auto">WhatsApp uygulamasÄ±nÄ± aÃ§Ä±n, "BaÄŸlÄ± Cihazlar" menÃ¼sÃ¼nden "Cihaz BaÄŸla" diyerek bu QR kodu okutun.</p>
                          <div className="p-4 bg-white rounded-xl inline-block mt-4">
                              <QRCodeSVG value={waQr} size={250} level="H" />
                          </div>
                      </div>
                  ) : (
                      <div className="space-y-4">
                          <div className="w-12 h-12 border-4 border-slate-700 border-t-emerald-500 rounded-full animate-spin mx-auto"></div>
                          <p className="text-slate-400">WhatsApp baÅŸlatÄ±lÄ±yor veya QR kod bekleniyor...</p>
                      </div>
                  )}
               </div>
            </div>
          </div>
        )}

        {activeTab === 'institutions' && (
          <div className="space-y-8">
             <form onSubmit={handleInstitutionSubmit} className="bg-slate-900/30 p-4 rounded-lg border border-slate-700 space-y-4">
                <h4 className="text-sm font-bold text-white flex items-center">
                  {editingInstitutionId ? <Edit2 className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                  {editingInstitutionId ? 'SaÄŸlÄ±k Kurumunu DÃ¼zenle' : 'SaÄŸlÄ±k Kurumu Ekle'}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <input required placeholder="Kurum AdÄ± (Ã–rn: Merkez Hastanesi)" value={iName} onChange={e => setIName(e.target.value)} className="bg-slate-800 border-slate-600 rounded px-3 py-2 text-white text-sm focus:ring-blue-500 outline-none" />
                   <input placeholder="Telefon / Ä°letiÅŸim" value={iPhone} onChange={e => setIPhone(e.target.value)} className="bg-slate-800 border-slate-600 rounded px-3 py-2 text-white text-sm focus:ring-blue-500 outline-none" />
                   <input placeholder="DetaylÄ± Adres Tarifi" value={iAddress} onChange={e => setIAddress(e.target.value)} className="bg-slate-800 border-slate-600 rounded px-3 py-2 text-white text-sm focus:ring-blue-500 outline-none" />
                   <input placeholder="Konum Linki (Google Maps vb.)" value={iLocationUrl} onChange={e => setILocationUrl(e.target.value)} className="bg-slate-800 border-slate-600 rounded px-3 py-2 text-white text-sm focus:ring-blue-500 outline-none" />
                   
                   <div className="md:col-span-2 mt-4 space-y-3 border-t border-slate-700/50 pt-4">
                     <label className="flex items-center space-x-2 cursor-pointer bg-slate-900/50 p-3 rounded-lg border border-slate-700 hover:bg-slate-800 transition-colors">
                       <input 
                         type="checkbox" 
                         checked={iSendWhatsapp}
                         onChange={(e) => setISendWhatsapp(e.target.checked)}
                         className="w-4 h-4 rounded border-slate-600 text-blue-600 focus:ring-blue-500 bg-slate-800"
                       />
                       <div className="flex flex-col">
                         <span className="text-sm font-bold text-slate-200">Personel Telefonuna WhatsApp MesajÄ± GÃ¶nder (Web)</span>
                         <span className="text-xs text-slate-400">Bu kurum seÃ§ilip sevk kaydedildiÄŸinde, doÄŸrudan WhatsApp Web'e yÃ¶nlendirerek konum ve sevk bilgisini atmaya yarar.</span>
                       </div>
                     </label>
                     
                     {iSendWhatsapp && (
                       <div className="pl-6">
                         <label className="text-[10px] text-slate-400 uppercase font-bold mb-1 block">WhatsApp Mesaj TaslaÄŸÄ±</label>
                         <textarea 
                           value={iWhatsappTemplate}
                           onChange={(e) => setIWhatsappTemplate(e.target.value)}
                           className="w-full bg-slate-800 border-slate-600 rounded px-3 py-2 text-slate-200 text-sm focus:ring-blue-500 outline-none min-h-[80px]"
                           placeholder="DeÄŸiÅŸkenler: {hasta_adi}, {tc_kimlik}, {dogum_tarihi}, {dogum_tarihi_bitisik}, {kurum_adi}, {konum_linki}"
                         />
                         <p className="text-xs text-slate-500 mt-1">KullanÄ±labilecek DeÄŸiÅŸkenler: <strong>{'{hasta_adi}'}</strong>, <strong>{'{tc_kimlik}'}</strong>, <strong>{'{dogum_tarihi}'}</strong>, <strong>{'{dogum_tarihi_bitisik}'}</strong>, <strong>{'{kurum_adi}'}</strong>, <strong>{'{konum_linki}'}</strong></p>
                       </div>
                     )}
                   </div>
                </div>
                <div className="flex justify-end space-x-3">
                  {editingInstitutionId && (
                    <button type="button" onClick={handleCancelInstitutionEdit} className="text-slate-400 hover:text-white px-4 py-2 rounded text-sm">VazgeÃ§</button>
                  )}
                  <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-sm">
                    {editingInstitutionId ? 'GÃ¼ncelle' : 'Ekle'}
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
                      <button onClick={() => handleEditInstitution(inst)} className="text-slate-500 hover:text-blue-400 p-1.5 hover:bg-blue-500/10 rounded transition-colors" title="DÃ¼zenle">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => onDeleteInstitution(inst.id)} className="text-slate-500 hover:text-red-400 p-1.5 hover:bg-red-500/10 rounded transition-colors" title="Sil">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                 </div>
               ))}
               {institutions.length === 0 && <p className="text-slate-500 text-sm col-span-2 text-center py-4">KayÄ±tlÄ± kurum bulunamadÄ±.</p>}
             </div>
          </div>
        )}

        {activeTab === 'exams' && (
          <div className="space-y-6">
             <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-xs text-blue-300 leading-relaxed flex items-start gap-2.5">
                <Sliders className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div>
                   <strong>Ä°pucu:</strong> Tetkiklerin adÄ±nÄ±, kodunu, satÄ±ÅŸ fiyatÄ±nÄ± veya maliyetini doÄŸrudan altÄ±sÄ±ra listesindeki kutulara tÄ±klayarak gÃ¼ncelleyebilirsiniz. YapÄ±lan deÄŸiÅŸiklikler otomatik kaydedilecektir. Tetkik ismi gÃ¼ncellendiÄŸinde, o tetkiki varsayÄ±lan olarak kullanan firmalar ile geÃ§miÅŸ sevk kayÄ±tlarÄ±ndaki tetkik isimleri de veri bÃ¼tÃ¼nlÃ¼ÄŸÃ¼nÃ¼ korumak iÃ§in otomatik olarak gÃ¼ncellenecektir.
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
                <input required placeholder="Tetkik AdÄ± (Ã–rn: PortÃ¶r)" value={eName} onChange={e => setEName(e.target.value)} className="flex-1 bg-slate-800 border-slate-600 rounded px-3 py-2 text-white text-sm focus:ring-blue-500 outline-none" />
                <input required type="number" placeholder="SatÄ±ÅŸ (TL)" value={ePrice} onChange={e => setEPrice(e.target.value)} className="w-full md:w-32 bg-slate-800 border-slate-600 rounded px-3 py-2 text-white text-sm focus:ring-blue-500 outline-none" />
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
                           title="Tetkik adÄ±nÄ± deÄŸiÅŸtirmek iÃ§in buraya tÄ±klayÄ±p yazabilirsiniz"
                           className="bg-transparent border-b border-transparent hover:border-slate-500 hover:bg-slate-800/40 focus:border-blue-500 focus:bg-slate-800 text-sm font-medium text-white px-1.5 py-0.5 rounded outline-none w-full transition-all"
                       />
                       <span className="text-[10px] text-slate-500 block pl-1.5">Maliyet: {exam.cost ? `â‚º${exam.cost}` : '-'}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex flex-col space-y-1 items-end">
                        <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 text-[10px]">SatÄ±ÅŸ â‚º</span>
                        <input 
                            type="number" 
                            defaultValue={exam.price} 
                            onBlur={(e) => handleUpdateExamField(exam.id, 'price', e.target.value)}
                            className="w-20 pl-8 pr-2 py-1 bg-slate-800 border border-slate-600 rounded text-xs text-white text-right focus:border-blue-500 outline-none"
                        />
                        </div>
                        <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-red-500/50 text-[10px]">Mal. â‚º</span>
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
                   Sistemdeki tÃ¼m verileri (firmalar, tetkikler, kurumlar, kasa hareketleri vb.) JSON formatÄ±nda bilgisayarÄ±nÄ±za indirebilir veya daha Ã¶nce aldÄ±ÄŸÄ±nÄ±z bir manuel yedeÄŸi sisteme doÄŸrudan geri yÃ¼kleyebilirsiniz.
                </p>

                <div className="flex flex-wrap gap-4 mt-6">
                    <button 
                        onClick={handleDownloadBackup}
                        className="flex items-center justify-center space-x-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white px-5 py-3 rounded-lg text-sm font-bold transition-colors shadow-lg cursor-pointer"
                    >
                        <Download className="w-4 h-4" />
                        <span>TÃ¼m Verileri Bilgisayara Ä°ndir</span>
                    </button>
                    
                    <label className="flex items-center justify-center space-x-2 bg-orange-600 hover:bg-orange-500 border border-orange-500/50 text-white px-5 py-3 rounded-lg text-sm font-bold transition-colors shadow-lg shadow-orange-900/20 cursor-pointer">
                        <Upload className="w-4 h-4" />
                        <span>Dosyadan Geri YÃ¼kle</span>
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
                        <h4 className="text-sm font-bold text-red-400">Ã–nemli UyarÄ±</h4>
                        <p className="text-xs text-red-300 mt-1 leading-relaxed">
                            YedeÄŸi geri yÃ¼klediÄŸinizde <strong>mevcut sistemdeki tÃ¼m veriler tamamen silinir</strong> ve yerine yeni dosyadaki veriler yazÄ±lÄ±r. Bu iÅŸlem geri alÄ±namaz.
                        </p>
                    </div>
                </div>
             </div>

             {/* SECTION 2: TELEGRAM BOT NOTIFICATION INTEGRATION */}
             <div className="bg-slate-900/40 p-6 rounded-lg border border-slate-700">
                <div className="flex items-center justify-between mb-4">
                   <div className="flex items-center">
                      <div className="p-2 bg-sky-500/10 rounded mr-3">
                         <Send className="w-5 h-5 text-sky-400" />
                      </div>
                      <div>
                         <h3 className="text-lg font-bold text-white flex items-center">
                            Telegram Bot Bildirim Entegrasyonu
                            <span className="ml-2 text-xs text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full font-normal border border-sky-500/20">AnlÄ±k Raporlama</span>
                         </h3>
                      </div>
                   </div>
                   
                   <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                         type="checkbox" 
                         className="sr-only peer" 
                         checked={isTelegramEnabled}
                         onChange={(e) => setIsTelegramEnabled(e.target.checked)}
                      />
                      <div className="w-9 h-5 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-500 peer-checked:after:bg-white"></div>
                      <span className="ml-2 text-xs font-semibold text-slate-300">
                         {isTelegramEnabled ? 'Aktif' : 'Deaktif'}
                      </span>
                   </label>
                </div>

                <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                   Her sevk (tetkik) iÅŸlemi yapÄ±ldÄ±ÄŸÄ±nda veya gÃ¼ncellendiÄŸinde tÃ¼m sevk detaylarÄ±nÄ± (Ã§alÄ±ÅŸan, firma, sevk edilen tetkikler vb.) anÄ±nda Ã¶zel Telegram botunuza bildirim olarak gÃ¶nderin.
                </p>

                <form onSubmit={handleSaveTelegramSettings} className="space-y-4">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                         <label className="text-xs font-bold text-slate-300 block">Telegram Bot Token (API Token)</label>
                         <input
                            type="text"
                            placeholder="Ã–rn: 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-white focus:ring-2 focus:ring-sky-500 outline-none transition-all placeholder-slate-600 font-mono"
                            value={telegramBotToken}
                            onChange={(e) => setTelegramBotToken(e.target.value)}
                         />
                      </div>

                      <div className="space-y-2">
                         <label className="text-xs font-bold text-slate-300 block">AlÄ±cÄ± Sohbet KimliÄŸi (Chat ID veya Grup ID)</label>
                         <input
                            type="text"
                            placeholder="Ã–rn: 987654321 veya -100123456789"
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-white focus:ring-2 focus:ring-sky-500 outline-none transition-all placeholder-slate-600 font-mono"
                            value={telegramChatId}
                            onChange={(e) => setTelegramChatId(e.target.value)}
                         />
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-800/60 pt-4">
                      <div className="space-y-2">
                         <label className="text-xs font-bold text-slate-300 block flex items-center">
                            <Clock className="w-3.5 h-3.5 text-sky-400 mr-1.5" />
                            Otomatik Raporlama Periyodu - 1
                         </label>
                         <select
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-white focus:ring-2 focus:ring-sky-500 outline-none transition-all cursor-pointer"
                            value={telegramReportPeriod}
                            onChange={(e) => setTelegramReportPeriod(e.target.value as 'none' | 'daily' | 'weekly' | 'monthly_custom')}
                         >
                            <option value="none">Otomatik Rapor GÃ¶nderme (Devre DÄ±ÅŸÄ±)</option>
                            <option value="daily">GÃ¼nlÃ¼k Excel Raporu GÃ¶nder</option>
                            <option value="weekly">HaftalÄ±k Excel Raporu GÃ¶nder (Her Pazar)</option>
                            <option value="monthly_custom">Ã–zel AylÄ±k Periyot Raporu GÃ¶nder (Belirli GÃ¼nler ArasÄ±)</option>
                         </select>
                      </div>

                      {telegramReportPeriod !== 'none' && (
                         <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-300 block flex items-center">
                               <Clock className="w-3.5 h-3.5 text-sky-400 mr-1.5" />
                               Rapor GÃ¶nderim Saati - 1
                            </label>
                            <select
                               className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-white focus:ring-2 focus:ring-sky-500 outline-none transition-all cursor-pointer font-mono"
                               value={telegramReportHour}
                               onChange={(e) => setTelegramReportHour(parseInt(e.target.value, 10))}
                            >
                               {Array.from({ length: 24 }).map((_, i) => (
                                  <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
                               ))}
                            </select>
                         </div>
                      )}
                   </div>
                   <p className="text-slate-500 text-[10px] leading-relaxed mt-1 block">
                      * Otomatik raporlama aktif edildiÄŸinde, sistem o dÃ¶neme ait sevk kayÄ±tlarÄ±nÄ± ve kasa hareketlerini Ã¶zetleyen detaylÄ± bir Excel (.xlsx) belgesini Telegram botu Ã¼zerinden otomatik olarak gÃ¶nderir.
                   </p>

                    {telegramReportPeriod === 'monthly_custom' && (
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-800/60 pt-4">
                          <div className="space-y-2">
                             <label className="text-xs font-bold text-slate-300 block">
                                DÃ¶nem BaÅŸlangÄ±Ã§ GÃ¼nÃ¼ (Her AyÄ±n GÃ¼nÃ¼)
                             </label>
                             <div className="flex items-center space-x-2">
                                <input
                                   type="number"
                                   min={1}
                                   max={28}
                                   className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-white focus:ring-2 focus:ring-sky-500 outline-none transition-all font-mono"
                                   value={telegramCustomReportStartDay}
                                   onChange={(e) => {
                                      let val = parseInt(e.target.value, 10);
                                      if (isNaN(val)) val = 20;
                                      if (val < 1) val = 1;
                                      if (val > 28) val = 28;
                                      setTelegramCustomReportStartDay(val);
                                   }}
                                />
                                <span className="text-slate-400 text-xs shrink-0">. GÃ¼nÃ¼</span>
                             </div>
                          </div>
                          <div className="space-y-2">
                             <label className="text-xs font-bold text-slate-300 block">
                                DÃ¶nem BitiÅŸ GÃ¼nÃ¼ (Her AyÄ±n GÃ¼nÃ¼)
                             </label>
                             <div className="flex items-center space-x-2">
                                <input
                                   type="number"
                                   min={1}
                                   max={28}
                                   className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-white focus:ring-2 focus:ring-sky-500 outline-none transition-all font-mono"
                                   value={telegramCustomReportEndDay}
                                   onChange={(e) => {
                                      let val = parseInt(e.target.value, 10);
                                      if (isNaN(val)) val = 19;
                                      if (val < 1) val = 1;
                                      if (val > 28) val = 28;
                                      setTelegramCustomReportEndDay(val);
                                   }}
                                />
                                <span className="text-slate-400 text-xs shrink-0">. GÃ¼nÃ¼</span>
                             </div>
                          </div>
                          <p className="col-span-1 md:col-span-2 text-[10px] text-slate-400 leading-relaxed">
                             Bu ayar ile her ayÄ±n belirtilen gÃ¼nlerinde otomatik olarak, bir Ã¶nceki ayÄ±n <b>{telegramCustomReportStartDay}.</b> gÃ¼nÃ¼ ile bu ayÄ±n <b>{telegramCustomReportEndDay}.</b> gÃ¼nÃ¼ arasÄ±ndaki tÃ¼m kayÄ±tlarÄ± kapsayan Excel raporu gÃ¶nderilecektir. (Ã–rn: her ayÄ±n {telegramCustomReportStartDay}'sinden diÄŸer ayÄ±n {telegramCustomReportEndDay}'sine).
                          </p>
                       </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-800/60 pt-4">
                       <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-300 block flex items-center">
                             <Clock className="w-3.5 h-3.5 text-sky-400 mr-1.5" />
                             Otomatik Excel Raporlama Periyodu - 2
                          </label>
                          <select
                             className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-white focus:ring-2 focus:ring-sky-500 outline-none transition-all cursor-pointer"
                             value={telegramReportPeriod2}
                             onChange={(e) => setTelegramReportPeriod2(e.target.value as 'none' | 'daily' | 'weekly' | 'monthly_custom')}
                          >
                             <option value="none">Otomatik Rapor GÃ¶nderme (Devre DÄ±ÅŸÄ±)</option>
                             <option value="daily">GÃ¼nlÃ¼k Excel Raporu GÃ¶nder</option>
                             <option value="weekly">HaftalÄ±k Excel Raporu GÃ¶nder (Her Pazar)</option>
                             <option value="monthly_custom">Ã–zel AylÄ±k Periyot Raporu GÃ¶nder (Belirli GÃ¼nler ArasÄ±)</option>
                          </select>
                       </div>

                       {telegramReportPeriod2 !== 'none' && (
                          <div className="space-y-2">
                             <label className="text-xs font-bold text-slate-300 block flex items-center">
                                <Clock className="w-3.5 h-3.5 text-sky-400 mr-1.5" />
                                Rapor GÃ¶nderim Saati - 2
                             </label>
                             <select
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-white focus:ring-2 focus:ring-sky-500 outline-none transition-all cursor-pointer font-mono"
                                value={telegramReportHour2}
                                onChange={(e) => setTelegramReportHour2(parseInt(e.target.value, 10))}
                             >
                                {Array.from({ length: 24 }).map((_, i) => (
                                   <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
                                ))}
                             </select>
                          </div>
                       )}
                    </div>
                    <p className="text-slate-500 text-[10px] leading-relaxed mt-1 block">
                       * Ä°kinci bir baÄŸÄ±msÄ±z raporlama periyodu tanÄ±mlayarak (Ã¶rneÄŸin hem haftalÄ±k hem aylÄ±k) aynÄ± anda iki farklÄ± periyotta rapor alabilirsiniz.
                    </p>

                    {telegramReportPeriod2 === 'monthly_custom' && (
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-800/60 pt-4">
                          <div className="space-y-2">
                             <label className="text-xs font-bold text-slate-300 block">
                                DÃ¶nem BaÅŸlangÄ±Ã§ GÃ¼nÃ¼ - 2 (Her AyÄ±n GÃ¼nÃ¼)
                             </label>
                             <div className="flex items-center space-x-2">
                                <input
                                   type="number"
                                   min={1}
                                   max={28}
                                   className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-white focus:ring-2 focus:ring-sky-500 outline-none transition-all font-mono"
                                   value={telegramCustomReportStartDay2}
                                   onChange={(e) => {
                                      let val = parseInt(e.target.value, 10);
                                      if (isNaN(val)) val = 20;
                                      if (val < 1) val = 1;
                                      if (val > 28) val = 28;
                                      setTelegramCustomReportStartDay2(val);
                                   }}
                                />
                                <span className="text-slate-400 text-xs shrink-0">. GÃ¼nÃ¼</span>
                             </div>
                          </div>
                          <div className="space-y-2">
                             <label className="text-xs font-bold text-slate-300 block">
                                DÃ¶nem BitiÅŸ GÃ¼nÃ¼ - 2 (Her AyÄ±n GÃ¼nÃ¼)
                             </label>
                             <div className="flex items-center space-x-2">
                                <input
                                   type="number"
                                   min={1}
                                   max={28}
                                   className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-white focus:ring-2 focus:ring-sky-500 outline-none transition-all font-mono"
                                   value={telegramCustomReportEndDay2}
                                   onChange={(e) => {
                                      let val = parseInt(e.target.value, 10);
                                      if (isNaN(val)) val = 19;
                                      if (val < 1) val = 1;
                                      if (val > 28) val = 28;
                                      setTelegramCustomReportEndDay2(val);
                                   }}
                                />
                                <span className="text-slate-400 text-xs shrink-0">. GÃ¼nÃ¼</span>
                             </div>
                          </div>
                          <p className="col-span-1 md:col-span-2 text-[10px] text-slate-400 leading-relaxed">
                             Bu ayar ile her ayÄ±n belirtilen gÃ¼nlerinde otomatik olarak, bir Ã¶nceki ayÄ±n <b>{telegramCustomReportStartDay2}.</b> gÃ¼nÃ¼ ile bu ayÄ±n <b>{telegramCustomReportEndDay2}.</b> gÃ¼nÃ¼ arasÄ±ndaki tÃ¼m kayÄ±tlarÄ± kapsayan Excel raporu gÃ¶nderilecektir. (Ã–rn: her ayÄ±n {telegramCustomReportStartDay2}'sinden diÄŸer ayÄ±n {telegramCustomReportEndDay2}'sine).
                          </p>
                       </div>
                    )}

                   <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
                      <p className="font-semibold text-slate-300">ğŸ’¡ NasÄ±l Kurulur?</p>
                      <p>1. Telegram'da <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">@BotFather</a> aramasÄ± yapÄ±n ve <code className="bg-slate-900 px-1 py-0.5 rounded text-sky-300 font-mono">/newbot</code> komutuyla bir bot oluÅŸturup <b>Token</b> deÄŸerini kopyalayÄ±n.</p>
                      <p>2. Botunuza <code className="bg-slate-900 px-1 py-0.5 rounded text-sky-300 font-mono">/start</code> deyin veya kurye bildirim botunu bir gruba ekleyin.</p>
                      <p>3. Kendi Chat ID'nizi veya Grubun Chat ID'sini Ã¶ÄŸrenmek iÃ§in <a href="https://t.me/userinfobot" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">@userinfobot</a> gibi bir botu kullanÄ±n.</p>
                   </div>

                   <div className="flex justify-between items-center pt-2">
                      <button
                         type="button"
                         onClick={handleTestTelegramBot}
                         className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sky-400 hover:text-sky-300 px-4 py-2 rounded-lg font-bold transition-all cursor-pointer flex items-center space-x-2"
                      >
                         <Bell className="w-4 h-4" />
                         <span>Telegram Botu Test Et</span>
                      </button>

                      <button
                         type="submit"
                         className="bg-sky-600 hover:bg-sky-500 text-white font-bold px-5 py-2 rounded-lg text-sm transition-colors cursor-pointer flex items-center space-x-2"
                      >
                         <Save className="w-4 h-4" />
                         <span>Telegram AyarlarÄ±nÄ± Kaydet</span>
                      </button>
                   </div>
                </form>

                {telegramTestStatus.type !== 'idle' && (
                   <div className={`mt-3 p-3 rounded text-xs leading-relaxed ${
                      telegramTestStatus.type === 'success' 
                      ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' 
                      : telegramTestStatus.type === 'loading'
                      ? 'bg-sky-500/10 border border-sky-500/20 text-sky-400'
                      : 'bg-red-500/10 border border-red-500/30 text-red-400'
                   }`}>
                      {telegramTestStatus.type === 'loading' && <RefreshCw className="inline-block w-3.5 h-3.5 animate-spin mr-2" />}
                      {telegramTestStatus.message}
                   </div>
                )}

                {/* SECTION: INSTANT EXCEL REPORT SENDING */}
                <div className="mt-6 pt-6 border-t border-slate-800 space-y-4">
                   <div className="flex items-center space-x-2">
                      <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                      <h4 className="text-sm font-bold text-white">AnlÄ±k Excel Raporu GÃ¶nder (Åimdi Raporla)</h4>
                   </div>
                   <p className="text-slate-400 text-xs leading-relaxed">
                      Sistemdeki tÃ¼m sevk hareketleri, tetkik Ã¼cretleri ve kasa durumunu anlÄ±k olarak derleyip bir Excel belgesi (.xlsx) olarak Telegram botunuza gÃ¶nderin:
                   </p>

                   <div className="flex flex-wrap gap-2">
                      <button
                         type="button"
                         onClick={() => handleSendTelegramReportNow('daily')}
                         disabled={telegramSendStatus.type === 'loading'}
                         className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 disabled:opacity-50"
                      >
                         <FileSpreadsheet className="w-3.5 h-3.5" />
                         <span>GÃ¼nlÃ¼k Raporu GÃ¶nder</span>
                      </button>

                      <button
                         type="button"
                         onClick={() => handleSendTelegramReportNow('weekly')}
                         disabled={telegramSendStatus.type === 'loading'}
                         className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 disabled:opacity-50"
                      >
                         <FileSpreadsheet className="w-3.5 h-3.5" />
                         <span>HaftalÄ±k Raporu GÃ¶nder</span>
                      </button>

                      <button
                         type="button"
                         onClick={() => handleSendTelegramReportNow('monthly_custom')}
                          disabled={telegramSendStatus.type === 'loading'}
                          className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 disabled:opacity-50"
                       >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          <span>Ã–zel AylÄ±k Raporu GÃ¶nder ({telegramCustomReportDay}'den {telegramCustomReportDay}'ye)</span>
                       </button>

                       <button
                          type="button"
                          onClick={() => handleSendTelegramReportNow('all')}
                         disabled={telegramSendStatus.type === 'loading'}
                         className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 disabled:opacity-50"
                      >
                         <FileSpreadsheet className="w-3.5 h-3.5" />
                         <span>TÃ¼m Zamanlar Raporunu GÃ¶nder</span>
                      </button>
                   </div>

                   {telegramSendStatus.type !== 'idle' && (
                      <div className={`p-3 rounded text-xs leading-relaxed ${
                         telegramSendStatus.type === 'success' 
                         ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' 
                         : telegramSendStatus.type === 'loading'
                         ? 'bg-sky-500/10 border border-sky-500/20 text-sky-400'
                         : 'bg-red-500/10 border border-red-500/30 text-red-400'
                      }`}>
                         {telegramSendStatus.type === 'loading' && <RefreshCw className="inline-block w-3.5 h-3.5 animate-spin mr-2" />}
                         {telegramSendStatus.message}
                      </div>
                   )}
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
                   <h3 className="text-lg font-bold text-white">YazÄ±lÄ±m SÃ¼rÃ¼m GÃ¼ncelleme</h3>
                </div>
                
                <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                  Sunucuda kurulu olan <strong>OSGB Tetkik Sevk Takip Sistemi</strong> yazÄ±lÄ±mÄ±nÄ± doÄŸrudan GitHub veya kurulduÄŸu repo Ã¼zerinden en son sÃ¼rÃ¼me gÃ¼venli bir ÅŸekilde gÃ¼ncelleyebilirsiniz. Bu iÅŸlem terminale baÄŸlanÄ±p manual git/build komutlarÄ± Ã§alÄ±ÅŸtÄ±rma zorunluluÄŸunu ortadan kaldÄ±rÄ±r.
                </p>

                {updateStatus === 'idle' && (
                  <div className="bg-slate-800 p-4 border border-slate-700 rounded-lg mb-6">
                    <h5 className="font-bold text-white text-xs mb-2 uppercase tracking-wide">YÃ¼rÃ¼tÃ¼lecek Ä°ÅŸlemler SÄ±rasÄ±yla:</h5>
                    <ul className="text-xs text-slate-300 space-y-2 list-decimal list-inside pl-1">
                      <li>Uzak Git deposundan (git pull) en son kaynak kodlar Ã§ekilir.</li>
                      <li>BaÄŸÄ±mlÄ±lÄ±klar (npm install) kontrol edilir ve gÃ¼ncellenir.</li>
                      <li>Proje Ã¼retim modunda (npm run build) sÄ±fÄ±rdan yeniden derlenir.</li>
                      <li>Mevcut sunucu yeni kararlÄ± dosyalarla otomatik yeniden baÅŸlatÄ±lÄ±r.</li>
                    </ul>
                  </div>
                )}

                {updateStatus === 'updating' && (
                  <div className="bg-slate-900/50 p-6 border border-blue-500/30 rounded-lg mb-6 space-y-4">
                     <div className="flex items-center space-x-3 text-blue-400">
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span className="text-sm font-semibold">GÃ¼ncelleme yÃ¼rÃ¼tÃ¼lÃ¼yor, lÃ¼tfen bekleyiniz...</span>
                     </div>
                     <p className="text-xs text-slate-400">
                       Bu iÅŸlem internet hÄ±zÄ±na ve sunucu kaynaklarÄ±na baÄŸlÄ± olarak 15-45 saniye sÃ¼rebilir. LÃ¼tfen sayfayÄ± kapatmayÄ±n veya yenilemeyin.
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
                        <span className="text-sm font-bold">Harika! YazÄ±lÄ±m BaÅŸarÄ±yla GÃ¼ncellendi.</span>
                     </div>
                     <p className="text-xs text-emerald-300 leading-relaxed">
                       TÃ¼m gÃ¼ncellemeler baÅŸarÄ±yla sunucuya kuruldu, yeni build baÅŸarÄ±yla oluÅŸturuldu ve sunucu servis arka planÄ±nda yeniden baÅŸlatÄ±ldÄ±. TarayÄ±cÄ±nÄ±z birkaÃ§ saniye iÃ§inde otomatik olarak taze sayfayÄ± yÃ¼kleyecektir...
                     </p>
                  </div>
                )}

                {updateStatus === 'error' && (
                  <div className="bg-red-500/10 p-6 border border-red-500/30 rounded-lg mb-6 space-y-3">
                     <div className="flex items-center space-x-3 text-red-400">
                        <AlertTriangle className="w-5 h-5 text-red-400 bg-red-500/20 rounded p-0.5" />
                        <span className="text-sm font-bold">GÃ¼ncelleme SÄ±rasÄ±nda Hata OluÅŸtu!</span>
                     </div>
                     <p className="text-xs text-red-300 font-medium">
                       Hata MesajÄ±: {updateError}
                     </p>
                     {updateDetails && (
                       <pre className="text-[10px] p-3 bg-black/40 border border-red-500/10 rounded text-red-400 font-mono max-h-40 overflow-auto whitespace-pre-wrap leading-relaxed">
                         {updateDetails}
                       </pre>
                     )}
                     <div className="pt-2">
                        <p className="text-[11px] text-slate-400">
                          Not: EÄŸer yerel deÄŸiÅŸiklikler yaptÄ±ysanÄ±z git pull Ã§akÄ±ÅŸma yapmÄ±ÅŸ olabilir veya sunucu aÄŸ baÄŸlantÄ±sÄ±nda bir problem oluÅŸmuÅŸ olabilir.
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
                         <span>SÃ¼rÃ¼mÃ¼ Resmi Repodan Åimdi GÃ¼ncelle</span>
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
