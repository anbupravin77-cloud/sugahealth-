import { Notification } from '../notifications';
import { config } from '../config';

export interface SmsProvider {
  sendSms(to: string, text: string): Promise<{ providerMessageId?: string; status: 'queued' | 'sent' | 'failed' | 'skipped' | 'not_configured'; failureReason?: string }>;
}

export class DefaultSmsProvider implements SmsProvider {
  async sendSms(to: string, text: string) {
    if (!config.sms.isConfigured || !config.sms.apiKey) {
      console.warn('SMS provider not configured. Skipping SMS delivery.');
      return { status: 'not_configured' as const, failureReason: 'Missing API Key' };
    }

    try {
      // Stub for actual HTTP request to Twilio / AWS SNS / etc.
      
      console.log(`[SMS SENT] To: ${to}, Text: ${text}`);
      return { status: 'sent' as const, providerMessageId: `sms_${Date.now()}` };
    } catch (err: any) {
      console.error('SMS delivery failed', err);
      return { status: 'failed' as const, failureReason: err.message };
    }
  }
}
