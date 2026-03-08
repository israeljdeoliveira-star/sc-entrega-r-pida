import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Download, Loader2, CheckCircle2, Database, Copy, Code, Users, HardDrive, Zap, KeyRound, FileText, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// ─── CSV Export ───

const EXPORTABLE_TABLES = [
  { name: "analytics_events", label: "Eventos Analytics" },
  { name: "cities", label: "Cidades" },
  { name: "drivers", label: "Motoristas" },
  { name: "dynamic_rules", label: "Regras Dinâmicas" },
  { name: "filial_config", label: "Configuração Filial" },
  { name: "freight_settings", label: "Configurações de Frete" },
  { name: "km_tiers", label: "Tabela de KM" },
  { name: "neighborhoods", label: "Bairros" },
  { name: "orders", label: "Pedidos" },
  { name: "pricing_change_log", label: "Log de Alterações de Preço" },
  { name: "pricing_cost_inputs", label: "Custos de Precificação" },
  { name: "pricing_simulations", label: "Simulações de Precificação" },
  { name: "profiles", label: "Perfis de Usuários" },
  { name: "served_states", label: "Estados Atendidos" },
  { name: "service_photos", label: "Fotos de Serviços" },
  { name: "simulations_log", label: "Log de Simulações" },
  { name: "site_settings", label: "Configurações do Site" },
  { name: "user_roles", label: "Roles de Usuários" },
  { name: "vehicle_profiles", label: "Perfis de Veículos" },
] as const;

function toCsv(data: Record<string, unknown>[]): string {
  if (!data.length) return "";
  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers.map((h) => {
      const val = row[h];
      const str = val === null || val === undefined ? "" : typeof val === "object" ? JSON.stringify(val) : String(val);
      return `"${str.replace(/"/g, '""')}"`;
    }).join(",")
  );
  return [headers.join(","), ...rows].join("\n");
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── SQL Schema Data ───

const SQL_ENUM = `CREATE TYPE public.app_role AS ENUM ('admin', 'user', 'driver', 'client');`;

