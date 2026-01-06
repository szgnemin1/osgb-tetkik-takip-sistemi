
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
  defaultPaymentMethod: 'CASH' | 'INVOICE'; // Firmanın varsayılan ödeme yöntemi
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
  aiAnalysis?: string; // Gemini analysis result
  resultSummary?: string;
  doctorName?: string; // Kayıt anındaki doktor
  specialistName?: string; // Kayıt anındaki uzman
  totalPrice?: number; // Müşteriden alınacak tutar
  totalCost?: number; // OSGB'nin ödeyeceği maliyet
  paymentMethod: 'CASH' | 'INVOICE'; // Nakit (Kasa) veya Cari (Fatura)
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
}

export interface AppSettings {
  ekgLimitAge: number; // Age threshold for mandatory EKG (default 40)
  companyLogo?: string; // Base64 string for the logo
}