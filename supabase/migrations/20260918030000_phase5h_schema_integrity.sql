-- Phase 5H Schema & Workflow Integrity Migration

-- 1. Add canonical selection fields to public.prescriptions
ALTER TABLE public.prescriptions
  ADD COLUMN IF NOT EXISTS selected_item_id UUID NULL REFERENCES public.prescription_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS selected_at TIMESTAMPTZ NULL;

-- 2. Safely remove legacy selection fields from consultations.responses JSONB
UPDATE public.consultations
SET responses = responses - 'patient_selected_prescription_item_id' - 'patient_selected_at' - 'patient_selected_option'
WHERE responses ? 'patient_selected_prescription_item_id'
   OR responses ? 'patient_selected_at'
   OR responses ? 'patient_selected_option';

-- 3. Prescription Uniqueness per consultation
WITH ranked_prescriptions AS (
  SELECT id, consultation_id, status, created_at,
    ROW_NUMBER() OVER (
      PARTITION BY consultation_id 
      ORDER BY 
        CASE WHEN status = 'finalized' THEN 1 ELSE 2 END,
        created_at DESC
    ) as rn
  FROM public.prescriptions
),
duplicates AS (
  SELECT id, consultation_id FROM ranked_prescriptions WHERE rn > 1
),
canonical AS (
  SELECT id, consultation_id FROM ranked_prescriptions WHERE rn = 1
)
UPDATE public.prescription_items pi
SET prescription_id = c.id
FROM duplicates d
JOIN canonical c ON d.consultation_id = c.consultation_id
WHERE pi.prescription_id = d.id;

DELETE FROM public.prescriptions
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY consultation_id 
      ORDER BY 
        CASE WHEN status = 'finalized' THEN 1 ELSE 2 END,
        created_at DESC
    ) as rn
    FROM public.prescriptions
  ) sub WHERE rn > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_prescriptions_unique_consultation ON public.prescriptions(consultation_id);

-- 4. Clinical Note Uniqueness per consultation + doctor
DELETE FROM public.clinical_notes
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY consultation_id, doctor_id
      ORDER BY created_at DESC
    ) as rn
    FROM public.clinical_notes
  ) sub WHERE rn > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_clinical_notes_unique_consultation_doctor ON public.clinical_notes(consultation_id, doctor_id);

-- 5. Message Thread Uniqueness per consultation
WITH ranked_threads AS (
  SELECT id, consultation_id, created_at,
    ROW_NUMBER() OVER (
      PARTITION BY consultation_id 
      ORDER BY created_at ASC
    ) as rn
  FROM public.message_threads
),
duplicates AS (
  SELECT id, consultation_id FROM ranked_threads WHERE rn > 1
),
canonical AS (
  SELECT id, consultation_id FROM ranked_threads WHERE rn = 1
)
UPDATE public.messages m
SET thread_id = c.id
FROM duplicates d
JOIN canonical c ON d.consultation_id = c.consultation_id
WHERE m.thread_id = d.id;

DELETE FROM public.message_threads
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY consultation_id 
      ORDER BY created_at ASC
    ) as rn
    FROM public.message_threads
  ) sub WHERE rn > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_message_threads_unique_consultation ON public.message_threads(consultation_id);

-- 6. Ensure supabase_realtime publication includes core clinical tables
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.consultations;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.message_threads;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;
END $$;
