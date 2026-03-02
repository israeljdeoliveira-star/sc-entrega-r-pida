
-- FASE 1: Adicionar colunas em cities, freight_settings e simulations_log

-- Cities: base_value, density, observation
ALTER TABLE public.cities ADD COLUMN IF NOT EXISTS base_value numeric NOT NULL DEFAULT 0;
ALTER TABLE public.cities ADD COLUMN IF NOT EXISTS density text NOT NULL DEFAULT 'media';
ALTER TABLE public.cities ADD COLUMN IF NOT EXISTS observation text;

-- Freight Settings: raio, multiplicadores MOTO, multiplicadores CARRO, margem inteligente
ALTER TABLE public.freight_settings ADD COLUMN IF NOT EXISTS max_radius_km numeric NOT NULL DEFAULT 100;
ALTER TABLE public.freight_settings ADD COLUMN IF NOT EXISTS enable_radius_limit boolean NOT NULL DEFAULT false;

-- Multiplicadores MOTO
ALTER TABLE public.freight_settings ADD COLUMN IF NOT EXISTS mult_moto_peak numeric NOT NULL DEFAULT 1.0;
ALTER TABLE public.freight_settings ADD COLUMN IF NOT EXISTS mult_moto_night numeric NOT NULL DEFAULT 1.0;
ALTER TABLE public.freight_settings ADD COLUMN IF NOT EXISTS mult_moto_rain numeric NOT NULL DEFAULT 1.0;
ALTER TABLE public.freight_settings ADD COLUMN IF NOT EXISTS mult_moto_severe numeric NOT NULL DEFAULT 1.0;
ALTER TABLE public.freight_settings ADD COLUMN IF NOT EXISTS mult_moto_risk_medium numeric NOT NULL DEFAULT 1.0;
ALTER TABLE public.freight_settings ADD COLUMN IF NOT EXISTS mult_moto_risk_high numeric NOT NULL DEFAULT 1.0;

-- Multiplicadores CARRO
ALTER TABLE public.freight_settings ADD COLUMN IF NOT EXISTS mult_car_peak numeric NOT NULL DEFAULT 1.0;
ALTER TABLE public.freight_settings ADD COLUMN IF NOT EXISTS mult_car_night numeric NOT NULL DEFAULT 1.0;
ALTER TABLE public.freight_settings ADD COLUMN IF NOT EXISTS mult_car_rain numeric NOT NULL DEFAULT 1.0;
ALTER TABLE public.freight_settings ADD COLUMN IF NOT EXISTS mult_car_severe numeric NOT NULL DEFAULT 1.0;
ALTER TABLE public.freight_settings ADD COLUMN IF NOT EXISTS mult_car_risk_medium numeric NOT NULL DEFAULT 1.0;
ALTER TABLE public.freight_settings ADD COLUMN IF NOT EXISTS mult_car_risk_high numeric NOT NULL DEFAULT 1.0;

-- Margem Inteligente
ALTER TABLE public.freight_settings ADD COLUMN IF NOT EXISTS margin_base numeric NOT NULL DEFAULT 15;
ALTER TABLE public.freight_settings ADD COLUMN IF NOT EXISTS margin_peak numeric NOT NULL DEFAULT 0;
ALTER TABLE public.freight_settings ADD COLUMN IF NOT EXISTS margin_rain numeric NOT NULL DEFAULT 0;
ALTER TABLE public.freight_settings ADD COLUMN IF NOT EXISTS margin_risk_high numeric NOT NULL DEFAULT 0;
ALTER TABLE public.freight_settings ADD COLUMN IF NOT EXISTS margin_long_distance numeric NOT NULL DEFAULT 0;
ALTER TABLE public.freight_settings ADD COLUMN IF NOT EXISTS long_distance_km numeric NOT NULL DEFAULT 50;

-- Simulations Log: operational_value, margin_applied, config_snapshot
ALTER TABLE public.simulations_log ADD COLUMN IF NOT EXISTS operational_value numeric;
ALTER TABLE public.simulations_log ADD COLUMN IF NOT EXISTS margin_applied numeric;
ALTER TABLE public.simulations_log ADD COLUMN IF NOT EXISTS config_snapshot jsonb;
