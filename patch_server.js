const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf8');

// Find the webhook section
const webhookIndex = content.indexOf('// Webhook Receiver');
if (webhookIndex > -1) {
  const replacement = `
  // Webhook Receiver
  app.post('/api/webhooks/payment', async (req, res) => {
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
            30 // Should derive from metadata in reality, or fetch from stripe
          );
          return res.json({ received: true });
        }
      }

      if (eventType === 'invoice.paid') {
        const { SubscriptionService } = await import('./src/server/subscription');
        const subService = new SubscriptionService();
        const subscriptionId = event.data.object.subscription;
        const billingReason = event.data.object.billing_reason;
        
        if (subscriptionId) {
          // If subscription_create, the initial order is created by the doctor/system, 
          // or we handle it via RefillRequest as well. 
          // Let's just create refill request for all payments (even initial) 
          // to unify the fulfillment workflow.
          await subService.handlePaymentSucceeded(subscriptionId, event.data.object.id, billingReason);
        }
        return res.json({ received: true });
      }

      if (eventType === 'invoice.payment_failed') {
        const { SubscriptionService } = await import('./src/server/subscription');
        const subService = new SubscriptionService();
        const subscriptionId = event.data.object.subscription;
        if (subscriptionId) {
          await subService.handlePaymentFailed(subscriptionId, event.data.object.id);
        }
        return res.json({ received: true });
      }

      if (eventType === 'customer.subscription.deleted') {
        const { SubscriptionService } = await import('./src/server/subscription');
        const subService = new SubscriptionService();
        const subscriptionId = event.data.object.id;
        await subService.handleSubscriptionCancelled(subscriptionId);
        return res.json({ received: true });
      }

      let orderId = event.data?.object?.metadata?.orderId; 

      if (!orderId) {
        // Not all events have orderId (e.g. subscription events we already handled)
        return res.json({ received: true });
      }

      // Idempotency check for orders
      const existingSnap = await db.collection('audit_logs')
        .where('action', '==', 'WEBHOOK_PROCESSED')
        .where('eventId', '==', eventId)
        .limit(1).get();
        
      if (!existingSnap.empty) {
        return res.json({ received: true });
      }

      if (eventType === 'checkout.session.completed') {
        // Handle standard order payment
        const orderRef = db.collection('orders').doc(orderId);
        const orderSnap = await orderRef.get();
`;
  
  // Replace the old webhook section
  const endOfWebhookIndex = content.indexOf('// -------------- PATIENT NOTIFICATIONS', webhookIndex);
  content = content.substring(0, webhookIndex) + replacement + content.substring(content.indexOf('if (eventType === \'checkout.session.completed\') {', webhookIndex) + 47, endOfWebhookIndex) + '\n  // -------------- PATIENT NOTIFICATIONS' + content.substring(endOfWebhookIndex + 39);

  fs.writeFileSync('server.ts', content);
}

