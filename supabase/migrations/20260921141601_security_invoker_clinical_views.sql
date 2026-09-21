-- SUGA.HEALTH — make exposed helper views respect the querying user's RLS context.
ALTER VIEW public.v_unassigned_consultation_queue SET (security_invoker = true);
ALTER VIEW public.v_doctor_directory SET (security_invoker = true);
