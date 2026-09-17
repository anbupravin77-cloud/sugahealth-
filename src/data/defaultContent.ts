import { SugaWebsiteContent } from '../types/content';
import { productsData } from './products';
import { doctorsData } from './doctors';

export const defaultContent: SugaWebsiteContent = {
  global: {
    tagline: 'live naturally',
    headerCta: {
      label: 'Start consultation',
      path: '/consultation'
    },
    navLinks: [
      { name: 'Weight Loss', path: '/weight-loss', desc: 'GLP-1 medical protocols' },
      { name: 'Hair Growth', path: '/hair-growth', desc: 'Follicular regeneration' },
      { name: 'Sexual Health', path: '/sexual-health', desc: 'Performance & longevity' },
      { name: 'About', path: '/about', desc: 'Clinical team & safety' },
    ],
    footer: {
      description: 'Confidential, doctor-guided treatments for medical weight loss, hair restoration, and sexual vitality. Real FDA-approved medicines delivered with care and complete privacy.',
      treatmentLinks: [
        { label: 'Medical Weight Loss (GLP-1)', path: '/weight-loss' },
        { label: 'Hair Regrowth & Density', path: '/hair-growth' },
        { label: 'Sexual Health & Performance', path: '/sexual-health' },
        { label: 'Start Online Consultation', path: '/consultation' },
      ],
      practiceLinks: [
        { label: 'Our Doctors & Medical Board', path: '/#doctors' },
        { label: 'Our Products & Formulary', path: '/#products' },
        { label: 'About Our Clinical Mission', path: '/about' },
        { label: 'Patient Medical Intake', path: '/consultation' },
      ],
      telehealthDisclaimer: 'Suga.health facilitates telehealth consultations through licensed medical professionals. Prescription products require an online evaluation with a licensed healthcare provider who will determine if a prescription is appropriate.',
      pharmacyDisclaimer: 'Medications are dispensed by licensed US pharmacies. Not for emergency medical conditions. If you are experiencing a medical emergency, call 911 immediately.',
      copyright: 'Suga.health. All rights reserved.'
    }
  },
  seo: {
    home: {
      title: 'Suga.health — Medical weight loss, hair growth & sexual health',
      description: 'Clinically proven, expert-prescribed treatment for medical weight loss, hair growth, and sexual health. Confidential, individualized care reviewed and approved by experienced clinicians.'
    },
    weightLoss: {
      title: 'Medical Weight Loss Protocols — Suga.health',
      description: 'FDA-approved GLP-1 treatments prescribed by licensed US clinicians to quiet biological cravings and restore metabolic balance.'
    },
    hairGrowth: {
      title: 'Evidence-Based Hair Regrowth — Suga.health',
      description: 'Clinically proven treatments targeting DHT and follicular blood flow, prescribed by licensed US dermatologists and physicians.'
    },
    sexualHealth: {
      title: 'Sexual Health & Longevity — Suga.health',
      description: 'Confidential medical treatment for erectile health and performance, reviewed by licensed physicians and delivered in unbranded packaging.'
    },
    about: {
      title: 'Clinical Mission & Standards — Suga.health',
      description: 'Suga.health was founded by US-trained clinicians with one core conviction: quality medical care should never depend on the length of a clinic waiting room line.'
    }
  },
  home: {
    hero: {
      title: 'Clinically proven care. Prescribed for real life.',
      description: 'Doctor-guided treatments for medical weight loss, hair density, and sexual vitality. Confidential evaluations, FDA-approved medications, and free doorstep delivery.',
      primaryCta: {
        label: 'Start Free Assessment',
        path: '/consultation'
      },
      secondaryCta: {
        label: 'Explore Treatment Protocols',
        path: '#treatments'
      },
      trustMetrics: [
        { value: 100, suffix: '%', label: 'US Doctors' },
        { value: 0, prefix: '', suffix: '', label: 'FDA-Approved Meds' }, // 0 indicates static text in the counter
        { value: 2, prefix: 'Discreet ', suffix: '-Day', label: 'Shipping' },
        { value: 4.9, decimals: 1, suffix: '/5', label: 'Rating (12k+)' },
      ]
    },
    specializations: [
      {
        id: 'weight',
        number: '01',
        title: 'Medical Weight Loss',
        subtitle: 'GLP-1 Metabolic Health Protocol',
        desc: 'Target the biological roots of appetite and insulin response with FDA-approved Semaglutide and Tirzepatide.',
        stats: 'Avg. 15% weight reduction',
        timeline: 'Noticeable in 4–8 weeks',
        highlights: [
          'Doctor-prescribed GLP-1 medications',
          'Regulates hunger and metabolic signals',
          'Ongoing dose titration & clinician support',
          'No starvation diets or calorie counting'
        ],
        path: '/weight-loss',
        img: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=1200&auto=format&fit=crop&grayscale=1'
      },
      {
        id: 'hair',
        number: '02',
        title: 'Hair Restoration',
        subtitle: 'Follicular Density & Regrowth',
        desc: 'Combat DHT-driven thinning at the root with customized oral and topical combinations of Finasteride and Minoxidil.',
        stats: '92% stopped further loss',
        timeline: 'Visible density in 90–120 days',
        highlights: [
          'Clinically proven active ingredients',
          'Custom formulas for men & women',
          'Protects active & dormant follicles',
          'Simple once-daily morning routine'
        ],
        path: '/hair-growth',
        img: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=1200&auto=format&fit=crop&grayscale=1'
      },
      {
        id: 'sexual',
        number: '03',
        title: 'Sexual Health',
        subtitle: 'Performance & Endocrine Care',
        desc: 'Confidential, judgment-free clinical treatments for ED and vitality with compounded and brand Sildenafil & Tadalafil.',
        stats: '95% clinical response rate',
        timeline: 'Works in 30–60 minutes',
        highlights: [
          'On-demand or daily micro-dosing',
          '100% online & 100% confidential',
          'Delivered in unbranded discreet boxes',
          'Physician-customized strength'
        ],
        path: '/sexual-health',
        img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1200&auto=format&fit=crop&grayscale=1'
      }
    ],
    timeline: {
      weight: [
        {
          phase: 'Month 1',
          label: 'Metabolic Reset',
          description: "Initial micro-dose titration minimizes side effects while dampening constant food cravings and biological 'food noise'."
        },
        {
          phase: 'Months 2–3',
          label: 'Consistent Loss',
          description: 'Steady 1–2 lbs weekly reduction. Improved insulin sensitivity, increased daytime energy, and reduced visceral fat.'
        },
        {
          phase: 'Months 4–6+',
          label: 'Target Stability',
          description: 'Reach your personal target weight. Physician evaluates maintenance dosing to lock in sustainable metabolic health.'
        }
      ],
      hair: [
        {
          phase: 'Months 1–2',
          label: 'Follicle Stabilization',
          description: 'DHT inhibition begins. Normal initial shedding of weak hairs as miniaturized follicles enter the active anagen growth phase.'
        },
        {
          phase: 'Months 3–4',
          label: 'Initial Regrowth',
          description: 'Early signs of thickening along the crown and hairline. Faint vellus hairs transition into stronger terminal strands.'
        },
        {
          phase: 'Months 6+',
          label: 'Peak Density',
          description: 'Noticeably denser coverage, reduced scalp visibility, and strengthened hair shafts with permanent daily routine.'
        }
      ],
      sexual: [
        {
          phase: 'Day 1',
          label: 'Immediate Efficacy',
          description: 'On-demand or daily protocol delivers reliable blood flow within 30 to 60 minutes of ingestion.'
        },
        {
          phase: 'Weeks 2–4',
          label: 'Confidence Restored',
          description: 'Elimination of performance anxiety. Daily micro-dosing allows completely spontaneous, natural intimacy.'
        },
        {
          phase: 'Ongoing',
          label: 'Continuous Optimization',
          description: 'Regular check-ins with your Suga physician to fine-tune dosage, refill automatically, and monitor total vascular health.'
        }
      ]
    },
    howItWorks: [
      {
        step: '01',
        title: 'Online Health Intake',
        time: '5 Minutes',
        desc: 'Complete a private health evaluation from any smartphone or computer. Share your health goals, medical history, and symptoms.'
      },
      {
        step: '02',
        title: 'Physician Evaluation',
        time: 'Under 24 Hours',
        desc: 'A licensed US physician reviews your chart to verify clinical suitability and prescribes the optimal custom medication dose.'
      },
      {
        step: '03',
        title: 'Discreet Delivery',
        time: '2-Day Doorstep',
        desc: 'Medications ship free from a licensed US pharmacy in unbranded packaging, with continuous access to your care team for refills.'
      }
    ],
    accountability: [
      {
        value: 5,
        suffix: ' Min',
        title: 'Intake Time',
        desc: 'Thoughtful and comprehensive online questions'
      },
      {
        value: 24,
        prefix: '< ',
        suffix: 'h',
        title: 'Doctor Review',
        desc: 'Fast evaluation by board-certified physicians'
      },
      {
        value: 100,
        suffix: '%',
        title: 'Human Doctors',
        desc: 'Every single chart is reviewed by real clinicians'
      }
    ],
    comparison: {
      traditional: [
        '3–6 weeks waiting for an in-person doctor appointment',
        'Uncomfortable waiting rooms and clinical interrogations',
        'In-person pharmacy pickup with public counter announcements',
        'Surprise insurance co-pays and facility fee invoices'
      ],
      sugaModel: [
        'Physician evaluation within 24 hours online',
        '100% confidential intake from the privacy of your home',
        'Free 2-day delivery in unmarked, discreet packaging',
        'Transparent upfront pricing with ongoing doctor messaging'
      ]
    },
    faqs: [
      {
        q: 'How does an online consultation work?',
        a: 'You complete a 5-minute medical questionnaire covering your health history, symptoms, and lifestyle. A board-certified US physician reviews your submission within 24 hours. If appropriate, they write an individualized prescription, and our licensed pharmacy ships it directly to you.'
      },
      {
        q: 'Are the medications real and FDA-approved?',
        a: 'Yes. All medications prescribed through Suga.health are FDA-approved drugs or formulated with pure active pharmaceutical ingredients from FDA-regulated US compounding pharmacies. We never use counterfeit or unregulated substances.'
      },
      {
        q: 'How discreet is the packaging?',
        a: 'Completely discreet. Your prescription arrives in a plain, unbranded cardboard mailer with no mention of Suga.health or the contents. Your privacy is strictly protected.'
      },
      {
        q: 'Do I need health insurance to use Suga.health?',
        a: 'No insurance is required. We offer transparent, upfront pricing that includes both the medical consultation, all doctor messaging, and the medication itself with free 2-day delivery. No surprise hospital bills or copayments.'
      },
      {
        q: 'Can I message my physician if I have questions or side effects?',
        a: 'Absolutely. Ongoing clinician communication is included at no additional charge. You can message your doctor anytime through your secure patient portal to discuss adjustments or concerns.'
      }
    ],
    ctaBanner: {
      eyebrow: 'Take the first step',
      title: 'Your personalized medical plan is 5 minutes away.',
      description: 'Answer quick medical questions. A licensed clinician will review your file and tailor your prescription.',
      buttonText: 'Start Free Assessment',
      buttonLink: '/consultation'
    }
  },
  weightLoss: {
    header: {
      title: 'Medical Weight Loss. Driven by Biology.',
      subtitle: 'FDA-approved GLP-1 treatments prescribed by licensed US clinicians to quiet biological cravings and restore metabolic balance.',
      image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=2000&auto=format&fit=crop&grayscale=1'
    },
    science: {
      eyebrow: 'Metabolic Truth',
      title: 'Why this works when traditional diets failed.',
      description: 'Chronic weight struggle is not a personal failure of willpower. It is controlled by evolutionary hormones, ghrelin spikes, and metabolic resistance.',
      clinicalFact: 'In NEJM clinical trials, patients taking GLP-1 therapies lost an average of 15% to 20% of baseline body weight over 68 weeks alongside lifestyle changes.'
    },
    pillars: [
      {
        num: '01',
        tag: 'FDA-Regulated Protocol',
        title: 'GLP-1 Receptor Agonists',
        desc: "Semaglutide and Tirzepatide mimic the body's natural satiety hormone, delaying gastric emptying and quieting perpetual 'food noise' in the brain."
      },
      {
        num: '02',
        tag: 'Patient Safety First',
        title: 'Comprehensive Clinical Screening',
        desc: 'Every patient undergoes a full online review by a US-licensed doctor to evaluate BMI, thyroid history, and contraindications before any script is issued.'
      },
      {
        num: '03',
        tag: 'Lasting Results',
        title: 'Metabolic Stabilization & Tapering',
        desc: 'We focus on long-term health preservation, preserving lean muscle mass and assisting in sustainable lifestyle routines for permanent results.'
      }
    ],
    medications: [
      {
        tag: 'GLP-1 Mono-agonist',
        title: 'Semaglutide',
        desc: 'The gold-standard GLP-1 receptor agonist that slows digestion and communicates fullness directly with the hypothalamus.',
        benefits: [
          'Average 15% body weight reduction in trials',
          'Convenient once-weekly self-injection pen',
          'Slow monthly dose escalation to minimize nausea'
        ],
        buttonText: 'Assess for Semaglutide',
        buttonLink: '/consultation'
      },
      {
        tag: 'Dual GIP / GLP-1 Agonist',
        title: 'Tirzepatide',
        desc: 'Next-generation dual incretin mimetic activating both GIP and GLP-1 pathways for enhanced glycemic and adiposity control.',
        benefits: [
          'Up to 20.9% average body weight loss in SURMOUNT trials',
          'Dual receptor targeting for maximum metabolic impact',
          'Doctor-monitored dosage titration schedule'
        ],
        buttonText: 'Assess for Tirzepatide',
        buttonLink: '/consultation'
      }
    ],
    comparison: {
      eyebrow: 'Comparative Pharmacology',
      title: 'Interactive Protocol Comparison',
      description: 'Explore side-by-side clinical mechanisms, trial weight loss outcomes, and expected biological trajectories.'
    },
    ctaBanner: {
      title: 'One confidential consultation. An honest plan.',
      description: 'Complete your online intake in under 5 minutes. A board-certified physician will review your history and recommend the right course of treatment.',
      buttonText: 'Start Free Assessment',
      buttonLink: '/consultation'
    }
  },
  hairGrowth: {
    header: {
      title: 'Evidence-Based Hair Regrowth. Act Before Follicles Sleep.',
      subtitle: 'Clinically proven treatments targeting DHT and follicular blood flow, prescribed by licensed US dermatologists and physicians.',
      image: 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?q=80&w=2000&auto=format&fit=crop&grayscale=1'
    },
    science: {
      eyebrow: 'Follicular Biology',
      title: 'Real medicine. Decades of proven clinical results.',
      description: 'No unproven light helmets or snake-oil serums. We prescribe the foundational medical therapies proven across clinical trials to halt follicular miniaturization.',
      clinicalFact: 'Over 90% of men who begin Finasteride and Minoxidil during early thinning halt further loss, with over 65% experiencing measurable hair regrowth within 12 months.'
    },
    pillars: [
      {
        num: '01',
        tag: 'Clinical First-Line',
        title: 'DHT Enzyme Inhibition',
        desc: 'Finasteride blocks 5-alpha reductase, preventing testosterone from converting into DHT—the primary hormone causing follicular shrinkage and hair thinning.'
      },
      {
        num: '02',
        tag: 'Growth Stimulator',
        title: 'Microvascular Follicular Stimulation',
        desc: 'Minoxidil acts as a potassium channel opener, widening blood vessels around the dermal papilla to rush oxygen and key nutrients directly to growing hair bulbs.'
      },
      {
        num: '03',
        tag: 'Zero Hassle Routine',
        title: 'Individualized Delivery Modes',
        desc: 'Choose between convenient once-daily oral tablets or custom 2-in-1 compounded topical drops that absorb cleanly without greasy residue.'
      }
    ],
    comparison: {
      eyebrow: 'Comparative Dermatology',
      title: 'Interactive Treatment Comparison',
      description: 'Explore side-by-side follicular biology, DHT suppression statistics, and expected clinical progression milestones.'
    },
    ctaBanner: {
      title: 'One confidential consultation. An honest plan.',
      description: 'Complete your online intake in under 5 minutes. A board-certified physician will review your history and recommend the right course of treatment.',
      buttonText: 'Start Free Assessment',
      buttonLink: '/consultation'
    }
  },
  sexualHealth: {
    header: {
      title: 'Sexual Health & Longevity. Handled with Complete Discretion.',
      subtitle: 'Confidential medical treatment for erectile health and performance, reviewed by licensed physicians and delivered in unbranded packaging.',
      image: 'https://images.unsplash.com/photo-1497250681558-e6d1cc5451a4?q=80&w=2000&auto=format&fit=crop&grayscale=1'
    },
    conditions: [
      {
        title: 'Erectile Dysfunction (ED)',
        stat: 'Affects ~50% of men over 40',
        desc: 'Proven daily micro-dosing or on-demand options like Sildenafil and Tadalafil, tailored to your vascular health profile.',
        meds: 'Sildenafil (Viagra®) & Tadalafil (Cialis®)',
        buttonText: 'Assess Eligibility',
        buttonLink: '/consultation'
      },
      {
        title: 'Premature Ejaculation (PE)',
        stat: 'Over 90% respond to treatment',
        desc: 'Medical and neurological interventions designed to significantly improve stamina and control without desensitizing satisfaction.',
        meds: 'Custom formulations & PDE5 combinations',
        buttonText: 'Assess Eligibility',
        buttonLink: '/consultation'
      },
      {
        title: 'Hormonal & Vitality Workup',
        stat: 'Comprehensive physician evaluation',
        desc: 'Thorough symptom screening for underlying metabolic and testosterone deficiency—treated responsibly only when clinically indicated.',
        meds: 'Cardiovascular & endocrine review',
        buttonText: 'Assess Eligibility',
        buttonLink: '/consultation'
      }
    ],
    cardiovascular: {
      eyebrow: 'Cardiovascular Insight',
      title: 'Vascular health is whole-body health.',
      paragraphs: [
        'Penile arteries are among the smallest vascular channels in the human body (1–2mm). Subtle changes in blood flow often serve as an early clinical window into cardiovascular and metabolic health.',
        'That is why our physicians review your full profile—blood pressure, sleep apnea risk, metabolic markers, and lifestyle—ensuring the right, safe treatment.'
      ],
      statNumber: '1 in 2',
      statLabel: 'Men Over 40',
      statDesc: 'Experience occasional or chronic ED. It is a biological condition that responds predictably to medical care.'
    },
    privacy: [
      {
        title: 'Unbranded Packaging',
        desc: 'Shipped in a plain brown mailer with zero logos, condition names, or medication details on the exterior.'
      },
      {
        title: 'Neutral Billing',
        desc: 'Your bank statement reflects a generic healthcare provider charge. Nothing identifying your specific prescription.'
      },
      {
        title: 'Bank-Grade Privacy & Security',
        desc: 'Your health records are encrypted and protected under strict federal patient privacy standards. We never sell your personal data.'
      }
    ],
    ctaBanner: {
      title: 'Five quiet minutes. No waiting room.',
      description: 'Answer private medical questions online. A licensed physician will review your history and prescribe the appropriate treatment if suitable.',
      buttonText: 'Start Free Assessment',
      buttonLink: '/consultation'
    }
  },
  about: {
    header: {
      title: 'Clinical Care Built on Trust. Not Volume.',
      subtitle: 'Suga.health was founded by US-trained clinicians with one core conviction: quality medical care should never depend on the length of a clinic waiting room line.',
      image: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?q=80&w=2000&auto=format&fit=crop&grayscale=1'
    },
    mission: {
      eyebrow: 'Our Guiding Mission',
      title: "What 'live naturally' actually means to us.",
      subtitle: 'Medicine as a bridge, not a subscription trap.',
      paragraphs: [
        'To generic wellness brands, “natural” is an overused buzzword. To a practicing physician, it describes a direction of biological health. We do not believe in locking patients into endless dependency.',
        'When treatment is appropriate, our licensed doctors prescribe it to treat, stabilize, and optimize your biology. We work steadily toward the minimal effective therapeutic dose that sustains your vitality and wellness.',
        'That is the true essence of living naturally: empowering your body to do as much of the vital work as it safely can, with science and medicine filling only the necessary gap.'
      ]
    },
    standards: [
      {
        title: 'Physicians Listen First',
        desc: 'Your medical questionnaire is thoroughly reviewed by a licensed doctor, not an automated AI classifier. Your complete health context matters before any treatment decision.'
      },
      {
        title: 'Prescribe Only When Clinically Sound',
        desc: 'We are not a pill dispensary. If an in-person diagnostic test, lab panel, or lifestyle modification is the safer path, our physicians will tell you plainly.'
      },
      {
        title: 'Proactive Ongoing Follow-Up',
        desc: 'Health outcomes happen over months, not at checkout. We check in on your titration curve, monitor side effects, and adjust protocols as your body responds.'
      }
    ],
    safety: [
      {
        title: '100% US-Licensed & Board-Certified',
        desc: 'Every clinician reviewing patient files holds active medical licenses in the state where the patient resides.'
      },
      {
        title: 'Legitimate US Compounding & Partner Pharmacies',
        desc: 'Medications are dispensed exclusively through licensed, inspected US pharmacies adhering to USP 795, 797, and cGMP standards.'
      },
      {
        title: 'Bank-Grade Security & End-to-End Encryption',
        desc: 'Your consultations, health uploads, and medical history are stored in private, confidential encrypted medical vaults.'
      },
      {
        title: 'Transparent Pricing with Zero Hidden Fees',
        desc: 'You see the exact monthly investment before ordering. No surprise hospital facility fees or subscription lock-ins.'
      }
    ],
    metrics: [
      {
        value: 5,
        suffix: ' Min',
        title: 'Intake Time',
        desc: 'Thoughtful and comprehensive online questions'
      },
      {
        value: 24,
        prefix: '< ',
        suffix: 'h',
        title: 'Doctor Review',
        desc: 'Fast evaluation by board-certified physicians'
      },
      {
        value: 100,
        suffix: '%',
        title: 'Human Doctors',
        desc: 'Every single chart is reviewed by real clinicians'
      }
    ],
    ctaBanner: {
      title: 'Modern clinical care. Grounded in science.',
      description: 'Experience healthcare that respects your time, dignity, and personal health journey.',
      buttonText: 'Start Free Assessment',
      buttonLink: '/consultation'
    }
  },
  products: productsData,
  doctors: doctorsData
};
