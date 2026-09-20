-- =============================================================================
-- SUGA.HEALTH — REALTIME PUBLICATION HARDENING
-- Migration: 20260918070000_phase5k_realtime_publication.sql
-- Description: Individually verifies and adds core clinical tables to supabase_realtime.
-- =============================================================================

DO $$
DECLARE
    tbl TEXT;
    target_tables TEXT[] := ARRAY[
        'consultations',
        'message_threads',
        'messages',
        'notifications',
        'prescriptions',
        'prescription_items'
    ];
BEGIN
    -- Ensure publication exists
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;

    -- Add each table individually after checking membership
    FOREACH tbl IN ARRAY target_tables LOOP
        IF NOT EXISTS (
            SELECT 1
            FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime'
              AND schemaname = 'public'
              AND tablename = tbl
        ) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
        END IF;
    END LOOP;
END $$;
