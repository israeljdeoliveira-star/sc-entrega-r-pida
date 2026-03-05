import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { Calculator, HelpCircle, CheckCircle, TrendingUp, DollarSign, Fuel, Wrench, Building2, Megaphone, Target } from "lucide-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line, Legend, Tooltip as RechartsTooltip } from "recharts";

interface VehicleProfile {
  id: string;
  name: string;
  fuel_type: string;
  consumption_km_per_l: number;
  cargo_volume_m3: number;
  cargo_weight_kg: number;
  useful_life_km: number;
  purchase_value: number;
  residual_value: number;
}

interface CostInputs {
  id?: string;
  vehicle_profile_id: string;
  fuel_price_per_l: number;
  tire_cost_per_km: number;
  oil_maintenance_per_km: number;
  corrective_maintenance_per_km: number;
  toll_per_km: number;
  risk_reserve_per_km: number;
  insurance_monthly: number;
  ipva_licensing_monthly: number;
  systems_monthly: number;
  salary_monthly: number;
  admin_expenses_monthly: number;
  marketing_monthly: number;
  cost_per_lead: number;
  lead_conversion_pct: number;
  target_margin_pct: number;
  safety_margin_pct: number;
  vehicle_occupation_pct: number;
  monthly_km: number;
}

const DEFAULT_VEHICLE: Omit<VehicleProfile, "id"> = {
  name: "Montana 2014 1.4 Flex",
  fuel_type: "flex",
  consumption_km_per_l: 8,
  cargo_volume_m3: 2.5,
  cargo_weight_kg: 500,
  useful_life_km: 300000,
  purchase_value: 45000,
  residual_value: 15000,
};

const DEFAULT_COSTS: Omit<CostInputs, "vehicle_profile_id"> = {
  fuel_price_per_l: 5.80,
  tire_cost_per_km: 0.05,
  oil_maintenance_per_km: 0.08,
  corrective_maintenance_per_km: 0.05,
  toll_per_km: 0,
  risk_reserve_per_km: 0.02,
  insurance_monthly: 300,
  ipva_licensing_monthly: 150,
  systems_monthly: 100,
  salary_monthly: 2500,
  admin_expenses_monthly: 200,
  marketing_monthly: 500,
  cost_per_lead: 15,
  lead_conversion_pct: 20,
  target_margin_pct: 25,
  safety_margin_pct: 5,
  vehicle_occupation_pct: 70,
  monthly_km: 3000,
};

const COLORS = ["hsl(217, 91%, 60%)", "hsl(142, 70%, 45%)", "hsl(38, 92%, 50%)", "hsl(0, 70%, 50%)", "hsl(280, 65%, 60%)", "hsl(190, 80%, 45%)"];

function InfoTip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground inline ml-1 cursor-help" />
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-xs">{text}</TooltipContent>
    </Tooltip>
  );
}

function NumField({ label, value, onChange, prefix, suffix, tip }: {
  label: string; value: number; onChange: (v: number) => void;
  prefix?: string; suffix?: string; tip?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">
        {label}{tip && <InfoTip text={tip} />}
      </Label>
      <div className="flex items-center gap-1">
        {prefix && <span className="text-xs text-muted-foreground">{prefix}</span>}
        <Input
          type="number"
          step="0.01"
          value={value}
          onChange={e => onChange(Number(e.target.value) || 0)}
          className="text-sm h-8"
        />
        {suffix && <span className="text-xs text-muted-foreground whitespace-nowrap">{suffix}</span>}
      </div>
    </div>
  );
}

