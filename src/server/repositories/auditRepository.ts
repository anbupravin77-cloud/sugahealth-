import { supabaseAdmin } from '../supabaseAdmin';
import { DbAuditLog } from './types';

export class AuditRepository {
  /**
   * Appends an audit log entry via the privileged service-role client.
   * Clients have NO direct write or mutate permissions on audit_logs.
   */
  async log(entry: {
    action: string;
    actorUid: string;
    targetUid?: string;
    consultationId?: string;
    prescriptionId?: string;
    documentId?: string;
    threadId?: string;
    orderId?: string;
    subscriptionId?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      const now = new Date().toISOString();
      const { error } = await supabaseAdmin.from('audit_logs').insert({
        action: entry.action,
        actor_uid: entry.actorUid,
        target_uid: entry.targetUid || null,
        consultation_id: entry.consultationId || null,
        prescription_id: entry.prescriptionId || null,
        document_id: entry.documentId || null,
        thread_id: entry.threadId || null,
        order_id: entry.orderId || null,
        subscription_id: entry.subscriptionId || null,
        metadata: entry.metadata || null,
        created_at: now,
      });

      if (error) {
        console.error('[AuditRepository] Failed to write audit log:', error.message);
      }
    } catch (err: any) {
      console.error('[AuditRepository] Unexpected error writing audit log:', err.message);
    }
  }

  /**
   * Privileged admin-only query of the audit trail.
   */
  async listLogs(params?: {
    action?: string;
    actorUid?: string;
    consultationId?: string;
    orderId?: string;
    limit?: number;
  }): Promise<DbAuditLog[]> {
    let query = supabaseAdmin
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(params?.limit || 100);

    if (params?.action) query = query.eq('action', params.action);
    if (params?.actorUid) query = query.eq('actor_uid', params.actorUid);
    if (params?.consultationId) query = query.eq('consultation_id', params.consultationId);
    if (params?.orderId) query = query.eq('order_id', params.orderId);

    const { data, error } = await query;
    if (error) {
      console.error('[AuditRepository] Failed to list logs:', error.message);
      return [];
    }
    return (data || []) as DbAuditLog[];
  }
}

export const auditRepository = new AuditRepository();
