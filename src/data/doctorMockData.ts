/**
 * Suga.Health Doctor Portal - Comprehensive Mock Data Architecture
 * Clinical, realistic, and structured data models for provider workflow.
 */

export interface DoctorProfile {
  id: string;
  name: string;
  title: string;
  credentials: string;
  specialty: string;
  subSpecialty: string;
  licenseNumber: string;
  deaNumber: string;
  npiNumber: string;
  email: string;
  phone: string;
  avatarUrl: string;
  shiftStatus: 'active' | 'break' | 'offline';
  affiliation: string;
  assignedJurisdiction: string[];
  bio: string;
  availabilityHours: string;
}

export interface PatientVitalRecord {
  date: string;
  bmi: number;
  weightLbs: number;
  heightInches: number;
  bloodPressure: string;
  heartRate: number;
  fastingBloodGlucose?: number;
}

export interface PatientMedication {
  id: string;
  name: string;
  dosage: string;
  form: string;
  frequency: string;
  route: string;
  status: 'active' | 'discontinued' | 'completed';
  prescribedDate: string;
  prescribingDoctor: string;
  refillsLeft: number;
  pharmacy: string;
  instructions: string;
}

export interface PatientLabRecord {
  id: string;
  title: string;
  category: 'Metabolic' | 'Hormone' | 'Lipid' | 'Renal' | 'CBC';
  date: string;
  status: 'normal' | 'abnormal' | 'pending';
  resultSummary: string;
  abnormalFlag?: string;
  orderingProvider: string;
  labFacility: string;
}

export interface ClinicalNote {
  id: string;
  date: string;
  author: string;
  type: 'Intake Evaluation' | 'Progress Note' | 'Follow-up' | 'Refill Assessment';
  text: string;
}

export interface PatientTimelineEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  type: 'consultation' | 'prescription' | 'message' | 'lab' | 'refill';
  author: string;
}

export interface Patient {
  id: string; // e.g. pt-9412
  mrn: string; // Medical Record Number: MRN-9412-CA
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  dob: string;
  state: string;
  city: string;
  phone: string;
  email: string;
  allergies: string[];
  primaryConcern: string;
  careCategory: 'GLP-1 Weight Management' | 'Hair Regrowth' | 'Men\'s Sexual Wellness' | 'Metabolic Health';
  careStatus: 'active_care' | 'awaiting_review' | 'follow_up_due' | 'maintenance';
  currentMedicationsSummary: string;
  medicalHistory: string[];
  vitalsHistory: PatientVitalRecord[];
  medications: PatientMedication[];
  labs: PatientLabRecord[];
  notes: ClinicalNote[];
  timeline: PatientTimelineEvent[];
}

export interface Consultation {
  id: string; // e.g. c-1082
  patientId: string;
  patientName: string;
  patientAge: number;
  patientGender: 'Male' | 'Female' | 'Other';
  patientState: string;
  mrn: string;
  category: 'GLP-1 Weight Management' | 'Hair Regrowth' | 'Men\'s Sexual Wellness' | 'Metabolic Health';
  requestedMedication: string;
  triagePriority: 'urgent' | 'high' | 'normal';
  status: 'pending_review' | 'in_review' | 'completed' | 'info_requested';
  submittedAt: string;
  waitTimeFormatted: string;
  reasonForReview: string;
  chiefComplaint: string;
  intakeAnswers: {
    question: string;
    answer: string;
  }[];
  contraindicationsChecked: boolean;
  medicalHistoryFlags: string[];
  clinicalAssessmentDraft?: string;
  planDraft?: string;
  assignedDoctor: string;
  completedAt?: string;
}

export interface PrescriptionRecord {
  id: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  medication: string;
  strength: string;
  form: string;
  frequency: string;
  route: string;
  quantity: string;
  refills: number;
  instructions: string;
  status: 'draft' | 'finalized' | 'dispensed';
  date: string;
  prescribedBy: string;
  pharmacyDestination: string;
  lockedAt?: string;
}

export interface MessageItem {
  id: string;
  sender: 'patient' | 'doctor' | 'system';
  senderName: string;
  text: string;
  timestamp: string;
  timeFormatted: string;
}

export interface MessageThread {
  id: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  subject: string;
  category: 'Symptom Follow-up' | 'Refill Inquiry' | 'Lab Question' | 'General Care';
  status: 'needs_reply' | 'waiting' | 'resolved';
  unread: boolean;
  priority: 'urgent' | 'normal';
  lastMessageTime: string;
  lastMessageSnippet: string;
  relatedConsultationId?: string;
  messages: MessageItem[];
}

export interface FollowUpTask {
  id: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  reason: string;
  dueDate: string;
  dueStatus: 'overdue' | 'today' | 'upcoming';
  priority: 'urgent' | 'high' | 'normal';
  category: 'GLP-1 Titration' | 'Refill Review' | 'Lab Panel Review' | 'Symptom Check-in';
  nextAction: string;
  relatedConsultationId?: string;
}

