const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const anchor = '// -------------- MESSAGING -------------- //';

const newEndpoints = `
  // -------------- SUBSCRIPTIONS -------------- //
  app.get('/api/subscriptions', requireAuth, async (req, res) => {
    try {
      const decodedToken = (req as any).user;
      const snap = await db.collection('subscriptions')
        .where('patientId', '==', decodedToken.uid)
        .orderBy('createdAt', 'desc')
        .get();
      const subs = snap.docs.map(d => d.data());
      res.json(subs);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Error' });
    }
  });

  app.post('/api/subscriptions/checkout', requireAuth, async (req, res) => {
    try {
      const decodedToken = (req as any).user;
      const { prescriptionId } = req.body;
      
      const prescriptionSnap = await db.collection('prescriptions').doc(prescriptionId).get();
      if (!prescriptionSnap.exists) {
        return res.status(404).json({ error: 'Prescription not found' });
      }
      const pData = prescriptionSnap.data() as any;

      if (pData.patientId !== decodedToken.uid) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      
      if (!pData.refillEligible || pData.status === 'cancelled') {
        return res.status(400).json({ error: 'Prescription is not eligible for subscription' });
      }

      const existingSub = await db.collection('subscriptions')
        .where('sourcePrescriptionId', '==', prescriptionId)
        .where('status', 'in', ['active', 'past_due', 'paused'])
        .get();
        
      if (!existingSub.empty) {
        return res.status(400).json({ error: 'Subscription already exists' });
      }

      const paymentProvider = new StripePaymentProvider();
      const session = await paymentProvider.createSubscriptionSession(decodedToken.uid, decodedToken.email || '', prescriptionId, pData);
      
      res.json({ url: session.url });
    } catch (error: any) {
      console.error(error);
      if (error.message === 'Payment provider not configured') {
        res.status(503).json({ error: 'Payment provider not configured' });
      } else {
        res.status(500).json({ error: 'Internal Error' });
      }
    }
  });

  app.post('/api/subscriptions/:id/cancel', requireAuth, async (req, res) => {
    try {
      const decodedToken = (req as any).user;
      const { id } = req.params;
      
      const subSnap = await db.collection('subscriptions').doc(id).get();
      if (!subSnap.exists) return res.status(404).json({ error: 'Not found' });
      
      const subData = subSnap.data() as any;
      if (subData.patientId !== decodedToken.uid && decodedToken.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' });
      }

      if (!config.stripe.isConfigured || !config.stripe.secretKey) {
        return res.status(503).json({ error: 'Stripe not configured' });
      }
      const Stripe = require('stripe').default || require('stripe');
      const stripe = new Stripe(config.stripe.secretKey);
      
      await stripe.subscriptions.cancel(subData.providerSubscriptionId);
      // We do NOT update firestore here. The webhook will handle it.
      
      res.json({ success: true, message: 'Cancellation requested' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Error' });
    }
  });

  app.get('/api/refill-requests', requireAuth, async (req, res) => {
    try {
      const decodedToken = (req as any).user;
      let snap;
      if (decodedToken.role === 'doctor') {
        snap = await db.collection('refill_requests')
          .orderBy('createdAt', 'desc')
          .get();
          // Filter in code or with compound queries. For milestone, return all or doctor's patients.
      } else {
        snap = await db.collection('refill_requests')
          .where('patientId', '==', decodedToken.uid)
          .orderBy('createdAt', 'desc')
          .get();
      }
      res.json(snap.docs.map(d => d.data()));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Error' });
    }
  });

  app.post('/api/refill-requests/:id/review', requireDoctorAuth, async (req, res) => {
    try {
      const decodedToken = (req as any).user;
      const { id } = req.params;
      const { action, decisionReason } = req.body; // action: 'approve' | 'deny'

      const reqRef = db.collection('refill_requests').doc(id);
      const reqSnap = await reqRef.get();
      if (!reqSnap.exists) return res.status(404).json({ error: 'Not found' });
      const reqData = reqSnap.data() as any;
      
      if (reqData.status !== 'pending_review') {
        return res.status(400).json({ error: 'Request is not pending review' });
      }

      const pRef = db.collection('prescriptions').doc(reqData.sourcePrescriptionId);
      const pSnap = await pRef.get();
      const pData = pSnap.data() as any;

      const timestamp = new Date().toISOString();
      let resultingOrderId = null;

      if (action === 'approve') {
        // Create new order
        const newOrderId = \`ord_\${Date.now()}\`;
        const { totalAmount, subtotal, taxAmount, shippingAmount, lineItems } = calculateOrderTotals(pData.medications);
        
        // Fetch patient shipping info
        const userSnap = await db.collection('users').doc(reqData.patientId).get();
        const userData = userSnap.data();

        const orderData = {
          patientId: reqData.patientId,
          prescriptionId: reqData.sourcePrescriptionId, // Or a new prescription version
          status: 'processing', // Since they already paid via subscription renewal
          paymentStatus: 'paid', // Pre-paid via subscription
          shippingAddress: userData?.address || {},
          lineItems,
          subtotal,
          taxAmount,
          shippingAmount,
          totalAmount,
          createdAt: timestamp,
          updatedAt: timestamp,
          refillRequestId: id
        };

        await db.collection('orders').doc(newOrderId).set(orderData);
        resultingOrderId = newOrderId;

        await db.collection('audit_logs').add({
          action: 'REFILL_ORDER_CREATED',
          actorUid: 'system',
          orderId: newOrderId,
          refillRequestId: id,
          timestamp
        });
      }

      const newStatus = action === 'approve' ? 'approved' : 'denied';

      await reqRef.update({
        status: newStatus,
        reviewedAt: timestamp,
        reviewedBy: decodedToken.uid,
        decisionReason: decisionReason || null,
        resultingOrderId
      });

      await db.collection('audit_logs').add({
        action: action === 'approve' ? 'REFILL_APPROVED' : 'REFILL_DENIED',
        actorUid: decodedToken.uid,
        refillRequestId: id,
        timestamp
      });

      // Notification
      const { NotificationService } = await import('./src/server/notifications');
      const notif = new NotificationService();
      await notif.createNotification({
        patientId: reqData.patientId,
        type: 'CONSULTATION_SUBMITTED', // Reusing generic type for now, or create new type
        title: \`Refill Request \${action === 'approve' ? 'Approved' : 'Denied'}\`,
        shortMessage: \`Your refill request for \${pData.treatmentCategory || 'medication'} has been \${newStatus}.\`,
        relatedEntityId: id,
        relatedEntityType: 'document',
        idempotencyKey: \`refill_dec_\${id}\`
      });

      res.json({ success: true, status: newStatus, resultingOrderId });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Error' });
    }
  });

`;

content = content.replace(anchor, newEndpoints + anchor);
fs.writeFileSync('server.ts', content);
console.log('Endpoints added');
