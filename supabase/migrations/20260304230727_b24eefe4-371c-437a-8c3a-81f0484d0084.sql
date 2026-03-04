
-- 1. Create filial_config table
CREATE TABLE public.filial_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cidade_filial text NOT NULL,
  endereco_filial text NOT NULL DEFAULT '',
  latitude_filial numeric NOT NULL DEFAULT 0,
  longitude_filial numeric NOT NULL DEFAULT 0,
  cobrar_deslocamento_fora_filial boolean NOT NULL DEFAULT true,
  valor_km_deslocamento numeric NOT NULL DEFAULT 2.5,
  valor_minimo_filial numeric NOT NULL DEFAULT 15,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.filial_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view filial_config" ON public.filial_config FOR SELECT USING (true);
CREATE POLICY "Admins can manage filial_config" ON public.filial_config FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. Create km_tiers table
CREATE TABLE public.km_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  km_ate numeric NOT NULL,
  valor numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.km_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view km_tiers" ON public.km_tiers FOR SELECT USING (true);
CREATE POLICY "Admins can manage km_tiers" ON public.km_tiers FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. Add new log columns to simulations_log
ALTER TABLE public.simulations_log 
  ADD COLUMN IF NOT EXISTS distancia_deslocamento_km numeric,
  ADD COLUMN IF NOT EXISTS valor_entrega numeric,
  ADD COLUMN IF NOT EXISTS valor_deslocamento numeric;

-- 4. Insert default KM tiers
INSERT INTO public.km_tiers (km_ate, valor) VALUES
  (1, 15),
  (5, 20),
  (10, 30),
  (15, 40),
  (20, 50),
  (30, 65),
  (50, 90);
