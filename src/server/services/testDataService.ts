import { supabaseAdmin } from '../supabaseAdmin';
import { auditRepository } from '../repositories/auditRepository';

/**
 * Test Data Safety Service
 *
 * ARCHITECTURAL BOUNDARY:
 * Provides strictly guarded, server-side-only helpers for resetting disposable
 * developer/test accounts.
 *
 * SAFETY DIRECTIVES:
 * 1. Strictly forbidden in production environments (process.env.NODE_ENV === 'production').
 * 2. Never exposes public reset endpoints or browser-accessible reset credentials.
 * 3. Never deletes all users. Operates only on explicitly designated test accounts
 *    (e.g., email matching /^test-[a-zA-Z0-9_-]+@sugahealth\.test$/).
 * 4. Generates an append-only audit trail for every action.
 */
export class TestDataSafetyService {
  private static isProductionEnvironment(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  private static isDesignatedTestAccount(email?: string): boolean {
    if (!email) return false;
    const normalized = email.toLowerCase().trim();
    // Only allow explicitly isolated disposable test patterns
    return (
      normalized.endsWith('@sugahealth.test') ||
      (normalized.startsWith('test-') && normalized.endsWith('@example.com'))
    );
  }

  /**
   * Resets test-only artifacts for an explicitly designated test account.
   * FORBIDDEN in production.
   */
  async resetDesignatedTestAccount(testUserId: string, testUserEmail: string, actorUid: string): Promise<void> {
    if (TestDataSafetyService.isProductionEnvironment()) {
      throw new Error('SECURITY VIOLATION: Test account reset is strictly forbidden in production.');
    }

    if (!TestDataSafetyService.isDesignatedTestAccount(testUserEmail)) {
      throw new Error(
        `SECURITY VIOLATION: Account ${testUserEmail} is not a designated disposable test account.`
      );
    }

    console.log(`[TestDataSafety] Resetting designated test account: ${testUserEmail} (${testUserId})`);

    // Clean up test-associated rows in dependency order
    await supabaseAdmin.from('notifications').delete().eq('patient_id', testUserId);
    await supabaseAdmin.from('refill_requests').delete().eq('patient_id', testUserId);
    await supabaseAdmin.from('subscriptions').delete().eq('patient_id', testUserId);
    await supabaseAdmin.from('order_events').delete().eq('actor_id', testUserId);
    await supabaseAdmin.from('orders').delete().eq('patient_id', testUserId);
    await supabaseAdmin.from('prescriptions').delete().eq('patient_id', testUserId);
    await supabaseAdmin.from('consultations').delete().eq('patient_id', testUserId);

    await auditRepository.log({
      action: 'DESIGNATED_TEST_ACCOUNT_RESET',
      actorUid,
      targetUid: testUserId,
      metadata: {
        email: testUserEmail,
        environment: process.env.NODE_ENV || 'development',
      },
    });
  }
}

export const testDataSafetyService = new TestDataSafetyService();
