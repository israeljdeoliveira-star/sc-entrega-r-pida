
ALTER TABLE public.freight_settings
ADD COLUMN IF NOT EXISTS moto_return_fee numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS moto_extra_stop_fee numeric NOT NULL DEFAULT 0;
