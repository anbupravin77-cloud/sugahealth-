const fs = require('fs');
const content = fs.readFileSync('src/pages/doctor/PrescriptionBuilder.tsx', 'utf8');
if (content.includes('treatmentCategory')) {
  console.log('treatmentCategory found');
} else {
  console.log('treatmentCategory NOT found');
}