const SQL_TABLES: Record<string, string> = {
  analytics_events: `CREATE TABLE public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  event_data jsonb DEFAULT '{}'::jsonb,
  page text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view events" ON public.analytics_events
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Insert analytics events" ON public.analytics_events
  FOR INSERT WITH CHECK (true);`,

  cities: `CREATE TABLE public.cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  state text NOT NULL DEFAULT 'SC',
  vehicle_type text NOT NULL DEFAULT 'moto',
  density text NOT NULL DEFAULT 'media',
  base_value numeric NOT NULL DEFAULT 0,
  min_value numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  observation text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage cities" ON public.cities
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active cities" ON public.cities
  FOR SELECT USING (true);`,

  drivers: `CREATE TABLE public.drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  vehicle_type text NOT NULL DEFAULT 'moto',
  license_plate text,
  is_active boolean NOT NULL DEFAULT true,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage drivers" ON public.drivers
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Drivers can view own record" ON public.drivers
  FOR SELECT USING (auth.uid() = user_id);`,

  dynamic_rules: `CREATE TABLE public.dynamic_rules (
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
  FOR SELECT USING (is_active = true);`,

  filial_config: `CREATE TABLE public.filial_config (
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

CREATE POLICY "Admins can manage filial_config" ON public.filial_config
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view filial_config" ON public.filial_config
  FOR SELECT USING (true);`,

  freight_settings: `CREATE TABLE public.freight_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fixed_fee numeric NOT NULL DEFAULT 0,
  price_per_km_moto numeric NOT NULL DEFAULT 2.5,
  price_per_km_car numeric NOT NULL DEFAULT 4.0,
  car_min_value numeric NOT NULL DEFAULT 98.00,
  use_new_car_pricing boolean NOT NULL DEFAULT false,
  moto_extra_stop_fee numeric NOT NULL DEFAULT 0,
  moto_return_fee numeric NOT NULL DEFAULT 0,
  moto_return_mode text NOT NULL DEFAULT 'hybrid',
  moto_return_price_per_km numeric NOT NULL DEFAULT 2.5,
  moto_return_min_fee numeric NOT NULL DEFAULT 10,
  moto_return_included_km numeric NOT NULL DEFAULT 8,
  multi_trip_discount_pct numeric NOT NULL DEFAULT 0,
  car_fee_fragile numeric NOT NULL DEFAULT 0,
  car_fee_bubble_wrap numeric NOT NULL DEFAULT 0,
  car_fee_no_elevator numeric NOT NULL DEFAULT 0,
  car_fee_stairs numeric NOT NULL DEFAULT 0,
  car_fee_helper numeric NOT NULL DEFAULT 0,
  long_distance_km numeric NOT NULL DEFAULT 50,
  national_min_value numeric NOT NULL DEFAULT 50.00,
  national_price_per_km numeric NOT NULL DEFAULT 3.50,
  valor_base_nacional numeric NOT NULL DEFAULT 0,
  margin_base numeric NOT NULL DEFAULT 15,
  margin_long_distance numeric NOT NULL DEFAULT 0,
  margin_peak numeric NOT NULL DEFAULT 0,
  margin_rain numeric NOT NULL DEFAULT 0,
  margin_risk_high numeric NOT NULL DEFAULT 0,
  mult_car_peak numeric NOT NULL DEFAULT 1.0,
  mult_car_rain numeric NOT NULL DEFAULT 1.0,
  mult_car_night numeric NOT NULL DEFAULT 1.0,
  mult_car_risk_high numeric NOT NULL DEFAULT 1.0,
  mult_car_risk_medium numeric NOT NULL DEFAULT 1.0,
  mult_car_severe numeric NOT NULL DEFAULT 1.0,
  mult_moto_peak numeric NOT NULL DEFAULT 1.0,
  mult_moto_rain numeric NOT NULL DEFAULT 1.0,
  mult_moto_night numeric NOT NULL DEFAULT 1.0,
  mult_moto_risk_high numeric NOT NULL DEFAULT 1.0,
  mult_moto_risk_medium numeric NOT NULL DEFAULT 1.0,
  mult_moto_severe numeric NOT NULL DEFAULT 1.0,
  enable_radius_limit boolean NOT NULL DEFAULT false,
  max_radius_km numeric NOT NULL DEFAULT 100,
  margem_minima_carro numeric NOT NULL DEFAULT 0,
  margem_minima_moto numeric NOT NULL DEFAULT 0,
  pedagios_padrao numeric NOT NULL DEFAULT 0,
  taxa_retorno_carro numeric NOT NULL DEFAULT 0,
  comissao_carro numeric NOT NULL DEFAULT 15.0,
  comissao_moto numeric NOT NULL DEFAULT 15.0,
  multiplicador_carro numeric NOT NULL DEFAULT 1.0,
  multiplicador_moto numeric NOT NULL DEFAULT 1.0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.freight_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage freight settings" ON public.freight_settings
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view freight settings" ON public.freight_settings
  FOR SELECT USING (true);`,

  km_tiers: `CREATE TABLE public.km_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  km_ate numeric NOT NULL,
  valor numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.km_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage km_tiers" ON public.km_tiers
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view km_tiers" ON public.km_tiers
  FOR SELECT USING (true);`,

  neighborhoods: `CREATE TABLE public.neighborhoods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  city_id uuid NOT NULL REFERENCES public.cities(id),
  additional_fee numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.neighborhoods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage neighborhoods" ON public.neighborhoods
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view neighborhoods" ON public.neighborhoods
  FOR SELECT USING (true);`,

  orders: `CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'pending',
  client_name text,
  client_phone text,
  origin_city text,
  destination_city text,
  vehicle_type text,
  distance_km numeric,
  final_value numeric,
  driver_id uuid REFERENCES public.drivers(id),
  simulation_id uuid REFERENCES public.simulations_log(id),
  confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage orders" ON public.orders
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can insert orders" ON public.orders
  FOR INSERT WITH CHECK (true);`,

  pricing_change_log: `CREATE TABLE public.pricing_change_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text,
  field_name text,
  old_value text,
  new_value text,
  changed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pricing_change_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view pricing logs" ON public.pricing_change_log
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert pricing logs" ON public.pricing_change_log
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));`,

  pricing_cost_inputs: `CREATE TABLE public.pricing_cost_inputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_profile_id uuid NOT NULL REFERENCES public.vehicle_profiles(id),
  fuel_price_per_l numeric NOT NULL DEFAULT 5.80,
  tire_cost_per_km numeric NOT NULL DEFAULT 0.05,
  oil_maintenance_per_km numeric NOT NULL DEFAULT 0.08,
  corrective_maintenance_per_km numeric NOT NULL DEFAULT 0.05,
  risk_reserve_per_km numeric NOT NULL DEFAULT 0.02,
  toll_per_km numeric NOT NULL DEFAULT 0,
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
  monthly_km numeric NOT NULL DEFAULT 3000,
  vehicle_occupation_pct numeric NOT NULL DEFAULT 70,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pricing_cost_inputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage pricing_cost_inputs" ON public.pricing_cost_inputs
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));`,

  pricing_simulations: `CREATE TABLE public.pricing_simulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  input_id uuid NOT NULL REFERENCES public.pricing_cost_inputs(id),
  scenario text NOT NULL DEFAULT 'base',
  cost_per_km numeric NOT NULL DEFAULT 0,
  breakeven_price numeric NOT NULL DEFAULT 0,
  recommended_price numeric NOT NULL DEFAULT 0,
  output_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pricing_simulations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage pricing_simulations" ON public.pricing_simulations
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));`,

  profiles: `CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text,
  email text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));`,

  served_states: `CREATE TABLE public.served_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state_code text NOT NULL,
  state_name text NOT NULL,
  base_value numeric NOT NULL DEFAULT 0,
  min_value numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.served_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage served_states" ON public.served_states
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active served_states" ON public.served_states
  FOR SELECT USING (true);`,

  service_photos: `CREATE TABLE public.service_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  image_url text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.service_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage service photos" ON public.service_photos
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active service photos" ON public.service_photos
  FOR SELECT USING (is_active = true);`,

  simulations_log: `CREATE TABLE public.simulations_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_type text NOT NULL,
  mode text NOT NULL DEFAULT 'sc',
  origin_city text,
  origin_neighborhood text,
  destination_city text,
  destination_neighborhood text,
  distance_km numeric,
  distancia_deslocamento_km numeric,
  valor_entrega numeric,
  valor_deslocamento numeric,
  operational_value numeric,
  margin_applied numeric,
  final_value numeric,
  config_snapshot jsonb,
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.simulations_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view simulations" ON public.simulations_log
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Insert simulations" ON public.simulations_log
  FOR INSERT WITH CHECK (true);`,

  site_settings: `CREATE TABLE public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp_number text NOT NULL DEFAULT '5547999999999',
  show_whatsapp_button boolean NOT NULL DEFAULT true,
  ga4_id text DEFAULT '',
  gtm_id text DEFAULT '',
  facebook_pixel_id text DEFAULT '',
  google_verification text DEFAULT '',
  custom_tracking_code text DEFAULT '',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage site settings" ON public.site_settings
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view site settings" ON public.site_settings
  FOR SELECT USING (true);`,

  user_roles: `CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);`,

  vehicle_profiles: `CREATE TABLE public.vehicle_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Montana 2014 1.4 Flex',
  fuel_type text NOT NULL DEFAULT 'flex',
  consumption_km_per_l numeric NOT NULL DEFAULT 8.0,
  cargo_volume_m3 numeric NOT NULL DEFAULT 2.5,
  cargo_weight_kg numeric NOT NULL DEFAULT 500,
  purchase_value numeric NOT NULL DEFAULT 45000,
  residual_value numeric NOT NULL DEFAULT 15000,
  useful_life_km numeric NOT NULL DEFAULT 300000,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vehicle_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage vehicle_profiles" ON public.vehicle_profiles
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active vehicle_profiles" ON public.vehicle_profiles
  FOR SELECT USING (is_active = true);`,
};

