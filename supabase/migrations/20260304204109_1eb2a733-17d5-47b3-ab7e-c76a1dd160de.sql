
-- Add vehicle_type column to cities table
ALTER TABLE public.cities ADD COLUMN vehicle_type text NOT NULL DEFAULT 'moto';

-- Update all existing cities to moto
UPDATE public.cities SET vehicle_type = 'moto' WHERE vehicle_type = 'moto';

-- Create served_states table for car freight
CREATE TABLE public.served_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state_code text NOT NULL,
  state_name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  min_value numeric NOT NULL DEFAULT 0,
  base_value numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(state_code)
);

-- Enable RLS
ALTER TABLE public.served_states ENABLE ROW LEVEL SECURITY;

-- RLS policies for served_states
CREATE POLICY "Admins can manage served_states" ON public.served_states FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can view active served_states" ON public.served_states FOR SELECT USING (true);
