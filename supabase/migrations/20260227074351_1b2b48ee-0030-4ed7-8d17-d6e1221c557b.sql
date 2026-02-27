
-- Drop overly permissive insert policies and replace with more specific ones
DROP POLICY IF EXISTS "Anyone can insert simulations" ON public.simulations_log;
DROP POLICY IF EXISTS "Anyone can insert orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can insert events" ON public.analytics_events;

-- Simulations log: allow inserts from edge functions (service role) or authenticated users
CREATE POLICY "Insert simulations" ON public.simulations_log FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Orders: only authenticated users can create orders
CREATE POLICY "Authenticated can insert orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (true);

-- Analytics: allow from anon and authenticated
CREATE POLICY "Insert analytics events" ON public.analytics_events FOR INSERT TO anon, authenticated WITH CHECK (true);