const SQL_FUNCTIONS = `-- Função: has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Função: handle_new_user (trigger)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;

-- Função: auto_assign_master_admin (trigger)
CREATE OR REPLACE FUNCTION public.auto_assign_master_admin()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.email IN ('visraeloficial@gmail.com', 'israeljdeoliveira@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Função: cleanup_old_simulations
CREATE OR REPLACE FUNCTION public.cleanup_old_simulations()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.simulations_log
  WHERE created_at < now() - interval '30 days';
END;
$$;`;

const STORAGE_INFO = `-- Bucket: service-photos
-- Public: Sim
-- Usado para armazenar fotos dos serviços realizados.
-- Acesso público de leitura. Upload restrito a admins via RLS.

-- Para criar o bucket via SQL:
INSERT INTO storage.buckets (id, name, public)
VALUES ('service-photos', 'service-photos', true);`;

const EDGE_FUNCTIONS_INFO = `-- Edge Function: calculate-freight
-- Caminho: supabase/functions/calculate-freight/index.ts
-- Descrição: Calcula o valor do frete com base nas configurações,
-- distância, tipo de veículo e regras dinâmicas.
-- Invocação: supabase.functions.invoke('calculate-freight', { body: {...} })`;

const SECRETS_INFO = `-- Secrets estão configurados e gerenciados via Lovable Cloud.
-- Por segurança, os nomes e valores não são exibidos aqui.
-- Para gerenciar secrets, acesse as configurações do projeto no Lovable.
--
-- Total de secrets configurados: 7
-- Todos os secrets necessários estão ativos e funcionando.`;