export interface DoctorNotification {
  id: string;
  category: 'clinical' | 'messages' | 'administrative';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  priority: 'urgent' | 'normal';
  link?: string;
}

// ----------------------------------------------------
// MOCK DATA STORE
// ----------------------------------------------------

export const MOCK_DOCTOR_PROFILE: DoctorProfile = {
  id: 'doc-88492',
  name: 'Dr. Sarah Mitchell',
  title: 'Attending Telehealth Physician',
  credentials: 'MD, FACP',
  specialty: 'Internal Medicine',
  subSpecialty: 'Clinical Endocrinology & Metabolic Health',
  licenseNumber: 'MD-88492-CA',
  deaNumber: 'BM9182374',
  npiNumber: '1982736450',
  email: 'doctor.demo@sugahealth.test',
  phone: '+1 (415) 890-2104',
  avatarUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=256',
  shiftStatus: 'active',
  affiliation: 'Suga.Health Telehealth Clinical Network',
  assignedJurisdiction: ['CA', 'NY', 'TX', 'FL', 'WA'],
  bio: 'Board-certified Internal Medicine specialist with 12+ years of experience in metabolic optimization, GLP-1 receptor agonist therapies, and preventative endocrinology. Clinical investigator for personalized digital health workflows.',
  availabilityHours: 'Mon - Fri, 08:00 - 17:00 PST (Telehealth Queue Active)',
};

