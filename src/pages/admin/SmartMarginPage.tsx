import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Percent, Clock, CloudRain, ShieldAlert, Route, Ruler } from "lucide-react";

interface MarginField {
  key: string;
  label: string;
  description: string;
  icon: React.ElementType;
  suffix: string;
}

const fields: MarginField[] = [
  {
    key: "margin_base",
    label: "Margem Base Padrão",
    description: "Alterando a margem base, você define o lucro padrão aplicado sobre todos os fretes. Este percentual é sempre aplicado.",
    icon: Percent,
    suffix: "%",
  },
  {
    key: "margin_peak",
    label: "Margem Adicional — Horário de Pico",
    description: "Percentual adicional de margem aplicado automaticamente quando o frete ocorre em horário de pico.",
    icon: Clock,
    suffix: "%",
  },
  {
    key: "margin_rain",
    label: "Margem Adicional — Chuva",
    description: "Percentual adicional aplicado quando há condições de chuva. Aumenta a rentabilidade em condições adversas.",
    icon: CloudRain,
    suffix: "%",
  },
  {
    key: "margin_risk_high",
    label: "Margem Adicional — Risco Alto",
    description: "Ligando margem adicional para risco alto, o sistema aumentará automaticamente a rentabilidade em áreas mais perigosas.",
    icon: ShieldAlert,
    suffix: "%",
  },
  {
    key: "margin_long_distance",
    label: "Margem Adicional — Distância Longa",
    description: "Percentual adicional para fretes que excedem a distância considerada longa. Compensa custos operacionais maiores.",
    icon: Route,
    suffix: "%",
  },
  {
    key: "long_distance_km",
    label: "Distância Considerada Longa",
    description: "Fretes com distância superior a este valor (em KM) receberão a margem adicional de distância longa.",
    icon: Ruler,
    suffix: "km",
  },
];

const allKeys = fields.map((f) => f.key);

export default function SmartMarginPage() {
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
            if (k !== "id") mapped[k] = String(v ?? "0");
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
      updatePayload[k] = parseFloat(settings[k] || "0");
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
    toast({ title: "Margem inteligente salva!" });
  };

  // Preview calculation
  const marginBase = parseFloat(settings.margin_base || "0");
  const marginPeak = parseFloat(settings.margin_peak || "0");
  const marginRain = parseFloat(settings.margin_rain || "0");
  const marginRisk = parseFloat(settings.margin_risk_high || "0");
  const marginLong = parseFloat(settings.margin_long_distance || "0");
  const maxMargin = marginBase + marginPeak + marginRain + marginRisk + marginLong;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Margem Inteligente</h2>
        <p className="text-muted-foreground">
          Configure a margem de lucro automática que o sistema aplica sobre o valor operacional. A margem total nunca será negativa.
        </p>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Margem base</p>
              <p className="text-2xl font-bold text-primary">{marginBase}%</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-muted-foreground">Margem máxima possível</p>
              <p className="text-2xl font-bold text-primary">{maxMargin.toFixed(1)}%</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Fórmula: valorFinal = valorOperacional × (1 + margemTotal/100)
          </p>
        </CardContent>
      </Card>

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
              <div className="relative">
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  value={settings[field.key] || "0"}
                  onChange={(e) => set(field.key, e.target.value)}
                  className="pr-10"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  {field.suffix}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{field.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full max-w-md">
        {saving ? "Salvando..." : "Salvar Margem Inteligente"}
      </Button>
    </div>
  );
}
