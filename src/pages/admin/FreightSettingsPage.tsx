import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Bike, Car, Globe, DollarSign, TrendingUp, Percent, Shield } from "lucide-react";

interface FieldDef {
  key: string;
  label: string;
  icon: React.ElementType;
  step?: string;
}

export default function FreightSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [originalSettings, setOriginalSettings] = useState<Record<string, string>>({});
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    supabase.from("freight_settings").select("*").limit(1).single().then(({ data }) => {
      if (data) {
        setSettingsId(data.id);
        const mapped: Record<string, string> = {};
        Object.entries(data).forEach(([k, v]) => {
          if (k !== "id") mapped[k] = String(v ?? "");
        });
        setSettings(mapped);
        setOriginalSettings(mapped);
      }
    });
  }, []);

  const set = (key: string, value: string) => setSettings(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!settingsId) return;
    setSaving(true);

    const updatePayload: Record<string, any> = { updated_at: new Date().toISOString() };
    const numericFields = [
      "price_per_km_moto", "price_per_km_car", "national_price_per_km", "national_min_value",
      "fixed_fee", "multiplicador_moto", "multiplicador_carro", "comissao_moto", "comissao_carro",
      "valor_base_nacional", "taxa_retorno_carro", "pedagios_padrao", "margem_minima_moto", "margem_minima_carro"
    ];

    numericFields.forEach(f => {
      updatePayload[f] = parseFloat(settings[f] || "0");
    });

    const { error } = await supabase.from("freight_settings").update(updatePayload).eq("id", settingsId);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    // Log changes
    const changes: { field_name: string; old_value: string; new_value: string }[] = [];
    numericFields.forEach(f => {
      if (settings[f] !== originalSettings[f]) {
        changes.push({ field_name: f, old_value: originalSettings[f] || "", new_value: settings[f] || "" });
      }
    });

    if (changes.length > 0) {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id || null;
      await supabase.from("pricing_change_log").insert(
        changes.map(c => ({ changed_by: userId, table_name: "freight_settings", ...c }))
      );
    }

    setOriginalSettings({ ...settings });
    setSaving(false);
    toast({ title: "Configurações salvas!" });
  };

  const Field = ({ field }: { field: FieldDef }) => (
    <div className="flex items-center gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <field.icon className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 space-y-1">
        <Label>{field.label}</Label>
        <Input
          type="number"
          step={field.step || "0.01"}
          value={settings[field.key] || ""}
          onChange={(e) => set(field.key, e.target.value)}
        />
      </div>
    </div>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Frete Regional SC */}
      <Card>
        <CardHeader>
          <CardTitle>Frete Regional (SC)</CardTitle>
          <CardDescription>Valores para entregas dentro de Santa Catarina</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field field={{ key: "price_per_km_moto", label: "Valor por KM - Moto (R$)", icon: Bike }} />
          <Field field={{ key: "price_per_km_car", label: "Valor por KM - Carro (R$)", icon: Car }} />
        </CardContent>
      </Card>

      {/* Frete Nacional */}
      <Card>
        <CardHeader>
          <CardTitle>Frete Nacional (Carro)</CardTitle>
          <CardDescription>Valores para entregas em todo o Brasil</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field field={{ key: "valor_base_nacional", label: "Valor Base Nacional (R$)", icon: Globe }} />
          <Field field={{ key: "national_price_per_km", label: "Valor por KM - Nacional (R$)", icon: Globe }} />
          <Field field={{ key: "national_min_value", label: "Valor Mínimo Nacional (R$)", icon: DollarSign }} />
          <Field field={{ key: "pedagios_padrao", label: "Pedágios Padrão (R$)", icon: DollarSign }} />
          <Field field={{ key: "taxa_retorno_carro", label: "Taxa de Retorno (R$)", icon: DollarSign }} />
        </CardContent>
      </Card>

      {/* Multiplicadores */}
      <Card>
        <CardHeader>
          <CardTitle>Multiplicadores</CardTitle>
          <CardDescription>Multiplicador padrão aplicado ao cálculo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field field={{ key: "multiplicador_moto", label: "Multiplicador Moto", icon: TrendingUp, step: "0.1" }} />
          <Field field={{ key: "multiplicador_carro", label: "Multiplicador Carro", icon: TrendingUp, step: "0.1" }} />
        </CardContent>
      </Card>

      {/* Comissão */}
      <Card>
        <CardHeader>
          <CardTitle>Comissão da Plataforma</CardTitle>
          <CardDescription>Percentual de comissão por modalidade</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field field={{ key: "comissao_moto", label: "Comissão Moto (%)", icon: Percent }} />
          <Field field={{ key: "comissao_carro", label: "Comissão Carro (%)", icon: Percent }} />
        </CardContent>
      </Card>

      {/* Margem Mínima & Taxa Fixa */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Margem Mínima & Taxa Fixa</CardTitle>
          <CardDescription>Valores mínimos garantidos e taxa fixa</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field field={{ key: "margem_minima_moto", label: "Margem Mínima Moto (R$)", icon: Shield }} />
            <Field field={{ key: "margem_minima_carro", label: "Margem Mínima Carro (R$)", icon: Shield }} />
            <Field field={{ key: "fixed_fee", label: "Taxa Fixa (R$)", icon: DollarSign }} />
          </div>
          <Separator />
          <Button onClick={handleSave} disabled={saving} className="w-full max-w-md">
            {saving ? "Salvando..." : "Salvar Todas as Configurações"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