export const MOCK_PATIENTS: Patient[] = [
  {
    id: 'pt-9412',
    mrn: 'MRN-9412-CA',
    name: 'Marcus Vance',
    age: 44,
    gender: 'Male',
    dob: '1982-04-12',
    state: 'CA',
    city: 'San Francisco',
    phone: '+1 (415) 555-0192',
    email: 'm.vance@example.com',
    allergies: ['Sulfa drugs (rash)', 'Latex (mild contact dermatitis)'],
    primaryConcern: 'Metabolic weight resistance & GLP-1 program evaluation',
    careCategory: 'GLP-1 Weight Management',
    careStatus: 'awaiting_review',
    currentMedicationsSummary: 'Lisinopril 10mg PO daily, Multivitamin',
    medicalHistory: ['Pre-hypertension stage 1', 'Family history of Type 2 Diabetes', 'Obesity Class 1'],
    vitalsHistory: [
      { date: '2026-09-18', bmi: 34.2, weightLbs: 236, heightInches: 70, bloodPressure: '138/88', heartRate: 74, fastingBloodGlucose: 108 },
      { date: '2026-06-12', bmi: 34.8, weightLbs: 240, heightInches: 70, bloodPressure: '140/90', heartRate: 76, fastingBloodGlucose: 112 },
    ],
    medications: [
      {
        id: 'med-101',
        name: 'Lisinopril',
        dosage: '10mg',
        form: 'Oral Tablet',
        frequency: 'Once daily in the morning',
        route: 'Oral',
        status: 'active',
        prescribedDate: '2025-10-10',
        prescribingDoctor: 'Dr. Robert Jenkins, MD (PCP)',
        refillsLeft: 3,
        pharmacy: 'Walgreens #4921 (San Francisco)',
        instructions: 'Take 1 tablet by mouth daily for blood pressure.',
      },
    ],
    labs: [
      {
        id: 'lab-301',
        title: 'Comprehensive Metabolic Panel (CMP) + HbA1c',
        category: 'Metabolic',
        date: '2026-09-10',
        status: 'abnormal',
        resultSummary: 'HbA1c: 5.8% (Prediabetic range), eGFR: 92 mL/min, ALT: 34 U/L, Fasting Glucose: 108 mg/dL',
        abnormalFlag: 'HbA1c 5.8% (Borderline)',
        orderingProvider: 'Dr. Sarah Mitchell, MD',
        labFacility: 'Quest Diagnostics (San Francisco Central)',
      },
      {
        id: 'lab-302',
        title: 'Lipid Panel',
        category: 'Lipid',
        date: '2026-09-10',
        status: 'normal',
        resultSummary: 'Total Cholesterol: 195 mg/dL, HDL: 46 mg/dL, Triglycerides: 160 mg/dL, LDL: 117 mg/dL',
        orderingProvider: 'Dr. Sarah Mitchell, MD',
        labFacility: 'Quest Diagnostics',
      },
    ],
    notes: [
      {
        id: 'note-1',
        date: '2026-09-18',
        author: 'Dr. Sarah Mitchell, MD',
        type: 'Intake Evaluation',
        text: 'Patient completed asynchronous digital intake. Elevated BMI (34.2) and Stage 1 prehypertension noted. Lab panel shows baseline eGFR > 90 and HbA1c 5.8%. Good candidate for Semaglutide starter protocol (0.25mg/week) with blood pressure follow-up.',
      },
    ],
    timeline: [
      { id: 't-1', date: '2026-09-18 21:45', title: 'Consultation Intake Submitted', description: 'Patient submitted GLP-1 weight management intake questionnaire.', type: 'consultation', author: 'Marcus Vance' },
      { id: 't-2', date: '2026-09-10 14:00', title: 'Lab Results Received', description: 'Quest Diagnostics uploaded CMP and HbA1c panel.', type: 'lab', author: 'Quest Diagnostics' },
    ],
  },
  {
    id: 'pt-8302',
    mrn: 'MRN-8302-WA',
    name: 'Elena Rostova',
    age: 38,
    gender: 'Female',
    dob: '1988-08-22',
    state: 'WA',
    city: 'Seattle',
    phone: '+1 (206) 555-0144',
    email: 'elena.rostova@example.com',
    allergies: ['Metformin (severe GI cramping)', 'Erythromycin'],
    primaryConcern: 'Postpartum metabolic resistance & Tirzepatide titration',
    careCategory: 'GLP-1 Weight Management',
    careStatus: 'awaiting_review',
    currentMedicationsSummary: 'Levothyroxine 50mcg PO daily',
    medicalHistory: ['Hypothyroidism (stable on Levothyroxine)', 'Postpartum weight retention', 'NKDA'],
    vitalsHistory: [
      { date: '2026-09-18', bmi: 31.8, weightLbs: 188, heightInches: 65, bloodPressure: '124/80', heartRate: 68, fastingBloodGlucose: 96 },
    ],
    medications: [
      {
        id: 'med-102',
        name: 'Levothyroxine',
        dosage: '50mcg',
        form: 'Oral Tablet',
        frequency: 'Once daily on empty stomach 30m before breakfast',
        route: 'Oral',
        status: 'active',
        prescribedDate: '2024-03-15',
        prescribingDoctor: 'Dr. Lisa Wong, MD (Endo)',
        refillsLeft: 5,
        pharmacy: 'CVS Pharmacy (Seattle)',
        instructions: 'Take 1 tablet daily with a full glass of water.',
      },
    ],
    labs: [
      {
        id: 'lab-303',
        title: 'TSH + Free T4 + Comprehensive Metabolic Panel',
        category: 'Hormone',
        date: '2026-09-02',
        status: 'normal',
        resultSummary: 'TSH: 1.84 mIU/L (Euthyroid), Free T4: 1.2 ng/dL, eGFR: >90 mL/min, ALT/AST normal',
        orderingProvider: 'Dr. Sarah Mitchell, MD',
        labFacility: 'LabCorp Seattle',
      },
    ],
    notes: [
      {
        id: 'note-2',
        date: '2026-09-18',
        author: 'Dr. Sarah Mitchell, MD',
        type: 'Intake Evaluation',
        text: 'Patient requesting Tirzepatide starter titration (2.5mg/week). TSH stable at 1.84. No history of pancreatitis or medullary thyroid carcinoma. Approved for starter pen kit.',
      },
    ],
    timeline: [
      { id: 't-3', date: '2026-09-18 22:10', title: 'Consultation Intake Submitted', description: 'Submitted Tirzepatide intake with metabolic history.', type: 'consultation', author: 'Elena Rostova' },
    ],
  },
  {
    id: 'pt-7721',
    mrn: 'MRN-7721-NY',
    name: 'David Chen',
    age: 29,
    gender: 'Male',
    dob: '1997-02-14',
    state: 'NY',
    city: 'New York',
    phone: '+1 (212) 555-0188',
    email: 'david.chen@example.com',
    allergies: ['NKDA (No Known Drug Allergies)'],
    primaryConcern: 'Norwood stage III androgenetic alopecia vertex thinning',
    careCategory: 'Hair Regrowth',
    careStatus: 'awaiting_review',
    currentMedicationsSummary: 'None (Topical Minoxidil 5% OTC for 6 months)',
    medicalHistory: ['No chronic conditions', 'Non-smoker'],
    vitalsHistory: [
      { date: '2026-09-18', bmi: 24.1, weightLbs: 165, heightInches: 69, bloodPressure: '118/76', heartRate: 70 },
    ],
    medications: [],
    labs: [],
    notes: [],
    timeline: [
      { id: 't-4', date: '2026-09-18 20:30', title: 'Hair Regrowth Intake Submitted', description: 'Patient submitted photos showing vertex thinning Norwood III.', type: 'consultation', author: 'David Chen' },
    ],
  },
  {
    id: 'pt-6510',
    mrn: 'MRN-6510-TX',
    name: 'Robert Kowalski',
    age: 52,
    gender: 'Male',
    dob: '1974-11-05',
    state: 'TX',
    city: 'Austin',
    phone: '+1 (512) 555-0199',
    email: 'r.kowalski@example.com',
    allergies: ['Penicillin (mild hives)'],
    primaryConcern: 'Erectile health & Tadalafil daily protocol',
    careCategory: 'Men\'s Sexual Wellness',
    careStatus: 'awaiting_review',
    currentMedicationsSummary: 'Atorvastatin 20mg PO daily',
    medicalHistory: ['Hyperlipidemia', 'Cardiovascular evaluation cleared (no nitrates)', 'Non-smoker'],
    vitalsHistory: [
      { date: '2026-09-18', bmi: 27.6, weightLbs: 195, heightInches: 71, bloodPressure: '128/82', heartRate: 72 },
    ],
    medications: [
      {
        id: 'med-103',
        name: 'Atorvastatin',
        dosage: '20mg',
        form: 'Oral Tablet',
        frequency: 'Once daily at bedtime',
        route: 'Oral',
        status: 'active',
        prescribedDate: '2025-01-12',
        prescribingDoctor: 'Dr. Kenneth Cole, MD (Cardiology)',
        refillsLeft: 2,
        pharmacy: 'HEB Pharmacy (Austin)',
        instructions: 'Take 1 tablet nightly.',
      },
    ],
    labs: [],
    notes: [],
    timeline: [
      { id: 't-5', date: '2026-09-18 19:15', title: 'Intake Questionnaire Submitted', description: 'Patient submitted men\'s wellness intake confirming nitrate absence.', type: 'consultation', author: 'Robert Kowalski' },
    ],
  },
  {
    id: 'pt-5419',
    mrn: 'MRN-5419-FL',
    name: 'Sophia Alvarez',
    age: 41,
    gender: 'Female',
    dob: '1985-06-19',
    state: 'FL',
    city: 'Miami',
    phone: '+1 (305) 555-0132',
    email: 's.alvarez@example.com',
    allergies: ['Aspirin (gastritis)'],
    primaryConcern: 'Semaglutide maintenance dose titration (0.5mg -> 1.0mg)',
    careCategory: 'GLP-1 Weight Management',
    careStatus: 'follow_up_due',
    currentMedicationsSummary: 'Semaglutide 0.5mg subcutaneous weekly',
    medicalHistory: ['Metabolic syndrome', 'Weight reduction milestone: -14 lbs over 8 weeks'],
    vitalsHistory: [
      { date: '2026-09-18', bmi: 29.4, weightLbs: 168, heightInches: 64, bloodPressure: '122/78', heartRate: 66 },
      { date: '2026-07-20', bmi: 31.8, weightLbs: 182, heightInches: 64, bloodPressure: '128/82', heartRate: 70 },
    ],
    medications: [
      {
        id: 'med-104',
        name: 'Semaglutide',
        dosage: '0.5mg / week',
        form: 'Subcutaneous Pen Injector',
        frequency: 'Once weekly on Sundays',
        route: 'Subcutaneous',
        status: 'active',
        prescribedDate: '2026-07-20',
        prescribingDoctor: 'Dr. Sarah Mitchell, MD',
        refillsLeft: 0,
        pharmacy: 'Suga Partner Compounding Pharmacy',
        instructions: 'Inject 0.5mg subcutaneously into abdomen or thigh once every 7 days.',
      },
    ],
    labs: [
      {
        id: 'lab-304',
        title: 'Mid-Treatment CMP & Lipid Evaluation',
        category: 'Metabolic',
        date: '2026-09-08',
        status: 'normal',
        resultSummary: 'eGFR: >90 mL/min, ALT: 22 U/L, AST: 19 U/L, Fasting Glucose: 92 mg/dL. Excellent tolerance.',
        orderingProvider: 'Dr. Sarah Mitchell, MD',
        labFacility: 'Quest Diagnostics Miami',
      },
    ],
    notes: [
      {
        id: 'note-3',
        date: '2026-09-08',
        author: 'Dr. Sarah Mitchell, MD',
        type: 'Progress Note',
        text: 'Patient successfully completed 8 weeks of Semaglutide (4w @ 0.25mg, 4w @ 0.5mg). Weight down 14 lbs with mild initial nausea fully resolved. Ready for 1.0mg maintenance titration.',
      },
    ],
    timeline: [
      { id: 't-6', date: '2026-09-18 18:40', title: 'Refill & Titration Request', description: 'Patient requested step-up to 1.0mg weekly dose.', type: 'refill', author: 'Sophia Alvarez' },
    ],
  },
  {
    id: 'pt-3882',
    mrn: 'MRN-3882-CA',
    name: 'Hannah Kim',
    age: 36,
    gender: 'Female',
    dob: '1990-01-30',
    state: 'CA',
    city: 'Los Angeles',
    phone: '+1 (310) 555-0177',
    email: 'hannah.kim@example.com',
    allergies: ['NKDA'],
    primaryConcern: 'GLP-1 starter protocol completed & approved',
    careCategory: 'GLP-1 Weight Management',
    careStatus: 'active_care',
    currentMedicationsSummary: 'Semaglutide 0.25mg / week starter kit',
    medicalHistory: ['BMI 32.1 baseline', 'No endocrine disorders'],
    vitalsHistory: [
      { date: '2026-09-18', bmi: 32.1, weightLbs: 178, heightInches: 63, bloodPressure: '118/74', heartRate: 72 },
    ],
    medications: [
      {
        id: 'med-105',
        name: 'Semaglutide Starter Kit',
        dosage: '0.25mg / week',
        form: 'Subcutaneous Pen Injector',
        frequency: 'Once weekly for 4 weeks',
        route: 'Subcutaneous',
        status: 'active',
        prescribedDate: '2026-09-18',
        prescribingDoctor: 'Dr. Sarah Mitchell, MD',
        refillsLeft: 1,
        pharmacy: 'Suga Partner Pharmacy',
        instructions: 'Inject 0.25mg subcutaneously once weekly for 4 weeks.',
      },
    ],
    labs: [],
    notes: [
      {
        id: 'note-4',
        date: '2026-09-18',
        author: 'Dr. Sarah Mitchell, MD',
        type: 'Intake Evaluation',
        text: 'Approved 0.25mg starter regimen + nutritional coaching guide. Follow-up scheduled in 4 weeks for dose adjustment.',
      },
    ],
    timeline: [
      { id: 't-7', date: '2026-09-18 14:35', title: 'Prescription Signed', description: 'Dr. Mitchell signed electronic Rx for Semaglutide 0.25mg starter kit.', type: 'prescription', author: 'Dr. Sarah Mitchell, MD' },
    ],
  },
];

