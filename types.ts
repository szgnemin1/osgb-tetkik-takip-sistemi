/*
 * Project: OSGB Tetkik Takip Sistemi
 * Copyright (C) 2026 szgn_emin
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License.
 */

export enum Status {
  PENDING = 'PENDING',       // Bekliyor (Henüz gitmedi)
  AT_HOSPITAL = 'AT_HOSPITAL', // Hastanede / Tetkikte
  AWAITING_RESULT = 'AWAITING_RESULT', // Sonuç Bekleniyor
  COMPLETED = 'COMPLETED',   // Tamamlandı
  CANCELLED = 'CANCELLED'    // İptal
}

// Deprecated enum usage in favor of dynamic list, keeping for type safety in legacy code
export enum ExamType {
  AUDIOMETRY = 'Odyometri',
  LUNG_XRAY = 'Akciğer Grafisi',
  HEMOGRAM = 'Hemogram',
  VISION = 'Göz Muayenesi',
  EKG = 'EKG',
  TETANUS = 'Tetanoz Aşısı',
  BLOOD_SUGAR = 'Açlık Kan Şekeri',
  LIVER_FUNC = 'Karaciğer Fonksiyon Testleri'
}

export interface ExamDefinition {
  id: string;
  code: string; // Excel mapping code (e.g. "101", "HEM")
  name: string;
  price: number; // Müşteriye satılan fiyat
  cost?: number; // OSGB'ye olan maliyeti (Kurum ödemesi)
}

export interface MedicalInstitution {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  locationUrl?: string; // QR code için konum linki
}

export enum HazardClass {
  LESS = 'Az Tehlikeli',
  DANGEROUS = 'Tehlikeli',
  VERY_DANGEROUS = 'Çok Tehlikeli'
}

export interface Company {
  id: string;
  name: string;
  hazardClass: HazardClass;
  assignedDoctor: string;     // İşyeri Hekimi
  assignedSpecialist: string; // İSG Uzmanı
  defaultExams: string[];     // Changed from ExamType[] to string[] to support dynamic exams
  defaultPaymentMethod: 'CASH' | 'POS' | 'INVOICE'; // Firmanın varsayılan ödeme yöntemi (POS eklendi)
  forcedInstitutionId?: string; // Eğer varsa, bu firma sadece bu kuruma sevk edilebilir
}

export interface Employee {
  id: string;
  fullName: string;
  tcNo: string;
  birthDate?: string; // New field added
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
  resultSummary?: string;
  doctorName?: string; // Kayıt anındaki doktor
  specialistName?: string; // Kayıt anındaki uzman
  totalPrice?: number; // Müşteriden alınacak tutar
  totalCost?: number; // OSGB'nin ödeyeceği maliyet
  paymentMethod: 'CASH' | 'POS' | 'INVOICE'; // Nakit, Pos veya Cari
  targetInstitutionId?: string; // Hangi kuruma sevk edildiği
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
  autoPrintReferral: boolean; // Otomatik yazdırma ayarı
  printBackgroundLogo?: string; // Base64 string for the print background watermark
  printPageSize?: 'A4' | 'A5' | 'A6'; // Sayfa boyutu
  defaultScannerId?: string; // Varsayılan tarayıcı cihaz ID'si
  isPasswordEnabled?: boolean; // Şifre koruması aktif mi
  appPassword?: string; // Uygulama giriş şifresi
}

/**
 * Converts a string to lowercase with robust Turkish characters support.
 */
export const turkishToLowerCase = (str: string | null | undefined): string => {
  if (!str) return '';
  return str
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .replace(/Ş/g, 'ş')
    .replace(/Ğ/g, 'ğ')
    .replace(/Ü/g, 'ü')
    .replace(/Ö/g, 'ö')
    .replace(/Ç/g, 'ç')
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