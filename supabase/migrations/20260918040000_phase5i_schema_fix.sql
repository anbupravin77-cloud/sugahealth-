-- Phase 5I: Final Schema Contract & Realtime Configuration Migration
-- Date: 2026-09-19

ALTER TABLE public.prescription_items
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS is_recommended BOOLEAN NOT NULL DEFAULT FALSE;

-- Ensure real-time publication includes core clinical tables
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.consultations;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.message_threads;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.prescriptions;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.prescription_items;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;
