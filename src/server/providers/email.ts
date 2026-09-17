import { Notification } from '../notifications';
import { config } from '../config';

export interface EmailProvider {
  sendEmail(to: string, subject: string, body: string): Promise<{ providerMessageId?: string; status: 'queued' | 'sent' | 'failed' | 'skipped' | 'not_configured'; failureReason?: string }>;
}

export class DefaultEmailProvider implements EmailProvider {
  async sendEmail(to: string, subject: string, body: string) {
    if (!config.email.isConfigured || !config.email.apiKey) {
      console.warn('Email provider not configured. Skipping email delivery.');
      return { status: 'not_configured' as const, failureReason: 'Missing API Key' };
    }

    try {
      // Stub for actual HTTP request to SendGrid / Mailgun / etc.
      // e.g. await fetch('https://api.sendgrid.com/v3/mail/send', { ... })
      
      console.log(`[EMAIL SENT] To: ${to}, Subject: ${subject}`);
      return { status: 'sent' as const, providerMessageId: `eml_${Date.now()}` };
    } catch (err: any) {
      console.error('Email delivery failed', err);
      return { status: 'failed' as const, failureReason: err.message };
    }
  }
}
