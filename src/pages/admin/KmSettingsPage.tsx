import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Bike, Car, Ruler, ShieldAlert } from "lucide-react";

interface SettingsField {
  key: string;
  label: string;
  description: string;
  icon: React.ElementType;
  step?: string;
}

const fields: SettingsField[] = [
  {
    key: "price_per_km_moto",
    label: "Valor por KM — Moto (R$)",
    description: "Alterando este valor, você define quanto será cobrado por quilômetro percorrido em entregas realizadas por moto.",
    icon: Bike,
  },
  {
    key: "price_per_km_car",
    label: "Valor por KM — Carro (R$)",
    description: "Alterando este valor, você define quanto será cobrado por quilômetro percorrido em entregas realizadas por carro.",
    icon: Car,
  },
  {
    key: "max_radius_km",
    label: "Raio Máximo Permitido (KM)",
    description: "Se a distância ultrapassar esse limite, o sistema bloqueará automaticamente o frete.",
    icon: Ruler,
  },
];

export default function KmSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [original, setOriginal] = useState<Record<string, string>>({});
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    supabase
      .from("freight_settings")
      .select("id, price_per_km_moto, price_per_km_car, max_radius_km, enable_radius_limit")
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) {
          setSettingsId(data.id);
          const mapped: Record<string, string> = {};
          Object.entries(data).forEach(([k, v]) => {
            if (k !== "id") mapped[k] = String(v ?? "");
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

    const numericKeys = ["price_per_km_moto", "price_per_km_car", "max_radius_km"];
    const updatePayload: Record<string, any> = { updated_at: new Date().toISOString() };
    numericKeys.forEach((k) => {
      updatePayload[k] = parseFloat(settings[k] || "0");
    });
    updatePayload.enable_radius_limit = settings.enable_radius_limit === "true";

    const { error } = await supabase.from("freight_settings").update(updatePayload).eq("id", settingsId);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    // Log changes
    const changes: { field_name: string; old_value: string; new_value: string }[] = [];
    [...numericKeys, "enable_radius_limit"].forEach((k) => {
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
    toast({ title: "Configurações de quilometragem salvas!" });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Configuração de Quilometragem</h2>
        <p className="text-muted-foreground">Defina os valores por KM e limites de raio para o cálculo de frete.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {fields.map((field) => (
          <Card key={field.key}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <field.icon className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-base">{field.label}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                type="number"
                step={field.step || "0.01"}
                value={settings[field.key] || ""}
                onChange={(e) => set(field.key, e.target.value)}
              />
              <p className="text-sm text-muted-foreground leading-relaxed">{field.description}</p>
            </CardContent>
          </Card>
        ))}

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <ShieldAlert className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-base">Ativar Limite de Raio</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Switch
                checked={settings.enable_radius_limit === "true"}
                onCheckedChange={(checked) => set("enable_radius_limit", String(checked))}
              />
              <span className="text-sm font-medium">
                {settings.enable_radius_limit === "true" ? "Ativado" : "Desativado"}
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Quando ativado, fretes com distância superior ao raio máximo serão automaticamente bloqueados pelo sistema.
            </p>
          </CardContent>
        </Card>
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full max-w-md">
        {saving ? "Salvando..." : "Salvar Configurações de Quilometragem"}
      </Button>
    </div>
  );
}
