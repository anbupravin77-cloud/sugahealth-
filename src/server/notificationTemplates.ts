export type NotificationChannel = 'email' | 'sms' | 'in_app';
export type NotificationEventType = 
  | 'CONSULTATION_SUBMITTED'
  | 'PRESCRIPTION_READY'
  | 'PAYMENT_REQUIRED'
  | 'PAYMENT_CONFIRMED'
  | 'ORDER_PROCESSING'
  | 'ORDER_PACKED'
  | 'ORDER_SHIPPED'
  | 'ORDER_DELIVERED'
  | 'NEW_DOCTOR_MESSAGE'
  | 'NEW_MESSAGE'
  | 'SUBSCRIPTION_ACTIVATED'
  | 'SUBSCRIPTION_CANCELLED'
  | 'REFILL_SUBMITTED';

export interface NotificationTemplate {
  subject?: string;
  body: string;
  actionLabel?: string;
  actionUrl?: string; // Relative URL (e.g. '/account', '/messages')
}

export const getTemplate = (eventType: NotificationEventType, channel: NotificationChannel): NotificationTemplate => {
  // We keep templates strictly privacy-focused. 
  // No PHI, medications, or sensitive diagnoses are included.
  
  const templates: Record<string, Record<NotificationChannel, NotificationTemplate>> = {
    CONSULTATION_SUBMITTED: {
      email: {
        subject: 'Consultation Submitted - Suga.Health',
        body: 'Your consultation has been successfully submitted and is pending review by our clinical team.',
        actionLabel: 'View Status',
        actionUrl: '/account'
      },
      sms: {
        body: 'Suga.Health: Your consultation has been submitted. Sign in to view status.'
      },
      in_app: {
        body: 'Consultation submitted successfully.'
      }
    },
    PRESCRIPTION_READY: {
      email: {
        subject: 'Prescription Ready - Suga.Health',
        body: 'Your prescription has been finalized by your care provider. Please sign in securely to review the details and proceed.',
        actionLabel: 'Review & Checkout',
        actionUrl: '/account'
      },
      sms: {
        body: 'Suga.Health: Your prescription is ready. Sign in securely to review and proceed.'
      },
      in_app: {
        body: 'Prescription finalized by doctor.'
      }
    },
    PAYMENT_REQUIRED: {
      email: {
        subject: 'Action Required: Payment Needed - Suga.Health',
        body: 'An order requires your attention. Please sign in to securely complete your payment.',
        actionLabel: 'Complete Payment',
        actionUrl: '/account'
      },
      sms: {
        body: 'Suga.Health: Action required. An order needs payment. Sign in securely to complete.'
      },
      in_app: {
        body: 'Payment required for order.'
      }
    },
    PAYMENT_CONFIRMED: {
      email: {
        subject: 'Payment Confirmed - Suga.Health',
        body: 'We have received your payment. Your order is now being processed by our pharmacy team.',
        actionLabel: 'View Order',
        actionUrl: '/account'
      },
      sms: {
        body: 'Suga.Health: Payment received. Your order is now processing.'
      },
      in_app: {
        body: 'Payment confirmed.'
      }
    },
    ORDER_PROCESSING: {
      email: {
        subject: 'Order Processing - Suga.Health',
        body: 'Your order is currently being processed by our pharmacy.',
        actionLabel: 'Track Order',
        actionUrl: '/account'
      },
      sms: {
        body: 'Suga.Health: Your order is now processing.'
      },
      in_app: {
        body: 'Order is processing.'
      }
    },
    ORDER_PACKED: {
      email: {
        subject: 'Order Packed - Suga.Health',
        body: 'Your order has been packed and is awaiting carrier pickup.',
        actionLabel: 'Track Order',
        actionUrl: '/account'
      },
      sms: {
        body: 'Suga.Health: Your order has been packed and is awaiting pickup.'
      },
      in_app: {
        body: 'Order has been packed.'
      }
    },
    ORDER_SHIPPED: {
      email: {
        subject: 'Order Shipped - Suga.Health',
        body: 'Good news! Your order has shipped. Please sign in to view your tracking details.',
        actionLabel: 'Track Order',
        actionUrl: '/account'
      },
      sms: {
        body: 'Suga.Health: Your order has shipped! Sign in to view tracking details.'
      },
      in_app: {
        body: 'Order has shipped.'
      }
    },
    ORDER_DELIVERED: {
      email: {
        subject: 'Order Delivered - Suga.Health',
        body: 'Your order has been delivered. If you have any questions, you can reach out to your care team.',
        actionLabel: 'View Details',
        actionUrl: '/account'
      },
      sms: {
        body: 'Suga.Health: Your order has been delivered.'
      },
      in_app: {
        body: 'Order delivered.'
      }
    },
    NEW_MESSAGE: {
      email: {
        subject: 'New Message from Care Team - Suga.Health',
        body: 'You have a new secure message from your care team. Please sign in to read and reply.',
        actionLabel: 'Read Message',
        actionUrl: '/messages'
      },
      sms: {
        body: 'Suga.Health: You have a new secure message from your care team. Sign in to view.'
      },
      in_app: {
        body: 'New message from your care team.'
      }
    }
  };

  return templates[eventType as string]?.[channel] || { body: 'You have a new update in Suga.Health. Sign in to view.' };
};