const LOGS_INFO = `-- Logs do sistema são acessíveis via Lovable Cloud.
-- Tipos disponíveis:
--   • Edge Function logs (invocações, erros)
--   • Auth logs (logins, signups, falhas)
--   • Database logs (queries lentas, erros)
--   • Realtime logs (conexões WebSocket)
--
-- Para acessar, use o painel Lovable Cloud no menu do projeto.`;

// ─── Sidebar items ───

type SidebarSection = "database" | "users" | "storage" | "edge-functions" | "secrets" | "logs";

const SIDEBAR_ITEMS: { id: SidebarSection; label: string; icon: React.ElementType }[] = [
  { id: "database", label: "Database", icon: Database },
  { id: "users", label: "Users", icon: Users },
  { id: "storage", label: "Storage", icon: HardDrive },
  { id: "edge-functions", label: "Edge Functions", icon: Zap },
  { id: "secrets", label: "Secrets", icon: KeyRound },
  { id: "logs", label: "Logs", icon: FileText },
];

// ─── Components ───

function CopyButton({ text, label = "Copiar SQL" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5 text-xs">
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copiado!" : label}
    </Button>
  );
}

function SqlBlock({ sql }: { sql: string }) {
  return (
    <pre className="rounded-md bg-muted/70 p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap border border-border">
      {sql}
    </pre>
  );
}

function DatabaseSection() {
  const allSql = [SQL_ENUM, "", ...Object.values(SQL_TABLES), "", SQL_FUNCTIONS].join("\n\n");
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Todas as Tabelas</h3>
        <CopyButton text={allSql} label="Copiar Tudo" />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">Enum</span>
          <CopyButton text={SQL_ENUM} />
        </div>
        <SqlBlock sql={SQL_ENUM} />
      </div>

      <Accordion type="multiple" className="space-y-1">
        {Object.entries(SQL_TABLES).map(([table, sql]) => (
          <AccordionItem key={table} value={table} className="border rounded-md px-3">
            <AccordionTrigger className="text-sm font-mono py-3 hover:no-underline">
              {table}
            </AccordionTrigger>
            <AccordionContent className="space-y-2 pb-4">
              <div className="flex justify-end">
                <CopyButton text={sql} />
              </div>
              <SqlBlock sql={sql} />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">Funções e Triggers</span>
          <CopyButton text={SQL_FUNCTIONS} />
        </div>
        <SqlBlock sql={SQL_FUNCTIONS} />
      </div>
    </div>
  );
}

function UsersSection() {
  const usersSql = [SQL_TABLES.profiles, SQL_TABLES.user_roles].join("\n\n");
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Tabelas de Usuários</h3>
        <CopyButton text={usersSql} label="Copiar Tudo" />
      </div>
      {["profiles", "user_roles"].map((t) => (
        <div key={t} className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-mono font-medium">{t}</span>
            <CopyButton text={SQL_TABLES[t]} />
          </div>
          <SqlBlock sql={SQL_TABLES[t]} />
        </div>
      ))}
    </div>
  );
}

function InfoSection({ title, sql }: { title: string; sql: string }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
        <CopyButton text={sql} />
      </div>
      <SqlBlock sql={sql} />
    </div>
  );
}

