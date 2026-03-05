import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Car, Users, ArrowDown, Building2, Package, AlertTriangle, Percent, RotateCcw, MapPin, Ruler, DollarSign } from "lucide-react";

interface Field {
  key: string;
  label: string;
  description: string;
  icon: React.ElementType;
  section: "car" | "moto" | "moto_return" | "discount";
  type?: "select";
  options?: { value: string; label: string }[];
}

const fields: Field[] = [
  { key: "car_min_value", label: "Valor Mínimo Carro (R$)", description: "Valor mínimo cobrado em qualquer frete de carro, independente da distância.", icon: Car, section: "car" },
  { key: "car_fee_helper", label: "Taxa Ajudante (R$)", description: "Valor adicional quando o cliente solicita ajudante para carga/descarga.", icon: Users, section: "car" },
  { key: "car_fee_stairs", label: "Taxa Escada (R$)", description: "Valor adicional quando é necessário subir/descer escadas.", icon: ArrowDown, section: "car" },
  { key: "car_fee_no_elevator", label: "Taxa Apartamento sem Elevador (R$)", description: "Valor adicional para entregas em apartamentos sem elevador.", icon: Building2, section: "car" },
  { key: "car_fee_bubble_wrap", label: "Taxa Embalagem Bolha (R$)", description: "Valor adicional quando o cliente solicita embalagem bolha.", icon: Package, section: "car" },
  { key: "car_fee_fragile", label: "Taxa Item Frágil (R$)", description: "Valor adicional quando há itens frágeis no transporte.", icon: AlertTriangle, section: "car" },
  { key: "moto_extra_stop_fee", label: "Taxa Parada Extra Moto (R$)", description: "Valor adicional por cada parada extra no trajeto do motoboy.", icon: MapPin, section: "moto" },
  // Moto return section
  { key: "moto_return_mode", label: "Modo da Taxa de Retorno", description: "fixed = só taxa fixa • per_km = só por km • hybrid = taxa fixa + excedente por km.", icon: RotateCcw, section: "moto_return", type: "select", options: [{ value: "fixed", label: "Fixo" }, { value: "per_km", label: "Por KM" }, { value: "hybrid", label: "Híbrido (recomendado)" }] },
  { key: "moto_return_fee", label: "Taxa Base Fixa de Retorno (R$)", description: "Valor fixo cobrado sempre que o motoboy precisa retornar. No modo híbrido, é a base antes do excedente.", icon: DollarSign, section: "moto_return" },
  { key: "moto_return_included_km", label: "KM Incluídos no Retorno", description: "Franquia de km já incluídos na taxa base. Excedente é cobrado à parte (modo híbrido).", icon: Ruler, section: "moto_return" },
  { key: "moto_return_price_per_km", label: "Valor por KM Excedente (R$)", description: "Valor cobrado por km que ultrapassar a franquia incluída (modos per_km e hybrid).", icon: Ruler, section: "moto_return" },
  { key: "moto_return_min_fee", label: "Valor Mínimo do Retorno (R$)", description: "Piso mínimo da taxa de retorno, independente do cálculo.", icon: DollarSign, section: "moto_return" },
  // Discount
  { key: "multi_trip_discount_pct", label: "Desconto Múltiplas Viagens (%)", description: "Percentual de desconto aplicado automaticamente quando o cliente precisa de mais de uma viagem.", icon: Percent, section: "discount" },
];

export default function CarAdditionalsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [original, setOriginal] = useState<Record<string, string>>({});
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const allKeys = fields.map(f => f.key);

  useEffect(() => {
    supabase.from("freight_settings")
      .select(`id, ${allKeys.join(", ")}`)
      .limit(1).single()
      .then(({ data }) => {
        if (data) {
          setSettingsId((data as any).id);
          const mapped: Record<string, string> = {};
          Object.entries(data as any).forEach(([k, v]) => { if (k !== "id") mapped[k] = String(v ?? ""); });
          setSettings(mapped);
          setOriginal(mapped);
        }
      });
  }, []);

  const set = (key: string, value: string) => setSettings(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!settingsId) return;
    setSaving(true);
    const updatePayload: Record<string, any> = { updated_at: new Date().toISOString() };
    allKeys.forEach(k => {
      const field = fields.find(f => f.key === k);
      if (field?.type === "select") {
        updatePayload[k] = settings[k] || "hybrid";
      } else {
        updatePayload[k] = parseFloat(settings[k] || "0");
      }
    });

    const { error } = await supabase.from("freight_settings").update(updatePayload).eq("id", settingsId);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    const changes: { field_name: string; old_value: string; new_value: string }[] = [];
    allKeys.forEach(k => {
      if (settings[k] !== original[k]) changes.push({ field_name: k, old_value: original[k] || "", new_value: settings[k] || "" });
    });
    if (changes.length > 0) {
      const { data: userData } = await supabase.auth.getUser();
      await supabase.from("pricing_change_log").insert(
        changes.map(c => ({ changed_by: userData?.user?.id || null, table_name: "freight_settings", ...c }))
      );
    }

    setOriginal({ ...settings });
    setSaving(false);
    toast({ title: "Configurações salvas!" });
  };

  const renderSection = (title: string, section: string, emoji: string) => {
    const sectionFields = fields.filter(f => f.section === section);
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">{emoji} {title}</h3>
        <div className="grid gap-4 lg:grid-cols-2">
          {sectionFields.map(field => (
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
                {field.type === "select" ? (
                  <Select value={settings[field.key] || "hybrid"} onValueChange={v => set(field.key, v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {field.options?.map(o => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input type="number" step="0.01" value={settings[field.key] || ""} onChange={e => set(field.key, e.target.value)} />
                )}
                <p className="text-sm text-muted-foreground leading-relaxed">{field.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold">Adicionais e Taxas</h2>
        <p className="text-muted-foreground">Configure taxas adicionais do carro, moto e descontos.</p>
      </div>
      {renderSection("Adicionais do Carro", "car", "🚗")}
      {renderSection("Adicionais do Motoboy", "moto", "🛵")}
      {renderSection("Taxa de Retorno Moto", "moto_return", "🔁")}
      {renderSection("Descontos", "discount", "💸")}
      <Button onClick={handleSave} disabled={saving} className="w-full max-w-md">
        {saving ? "Salvando..." : "Salvar Configurações"}
      </Button>
    </div>
  );
}
