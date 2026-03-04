
-- Create function to cleanup old simulations (older than 30 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_simulations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.simulations_log
  WHERE created_at < now() - interval '30 days';
END;
$$;

-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- Schedule daily cleanup at 3:00 AM UTC
SELECT cron.schedule(
  'cleanup-old-simulations',
  '0 3 * * *',
  'SELECT public.cleanup_old_simulations()'
);
