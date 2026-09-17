const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const anchor1 = "const { medications, prescriptionId } = req.body;";
const replace1 = "const { medications, prescriptionId, refillEligible, refillIntervalDays, treatmentCategory } = req.body;";

content = content.replace(anchor1, replace1);

const anchor2 = `await db.collection('prescriptions').doc(prescriptionId).update({
          medications,
          updatedAt: timestamp
        });`;
const replace2 = `await db.collection('prescriptions').doc(prescriptionId).update({
          medications,
          refillEligible: refillEligible || false,
          refillIntervalDays: refillIntervalDays || 30,
          treatmentCategory: treatmentCategory || '',
          updatedAt: timestamp
        });`;

content = content.replace(anchor2, replace2);

const anchor3 = `status: 'draft',
          createdAt: timestamp,
          updatedAt: timestamp
        });`;
const replace3 = `status: 'draft',
          refillEligible: refillEligible || false,
          refillIntervalDays: refillIntervalDays || 30,
          treatmentCategory: treatmentCategory || '',
          createdAt: timestamp,
          updatedAt: timestamp
        });`;

content = content.replace(anchor3, replace3);
fs.writeFileSync('server.ts', content);
console.log('Prescription route patched');
