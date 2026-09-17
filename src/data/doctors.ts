import { Doctor } from '../types';

export const doctorsData: Doctor[] = [
  {
    id: 'dr-marcus-vance',
    name: 'Dr. Marcus Vance',
    credentials: 'MD, FACP',
    role: 'Chief Medical Officer',
    specialty: 'Internal Medicine & Metabolic Pharmacology',
    education: 'Johns Hopkins School of Medicine',
    affiliations: ['Former Mayo Clinic Clinical Fellow', 'American College of Physicians'],
    licensedStatesCount: 32,
    featuredStates: ['CA', 'NY', 'TX', 'FL', 'IL'],
    quote: 'Treating whole metabolic health, never cutting clinical corners.',
    bio: 'Dr. Vance has over 16 years of experience in endocrinology, preventative longevity, and clinical weight management. He oversees Suga Health’s clinical safety protocols, ensuring every GLP-1 intake adheres to strict contraindication screening.',
    image: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?q=80&w=800&auto=format&fit=crop',
    boardCertification: 'American Board of Internal Medicine (ABIM)',
    yearsOfExperience: 16
  },
  {
    id: 'dr-elena-chen',
    name: 'Dr. Elena Chen',
    credentials: 'MD, FAAD',
    role: 'Director of Clinical Dermatology',
    specialty: 'Trichology & Follicular Regeneration',
    education: 'Stanford University School of Medicine',
    affiliations: ['UCSF Medical Center Alum', 'American Academy of Dermatology'],
    licensedStatesCount: 26,
    featuredStates: ['CA', 'WA', 'OR', 'MA', 'NY'],
    quote: 'Precision follicular stimulation with minimal systemic exposure.',
    bio: 'Dr. Chen specializes in pattern hair loss in men and women, androgenetic alopecia, and dual-action compounds. Her research in low-dose topical formulations guides Suga’s customized hair restoration regimens.',
    image: 'https://images.unsplash.com/photo-1594824813583-294711319717?q=80&w=800&auto=format&fit=crop',
    boardCertification: 'American Board of Dermatology (ABD)',
    yearsOfExperience: 12
  },
  {
    id: 'dr-julian-rivera',
    name: 'Dr. Julian Rivera',
    credentials: 'MD',
    role: 'Lead Urologist & Men’s Health Director',
    specialty: 'Endocrine Health & Sexual Vitality',
    education: 'Columbia University Vagelos College of Physicians',
    affiliations: ['Mount Sinai Health System', 'American Urological Association'],
    licensedStatesCount: 28,
    featuredStates: ['NY', 'NJ', 'PA', 'FL', 'OH'],
    quote: 'Restoring vitality through exact, evidence-based therapeutic dosing.',
    bio: 'Dr. Rivera is a practicing urologist with extensive clinical expertise in vascular erectile health and hormone optimization. He ensures all patients receive thorough cardiovascular safety checks prior to prescription dispensing.',
    image: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?q=80&w=800&auto=format&fit=crop',
    boardCertification: 'American Board of Urology (ABU)',
    yearsOfExperience: 14
  },
  {
    id: 'dr-sarah-jenkins',
    name: 'Dr. Sarah Jenkins',
    credentials: 'DO',
    role: 'Director of Preventive Longevity',
    specialty: 'Integrative Wellness & Primary Care',
    education: 'Georgetown University Medical Center',
    affiliations: ['Cleveland Clinic Health System', 'American Osteopathic Association'],
    licensedStatesCount: 24,
    featuredStates: ['VA', 'DC', 'MD', 'NC', 'GA'],
    quote: 'Proactive titration and ongoing clinician guidance ensure lasting health.',
    bio: 'Dr. Jenkins champions whole-person osteopathic medicine and lifestyle-integrated pharmacotherapy. She directs Suga’s ongoing patient check-in protocols and titration schedule guidelines.',
    image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=800&auto=format&fit=crop',
    boardCertification: 'American Osteopathic Board of Internal Medicine (AOBIM)',
    yearsOfExperience: 11
  }
];