export const MOCK_CONSULTATIONS: Consultation[] = [
  {
    id: 'c-1082',
    patientId: 'pt-9412',
    patientName: 'Marcus Vance',
    patientAge: 44,
    patientGender: 'Male',
    patientState: 'CA',
    mrn: 'MRN-9412-CA',
    category: 'GLP-1 Weight Management',
    requestedMedication: 'Semaglutide 0.25mg Starter Titration',
    triagePriority: 'urgent',
    status: 'pending_review',
    submittedAt: '2026-09-18T21:45:00Z',
    waitTimeFormatted: '38 mins ago',
    reasonForReview: 'Elevated BMI (34.2) + Stage 1 prehypertension (138/88 mmHg)',
    chiefComplaint: 'Seeking medical weight loss program after lifestyle plateau. History of borderline prediabetes and elevated fasting glucose.',
    intakeAnswers: [
      { question: 'Current Weight & Height', answer: '236 lbs, 5 ft 10 in (BMI 34.2)' },
      { question: 'Primary Weight Management Goal', answer: 'Target weight 190 lbs; improve cardiovascular markers and reduce prediabetic risk.' },
      { question: 'Prior Weight Loss Interventions', answer: 'Calorie restriction, intermittent fasting, personal training. Weight rebounds after 6 months.' },
      { question: 'Current Prescription Medications', answer: 'Lisinopril 10mg daily for mild hypertension (stable for 2 years).' },
      { question: 'Personal or Family History of Thyroid Cancer', answer: 'No personal or family history of medullary thyroid carcinoma or MEN-2.' },
      { question: 'History of Pancreatitis or Gallbladder Disease', answer: 'None reported.' },
      { question: 'GI Symptoms / Gastroparesis', answer: 'No history of severe reflux or gastroparesis.' },
    ],
    contraindicationsChecked: true,
    medicalHistoryFlags: ['Pre-hypertension stage 1', 'Family History T2D'],
    clinicalAssessmentDraft: '44-year-old male with Class I obesity (BMI 34.2), prediabetes (HbA1c 5.8%), and stable pre-hypertension on Lisinopril. No contraindications to GLP-1 therapy. Appropriate for Semaglutide starter titration with home blood pressure tracking.',
    planDraft: '1. Initiate Semaglutide 0.25mg subcutaneous weekly for 4 weeks.\n2. Maintain Lisinopril 10mg PO daily.\n3. Digital follow-up in 4 weeks for GI tolerance and dose titration.\n4. Provide dietary hydration protocol (min 64oz water daily).',
    assignedDoctor: 'Dr. Sarah Mitchell, MD',
  },
  {
    id: 'c-1081',
    patientId: 'pt-8302',
    patientName: 'Elena Rostova',
    patientAge: 38,
    patientGender: 'Female',
    patientState: 'WA',
    mrn: 'MRN-8302-WA',
    category: 'GLP-1 Weight Management',
    requestedMedication: 'Tirzepatide 2.5mg Starter Kit',
    triagePriority: 'urgent',
    status: 'pending_review',
    submittedAt: '2026-09-18T22:10:00Z',
    waitTimeFormatted: '1 hr ago',
    reasonForReview: 'Metformin GI intolerance history & postpartum metabolic resistance',
    chiefComplaint: 'Postpartum weight retention 18 months following second child. Prior Metformin caused severe GI cramping.',
    intakeAnswers: [
      { question: 'Current Weight & Height', answer: '188 lbs, 5 ft 5 in (BMI 31.8)' },
      { question: 'Target Weight', answer: '145 lbs' },
      { question: 'Hypothyroidism Details', answer: 'Levothyroxine 50mcg daily. Most recent TSH 1.84 mIU/L (Sept 2026).' },
      { question: 'Pregnancy & Breastfeeding Status', answer: 'Not currently pregnant, planning pregnancy, or breastfeeding.' },
      { question: 'Allergies', answer: 'Severe Metformin GI intolerance, Erythromycin.' },
    ],
    contraindicationsChecked: true,
    medicalHistoryFlags: ['Hypothyroidism (Controlled)', 'Metformin GI Sensitivity'],
    clinicalAssessmentDraft: '38yo female with Class I obesity (BMI 31.8), stable hypothyroidism, and Metformin intolerance. TSH well controlled. Cleared for dual GIP/GLP-1 receptor agonist (Tirzepatide 2.5mg starter).',
    planDraft: '1. Tirzepatide 2.5mg subcutaneous once weekly for 4 weeks.\n2. Continue Levothyroxine 50mcg in morning.\n3. Schedule 4-week clinical check-in.',
    assignedDoctor: 'Dr. Sarah Mitchell, MD',
  },
  {
    id: 'c-1080',
    patientId: 'pt-7721',
    patientName: 'David Chen',
    patientAge: 29,
    patientGender: 'Male',
    patientState: 'NY',
    mrn: 'MRN-7721-NY',
    category: 'Hair Regrowth',
    requestedMedication: 'Finasteride 1mg Oral Daily + Topical Minoxidil 5%',
    triagePriority: 'normal',
    status: 'pending_review',
    submittedAt: '2026-09-18T20:30:00Z',
    waitTimeFormatted: '2.5 hrs ago',
    reasonForReview: 'Norwood Stage III vertex thinning clinical intake',
    chiefComplaint: 'Noticed progressive crown and hairline thinning over the last 18 months. Moderate family history of male pattern baldness.',
    intakeAnswers: [
      { question: 'Duration of Hair Loss', answer: '18 - 24 months, accelerating in crown vertex.' },
      { question: 'Previous Treatments', answer: 'Over-the-counter Minoxidil foam with plateaued response.' },
      { question: 'Prostate / PSA History', answer: 'No history of prostate conditions or elevated PSA.' },
      { question: 'Contraindications / Liver Function', answer: 'No hepatic disease. No current prescription medications.' },
    ],
    contraindicationsChecked: true,
    medicalHistoryFlags: ['NKDA'],
    clinicalAssessmentDraft: '29yo male with androgenetic alopecia Norwood Stage III. No hepatic contraindications. Appropriate candidate for oral 5-alpha reductase inhibitor.',
    planDraft: '1. Finasteride 1mg oral tablet once daily.\n2. Counsel on 3-6 month timeline for visible stabilisation.\n3. Six-month digital hair check-in.',
    assignedDoctor: 'Dr. Sarah Mitchell, MD',
  },
  {
    id: 'c-1079',
    patientId: 'pt-6510',
    patientName: 'Robert Kowalski',
    patientAge: 52,
    patientGender: 'Male',
    patientState: 'TX',
    mrn: 'MRN-6510-TX',
    category: 'Men\'s Sexual Wellness',
    requestedMedication: 'Tadalafil 5mg Daily Therapy',
    triagePriority: 'normal',
    status: 'pending_review',
    submittedAt: '2026-09-18T19:15:00Z',
    waitTimeFormatted: '3.5 hrs ago',
    reasonForReview: 'PDE-5 inhibitor safety screening (Nitrate exclusion verified)',
    chiefComplaint: 'Mild situational erectile difficulty over past year associated with work stress. Requesting daily low-dose Tadalafil.',
    intakeAnswers: [
      { question: 'Cardiovascular History', answer: 'Cleared for normal sexual activity. Walk 3 miles without chest pain or dyspnea.' },
      { question: 'Nitroglycerin / Nitrates Usage', answer: 'STRICT NO. Do not take any nitrate medications, nitroglycerin spray/patches, or recreational poppers.' },
      { question: 'Blood Pressure Status', answer: 'Normal / Controlled (128/82 mmHg).' },
      { question: 'Alpha-Blockers Usage', answer: 'None.' },
    ],
    contraindicationsChecked: true,
    medicalHistoryFlags: ['Nitrate Absence Confirmed', 'Cardiovascular Cleared'],
    clinicalAssessmentDraft: '52yo male with mild ED. Statin therapy for lipids. Absolute absence of nitrates confirmed. Safe for daily Tadalafil 5mg.',
    planDraft: '1. Tadalafil 5mg PO once daily.\n2. Explicit warning against co-administration with nitrates or recreational alkyl nitrites.\n3. 90-day renewal evaluation.',
    assignedDoctor: 'Dr. Sarah Mitchell, MD',
  },
];