export default function CarPricingPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [vehicle, setVehicle] = useState<VehicleProfile>({ id: "", ...DEFAULT_VEHICLE });
  const [costs, setCosts] = useState<CostInputs>({ vehicle_profile_id: "", ...DEFAULT_COSTS });
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [currentPricePerKm, setCurrentPricePerKm] = useState<number>(0);

  // Load existing data
  useEffect(() => {
    (async () => {
      const { data: vp } = await supabase.from("vehicle_profiles").select("*").eq("is_active", true).limit(1).single();
      if (vp) {
        setVehicle(vp as unknown as VehicleProfile);
        const { data: ci } = await supabase.from("pricing_cost_inputs").select("*").eq("vehicle_profile_id", vp.id).order("created_at", { ascending: false }).limit(1).single();
        if (ci) setCosts(ci as unknown as CostInputs);
        else setCosts(prev => ({ ...prev, vehicle_profile_id: vp.id }));
      }
      const { data: fs } = await supabase.from("freight_settings").select("price_per_km_car").limit(1).single();
      if (fs) setCurrentPricePerKm(Number(fs.price_per_km_car) || 0);
      setLoading(false);
    })();
  }, []);

  // Calculations
  const calc = useMemo(() => {
    const fuelPerKm = costs.fuel_price_per_l / Math.max(vehicle.consumption_km_per_l, 0.1);
    const depreciationPerKm = (vehicle.purchase_value - vehicle.residual_value) / Math.max(vehicle.useful_life_km, 1);

    const variablePerKm = fuelPerKm + costs.tire_cost_per_km + costs.oil_maintenance_per_km +
      costs.corrective_maintenance_per_km + costs.toll_per_km + costs.risk_reserve_per_km + depreciationPerKm;

    const totalFixedMonthly = costs.insurance_monthly + costs.ipva_licensing_monthly +
      costs.systems_monthly + costs.salary_monthly + costs.admin_expenses_monthly;
    const fixedPerKm = totalFixedMonthly / Math.max(costs.monthly_km, 1);

    const cpa = costs.lead_conversion_pct > 0
      ? costs.cost_per_lead / (costs.lead_conversion_pct / 100)
      : 0;
    const avgKmPerTrip = 15; // estimate
    const marketingPerKm = costs.marketing_monthly / Math.max(costs.monthly_km, 1);

    const totalCostPerKm = variablePerKm + fixedPerKm + marketingPerKm;
    const occupationAdjusted = totalCostPerKm / Math.max(costs.vehicle_occupation_pct / 100, 0.1);
    const breakeven = occupationAdjusted;
    const totalMargin = costs.target_margin_pct + costs.safety_margin_pct;
    const recommended = breakeven / Math.max(1 - totalMargin / 100, 0.01);

    // Scenarios
    const pessimisticFuel = costs.fuel_price_per_l * 1.2;
    const optimisticFuel = costs.fuel_price_per_l * 0.85;
    const pessimisticCost = (pessimisticFuel / Math.max(vehicle.consumption_km_per_l, 0.1) + variablePerKm - fuelPerKm + fixedPerKm + marketingPerKm) / Math.max(costs.vehicle_occupation_pct / 100, 0.1);
    const optimisticCost = (optimisticFuel / Math.max(vehicle.consumption_km_per_l, 0.1) + variablePerKm - fuelPerKm + fixedPerKm + marketingPerKm) / Math.max(costs.vehicle_occupation_pct / 100, 0.1);

    const pessimisticPrice = pessimisticCost / Math.max(1 - totalMargin / 100, 0.01);
    const optimisticPrice = optimisticCost / Math.max(1 - totalMargin / 100, 0.01);

    // Pie chart data
    const pieData = [
      { name: "Combustível", value: fuelPerKm },
      { name: "Manutenção", value: costs.tire_cost_per_km + costs.oil_maintenance_per_km + costs.corrective_maintenance_per_km },
      { name: "Depreciação", value: depreciationPerKm },
      { name: "Custos Fixos", value: fixedPerKm },
      { name: "Marketing", value: marketingPerKm },
      { name: "Risco/Pedágio", value: costs.toll_per_km + costs.risk_reserve_per_km },
    ].filter(d => d.value > 0);

    // Sensitivity data
    const sensitivityData = Array.from({ length: 7 }, (_, i) => {
      const fuelPrice = costs.fuel_price_per_l * (0.7 + i * 0.1);
      const fuelCost = fuelPrice / Math.max(vehicle.consumption_km_per_l, 0.1);
      const totalC = (fuelCost + variablePerKm - fuelPerKm + fixedPerKm + marketingPerKm) / Math.max(costs.vehicle_occupation_pct / 100, 0.1);
      const recPrice = totalC / Math.max(1 - totalMargin / 100, 0.01);
      return { fuel: `R$ ${fuelPrice.toFixed(2)}`, custo: Number(totalC.toFixed(2)), preco: Number(recPrice.toFixed(2)) };
    });

    return {
      fuelPerKm, depreciationPerKm, variablePerKm, fixedPerKm, marketingPerKm,
      totalCostPerKm, breakeven, recommended, cpa,
      pessimisticPrice, optimisticPrice,
      pieData, sensitivityData, totalFixedMonthly,
    };
  }, [vehicle, costs]);

  const handleSave = async () => {
    try {
      // Upsert vehicle
      if (vehicle.id) {
        await supabase.from("vehicle_profiles").update({
          name: vehicle.name, fuel_type: vehicle.fuel_type,
          consumption_km_per_l: vehicle.consumption_km_per_l,
          cargo_volume_m3: vehicle.cargo_volume_m3, cargo_weight_kg: vehicle.cargo_weight_kg,
          useful_life_km: vehicle.useful_life_km, purchase_value: vehicle.purchase_value,
          residual_value: vehicle.residual_value,
        } as any).eq("id", vehicle.id);
      } else {
        const { data: newVp } = await supabase.from("vehicle_profiles").insert({
          name: vehicle.name, fuel_type: vehicle.fuel_type,
          consumption_km_per_l: vehicle.consumption_km_per_l,
          cargo_volume_m3: vehicle.cargo_volume_m3, cargo_weight_kg: vehicle.cargo_weight_kg,
          useful_life_km: vehicle.useful_life_km, purchase_value: vehicle.purchase_value,
          residual_value: vehicle.residual_value,
        } as any).select().single();
        if (newVp) {
          setVehicle(prev => ({ ...prev, id: (newVp as any).id }));
          setCosts(prev => ({ ...prev, vehicle_profile_id: (newVp as any).id }));
        }
      }

      // Upsert cost inputs
      const costPayload = { ...costs, vehicle_profile_id: vehicle.id || costs.vehicle_profile_id, updated_at: new Date().toISOString() };
      if (costs.id) {
        await supabase.from("pricing_cost_inputs").update(costPayload as any).eq("id", costs.id);
      } else {
        const { data: newCi } = await supabase.from("pricing_cost_inputs").insert(costPayload as any).select().single();
        if (newCi) setCosts(prev => ({ ...prev, id: (newCi as any).id }));
      }
      toast({ title: "Salvo!", description: "Dados de precificação atualizados." });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleApplyPrice = async () => {
    setApplying(true);
    try {
      const oldPrice = currentPricePerKm;
      const newPrice = Number(calc.recommended.toFixed(2));

      await supabase.from("freight_settings").update({ price_per_km_car: newPrice } as any).neq("id", "00000000-0000-0000-0000-000000000000");

      await supabase.from("pricing_change_log").insert({
        changed_by: user?.id || null,
        table_name: "freight_settings",
        field_name: "price_per_km_car",
        old_value: String(oldPrice),
        new_value: String(newPrice),
      });

      setCurrentPricePerKm(newPrice);
      toast({ title: "Preço aplicado!", description: `R$ ${oldPrice.toFixed(2)} → R$ ${newPrice.toFixed(2)} por km` });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setApplying(false);
    }
  };

  const updateVehicle = (key: keyof VehicleProfile, val: any) => setVehicle(prev => ({ ...prev, [key]: val }));
  const updateCosts = (key: keyof CostInputs, val: number) => setCosts(prev => ({ ...prev, [key]: val }));

  if (loading) return <div className="flex items-center justify-center py-20"><p className="text-muted-foreground">Carregando...</p></div>;

  const scenarioData = [
    { name: "Pessimista", preco: Number(calc.pessimisticPrice.toFixed(2)) },
    { name: "Base", preco: Number(calc.recommended.toFixed(2)) },
    { name: "Otimista", preco: Number(calc.optimisticPrice.toFixed(2)) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><Calculator className="h-6 w-6 text-primary" /> Precificação Inteligente — Carro</h2>
          <p className="text-sm text-muted-foreground mt-1">Calcule o preço ideal por km com base nos seus custos reais</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSave}>Salvar dados</Button>
        </div>
      </div>

      {/* Current vs recommended */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">Preço atual/km</p>
            <p className="text-2xl font-bold">R$ {currentPricePerKm.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card className="border-primary/30">
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">Custo total/km</p>
            <p className="text-2xl font-bold text-destructive">R$ {calc.totalCostPerKm.toFixed(2)}</p>
            <p className="text-[10px] text-muted-foreground">Sem ocupação ajustada</p>
          </CardContent>
        </Card>
        <Card className="border-yellow-400/30">
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">Break-even/km</p>
            <p className="text-2xl font-bold text-yellow-600">R$ {calc.breakeven.toFixed(2)}</p>
            <p className="text-[10px] text-muted-foreground">Preço de equilíbrio</p>
          </CardContent>
        </Card>
        <Card className="border-green-400/30 bg-green-50/50 dark:bg-green-950/20">
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">Preço recomendado/km</p>
            <p className="text-2xl font-bold text-green-600">R$ {calc.recommended.toFixed(2)}</p>
            <p className="text-[10px] text-muted-foreground">Com margem de {costs.target_margin_pct + costs.safety_margin_pct}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Apply button */}
      {calc.recommended > 0 && (
        <Alert className="border-primary/30 bg-primary/5">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span className="text-sm">
              Fórmula: <code className="bg-muted px-1 rounded text-xs">Preço/km = Custo/km ÷ (1 − margem%)</code>
              <InfoTip text={`Custo/km (R$ ${calc.breakeven.toFixed(2)}) ÷ (1 − ${costs.target_margin_pct + costs.safety_margin_pct}%) = R$ ${calc.recommended.toFixed(2)}`} />
            </span>
            <Button size="sm" onClick={handleApplyPrice} disabled={applying} className="gap-1">
              <TrendingUp className="h-3.5 w-3.5" /> {applying ? "Aplicando..." : "Aplicar preço recomendado"}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Vehicle */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Fuel className="h-4 w-4 text-primary" /> Veículo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Modelo</Label>
              <Input value={vehicle.name} onChange={e => updateVehicle("name", e.target.value)} className="text-sm h-8" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Combustível</Label>
              <Select value={vehicle.fuel_type} onValueChange={v => updateVehicle("fuel_type", v)}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="gasolina">Gasolina</SelectItem>
                  <SelectItem value="etanol">Etanol</SelectItem>
                  <SelectItem value="flex">Flex</SelectItem>
                  <SelectItem value="diesel">Diesel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <NumField label="Consumo (km/l com ar)" value={vehicle.consumption_km_per_l} onChange={v => updateVehicle("consumption_km_per_l", v)} suffix="km/l" tip="Consumo real médio com ar condicionado ligado" />
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Volume (m³)" value={vehicle.cargo_volume_m3} onChange={v => updateVehicle("cargo_volume_m3", v)} suffix="m³" />
              <NumField label="Carga (kg)" value={vehicle.cargo_weight_kg} onChange={v => updateVehicle("cargo_weight_kg", v)} suffix="kg" />
            </div>
            <NumField label="Vida útil" value={vehicle.useful_life_km} onChange={v => updateVehicle("useful_life_km", v)} suffix="km" />
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Valor compra" value={vehicle.purchase_value} onChange={v => updateVehicle("purchase_value", v)} prefix="R$" />
              <NumField label="Valor residual" value={vehicle.residual_value} onChange={v => updateVehicle("residual_value", v)} prefix="R$" />
            </div>
          </CardContent>
        </Card>

        {/* Variable costs */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Wrench className="h-4 w-4 text-primary" /> Custos Variáveis por KM</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <NumField label="Preço combustível" value={costs.fuel_price_per_l} onChange={v => updateCosts("fuel_price_per_l", v)} prefix="R$" suffix="/litro" />
            <div className="pl-3 text-xs text-muted-foreground">→ Custo combustível: <strong>R$ {calc.fuelPerKm.toFixed(3)}/km</strong></div>
            <NumField label="Pneus" value={costs.tire_cost_per_km} onChange={v => updateCosts("tire_cost_per_km", v)} prefix="R$" suffix="/km" tip="Custo estimado de desgaste de pneus por km" />
            <NumField label="Óleo/manutenção preventiva" value={costs.oil_maintenance_per_km} onChange={v => updateCosts("oil_maintenance_per_km", v)} prefix="R$" suffix="/km" />
            <NumField label="Manutenção corretiva" value={costs.corrective_maintenance_per_km} onChange={v => updateCosts("corrective_maintenance_per_km", v)} prefix="R$" suffix="/km" />
            <NumField label="Pedágio médio" value={costs.toll_per_km} onChange={v => updateCosts("toll_per_km", v)} prefix="R$" suffix="/km" />
            <NumField label="Reserva risco" value={costs.risk_reserve_per_km} onChange={v => updateCosts("risk_reserve_per_km", v)} prefix="R$" suffix="/km" />
            <div className="pl-3 text-xs text-muted-foreground">→ Depreciação: <strong>R$ {calc.depreciationPerKm.toFixed(3)}/km</strong></div>
            <div className="border-t pt-2 pl-3 text-xs font-semibold">Total variável: R$ {calc.variablePerKm.toFixed(3)}/km</div>
          </CardContent>
        </Card>

        {/* Fixed costs */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" /> Custos Fixos Mensais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <NumField label="Seguro" value={costs.insurance_monthly} onChange={v => updateCosts("insurance_monthly", v)} prefix="R$" suffix="/mês" />
            <NumField label="IPVA/Licenciamento" value={costs.ipva_licensing_monthly} onChange={v => updateCosts("ipva_licensing_monthly", v)} prefix="R$" suffix="/mês" />
            <NumField label="Sistemas/Assinaturas" value={costs.systems_monthly} onChange={v => updateCosts("systems_monthly", v)} prefix="R$" suffix="/mês" />
            <NumField label="Salário/Pró-labore" value={costs.salary_monthly} onChange={v => updateCosts("salary_monthly", v)} prefix="R$" suffix="/mês" />
            <NumField label="Despesas administrativas" value={costs.admin_expenses_monthly} onChange={v => updateCosts("admin_expenses_monthly", v)} prefix="R$" suffix="/mês" />
            <div className="border-t pt-2 text-xs">
              <span className="font-semibold">Total fixo: R$ {calc.totalFixedMonthly.toFixed(2)}/mês</span>
              <span className="text-muted-foreground ml-2">→ R$ {calc.fixedPerKm.toFixed(3)}/km</span>
            </div>
          </CardContent>
        </Card>

        {/* Marketing */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Megaphone className="h-4 w-4 text-primary" /> Marketing e Aquisição</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <NumField label="Investimento marketing" value={costs.marketing_monthly} onChange={v => updateCosts("marketing_monthly", v)} prefix="R$" suffix="/mês" />
            <NumField label="Custo por lead (CPL)" value={costs.cost_per_lead} onChange={v => updateCosts("cost_per_lead", v)} prefix="R$" tip="Quanto custa cada lead gerado" />
            <NumField label="Taxa conversão lead→pedido" value={costs.lead_conversion_pct} onChange={v => updateCosts("lead_conversion_pct", v)} suffix="%" />
            <div className="border-t pt-2 text-xs space-y-1">
              <div>CPA (Custo por Aquisição): <strong>R$ {calc.cpa.toFixed(2)}</strong> <InfoTip text="CPL ÷ taxa de conversão" /></div>
              <div>Rateio marketing: <strong>R$ {calc.marketingPerKm.toFixed(3)}/km</strong></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Business targets */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> Meta de Negócio</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-4">
            <NumField label="Margem de lucro alvo" value={costs.target_margin_pct} onChange={v => updateCosts("target_margin_pct", v)} suffix="%" tip="Percentual de lucro desejado sobre o preço de venda" />
            <NumField label="Margem de segurança" value={costs.safety_margin_pct} onChange={v => updateCosts("safety_margin_pct", v)} suffix="%" tip="Buffer adicional para imprevistos" />
            <NumField label="Ocupação do veículo" value={costs.vehicle_occupation_pct} onChange={v => updateCosts("vehicle_occupation_pct", v)} suffix="%" tip="% do tempo que o veículo está em corrida gerando receita" />
            <NumField label="KM rodado mensal" value={costs.monthly_km} onChange={v => updateCosts("monthly_km", v)} suffix="km/mês" />
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Pie - cost composition */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Composição do Custo/km</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={calc.pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {calc.pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <RechartsTooltip formatter={(v: number) => `R$ ${v.toFixed(3)}/km`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Bar - scenarios */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Cenários de Preço/km</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={scenarioData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <RechartsTooltip formatter={(v: number) => `R$ ${v.toFixed(2)}`} />
                <Bar dataKey="preco" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Line - fuel sensitivity */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Sensibilidade ao Combustível</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={calc.sensitivityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="fuel" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <RechartsTooltip />
                <Legend />
                <Line type="monotone" dataKey="custo" name="Custo/km" stroke="hsl(0, 70%, 50%)" strokeWidth={2} />
                <Line type="monotone" dataKey="preco" name="Preço/km" stroke="hsl(142, 70%, 45%)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
