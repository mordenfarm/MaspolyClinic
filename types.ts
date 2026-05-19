
export type UserRole = 'student' | 'doctor' | 'admin' | 'guest';

export type StaffRole = 'doctor' | 'admin';

export interface StaffMember {
  id?: string;
  name: string;
  role: StaffRole;
  password?: string;
  pin?: string;
  email?: string;
  isMainAdmin?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export interface Course {
  id?: string;
  name: string;
}

export interface PrescribedMedication {
  name: string;
  units: number;
}

export interface PharmacyHistory {
  id?: string;
  studentName: string;
  studentId: string;
  medicineName: string;
  units: number;
  date: any;
  doctorName: string;
}

export interface Vitals {
  temp: number;
  hr: number;
  bpSys: number;
  bpDia: number;
  weight?: number;
  height?: number;
}

export interface ClinicalRecord {
  id?: string;
  studentId: string;
  date: any;
  symptoms: string[];
  affectedArea: string;
  vitals: Vitals;
  painLevel: number;
  diagnosis: string;
  treatment: string;
  medications: PrescribedMedication[];
  notes: string;
  staffName: string;
  disposition: string;
  dispositionDate?: string;
}

export interface Appointment {
  id?: string;
  studentId: string;
  studentName: string;
  studentWhatsapp?: string;
  date: string;
  time: string;
  reason: string;
  status: 'pending' | 'approved' | 'confirmed' | 'cancelled' | 'completed' | 'transferred' | 'doctor_unavailable';
  doctorId?: string;
  doctorName?: string;
  transferReason?: string;
  transferredToDoctorId?: string;
  transferredToDoctorName?: string;
  unavailableReason?: string;
  symptoms?: string;
  timestamp?: any;
}

export interface ReferralLetter {
  id?: string;
  studentId: string;
  studentName: string;
  doctorName: string;
  diagnosis: string;
  reason: string;
  clinicalSummary: string;
  recommendedSpecialist: string;
  status: 'issued';
  createdAt: any;
}

export interface SickNoteRequest {
  id?: string;
  studentId: string;
  studentName: string;
  reason: string;
  startDate: string;
  endDate: string;
  status: 'pending' | 'approved' | 'rejected';
  timestamp: any;
}

export interface SickNote {
  id?: string;
  studentId: string;
  studentName: string;
  certificateId: string;
  reason: string;
  startDate: string;
  endDate: string;
  approvedBy: string;
  dateIssued: any;
}

export interface InventoryItem {
  id: string;
  name: string;
  stock: number;
  expiry: string;
  lowStockLevel?: number;
  category?: string;
}

export interface Patient {
  id: string;
  name: string;
  surname: string;
  dob: string;
  gender: 'Male' | 'Female' | 'Other';
  studentNumber: string;
  address: string;
  phone: string;
  whatsapp?: string;
  nextOfKinName: string;
  nextOfKinPhone: string;
  course: string;
  level: 'NC' | 'ND';
  registrationDate: string;
  password?: string;
}

export interface EmergencyAlert {
  id?: string;
  type: 'physical' | 'mental';
  location: string;
  status: 'active' | 'dispatched' | 'attended';
  timestamp: any;
  attendedAt?: any;
  attendedBy?: string;
  assignedDoctorId?: string;
  assignedDoctorName?: string;
  dispatchedAt?: any;
}