export const MOCK_PRESCRIPTIONS: PrescriptionRecord[] = [
  {
    id: 'rx-5910',
    patientId: 'pt-3882',
    patientName: 'Hannah Kim',
    patientMrn: 'MRN-3882-CA',
    medication: 'Semaglutide Subcutaneous Injection',
    strength: '0.25mg / 0.5mL',
    form: 'Pre-filled multi-dose pen',
    frequency: 'Once weekly for 4 weeks',
    route: 'Subcutaneous',
    quantity: '1 Pen (2mL total)',
    refills: 1,
    instructions: 'Inject 0.25mg subcutaneously into abdomen or thigh once weekly on the same day each week.',
    status: 'finalized',
    date: '2026-09-18',
    prescribedBy: 'Dr. Sarah Mitchell, MD',
    pharmacyDestination: 'Suga Partner Pharmacy (EPCS ID: #8849)',
    lockedAt: '2026-09-18T14:35:00Z',
  },
  {
    id: 'rx-5909',
    patientId: 'pt-5419',
    patientName: 'Sophia Alvarez',
    patientMrn: 'MRN-5419-FL',
    medication: 'Semaglutide Maintenance Pen',
    strength: '1.0mg / 0.5mL',
    form: 'Pre-filled pen',
    frequency: 'Once weekly',
    route: 'Subcutaneous',
    quantity: '1 Pen (4 doses)',
    refills: 2,
    instructions: 'Inject 1.0mg subcutaneously once weekly for maintenance metabolic control.',
    status: 'draft',
    date: '2026-09-18',
    prescribedBy: 'Dr. Sarah Mitchell, MD',
    pharmacyDestination: 'Suga Partner Pharmacy',
  },
  {
    id: 'rx-5908',
    patientId: 'pt-9412',
    patientName: 'Marcus Vance',
    patientMrn: 'MRN-9412-CA',
    medication: 'Semaglutide Starter Kit',
    strength: '0.25mg / 0.5mL',
    form: 'Injectable pen',
    frequency: 'Once weekly',
    route: 'Subcutaneous',
    quantity: '1 Pen (4 starter doses)',
    refills: 0,
    instructions: 'Inject 0.25mg subcutaneously once weekly for 4 weeks. Track BP weekly.',
    status: 'draft',
    date: '2026-09-18',
    prescribedBy: 'Dr. Sarah Mitchell, MD',
    pharmacyDestination: 'Suga Partner Pharmacy',
  },
];

