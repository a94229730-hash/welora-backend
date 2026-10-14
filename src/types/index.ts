export type TriageLevel = 'EMERGENCY_RED' | 'URGENT_ATTENTION' | 'ROUTINE_CARE' | 'HOME_CARE';

export interface EmergencyContact {
  name: string;
  phone: string;
  relation: string;
}

export interface HealthProfile {
  age: number;
  bloodGroup: string;
  allergies: string[];
  chronicConditions: string[];
  currentMedications: string[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  authProvider: 'google' | 'phone';
  displayLanguage: string;
  communicationLanguage: string;
  createdAt: string;
  emergencyContacts: EmergencyContact[];
  healthProfile: HealthProfile;
}

export interface EmergencyService {
  id: string;
  name: string;
  number: string;
  altNumber?: string;
  category: string;
  description: string;
  priority: 'Critical' | 'High' | 'Normal';
  isDemoSimulated: boolean;
}

export interface Hospital {
  id: string;
  name: string;
  city: string;
  state: string;
  address: string;
  phone: string;
  emergencyPhone: string;
  lat: number;
  lng: number;
  type: string;
  traumaLevel: string;
  bedsAvailable: string;
  rating: number;
  specialties: string[];
  distanceKm?: number;
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  degrees: string;
  experienceYears: number;
  hospital: string;
  city: string;
  rating: number;
  consultationFee: number;
  availableDays: string[];
  timeSlots: string[];
  avatar: string;
}

export interface Appointment {
  id: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  hospital: string;
  date: string;
  time: string;
  patientName: string;
  patientPhone: string;
  chiefComplaint: string;
  status: 'Confirmed' | 'Requested' | 'Rescheduled' | 'Completed' | 'Cancelled';
  consultationFee: number;
  bookedAt: string;
  isDemoAppointment?: boolean;
}

export interface PrescriptionMedicine {
  name: string;
  strength: string;
  form: string;
  dosage: string;
  frequency: string;
  duration: string;
  timing: string;
  generalUse: string;
  clarityStatus: 'Clear' | 'Partially Unclear' | 'Needs Pharmacist Verification';
  pharmacistNotes: string;
}

export interface PrescriptionData {
  doctorName?: string | null;
  clinicOrHospital?: string | null;
  prescriptionDate?: string | null;
  patientName?: string | null;
  diagnosisOrChiefComplaint?: string | null;
  medicines?: PrescriptionMedicine[];
  unclearOrIllegibleSections?: string[];
  importantPrecautions?: string[];
  doctorConsultationRecommendations?: string;
  disclaimer?: string;
  error?: string;
  message?: string;
  isSyntheticDemoData?: boolean;
}

export interface LabTestItem {
  testName: string;
  value: string;
  unit: string;
  referenceRange: string;
  status: 'Normal' | 'High' | 'Low' | 'Critical';
  simpleExplanation: string;
}

export interface LabReportData {
  labName?: string | null;
  reportDate?: string | null;
  patientName?: string | null;
  panelName?: string;
  results?: LabTestItem[];
  overallSummary?: string;
  doctorConsultationPoints?: string[];
  disclaimer?: string;
  error?: string;
  message?: string;
  isSyntheticDemoData?: boolean;
}

export interface LabComparisonItem {
  testName: string;
  previousValue: string;
  currentValue: string;
  unit: string;
  referenceRange: string;
  trend: 'Improved' | 'Worsened' | 'Stable' | 'New Test';
  interpretation: string;
}

export interface LabComparisonData {
  comparisonDateRange: string;
  trendSummary: string;
  comparisons: LabComparisonItem[];
  positiveProgressNotes: string[];
  areasRequiringAttention: string[];
  doctorDiscussionQuestions: string[];
  disclaimer: string;
}

export interface MedicalRecord {
  id: string;
  type: 'symptom_consult' | 'prescription' | 'lab_report' | 'lab_comparison' | 'appointment';
  title: string;
  date: string;
  summary: string;
  payload: any;
  createdAt: string;
  doctorOrFacility?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isEmergency?: boolean;
}

export type HealthGoalType = 'water' | 'steps' | 'sleep' | 'exercise' | 'meditation';

export interface DailyHealthGoal {
  id: string;
  type: HealthGoalType;
  title: string;
  target: number;
  current: number;
  unit: string;
  stepIncrement: number;
  iconName: string;
  notes?: string;
  updatedAt?: string;
}

export interface MedicationDose {
  id: string;
  medicineName: string;
  dosage: string;
  scheduledTime: string;
  timeOfDay: 'Morning' | 'Afternoon' | 'Evening' | 'Night';
  instructions: string;
  isTaken: boolean;
  takenAt?: string;
  doctorName?: string;
  prescribedFor?: string;
  urgency?: 'Routine' | 'Time-Sensitive' | 'Important';
}

export type JournalMood = 'great' | 'good' | 'neutral' | 'poor' | 'unwell';

export interface HealthJournalEntry {
  id: string;
  date: string;
  time: string;
  mood: JournalMood;
  energyLevel: number;
  title: string;
  content: string;
  symptoms: {
    name: string;
    severity: 1 | 2 | 3 | 4 | 5;
  }[];
  vitals?: {
    systolicBP?: number;
    diastolicBP?: number;
    heartRate?: number;
    bloodGlucose?: number;
    sleepHours?: number;
    waterIntakeLiters?: number;
    weightKg?: number;
    temperatureF?: number;
  };
  mealQuality?: 'healthy' | 'moderate' | 'indulgent' | 'fasted';
  tags: string[];
  questionsForDoctor?: string;
  isFlaggedForDoctor?: boolean;
  createdAt: string;
  updatedAt?: string;
}