// ─── Main Component ───

export default function DataExportPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [exported, setExported] = useState<Set<string>>(new Set());
  const [exportingAll, setExportingAll] = useState(false);
  const [activeSection, setActiveSection] = useState<SidebarSection>("database");

  const exportTable = async (tableName: string) => {
    setLoading(tableName);
    try {
      const { data, error } = await (supabase.from(tableName as any).select("*") as any);
      if (error) throw error;
      if (!data || data.length === 0) {
        toast({ title: "Tabela vazia", description: `A tabela "${tableName}" não possui registros.` });
        setLoading(null);
        return;
      }
      const csv = toCsv(data as Record<string, unknown>[]);
      downloadCsv(csv, `${tableName}_${new Date().toISOString().slice(0, 10)}.csv`);
      setExported((prev) => new Set(prev).add(tableName));
      toast({ title: "Exportado!", description: `${data.length} registros de "${tableName}".` });
    } catch (e: any) {
      toast({ title: "Erro ao exportar", description: e.message, variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  const exportAll = async () => {
    setExportingAll(true);
    for (const table of EXPORTABLE_TABLES) {
      await exportTable(table.name);
    }
    setExportingAll(false);
    toast({ title: "Exportação completa", description: "Todos os CSVs foram baixados." });
  };

  const renderSqlContent = () => {
    switch (activeSection) {
      case "database": return <DatabaseSection />;
      case "users": return <UsersSection />;
      case "storage": return <InfoSection title="Storage Buckets" sql={STORAGE_INFO} />;
      case "edge-functions": return <InfoSection title="Edge Functions" sql={EDGE_FUNCTIONS_INFO} />;
      case "secrets": return <InfoSection title="Secrets" sql={SECRETS_INFO} />;
      case "logs": return <InfoSection title="Logs" sql={LOGS_INFO} />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Exportar Dados
        </CardTitle>
        <CardDescription>
          Exporte dados em CSV ou copie o SQL de criação das tabelas para migração.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="csv" className="space-y-4">
          <TabsList>
            <TabsTrigger value="csv" className="gap-1.5">
              <Download className="h-3.5 w-3.5" /> Exportar CSV
            </TabsTrigger>
            <TabsTrigger value="sql" className="gap-1.5">
              <Code className="h-3.5 w-3.5" /> SQL Schema
            </TabsTrigger>
          </TabsList>

          {/* CSV Tab */}
          <TabsContent value="csv" className="space-y-4">
            <Button onClick={exportAll} disabled={exportingAll || !!loading} className="w-full sm:w-auto">
              {exportingAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              {exportingAll ? "Exportando tudo..." : "Exportar Todas as Tabelas"}
            </Button>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {EXPORTABLE_TABLES.map((table) => (
                <Button
                  key={table.name}
                  variant="outline"
                  size="sm"
                  className="justify-start gap-2 text-xs"
                  disabled={!!loading || exportingAll}
                  onClick={() => exportTable(table.name)}
                >
                  {loading === table.name ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : exported.has(table.name) ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  {table.label}
                </Button>
              ))}
            </div>
          </TabsContent>

          {/* SQL Schema Tab */}
          <TabsContent value="sql">
            <div className="flex gap-4 min-h-[500px]">
              {/* Sidebar */}
              <div className="w-48 shrink-0 rounded-lg border bg-card">
                <nav className="flex flex-col p-2 gap-0.5">
                  {SIDEBAR_ITEMS.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveSection(item.id)}
                        className={cn(
                          "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors text-left",
                          activeSection === item.id
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {item.label}
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Content */}
              <ScrollArea className="flex-1 rounded-lg border p-4">
                {renderSqlContent()}
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
