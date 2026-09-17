const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const webhookStart = content.indexOf('app.post(\'/api/webhooks/payment\'');
const webhookEnd = content.indexOf('// -------------- PATIENT NOTIFICATIONS', webhookStart);

if (webhookStart > -1 && webhookEnd > -1) {
  const newWebhook = `  app.post('/api/webhooks/payment', async (req, res) => {
    try {
      const payload = (req as any).rawBody || JSON.stringify(req.body);
      const signature = req.headers['stripe-signature'] as string;

      if (!signature) {
        return res.status(400).send('Webhook Error: Missing signature');
      }

      if (!config.stripe.isConfigured || !config.stripe.webhookSecret) {
        if (config.env === 'production') {
          return res.status(500).send('Webhook Error: Server not configured');
        }
        return res.status(400).send('Webhook Error: Not configured in dev');
      }

      const paymentProvider = new StripePaymentProvider();
      const secret = config.stripe.webhookSecret;
      
      const isValid = paymentProvider.verifyWebhookSignature(payload, signature, secret);
      if (!isValid) {
        return res.status(400).send('Webhook Error: Invalid signature');
      }

      const event = req.body;
      const eventType = event.type;
      const eventId = event.id;

      // Idempotency check for event
      const eventSnap = await db.collection('payment_events').doc(eventId).get();
      if (eventSnap.exists) {
        return res.json({ received: true });
      }

      if (eventType === 'checkout.session.completed') {
        const type = event.data?.object?.metadata?.type;
        if (type === 'refill_subscription') {
          const { SubscriptionService } = await import('./src/server/subscription');
          const subService = new SubscriptionService();
          const subscriptionId = event.data.object.subscription;
          const customerId = event.data.object.customer;
          
          await subService.handleSubscriptionCreated(
            subscriptionId, 
            customerId, 
            event.data.object.metadata, 
            'day', 
            30
          );
          
          await db.collection('payment_events').doc(eventId).set({
            processedAt: new Date().toISOString(),
            type: eventType,
            subscriptionId
          });
          return res.json({ received: true });
        }
      }

      if (eventType === 'invoice.paid') {
        const { SubscriptionService } = await import('./src/server/subscription');
        const subService = new SubscriptionService();
        const subscriptionId = event.data.object.subscription;
        const billingReason = event.data.object.billing_reason;
        
        if (subscriptionId) {
          await subService.handlePaymentSucceeded(subscriptionId, event.data.object.id, billingReason);
        }
        await db.collection('payment_events').doc(eventId).set({
          processedAt: new Date().toISOString(),
          type: eventType,
          subscriptionId
        });
        return res.json({ received: true });
      }

      if (eventType === 'invoice.payment_failed') {
        const { SubscriptionService } = await import('./src/server/subscription');
        const subService = new SubscriptionService();
        const subscriptionId = event.data.object.subscription;
        if (subscriptionId) {
          await subService.handlePaymentFailed(subscriptionId, event.data.object.id);
        }
        await db.collection('payment_events').doc(eventId).set({
          processedAt: new Date().toISOString(),
          type: eventType,
          subscriptionId
        });
        return res.json({ received: true });
      }

      if (eventType === 'customer.subscription.deleted' || (eventType === 'customer.subscription.updated' && event.data.object.status === 'canceled')) {
        const { SubscriptionService } = await import('./src/server/subscription');
        const subService = new SubscriptionService();
        const subscriptionId = event.data.object.id;
        await subService.handleSubscriptionCancelled(subscriptionId);
        await db.collection('payment_events').doc(eventId).set({
          processedAt: new Date().toISOString(),
          type: eventType,
          subscriptionId
        });
        return res.json({ received: true });
      }

      // Ordinary Order processing
      let orderId = event.data?.object?.metadata?.orderId; 

      if (!orderId) {
        return res.json({ received: true }); // Ignore irrelevant webhooks silently
      }

      const orderRef = db.collection('orders').doc(orderId);
      const orderSnap = await orderRef.get();
      
      if (!orderSnap.exists) {
        return res.status(404).send('Order not found');
      }

      const orderData = orderSnap.data() as any;
      const timestamp = new Date().toISOString();

      if (orderData.paymentStatus !== 'paid' && orderData.paymentStatus !== 'refunded') {
        if (eventType === 'checkout.session.completed' || eventType === 'payment_intent.succeeded' || eventType === 'mock.payment.success') {
          await orderRef.update({
            paymentStatus: 'paid',
            status: 'processing', // Move to processing once paid
            updatedAt: timestamp
          });

          await db.collection('payment_events').doc(eventId).set({
            processedAt: timestamp,
            orderId,
            type: eventType
          });

          await db.collection('audit_logs').add({
            action: 'PAYMENT_CONFIRMED',
            actorUid: 'system',
            orderId,
            eventId,
            timestamp
          });

          try {
            const { TimelineService } = await import('./src/server/timeline');
            const { NotificationService } = await import('./src/server/notifications');
            
            const timeline = new TimelineService();
            const notifService = new NotificationService();

            await timeline.createEvent({
              orderId,
              eventType: 'PAYMENT_CONFIRMED',
              timestamp,
              actorType: 'system',
              actorId: 'system'
            });

            await notifService.createNotification({
              patientId: orderData.patientId,
              type: 'PAYMENT_CONFIRMED',
              title: 'Payment Confirmed',
              shortMessage: 'Your payment was successful. We are now processing your order.',
              relatedEntityId: orderId,
              relatedEntityType: 'order',
              idempotencyKey: \`payment_confirmed_\${orderId}\`
            });
          } catch (err) {
            console.error('Error creating timeline/notification:', err);
          }
        }
      }

      res.json({ received: true });
    } catch (err: any) {
      console.error('Error processing webhook:', err);
      res.status(500).send(\`Webhook Error: \${err.message}\`);
    }
  });

`;

  content = content.substring(0, webhookStart) + newWebhook + content.substring(webhookEnd);
  fs.writeFileSync('server.ts', content);
  console.log('Webhook patched successfully');
}
