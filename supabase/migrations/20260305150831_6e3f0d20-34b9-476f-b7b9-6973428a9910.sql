ALTER TABLE public.freight_settings
  ADD COLUMN IF NOT EXISTS moto_return_mode text NOT NULL DEFAULT 'hybrid',
  ADD COLUMN IF NOT EXISTS moto_return_included_km numeric NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS moto_return_price_per_km numeric NOT NULL DEFAULT 2.5,
  ADD COLUMN IF NOT EXISTS moto_return_min_fee numeric NOT NULL DEFAULT 10;

UPDATE public.freight_settings SET moto_return_fee = 12 WHERE moto_return_fee = 0;