export const MOCK_MESSAGE_THREADS: MessageThread[] = [
  {
    id: 'msg-401',
    patientId: 'pt-9412',
    patientName: 'Marcus Vance',
    patientMrn: 'MRN-9412-CA',
    subject: 'Question regarding injection timing and hydration',
    category: 'Symptom Follow-up',
    status: 'needs_reply',
    unread: true,
    priority: 'urgent',
    lastMessageTime: '25m ago',
    lastMessageSnippet: 'Hello Dr. Mitchell, I submitted my intake earlier. Should I take my first injection on a Friday evening or Sunday morning to manage any mild nausea?',
    relatedConsultationId: 'c-1082',
    messages: [
      {
        id: 'm-1',
        sender: 'patient',
        senderName: 'Marcus Vance',
        text: 'Hello Dr. Mitchell, I submitted my intake earlier. Should I take my first injection on a Friday evening or Sunday morning to manage any mild nausea?',
        timestamp: '2026-09-18T22:15:00Z',
        timeFormatted: '25m ago',
      },
    ],
  },
  {
    id: 'msg-402',
    patientId: 'pt-5419',
    patientName: 'Sophia Alvarez',
    patientMrn: 'MRN-5419-FL',
    subject: 'Ready for 1.0mg titration step',
    category: 'Refill Inquiry',
    status: 'needs_reply',
    unread: true,
    priority: 'normal',
    lastMessageTime: '2h ago',
    lastMessageSnippet: 'Dr. Mitchell, I finished my second month on 0.5mg and feeling great. My lab panel from Quest was uploaded. Can we proceed with the 1.0mg prescription?',
    relatedConsultationId: 'c-1078',
    messages: [
      {
        id: 'm-2',
        sender: 'patient',
        senderName: 'Sophia Alvarez',
        text: 'Dr. Mitchell, I finished my second month on 0.5mg and feeling great. My lab panel from Quest was uploaded. Can we proceed with the 1.0mg prescription?',
        timestamp: '2026-09-18T20:30:00Z',
        timeFormatted: '2h ago',
      },
    ],
  },
  {
    id: 'msg-403',
    patientId: 'pt-8302',
    patientName: 'Elena Rostova',
    patientMrn: 'MRN-8302-WA',
    subject: 'LabCorp panel confirmation',
    category: 'Lab Question',
    status: 'waiting',
    unread: false,
    priority: 'normal',
    lastMessageTime: '4h ago',
    lastMessageSnippet: 'I have verified that LabCorp sent the TSH panel directly to your portal.',
    relatedConsultationId: 'c-1081',
    messages: [
      {
        id: 'm-3',
        sender: 'doctor',
        senderName: 'Dr. Sarah Mitchell, MD',
        text: 'Hello Elena, thank you for providing your thyroid history. Please ensure the latest TSH panel is attached to your chart.',
        timestamp: '2026-09-18T17:00:00Z',
        timeFormatted: '6h ago',
      },
      {
        id: 'm-4',
        sender: 'patient',
        senderName: 'Elena Rostova',
        text: 'I have verified that LabCorp sent the TSH panel directly to your portal.',
        timestamp: '2026-09-18T19:00:00Z',
        timeFormatted: '4h ago',
      },
    ],
  },
];

