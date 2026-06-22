/*
 * Project: OSGB Tetkik Takip Sistemi
 * Copyright (C) 2026 szgn_emin
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License.
 */
import { useState, useEffect } from 'react';
import { Referral, Company, ExamDefinition, SafeTransaction, MedicalInstitution, AppSettings } from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

let API_TOKEN = '';

export function setApiToken(token: string) {
  API_TOKEN = token;
}

export function getApiToken() {
  return API_TOKEN;
}

const fetchWithToken = async (url: string, options: RequestInit = {}) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as object),
  };
  
  if (API_TOKEN) {
    headers['Authorization'] = `Bearer ${API_TOKEN}`;
  }

  const baseUrl = import.meta.env.BASE_URL || '/';
  const finalUrl = url.startsWith('/') ? `${baseUrl}${url.slice(1)}` : url;

  const res = await fetch(finalUrl, { ...options, headers });
  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('Unauthorized');
    }
    throw new Error('API Error');
  }
  return res.json();
};

export function useServerData(isAuthenticated: boolean) {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [exams, setExams] = useState<ExamDefinition[]>([]);
  const [institutions, setInstitutions] = useState<MedicalInstitution[]>([]);
  const [transactions, setTransactions] = useState<SafeTransaction[]>([]);
  const [appSettings, setAppSettings] = useState<AppSettings>({ ekgLimitAge: 40, autoPrintReferral: true });
  const [loading, setLoading] = useState(true);

  // Function to reload data with auto-backup & silent restoration safety net
  const loadData = async () => {
    if (!isAuthenticated) return;
    try {
      const data = await fetchWithToken('/api/data');
      
      const serverReferrals = data.referrals || [];
      const serverCompanies = data.companies || [];
      const serverExams = data.exams || [];
      const serverInstitutions = data.institutions || [];
      const serverTransactions = data.transactions || [];
      const serverSettings = data.appSettings || { ekgLimitAge: 40, autoPrintReferral: true };

      const hasServerData = serverReferrals.length > 0 || serverCompanies.length > 0 || serverExams.length > 0 || serverInstitutions.length > 0;

      // Evaluate browser's auto backup
      const localBackupStr = localStorage.getItem('osgb_auto_backup');
      if (!hasServerData && localBackupStr) {
        try {
          const localBackup = JSON.parse(localBackupStr);
          const hasLocalData = (localBackup.referrals && localBackup.referrals.length > 0) ||
                               (localBackup.companies && localBackup.companies.length > 0) ||
                               (localBackup.exams && localBackup.exams.length > 0) ||
                               (localBackup.institutions && localBackup.institutions.length > 0);
          
          if (hasLocalData) {
            console.log("Sunucu verisi boş/sıfırlanmış tespit edildi, tarayıcı yedeği otomatik yükleniyor...");
            await fetchWithToken('/api/backup/restore', {
              method: 'POST',
              body: JSON.stringify(localBackup)
            });
            // Reload fresh from server
            const freshData = await fetchWithToken('/api/data');
            setReferrals(freshData.referrals || []);
            setCompanies(freshData.companies || []);
            setExams(freshData.exams || []);
            setInstitutions(freshData.institutions || []);
            setTransactions(freshData.transactions || []);
            if (freshData.appSettings) {
              setAppSettings(freshData.appSettings);
            }
            return;
          }
        } catch (backupErr) {
          console.error("Otomatik yedek yükleme sırasında hata oluştu:", backupErr);
        }
      }

      // Standard load paths
      setReferrals(serverReferrals);
      setCompanies(serverCompanies);
      setExams(serverExams);
      setInstitutions(serverInstitutions);
      setTransactions(serverTransactions);
      setAppSettings(serverSettings);

      // Save local backup whenever server is successfully loaded
      localStorage.setItem('osgb_auto_backup', JSON.stringify({
        referrals: serverReferrals,
        companies: serverCompanies,
        exams: serverExams,
        institutions: serverInstitutions,
        transactions: serverTransactions,
        appSettings: serverSettings
      }));

    } catch (e) {
      console.error(e);
      // Auto-logout on unauthorized
      if (e instanceof Error && e.message === 'Unauthorized') {
        setApiToken('');
        sessionStorage.removeItem('api_token');
        window.location.reload();
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
      
      // Simple polling for updates
      const interval = setInterval(loadData, 10000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  return { referrals, companies, exams, institutions, transactions, appSettings, loading, reloadData: loadData };
}

// Write functions
export const saveReferralToDb = async (referral: Referral) => {
  await fetchWithToken('/api/data/referrals/save', { method: 'POST', body: JSON.stringify(referral) });
};

export const deleteReferralFromDb = async (id: string) => {
  await fetchWithToken('/api/data/referrals/delete', { method: 'POST', body: JSON.stringify({ id }) });
};

export const saveCompanyToDb = async (company: Company) => {
  await fetchWithToken('/api/data/companies/save', { method: 'POST', body: JSON.stringify(company) });
};

export const deleteCompanyFromDb = async (id: string) => {
  await fetchWithToken('/api/data/companies/delete', { method: 'POST', body: JSON.stringify({ id }) });
};

export const saveExamToDb = async (exam: ExamDefinition) => {
  await fetchWithToken('/api/data/exams/save', { method: 'POST', body: JSON.stringify(exam) });
};

export const deleteExamFromDb = async (id: string) => {
  await fetchWithToken('/api/data/exams/delete', { method: 'POST', body: JSON.stringify({ id }) });
};

export const saveInstitutionToDb = async (inst: MedicalInstitution) => {
  await fetchWithToken('/api/data/institutions/save', { method: 'POST', body: JSON.stringify(inst) });
};

export const deleteInstitutionFromDb = async (id: string) => {
  await fetchWithToken('/api/data/institutions/delete', { method: 'POST', body: JSON.stringify({ id }) });
};

export const saveTransactionToDb = async (tx: SafeTransaction) => {
  await fetchWithToken('/api/data/transactions/save', { method: 'POST', body: JSON.stringify(tx) });
};

export const deleteTransactionFromDb = async (id: string) => {
  await fetchWithToken('/api/data/transactions/delete', { method: 'POST', body: JSON.stringify({ id }) });
};

export const saveSettingsToDb = async (settings: AppSettings) => {
  await fetchWithToken('/api/data/appSettings/save', { method: 'POST', body: JSON.stringify(settings) });
};
