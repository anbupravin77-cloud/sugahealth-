import { getFirestore } from 'firebase-admin/firestore';
import crypto from 'crypto';
import Stripe from 'stripe';
import { config } from './config';

export function calculateOrderTotals(medications: any[]) {
  const lineItems = medications.map((med) => {
    // Mock base price mapping or standard pricing
    const unitPrice = 45.00; 
    const quantity = 1; // Standardized unit quantity for milestone
    
    return {
      medicationName: med.medicationName,
      activeIngredient: med.activeIngredient || '',
      quantity,
      unitPrice,
      totalPrice: unitPrice * quantity
    };
  });

  const subtotal = lineItems.reduce((acc, item) => acc + item.totalPrice, 0);
  const shippingAmount = 15.00;
  const taxAmount = subtotal * 0.08; // 8% tax
  const totalAmount = subtotal + shippingAmount + taxAmount;

  return {
    lineItems,
    subtotal,
    shippingAmount,
    taxAmount,
    totalAmount
  };
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
