
-- Add fixed_fee to freight_settings
ALTER TABLE public.freight_settings
  ADD COLUMN fixed_fee NUMERIC NOT NULL DEFAULT 0;

-- Add 'driver' and 'client' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'driver';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'client';

-- Create drivers table
CREATE TABLE public.drivers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  phone TEXT,
  vehicle_type TEXT NOT NULL DEFAULT 'moto',
  license_plate TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage drivers" ON public.drivers FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Drivers can view own record" ON public.drivers FOR SELECT USING (auth.uid() = user_id);

-- Create simulations_log table
CREATE TABLE public.simulations_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  origin_city TEXT,
  destination_city TEXT,
  origin_neighborhood TEXT,
  destination_neighborhood TEXT,
  vehicle_type TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'sc',
  distance_km NUMERIC,
  final_value NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.simulations_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert simulations" ON public.simulations_log FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view simulations" ON public.simulations_log FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Create orders table
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  simulation_id UUID REFERENCES public.simulations_log(id),
  client_name TEXT,
  client_phone TEXT,
  driver_id UUID REFERENCES public.drivers(id),
  status TEXT NOT NULL DEFAULT 'pending',
  origin_city TEXT,
  destination_city TEXT,
  distance_km NUMERIC,
  final_value NUMERIC,
  vehicle_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage orders" ON public.orders FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can insert orders" ON public.orders FOR INSERT WITH CHECK (true);

-- Create analytics_events table for click tracking
CREATE TABLE public.analytics_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  page TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert events" ON public.analytics_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view events" ON public.analytics_events FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Add name and phone to profiles for client management
ALTER TABLE public.profiles
  ADD COLUMN name TEXT,
  ADD COLUMN phone TEXT;
