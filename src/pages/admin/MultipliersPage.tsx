import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Bike, Car, Clock, Moon, CloudRain, CloudLightning, ShieldAlert, AlertTriangle } from "lucide-react";

interface MultField {
  key: string;
  label: string;
  description: string;
  icon: React.ElementType;
}

const motoFields: MultField[] = [
  { key: "mult_moto_peak", label: "Horário de Pico", description: "Multiplicador aplicado em horários de alta demanda (ex: 11h-13h, 17h-19h). Valor 1.0 = sem alteração.", icon: Clock },
  { key: "mult_moto_night", label: "Noturno", description: "Multiplicador para entregas realizadas no período noturno (após 20h). Valor 1.0 = sem alteração.", icon: Moon },
  { key: "mult_moto_rain", label: "Chuva", description: "Multiplicador aplicado quando há chuva na região. Compensa o risco e dificuldade do motoboy.", icon: CloudRain },
  { key: "mult_moto_severe", label: "Clima Severo", description: "Multiplicador para condições climáticas extremas (temporal, granizo). Valor mais alto que chuva comum.", icon: CloudLightning },
  { key: "mult_moto_risk_medium", label: "Risco Médio", description: "Multiplicador para áreas classificadas como risco médio. Compensa o risco operacional.", icon: AlertTriangle },
  { key: "mult_moto_risk_high", label: "Risco Alto", description: "Multiplicador para áreas de alto risco. Deve ser maior que o de risco médio.", icon: ShieldAlert },
];

const carFields: MultField[] = [
  { key: "mult_car_peak", label: "Horário de Pico", description: "Multiplicador aplicado em horários de alta demanda para fretes de carro.", icon: Clock },
  { key: "mult_car_night", label: "Noturno", description: "Multiplicador para entregas noturnas realizadas por carro.", icon: Moon },
  { key: "mult_car_rain", label: "Chuva", description: "Multiplicador aplicado em condições de chuva para fretes de carro.", icon: CloudRain },
  { key: "mult_car_severe", label: "Clima Severo", description: "Multiplicador para condições climáticas extremas em fretes de carro.", icon: CloudLightning },
  { key: "mult_car_risk_medium", label: "Risco Médio", description: "Multiplicador para áreas de risco médio em fretes de carro.", icon: AlertTriangle },
  { key: "mult_car_risk_high", label: "Risco Alto", description: "Multiplicador para áreas de alto risco em fretes de carro.", icon: ShieldAlert },
];

const allKeys = [...motoFields, ...carFields].map((f) => f.key);

export default function MultipliersPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [original, setOriginal] = useState<Record<string, string>>({});
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    supabase
      .from("freight_settings")
      .select("*")
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) {
          setSettingsId(data.id);
          const mapped: Record<string, string> = {};
          Object.entries(data).forEach(([k, v]) => {
            if (k !== "id") mapped[k] = String(v ?? "1.0");
          });
          setSettings(mapped);
          setOriginal(mapped);
        }
      });
  }, []);

  const set = (key: string, value: string) => setSettings((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!settingsId) return;
    setSaving(true);

    const updatePayload: Record<string, any> = { updated_at: new Date().toISOString() };
    allKeys.forEach((k) => {
      updatePayload[k] = parseFloat(settings[k] || "1.0");
    });

    const { error } = await supabase.from("freight_settings").update(updatePayload).eq("id", settingsId);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    const changes: { field_name: string; old_value: string; new_value: string }[] = [];
    allKeys.forEach((k) => {
      if (settings[k] !== original[k]) {
        changes.push({ field_name: k, old_value: original[k] || "", new_value: settings[k] || "" });
      }
    });
    if (changes.length > 0) {
      const { data: userData } = await supabase.auth.getUser();
      await supabase.from("pricing_change_log").insert(
        changes.map((c) => ({ changed_by: userData?.user?.id || null, table_name: "freight_settings", ...c }))
      );
    }

    setOriginal({ ...settings });
    setSaving(false);
    toast({ title: "Multiplicadores salvos!" });
  };

  const renderFields = (fields: MultField[]) => (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map((field) => (
        <Card key={field.key}>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <field.icon className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm">{field.label}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <Input
              type="number"
              step="0.05"
              min="0.1"
              value={settings[field.key] || "1.0"}
              onChange={(e) => set(field.key, e.target.value)}
            />
            <p className="text-xs text-muted-foreground leading-relaxed">{field.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Multiplicadores Operacionais</h2>
        <p className="text-muted-foreground">
          Configure multiplicadores por condição para cada tipo de veículo. Valor 1.0 significa sem alteração no preço.
        </p>
      </div>

      <Tabs defaultValue="moto">
        <TabsList>
          <TabsTrigger value="moto" className="gap-1.5">
            <Bike className="h-4 w-4" /> Moto
          </TabsTrigger>
          <TabsTrigger value="car" className="gap-1.5">
            <Car className="h-4 w-4" /> Carro
          </TabsTrigger>
        </TabsList>
        <TabsContent value="moto" className="mt-4">
          {renderFields(motoFields)}
        </TabsContent>
        <TabsContent value="car" className="mt-4">
          {renderFields(carFields)}
        </TabsContent>
      </Tabs>

      <Button onClick={handleSave} disabled={saving} className="w-full max-w-md">
        {saving ? "Salvando..." : "Salvar Multiplicadores"}
      </Button>
    </div>
  );
}
