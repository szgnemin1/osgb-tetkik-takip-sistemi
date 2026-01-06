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
export const loadCompanies = (defaults: Company[]): Company[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY_COMPANIES);
    return data ? JSON.parse(data) : defaults;
  } catch (error) {
    return defaults;
  }
};
export const saveCompanies = (data: Company[]) => localStorage.setItem(STORAGE_KEY_COMPANIES, JSON.stringify(data));

// Exams
export const loadExams = (defaults: ExamDefinition[]): ExamDefinition[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY_EXAMS);
    return data ? JSON.parse(data) : defaults;
  } catch (error) {
    return defaults;
  }
};
export const saveExams = (data: ExamDefinition[]) => localStorage.setItem(STORAGE_KEY_EXAMS, JSON.stringify(data));

// Institutions
export const loadInstitutions = (defaults: MedicalInstitution[]): MedicalInstitution[] => {
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