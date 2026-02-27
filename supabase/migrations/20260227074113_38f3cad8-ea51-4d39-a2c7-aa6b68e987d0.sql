
ALTER TABLE public.freight_settings
  ADD COLUMN national_price_per_km NUMERIC NOT NULL DEFAULT 3.50,
  ADD COLUMN national_min_value NUMERIC NOT NULL DEFAULT 50.00;

UPDATE public.freight_settings SET national_price_per_km = 3.50, national_min_value = 50.00;