export const MOCK_FOLLOW_UPS: FollowUpTask[] = [
  {
    id: 'fu-1',
    patientId: 'pt-9412',
    patientName: 'Marcus Vance',
    patientMrn: 'MRN-9412-CA',
    reason: 'Review baseline blood pressure and GLP-1 intake clearance',
    dueDate: 'Today',
    dueStatus: 'today',
    priority: 'urgent',
    category: 'GLP-1 Titration',
    nextAction: 'Review Consultation Intake',
    relatedConsultationId: 'c-1082',
  },
  {
    id: 'fu-2',
    patientId: 'pt-5419',
    patientName: 'Sophia Alvarez',
    patientMrn: 'MRN-5419-FL',
    reason: 'Sign off 1.0mg maintenance dosage titration and verify lipid response',
    dueDate: 'Today',
    dueStatus: 'today',
    priority: 'high',
    category: 'Refill Review',
    nextAction: 'Approve Maintenance Rx',
  },
  {
    id: 'fu-3',
    patientId: 'pt-8302',
    patientName: 'Elena Rostova',
    patientMrn: 'MRN-8302-WA',
    reason: 'Verify TSH baseline stability before Tirzepatide delivery',
    dueDate: 'Tomorrow',
    dueStatus: 'upcoming',
    priority: 'high',
    category: 'Lab Panel Review',
    nextAction: 'Inspect TSH Lab Record',
    relatedConsultationId: 'c-1081',
  },
  {
    id: 'fu-4',
    patientId: 'pt-3882',
    patientName: 'Hannah Kim',
    patientMrn: 'MRN-3882-CA',
    reason: '4-week starter dose tolerance & weight trajectory check-in',
    dueDate: 'Oct 16, 2026',
    dueStatus: 'upcoming',
    priority: 'normal',
    category: 'Symptom Check-in',
    nextAction: 'Schedule Check-in Note',
  },
];

