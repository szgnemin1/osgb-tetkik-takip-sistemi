/*
 * Project: OSGB Tetkik Takip Sistemi
 * Copyright (C) 2026 szgn_emin
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License.
 */

export enum Status {
  PENDING = 'PENDING',       // Bekliyor (HenÃ¼z gitmedi)
  AT_HOSPITAL = 'AT_HOSPITAL', // Hastanede / Tetkikte
  AWAITING_RESULT = 'AWAITING_RESULT', // SonuÃ§ Bekleniyor
  COMPLETED = 'COMPLETED',   // TamamlandÄ±
  CANCELLED = 'CANCELLED'    // Ä°ptal
}

// Deprecated enum usage in favor of dynamic list, keeping for type safety in legacy code
export enum ExamType {
  AUDIOMETRY = 'Odyometri',
  LUNG_XRAY = 'AkciÄŸer Grafisi',
  HEMOGRAM = 'Hemogram',
  VISION = 'GÃ¶z Muayenesi',
  EKG = 'EKG',
  TETANUS = 'Tetanoz AÅŸÄ±sÄ±',
  BLOOD_SUGAR = 'AÃ§lÄ±k Kan Åekeri',
  LIVER_FUNC = 'KaraciÄŸer Fonksiyon Testleri'
}

export interface ExamDefinition {
  id: string;
  code: string; // Excel mapping code (e.g. "101", "HEM")
  name: string;
  price: number; // MÃ¼ÅŸteriye satÄ±lan fiyat
  cost?: number; // OSGB'ye olan maliyeti (Kurum Ã¶demesi)
}

export interface MedicalInstitution {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  locationUrl?: string; // QR code iÃ§in konum linki
  sendWhatsapp?: boolean; // WhatsApp mesajÄ± gÃ¶nderilecek mi
  whatsappTemplate?: string; // GÃ¶nderilecek mesaj taslaÄŸÄ±
}

export enum HazardClass {
  LESS = 'Az Tehlikeli',
  DANGEROUS = 'Tehlikeli',
  VERY_DANGEROUS = 'Ã‡ok Tehlikeli'
}

export interface Company {
  id: string;
  name: string;
  hazardClass: HazardClass;
  assignedDoctor: string;     // Ä°ÅŸyeri Hekimi
  assignedSpecialist: string; // Ä°SG UzmanÄ±
  defaultExams: string[];     // Changed from ExamType[] to string[] to support dynamic exams
  defaultPaymentMethod: 'CASH' | 'POS' | 'INVOICE'; // FirmanÄ±n varsayÄ±lan Ã¶deme yÃ¶ntemi (POS eklendi)
  forcedInstitutionId?: string; // EÄŸer varsa, bu firma sadece bu kuruma sevk edilebilir
}

export interface Employee {
  id: string;
  fullName: string;
  tcNo: string;
  birthDate?: string; // New field added
  phone?: string; // Added for WhatsApp integration
  company: string;
  department?: string;
}

export interface Referral {
  id: string;
  employee: Employee;
  exams: string[]; // Changed to string[]
  status: Status;
  referralDate: string; // ISO Date string
  notes?: string;
  notesShow?: boolean;
  resultSummary?: string;
  doctorName?: string; // KayÄ±t anÄ±ndaki doktor
  specialistName?: string; // KayÄ±t anÄ±ndaki uzman
  totalPrice?: number; // MÃ¼ÅŸteriden alÄ±nacak tutar
  totalCost?: number; // OSGB'nin Ã¶deyeceÄŸi maliyet
  paymentMethod: 'CASH' | 'POS' | 'INVOICE'; // Nakit, Pos veya Cari
  targetInstitutionId?: string; // Hangi kuruma sevk edildiÄŸi
  skipNotifications?: boolean; // Sadece kayÄ±t yaparken bildirimleri atlamak iÃ§in
  isExternalRecord?: boolean; // Disaridan gelen kayit
}

export interface Stats {
  total: number;
  today: number;
  totalIncome: number;
}

export interface SafeTransaction {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  description: string;
  date: string;
  category?: string;
  paymentMethod?: 'CASH' | 'POS' | 'INVOICE';
  referralId?: string;
}

export interface AppSettings {
  ekgLimitAge: number; // Age threshold for mandatory EKG (default 40)
  companyLogo?: string; // Base64 string for the logo
  autoPrintReferral: boolean; // Otomatik yazdÄ±rma ayarÄ±
  printBackgroundLogo?: string; // Base64 string for the print background watermark
  printPageSize?: 'A4' | 'A5' | 'A6'; // Sayfa boyutu
  defaultScannerId?: string; // VarsayÄ±lan tarayÄ±cÄ± cihaz ID'si
  isPasswordEnabled?: boolean; // Åifre korumasÄ± aktif mi
  appPassword?: string; // Uygulama giriÅŸ ÅŸifresi
  webhookUrl?: string; // Webhook sync target URL
  backupApiKey?: string; // API key for external sync RSS feed
  telegramBotToken?: string;
  telegramChatId?: string;
  isTelegramEnabled?: boolean;
  telegramReportPeriod?: 'none' | 'daily' | 'weekly' | 'monthly_custom';
  telegramCustomReportDay?: number;
  telegramCustomReportStartDay?: number;
  telegramCustomReportEndDay?: number;
  telegramReportHour?: number;
  telegramLastReportSent?: string;
  telegramReportPeriod2?: 'none' | 'daily' | 'weekly' | 'monthly_custom';
  telegramCustomReportDay2?: number;
  telegramCustomReportStartDay2?: number;
  telegramCustomReportEndDay2?: number;
  telegramReportHour2?: number;
  telegramLastReportSent2?: string;

}

/**
 * Converts a string to lowercase with robust Turkish characters support.
 */
export const turkishToLowerCase = (str: string | null | undefined): string => {
  if (!str) return '';
  return str
    .replace(/Ä°/g, 'i')
    .replace(/I/g, 'Ä±')
    .replace(/Å/g, 'ÅŸ')
    .replace(/Ä/g, 'ÄŸ')
    .replace(/Ãœ/g, 'Ã¼')
    .replace(/Ã–/g, 'Ã¶')
    .replace(/Ã‡/g, 'Ã§')
    .toLowerCase();
};

/**
 * Returns true if the test string contains the query string, under Turkish-friendly lowercase rules.
 */
export const turkishIncludes = (str: string | null | undefined, searchStr: string | null | undefined): boolean => {
  if (str === null || str === undefined) return false;
  if (!searchStr) return true;
  return turkishToLowerCase(str).includes(turkishToLowerCase(searchStr));
};
