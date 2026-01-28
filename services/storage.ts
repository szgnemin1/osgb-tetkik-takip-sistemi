import { Referral, Company, ExamDefinition, SafeTransaction, MedicalInstitution, AppSettings } from '../types';

const STORAGE_KEY_REFERRALS = 'osgb_referrals_v1';
const STORAGE_KEY_COMPANIES = 'osgb_companies_v1';
const STORAGE_KEY_EXAMS = 'osgb_exams_v1';
const STORAGE_KEY_TRANSACTIONS = 'osgb_transactions_v1';
const STORAGE_KEY_INSTITUTIONS = 'osgb_institutions_v1';
const STORAGE_KEY_SETTINGS = 'osgb_settings_v1';

// Referrals
export const loadReferrals = (): Referral[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY_REFERRALS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    return [];
  }
};
export const saveReferrals = (data: Referral[]) => localStorage.setItem(STORAGE_KEY_REFERRALS, JSON.stringify(data));

// Companies
export const loadCompanies = (defaults: Company[] = []): Company[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY_COMPANIES);
    return data ? JSON.parse(data) : defaults;
  } catch (error) {
    return defaults;
  }
};
export const saveCompanies = (data: Company[]) => localStorage.setItem(STORAGE_KEY_COMPANIES, JSON.stringify(data));

// Exams
export const loadExams = (defaults: ExamDefinition[] = []): ExamDefinition[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY_EXAMS);
    return data ? JSON.parse(data) : defaults;
  } catch (error) {
    return defaults;
  }
};
export const saveExams = (data: ExamDefinition[]) => localStorage.setItem(STORAGE_KEY_EXAMS, JSON.stringify(data));

// Institutions
export const loadInstitutions = (defaults: MedicalInstitution[] = []): MedicalInstitution[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY_INSTITUTIONS);
    return data ? JSON.parse(data) : defaults;
  } catch (error) {
    return defaults;
  }
};
export const saveInstitutions = (data: MedicalInstitution[]) => localStorage.setItem(STORAGE_KEY_INSTITUTIONS, JSON.stringify(data));

// Safe Transactions
export const loadTransactions = (): SafeTransaction[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    return [];
  }
};
export const saveTransactions = (data: SafeTransaction[]) => localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(data));

// App Settings
export const loadAppSettings = (): AppSettings => {
  try {
    const data = localStorage.getItem(STORAGE_KEY_SETTINGS);
    return data ? JSON.parse(data) : { ekgLimitAge: 40 }; // Default 40
  } catch (error) {
    return { ekgLimitAge: 40 };
  }
};

export const saveAppSettings = (settings: AppSettings) => localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));

// --- BACKUP & RESTORE UTILITIES ---

export interface BackupData {
  version: string;
  timestamp: string;
  companies: Company[];
  referrals: Referral[];
  exams: ExamDefinition[];
  institutions: MedicalInstitution[];
  transactions: SafeTransaction[];
  settings: AppSettings;
}

export const exportFullData = (): string => {
  const backup: BackupData = {
    version: '1.0',
    timestamp: new Date().toISOString(),
    companies: loadCompanies(),
    referrals: loadReferrals(),
    exams: loadExams(),
    institutions: loadInstitutions(),
    transactions: loadTransactions(),
    settings: loadAppSettings()
  };
  return JSON.stringify(backup, null, 2);
};

export const restoreFullData = (jsonData: string): boolean => {
  try {
    const data: BackupData = JSON.parse(jsonData);
    
    // Basic validation
    if (!data.companies || !data.referrals) {
      throw new Error("Geçersiz yedek dosyası formatı.");
    }

    // Save all data
    if(data.companies) saveCompanies(data.companies);
    if(data.referrals) saveReferrals(data.referrals);
    if(data.exams) saveExams(data.exams);
    if(data.institutions) saveInstitutions(data.institutions);
    if(data.transactions) saveTransactions(data.transactions);
    if(data.settings) saveAppSettings(data.settings);

    return true;
  } catch (error) {
    console.error("Yedek yükleme hatası:", error);
    return false;
  }
};