export const MOCK_NOTIFICATIONS: DoctorNotification[] = [
  {
    id: 'notif-1',
    category: 'clinical',
    title: 'Urgent Triage: Marcus Vance (MRN-9412-CA)',
    message: 'Elevated baseline BMI (34.2) and Stage 1 BP (138/88) requires physician clearance prior to Semaglutide dispatch.',
    timestamp: '38m ago',
    isRead: false,
    priority: 'urgent',
    link: '/doctor/consultations/c-1082',
  },
  {
    id: 'notif-2',
    category: 'messages',
    title: 'New Clinical Message from Sophia Alvarez',
    message: 'Patient requested step-up to 1.0mg maintenance dose with attached Quest metabolic panel.',
    timestamp: '2h ago',
    isRead: false,
    priority: 'normal',
    link: '/doctor/messages',
  },
  {
    id: 'notif-3',
    category: 'administrative',
    title: 'EPCS DEA Licensure Recertification',
    message: 'California digital prescribing token verified active through December 2027.',
    timestamp: '1d ago',
    isRead: true,
    priority: 'normal',
    link: '/doctor/profile',
  },
];

// Helper utility getters
export function getPatientById(id: string): Patient | undefined {
  return MOCK_PATIENTS.find((p) => p.id === id);
}

export function getConsultationById(id: string): Consultation | undefined {
  return MOCK_CONSULTATIONS.find((c) => c.id === id);
}

export function getMessageThreadById(id: string): MessageThread | undefined {
  return MOCK_MESSAGE_THREADS.find((t) => t.id === id);
}
