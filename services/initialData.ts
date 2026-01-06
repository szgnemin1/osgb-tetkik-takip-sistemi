
import { Company, HazardClass, ExamType, ExamDefinition, MedicalInstitution } from '../types';

export const DEFAULT_EXAMS: ExamDefinition[] = [
  { id: 'ex1', code: '101', name: ExamType.AUDIOMETRY, price: 150, cost: 70 },
  { id: 'ex2', code: '102', name: ExamType.LUNG_XRAY, price: 200, cost: 100 },
  { id: 'ex3', code: '103', name: ExamType.HEMOGRAM, price: 100, cost: 40 },
  { id: 'ex4', code: '104', name: ExamType.VISION, price: 120, cost: 50 },
  { id: 'ex5', code: '105', name: ExamType.EKG, price: 150, cost: 60 },
  { id: 'ex6', code: '106', name: ExamType.TETANUS, price: 50, cost: 15 },
  { id: 'ex7', code: '107', name: ExamType.BLOOD_SUGAR, price: 40, cost: 10 },
  { id: 'ex8', code: '108', name: ExamType.LIVER_FUNC, price: 180, cost: 80 }
];

export const DEFAULT_INSTITUTIONS: MedicalInstitution[] = [
  { id: 'inst1', name: 'Merkez OSGB Laboratuvarı', phone: '0212 555 10 10' },
  { id: 'inst2', name: 'Yaşam Görüntüleme Merkezi', phone: '0212 555 20 20' },
  { id: 'inst3', name: 'Devlet Hastanesi (Raporlu)', phone: '182' }
];

export const PREDEFINED_COMPANIES: Company[] = [
  {
    id: 'c1',
    name: 'Mega Metal Sanayi A.Ş.',
    hazardClass: HazardClass.VERY_DANGEROUS,
    assignedDoctor: 'Dr. Mehmet Özdemir',
    assignedSpecialist: 'Uzm. Ayşe Yılmaz (A Sınıfı)',
    defaultPaymentMethod: 'INVOICE',
    forcedInstitutionId: 'inst2', // Bu firma zorunlu olarak Yaşam Görüntüleme'ye gidiyor
    defaultExams: [
      ExamType.LUNG_XRAY, 
      ExamType.AUDIOMETRY, 
      ExamType.HEMOGRAM, 
      ExamType.TETANUS,
      ExamType.LIVER_FUNC
    ]
  },
  {
    id: 'c2',
    name: 'TeknoSoft Yazılım Ltd.',
    hazardClass: HazardClass.LESS,
    assignedDoctor: 'Dr. Zeynep Kaya',
    assignedSpecialist: 'Uzm. Ali Veli (C Sınıfı)',
    defaultPaymentMethod: 'INVOICE',
    defaultExams: [
      ExamType.VISION,
      ExamType.EKG
    ]
  },
  {
    id: 'c3',
    name: 'Kuzey Lojistik ve Depolama',
    hazardClass: HazardClass.DANGEROUS,
    assignedDoctor: 'Dr. Ahmet Demir',
    assignedSpecialist: 'Uzm. Fatma Şahin (B Sınıfı)',
    defaultPaymentMethod: 'CASH',
    defaultExams: [
      ExamType.HEMOGRAM,
      ExamType.EKG,
      ExamType.BLOOD_SUGAR,
      ExamType.LUNG_XRAY
    ]
  },
  {
    id: 'c4',
    name: 'Anadolu İnşaat Yapı',
    hazardClass: HazardClass.VERY_DANGEROUS,
    assignedDoctor: 'Dr. Mehmet Özdemir',
    assignedSpecialist: 'Uzm. Burak Çelik (A Sınıfı)',
    defaultPaymentMethod: 'CASH',
    defaultExams: [
      ExamType.TETANUS,
      ExamType.LUNG_XRAY,
      ExamType.AUDIOMETRY,
      ExamType.VISION,
      ExamType.EKG
    ]
  }
];