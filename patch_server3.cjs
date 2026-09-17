const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const anchor = '// -------------- SUBSCRIPTIONS -------------- //';

const endpoint = `
  app.get('/api/prescriptions/eligible', requireAuth, async (req, res) => {
    try {
      const decodedToken = (req as any).user;
      const snap = await db.collection('prescriptions')
        .where('patientId', '==', decodedToken.uid)
        .where('refillEligible', '==', true)
        .where('status', 'in', ['finalized', 'active'])
        .get();
        
      const pDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      res.json(pDocs);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Error' });
    }
  });
`;

content = content.replace(anchor, anchor + "\n" + endpoint);
fs.writeFileSync('server.ts', content);
console.log('Endpoint added');
