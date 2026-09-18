import crypto from 'crypto';
import Stripe from 'stripe';
import { config } from './config';
import { pricingService, MedicationPricingItem, CalculatedOrderTotals } from './services/pricingService';

export function calculateOrderTotals(medications: any[]): CalculatedOrderTotals {
  return pricingService.calculateTotals(medications);
}

export interface PaymentProvider {

  createPaymentSession(orderId: string, orderData: any): Promise<{ url: string, paymentReference: string }>;
  createSubscriptionSession(patientId: string, patientEmail: string, prescriptionId: string, prescriptionData: any): Promise<{ url: string, paymentReference: string }>;
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean;
}

export class StripePaymentProvider implements PaymentProvider {
  async createPaymentSession(orderId: string, orderData: any) {
    if (!config.stripe.isConfigured || !config.stripe.secretKey) {
      throw new Error('Payment provider not configured');
    }
    
    const stripe = new Stripe(config.stripe.secretKey);
    const host = config.appUrl;

    const line_items = orderData.lineItems.map((item: any) => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.medicationName,
          description: item.activeIngredient || undefined
        },
        unit_amount: Math.round(item.unitPrice * 100),
      },
      quantity: item.quantity,
    }));

    if (orderData.shippingAmount > 0) {
      line_items.push({
        price_data: {
          currency: 'usd',
          product_data: { name: 'Shipping' },
          unit_amount: Math.round(orderData.shippingAmount * 100),
        },
        quantity: 1,
      });
    }

    if (orderData.taxAmount > 0) {
      line_items.push({
        price_data: {
          currency: 'usd',
          product_data: { name: 'Estimated Tax' },
          unit_amount: Math.round(orderData.taxAmount * 100),
        },
        quantity: 1,
      });
    }

    const calculatedTotal = (line_items.reduce((sum: number, item: any) => sum + (item.price_data.unit_amount * item.quantity), 0)) / 100;
    if (Math.abs(calculatedTotal - orderData.totalAmount) > 0.05) {
      throw new Error(`Checkout total mismatch: line items sum to $${calculatedTotal}, but order total is $${orderData.totalAmount}`);
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      success_url: `${host}/checkout/success?order_id=${orderId}`,
      cancel_url: `${host}/account`, // Redirect back to account on cancel
      metadata: {
        orderId
      }
    });

    return { url: session.url as string, paymentReference: session.id };
  }

  async createSubscriptionSession(patientId: string, patientEmail: string, prescriptionId: string, prescriptionData: any) {
    if (!config.stripe.isConfigured || !config.stripe.secretKey) {
      throw new Error('Payment provider not configured');
    }
    
    const stripe = new Stripe(config.stripe.secretKey);
    const host = config.appUrl;

    // Use total amounts from the standard pricing
    const { totalAmount } = calculateOrderTotals(prescriptionData.medications);
    
    // We expect prescriptionData to have refillIntervalDays
    const intervalDays = prescriptionData.refillIntervalDays || 30;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: patientEmail, // Stripe will create or link customer
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Refill Subscription: ${prescriptionData.medications.map((m: any) => m.medicationName).join(', ')}`,
            },
            unit_amount: Math.round(totalAmount * 100),
            recurring: {
              interval: 'day',
              interval_count: intervalDays,
            }
          },
          quantity: 1,
        }
      ],
      success_url: `${host}/account?subscription=success`,
      cancel_url: `${host}/account?subscription=cancelled`,
      metadata: {
        patientId,
        prescriptionId,
        type: 'refill_subscription'
      }
    });

    return { url: session.url as string, paymentReference: session.id };
  }

  verifyWebhookSignature(payload: string, signature: string, secret: string) {
    if (!config.stripe.isConfigured || !config.stripe.secretKey) {
      // Reject if not configured securely. Never fake signatures.
      console.warn('Webhook received but Stripe is not configured.');
      return false;
    }
    
    const stripe = new Stripe(config.stripe.secretKey);
    try {
      stripe.webhooks.constructEvent(payload, signature, secret);
      return true;
    } catch (err: any) {
      console.error('Stripe webhook signature verification failed:', err.message);
      return false;
    }
  }
}
