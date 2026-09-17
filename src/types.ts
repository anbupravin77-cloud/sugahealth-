export type TreatmentCategory = 'weight' | 'hair' | 'sexual';

export interface Product {
  id: string;
  name: string;
  category: TreatmentCategory;
  tagline: string;
  activeIngredients: string;
  deliveryMethod: string;
  dosage: string;
  clinicalProof: string;
  startingPrice: string;
  billingCadence: string;
  image: string;
  isPopular?: boolean;
  rxRequired: boolean;
  description: string;
  benefits: string[];
  mechanismOfAction: string;
  howToUse: string;
}

export interface Doctor {
  id: string;
  name: string;
  credentials: string;
  role: string;
  specialty: string;
  education: string;
  affiliations: string[];
  licensedStatesCount: number;
  featuredStates: string[];
  quote: string;
  bio: string;
  image: string;
  boardCertification: string;
  yearsOfExperience: number;
}
