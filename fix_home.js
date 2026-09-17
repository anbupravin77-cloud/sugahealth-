const fs = require('fs');

let code = fs.readFileSync('src/pages/Home.tsx', 'utf-8');

// 1. Fix specializations
code = code.replace(
  'const pillars = home.specializations.items;',
  `const specializationsData = home.specializations || [];
  const pillars = Array.isArray(specializationsData) ? specializationsData : (specializationsData as any)?.items || [];`
);
code = code.replace(
  '{home.specializations.eyebrow}',
  '{(home.specializations as any)?.eyebrow || "Targeted Therapeutics"}'
);
code = code.replace(
  '{home.specializations.title}',
  '{(home.specializations as any)?.title || "Focused Clinical Pathways"}'
);
code = code.replace(
  '{home.specializations.subtitle}',
  '{(home.specializations as any)?.subtitle || "Precision treatment protocols designed for sustained biological optimization."}'
);

// 2. Fix timelineData
code = code.replace(
  'const timelineData = home.timeline.items;',
  'const timelineData = (home.timeline as any)?.items || home.timeline || {};'
);
// Actually `home.timeline` contains `weight`, `hair`, `sexual` keys, so `timelineData[timelineCategory]` works if `timelineData` is the object itself.

// 3. Fix faqs
code = code.replace(
  'const faqs = home.faqs.items;',
  `const faqsRaw = home.faqs || [];
  const faqs = Array.isArray(faqsRaw) ? faqsRaw : (faqsRaw as any)?.items || [];`
);
code = code.replace(
  '{home.faqs.eyebrow}',
  '{(home.faqs as any)?.eyebrow || "Patient Education"}'
);
code = code.replace(
  '{home.faqs.title}',
  '{(home.faqs as any)?.title || "Common Questions"}'
);
code = code.replace(
  '{home.faqs.subtitle}',
  '{(home.faqs as any)?.subtitle || "Straightforward answers about our clinical protocols and prescription process."}'
);
// faq items use q and a in defaultContent
// wait, faqs map uses `faq.question` and `faq.answer` or `faq.q`? Let's check.
