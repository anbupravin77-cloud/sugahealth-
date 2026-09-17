import { Product } from '../types';

export const productsData: Product[] = [
  {
    id: 'semaglutide-b12',
    name: 'Compounded Semaglutide + B12',
    category: 'weight',
    tagline: 'Weekly GLP-1 Receptor Agonist Injection',
    activeIngredients: 'Semaglutide + Cyanocobalamin (Vitamin B12)',
    deliveryMethod: 'Once-Weekly Subcutaneous Micro-Injection',
    dosage: 'Starting at 0.25mg titrated up to 2.5mg',
    clinicalProof: 'Avg. 15% body weight reduction in landmark clinical trials',
    startingPrice: '$199',
    billingCadence: 'per month, all-inclusive',
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?q=80&w=900&auto=format&fit=crop',
    isPopular: true,
    rxRequired: true,
    description: 'A customized formulation combining pharmaceutical-grade Semaglutide with Vitamin B12 to support metabolic energy while suppressing chronic appetite cravings.',
    benefits: [
      'Targets central nervous system hunger signals',
      'Slows gastric emptying for prolonged post-meal satiety',
      'Vitamin B12 helps reduce transient fatigue & nausea',
      'Dose titrated gradually by your dedicated physician'
    ],
    mechanismOfAction: 'Mimics natural glucagon-like peptide-1 (GLP-1), binding to satiety centers in the hypothalamus and optimizing postprandial insulin secretion.',
    howToUse: 'Self-administered once weekly subcutaneously into the abdomen, thigh, or upper arm using virtually painless micro-needles.'
  },
  {
    id: 'tirzepatide-dual',
    name: 'Compounded Tirzepatide (Dual Incretin)',
    category: 'weight',
    tagline: 'Dual GIP & GLP-1 Receptor Agonist Protocol',
    activeIngredients: 'Tirzepatide + Pyridoxine (Vitamin B6)',
    deliveryMethod: 'Once-Weekly Subcutaneous Injection',
    dosage: 'Starting at 2.5mg titrated up to 15mg',
    clinicalProof: 'Up to 20.9% average body weight loss in SURMOUNT trials',
    startingPrice: '$299',
    billingCadence: 'per month, all-inclusive',
    image: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?q=80&w=900&auto=format&fit=crop',
    isPopular: false,
    rxRequired: true,
    description: 'The premier next-generation dual incretin agonist targeting both GIP and GLP-1 receptors simultaneously for heightened metabolic response and fat oxidation.',
    benefits: [
      'Dual hormone pathway for deeper metabolic synergy',
      'Enhanced glycemic control and insulin sensitivity',
      'Shown to produce higher total weight reduction than single GLP-1',
      'All injection supplies, clinician messaging, and shipping included'
    ],
    mechanismOfAction: 'Simultaneously co-activates glucose-dependent insulinotropic polypeptide (GIP) and GLP-1 receptors, coordinating metabolic hormone pathways.',
    howToUse: 'Subcutaneous injection once every 7 days on the same day each week, with or without meals.'
  },
  {
    id: 'dual-topical-hair',
    name: 'Dual Topical Finasteride & Minoxidil',
    category: 'hair',
    tagline: 'Non-Greasy Precision Scalp Micro-Mist',
    activeIngredients: 'Finasteride 0.3% + Minoxidil 6% + Caffeine USP',
    deliveryMethod: 'Direct Follicular Precision Dropper / Spray',
    dosage: '1 mL applied twice daily directly to thinning areas',
    clinicalProof: '88% stoppage of crown loss with negligible systemic absorption',
    startingPrice: '$45',
    billingCadence: 'per month',
    image: 'https://images.unsplash.com/photo-1608248597359-009587424683?q=80&w=900&auto=format&fit=crop',
    isPopular: true,
    rxRequired: true,
    description: 'A targeted topical compounding that delivers clinical Finasteride directly to miniaturizing hair follicles while avoiding systemic serum DHT reduction.',
    benefits: [
      'Locally blocks DHT enzyme right at the dermal papilla',
      'Minoxidil dilates micro-capillaries to flood follicles with nutrients',
      'Quick-drying, fragrance-free formula leaves zero oily residue',
      'Noticeable stabilization in 60–90 days'
    ],
    mechanismOfAction: 'Inhibits type II 5-alpha reductase locally in the scalp while opening potassium channels to extend follicular anagen (growth) phase.',
    howToUse: 'Apply 1 mL once or twice daily onto dry scalp in areas of thinning. Massage lightly with fingertips. Do not rinse for 4 hours.'
  },
  {
    id: 'oral-hair-capsule',
    name: 'Oral Multi-Pathway Hair Density Formula',
    category: 'hair',
    tagline: 'Once-Daily Enteric-Coated Trichology Capsule',
    activeIngredients: 'Oral Minoxidil 2.5mg + Biotin 5000mcg + Saw Palmetto',
    deliveryMethod: 'Single Daily Oral Capsule',
    dosage: '1 capsule daily with water',
    clinicalProof: '94% user-reported improvement in overall hairline thickness',
    startingPrice: '$39',
    billingCadence: 'per month',
    image: 'https://images.unsplash.com/photo-1550572017-ed200f5e6343?q=80&w=900&auto=format&fit=crop',
    isPopular: false,
    rxRequired: true,
    description: 'Convenient oral prescription combining low-dose micro-Minoxidil with botanical DHT regulators for individuals seeking complete coverage without topical application.',
    benefits: [
      'Effortless 5-second daily routine',
      'Provides uniform follicular stimulation across entire scalp & crown',
      'Biotin and zinc support keratin infrastructure',
      'Compounded in certified 503A/503B state-licensed facilities'
    ],
    mechanismOfAction: 'Systemically increases vascular perfusion to micro-follicles, revitalizing resting telogen hairs into active anagen growth cycles.',
    howToUse: 'Take one capsule once per day with a meal and full glass of water.'
  },
  {
    id: 'tadalafil-odt',
    name: 'Compounded Tadalafil Rapid-Dissolve (ODT)',
    category: 'sexual',
    tagline: 'Sublingual Fast-Dissolve Mint Tablet',
    activeIngredients: 'Tadalafil (5mg Daily or 20mg On-Demand) + L-Citrulline',
    deliveryMethod: 'Sublingual Oral Disintegrating Tablet (Melts on tongue)',
    dosage: '5mg once daily or 20mg 30 minutes before activity',
    clinicalProof: 'Up to 36-hour clinical efficacy window with rapid sublingual onset',
    startingPrice: '$48',
    billingCadence: 'per month (30-day supply)',
    image: 'https://images.unsplash.com/photo-1585435557343-3b092031a831?q=80&w=900&auto=format&fit=crop',
    isPopular: true,
    rxRequired: true,
    description: 'Fast-absorbing sublingual formulation that bypasses first-pass liver metabolism, entering blood vessels under the tongue for rapid bioavailability and reliable performance.',
    benefits: [
      'Rapid absorption in 15–25 minutes without swallowing pills',
      'Flexible 36-hour window allows natural, unpressured spontaneity',
      'Daily micro-dose option for ongoing ready-state vitality',
      'Discreet pocket-sized blister pack with neutral branding'
    ],
    mechanismOfAction: 'Selective PDE-5 inhibitor preserving cyclic GMP levels, promoting smooth muscle relaxation and sustained penile arterial inflow.',
    howToUse: 'Place one tablet under the tongue and allow it to dissolve completely. Avoid swallowing with water for maximal sublingual absorption.'
  },
  {
    id: 'sildenafil-troche',
    name: 'Compounded Sildenafil Quick-Action Troche',
    category: 'sexual',
    tagline: 'Rapid-Onset Precision Sublingual Troche',
    activeIngredients: 'Sildenafil Citrate 50mg or 100mg',
    deliveryMethod: 'Dissolvable Sublingual Troche',
    dosage: '1 troche 15–30 minutes prior to intimacy',
    clinicalProof: '95% clinical response rate with faster onset than standard tablets',
    startingPrice: '$35',
    billingCadence: 'per month (pack of 8–12)',
    image: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?q=80&w=900&auto=format&fit=crop',
    isPopular: false,
    rxRequired: true,
    description: 'High-potency, on-demand compound engineered for immediate confidence and firm vascular responsiveness when peak timing matters most.',
    benefits: [
      'Rapid onset in as little as 15–30 minutes',
      'Sublingual delivery avoids delay caused by recent meals or fatty foods',
      'Pleasant natural mint flavor',
      'Custom dose matched precisely to your health profile'
    ],
    mechanismOfAction: 'Potent competitive inhibitor of phosphodiesterase type 5 (PDE5), accelerating vascular nitric oxide signaling pathways.',
    howToUse: 'Dissolve between cheek and gum or under tongue 15 to 30 minutes before planned intimacy.'
  }
];
