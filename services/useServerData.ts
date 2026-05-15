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

  const res = await fetch(url, { ...options, headers });
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

  // Function to reload data
  const loadData = async () => {
    if (!isAuthenticated) return;
    try {
      const data = await fetchWithToken('/api/data');
      setReferrals(data.referrals || []);
      setCompanies(data.companies || []);
      setExams(data.exams || []);
      setInstitutions(data.institutions || []);
      setTransactions(data.transactions || []);
      if (data.appSettings) {
        setAppSettings(data.appSettings);
      }
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
