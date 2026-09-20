-- =============================================================================
-- SUGA.HEALTH — PHASE 5J HARDENING & WORKFLOW INTEGRITY
-- Migration: 20260918050000_phase5j_hardening.sql
-- Description: Realtime publication membership verification, legacy response snapshot
--              cleanup, and safe unique prescription reconciliation.
-- =============================================================================

-- 1. Ensure all 6 core realtime tables are safely in supabase_realtime publication
DO $$
DECLARE
    t_name TEXT;
    tbls TEXT[] := ARRAY['consultations', 'message_threads', 'messages', 'notifications', 'prescriptions', 'prescription_items'];
BEGIN
    FOR i IN 1..array_length(tbls, 1) LOOP
        t_name := tbls[i];
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' 
              AND schemaname = 'public' 
              AND tablename = t_name
        ) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t_name);
        END IF;
    END LOOP;
END $$;

-- 2. Clean up legacy medicationOptions.options array from consultations.responses
UPDATE public.consultations
SET responses = jsonb_set(
    responses,
    '{medicationOptions}',
    (responses->'medicationOptions') - 'options'
)
WHERE responses ? 'medicationOptions' 
  AND (responses->'medicationOptions') ? 'options';

-- 3. Safely reconcile duplicate prescriptions before adding unique index
DO $$
DECLARE
    r RECORD;
    canonical_rx_id UUID;
    dup_rx_id UUID;
BEGIN
    FOR r IN (
        SELECT consultation_id
        FROM public.prescriptions
        GROUP BY consultation_id
        HAVING count(*) > 1
    ) LOOP
        SELECT id INTO canonical_rx_id
        FROM public.prescriptions
        WHERE consultation_id = r.consultation_id
        ORDER BY created_at DESC
        LIMIT 1;

        FOR dup_rx_id IN (
            SELECT id FROM public.prescriptions
            WHERE consultation_id = r.consultation_id AND id <> canonical_rx_id
        ) LOOP
            UPDATE public.prescription_items
            SET prescription_id = canonical_rx_id
            WHERE prescription_id = dup_rx_id;

            UPDATE public.orders
            SET prescription_id = canonical_rx_id
            WHERE prescription_id = dup_rx_id;

            DELETE FROM public.prescriptions WHERE id = dup_rx_id;
        END LOOP;
    END LOOP;
END $$;

-- Create unique index on consultation_id for prescriptions
CREATE UNIQUE INDEX IF NOT EXISTS idx_prescriptions_unique_consultation ON public.prescriptions(consultation_id);
