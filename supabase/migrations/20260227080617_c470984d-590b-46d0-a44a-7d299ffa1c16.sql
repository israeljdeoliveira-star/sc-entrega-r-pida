
-- Add new columns to freight_settings
ALTER TABLE public.freight_settings
  ADD COLUMN IF NOT EXISTS multiplicador_moto numeric NOT NULL DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS multiplicador_carro numeric NOT NULL DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS comissao_moto numeric NOT NULL DEFAULT 15.0,
  ADD COLUMN IF NOT EXISTS comissao_carro numeric NOT NULL DEFAULT 15.0,
  ADD COLUMN IF NOT EXISTS valor_base_nacional numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS taxa_retorno_carro numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pedagios_padrao numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS margem_minima_moto numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS margem_minima_carro numeric NOT NULL DEFAULT 0;

-- Create dynamic_rules table
CREATE TABLE IF NOT EXISTS public.dynamic_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  condition_type text NOT NULL,
  multiplier numeric NOT NULL DEFAULT 1.0,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dynamic_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage dynamic rules" ON public.dynamic_rules
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active rules" ON public.dynamic_rules
  FOR SELECT USING (is_active = true);

-- Create pricing_change_log table
CREATE TABLE IF NOT EXISTS public.pricing_change_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  changed_by uuid,
  table_name text,
  field_name text,
  old_value text,
  new_value text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pricing_change_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view pricing logs" ON public.pricing_change_log
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert pricing logs" ON public.pricing_change_log
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
