
-- vehicle_profiles: vehicle data for pricing calculations
CREATE TABLE public.vehicle_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Montana 2014 1.4 Flex',
  fuel_type text NOT NULL DEFAULT 'flex',
  consumption_km_per_l numeric NOT NULL DEFAULT 8.0,
  cargo_volume_m3 numeric NOT NULL DEFAULT 2.5,
  cargo_weight_kg numeric NOT NULL DEFAULT 500,
  useful_life_km numeric NOT NULL DEFAULT 300000,
  purchase_value numeric NOT NULL DEFAULT 45000,
  residual_value numeric NOT NULL DEFAULT 15000,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.vehicle_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage vehicle_profiles" ON public.vehicle_profiles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view active vehicle_profiles" ON public.vehicle_profiles
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

-- pricing_cost_inputs: cost structure for pricing calculations
CREATE TABLE public.pricing_cost_inputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_profile_id uuid REFERENCES public.vehicle_profiles(id) ON DELETE CASCADE NOT NULL,
  fuel_price_per_l numeric NOT NULL DEFAULT 5.80,
  tire_cost_per_km numeric NOT NULL DEFAULT 0.05,
  oil_maintenance_per_km numeric NOT NULL DEFAULT 0.08,
  corrective_maintenance_per_km numeric NOT NULL DEFAULT 0.05,
  toll_per_km numeric NOT NULL DEFAULT 0,
  risk_reserve_per_km numeric NOT NULL DEFAULT 0.02,
  insurance_monthly numeric NOT NULL DEFAULT 300,
  ipva_licensing_monthly numeric NOT NULL DEFAULT 150,
  systems_monthly numeric NOT NULL DEFAULT 100,
  salary_monthly numeric NOT NULL DEFAULT 2500,
  admin_expenses_monthly numeric NOT NULL DEFAULT 200,
  marketing_monthly numeric NOT NULL DEFAULT 500,
  cost_per_lead numeric NOT NULL DEFAULT 15,
  lead_conversion_pct numeric NOT NULL DEFAULT 20,
  target_margin_pct numeric NOT NULL DEFAULT 25,
  safety_margin_pct numeric NOT NULL DEFAULT 5,
  vehicle_occupation_pct numeric NOT NULL DEFAULT 70,
  monthly_km numeric NOT NULL DEFAULT 3000,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pricing_cost_inputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage pricing_cost_inputs" ON public.pricing_cost_inputs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- pricing_simulations: saved scenario outputs
CREATE TABLE public.pricing_simulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  input_id uuid REFERENCES public.pricing_cost_inputs(id) ON DELETE CASCADE NOT NULL,
  scenario text NOT NULL DEFAULT 'base',
  cost_per_km numeric NOT NULL DEFAULT 0,
  breakeven_price numeric NOT NULL DEFAULT 0,
  recommended_price numeric NOT NULL DEFAULT 0,
  output_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pricing_simulations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage pricing_simulations" ON public.pricing_simulations
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add use_new_car_pricing flag to freight_settings for feature toggle
ALTER TABLE public.freight_settings ADD COLUMN IF NOT EXISTS use_new_car_pricing boolean NOT NULL DEFAULT false;
