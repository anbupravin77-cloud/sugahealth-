export type Environment = 'development' | 'production' | 'test';

export interface AppConfig {
  env: Environment;
  appUrl: string;
  stripe: {
    secretKey?: string;
    webhookSecret?: string;
    isConfigured: boolean;
  };
  email: {
    apiKey?: string;
    isConfigured: boolean;
  };
  sms: {
    apiKey?: string;
    isConfigured: boolean;
  };
  shipping: {
    apiKey?: string;
    isConfigured: boolean;
  };
}

const getEnv = (): Environment => {
  const nodeEnv = process.env.NODE_ENV;
  if (nodeEnv === 'production') return 'production';
  if (nodeEnv === 'test') return 'test';
  return 'development';
};

const appUrl = process.env.APP_URL || process.env.PUBLIC_URL || 'http://localhost:3000';

export const config: AppConfig = {
  env: getEnv(),
  appUrl,
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    isConfigured: !!process.env.STRIPE_SECRET_KEY && !!process.env.STRIPE_WEBHOOK_SECRET,
  },
  email: {
    apiKey: process.env.EMAIL_API_KEY,
    isConfigured: !!process.env.EMAIL_API_KEY,
  },
  sms: {
    apiKey: process.env.SMS_API_KEY,
    isConfigured: !!process.env.SMS_API_KEY,
  },
  shipping: {
    apiKey: process.env.SHIPPING_API_KEY,
    isConfigured: !!process.env.SHIPPING_API_KEY,
  }
};

export const validateProductionConfig = () => {
  if (config.env === 'production') {
    const missing = [];
    if (!config.stripe.isConfigured) {
      missing.push('Stripe');
    } else if (config.stripe.secretKey?.startsWith('sk_test_')) {
      console.error('[CRITICAL] Stripe TEST key used in PRODUCTION environment. This is forbidden.');
      missing.push('Stripe (Valid Live Key Required)');
    }
    if (!config.shipping.isConfigured) missing.push('Shipping');
    
    // Email and SMS might be optionally required depending on business rules, 
    // but typically core transactional flows require them in prod.
    // For now, we will log warnings if they are missing in prod.
    if (!config.email.isConfigured) console.warn('[WARNING] Production Email provider is not configured.');
    if (!config.sms.isConfigured) console.warn('[WARNING] Production SMS provider is not configured.');

    if (missing.length > 0) {
      console.error(`[CRITICAL] Missing required production configurations for: ${missing.join(', ')}`);
      // In a strict prod environment, we might process.exit(1) here.
    }
  } else {
    console.log(`[INFO] Running in ${config.env} mode. Missing providers will fail safely or use dev mocks.`);
  }
};
