import { Doctor, Product } from '../types';

export interface GlobalContent {
  tagline: string;
  headerCta: {
    label: string;
    path: string;
  };
  navLinks: Array<{
    name: string;
    path: string;
    desc: string;
  }>;
  footer: {
    description: string;
    treatmentLinks: Array<{ label: string; path: string }>;
    practiceLinks: Array<{ label: string; path: string }>;
    telehealthDisclaimer: string;
    pharmacyDisclaimer: string;
    copyright: string;
  };
}

export interface SeoMetadata {
  title: string;
  description: string;
  ogImage?: string;
}

export interface SeoContent {
  home: SeoMetadata;
  weightLoss: SeoMetadata;
  hairGrowth: SeoMetadata;
  sexualHealth: SeoMetadata;
  about: SeoMetadata;
}

export interface HomeContent {
  hero: {
    title: string;
    description: string;
    primaryCta: { label: string; path: string };
    secondaryCta: { label: string; path: string };
    trustMetrics: Array<{
      value: number;
      prefix?: string;
      suffix?: string;
      decimals?: number;
      label: string;
    }>;
  };
  specializations: Array<{
    id: 'weight' | 'hair' | 'sexual';
    number: string;
    title: string;
    subtitle: string;
    desc: string;
    stats: string;
    timeline: string;
    highlights: string[];
    path: string;
    img: string;
  }>;
  timeline: {
    weight: Array<{ phase: string; label: string; description: string }>;
    hair: Array<{ phase: string; label: string; description: string }>;
    sexual: Array<{ phase: string; label: string; description: string }>;
  };
  howItWorks: Array<{
    step: string;
    title: string;
    time: string;
    desc: string;
  }>;
  accountability: Array<{
    value: number;
    prefix?: string;
    suffix?: string;
    title: string;
    desc: string;
  }>;
  comparison: {
    traditional: string[];
    sugaModel: string[];
  };
  faqs: Array<{
    q: string;
    a: string;
  }>;
  ctaBanner: {
    eyebrow: string;
    title: string;
    description: string;
    buttonText: string;
    buttonLink: string;
  };
}

export interface WeightLossPageContent {
  header: {
    title: string;
    subtitle: string;
    image: string;
  };
  science: {
    eyebrow: string;
    title: string;
    description: string;
    clinicalFact: string;
  };
  pillars: Array<{
    num: string;
    tag: string;
    title: string;
    desc: string;
  }>;
  medications: Array<{
    tag: string;
    title: string;
    desc: string;
    benefits: string[];
    buttonText: string;
    buttonLink: string;
  }>;
  comparison: {
    eyebrow: string;
    title: string;
    description: string;
  };
  ctaBanner: {
    title: string;
    description: string;
    buttonText: string;
    buttonLink: string;
  };
}

export interface HairGrowthPageContent {
  header: {
    title: string;
    subtitle: string;
    image: string;
  };
  science: {
    eyebrow: string;
    title: string;
    description: string;
    clinicalFact: string;
  };
  pillars: Array<{
    num: string;
    tag: string;
    title: string;
    desc: string;
  }>;
  comparison: {
    eyebrow: string;
    title: string;
    description: string;
  };
  ctaBanner: {
    title: string;
    description: string;
    buttonText: string;
    buttonLink: string;
  };
}

export interface SexualHealthPageContent {
  header: {
    title: string;
    subtitle: string;
    image: string;
  };
  conditions: Array<{
    title: string;
    stat: string;
    desc: string;
    meds: string;
    buttonText: string;
    buttonLink: string;
  }>;
  cardiovascular: {
    eyebrow: string;
    title: string;
    paragraphs: string[];
    statNumber: string;
    statLabel: string;
    statDesc: string;
  };
  privacy: Array<{
    title: string;
    desc: string;
  }>;
  ctaBanner: {
    title: string;
    description: string;
    buttonText: string;
    buttonLink: string;
  };
}

export interface AboutPageContent {
  header: {
    title: string;
    subtitle: string;
    image: string;
  };
  mission: {
    eyebrow: string;
    title: string;
    subtitle: string;
    paragraphs: string[];
  };
  standards: Array<{
    title: string;
    desc: string;
  }>;
  safety: Array<{
    title: string;
    desc: string;
  }>;
  metrics: Array<{
    value: number;
    prefix?: string;
    suffix?: string;
    title: string;
    desc: string;
  }>;
  ctaBanner: {
    title: string;
    description: string;
    buttonText: string;
    buttonLink: string;
  };
}

export interface SugaWebsiteContent {
  global: GlobalContent;
  seo: SeoContent;
  home: HomeContent;
  weightLoss: WeightLossPageContent;
  hairGrowth: HairGrowthPageContent;
  sexualHealth: SexualHealthPageContent;
  about: AboutPageContent;
  products: Product[];
  doctors: Doctor[];
}

export type ContentData = SugaWebsiteContent;

