import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Bike, Car, Globe } from "lucide-react";

export default function FreightSettingsPage() {
  const [motoPrice, setMotoPrice] = useState("2.50");
  const [carPrice, setCarPrice] = useState("4.00");
  const [nationalPrice, setNationalPrice] = useState("3.50");
  const [nationalMinValue, setNationalMinValue] = useState("50.00");
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    supabase.from("freight_settings").select("*").limit(1).single().then(({ data }) => {
      if (data) {
        setSettingsId(data.id);
        setMotoPrice(String(data.price_per_km_moto));
        setCarPrice(String(data.price_per_km_car));
        setNationalPrice(String(data.national_price_per_km));
        setNationalMinValue(String(data.national_min_value));
      }
    });
  }, []);

  const handleSave = async () => {
    if (!settingsId) return;
    setSaving(true);
    const { error } = await supabase.from("freight_settings").update({
      price_per_km_moto: parseFloat(motoPrice),
      price_per_km_car: parseFloat(carPrice),
      national_price_per_km: parseFloat(nationalPrice),
      national_min_value: parseFloat(nationalMinValue),
      updated_at: new Date().toISOString(),
    }).eq("id", settingsId);
    setSaving(false);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Configurações salvas!" });
    }
  };

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>Configurações de Frete</CardTitle>
        <CardDescription>Defina os valores por quilômetro para cada modalidade</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Frete SC (Regional)</h3>
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Bike className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 space-y-1">
            <Label>Valor por KM - Moto (R$)</Label>
            <Input type="number" step="0.01" value={motoPrice} onChange={(e) => setMotoPrice(e.target.value)} />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Car className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 space-y-1">
            <Label>Valor por KM - Carro SC (R$)</Label>
            <Input type="number" step="0.01" value={carPrice} onChange={(e) => setCarPrice(e.target.value)} />
          </div>
        </div>

        <Separator />

        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Frete Nacional (Carro)</h3>
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Globe className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 space-y-1">
            <Label>Valor por KM - Nacional (R$)</Label>
            <Input type="number" step="0.01" value={nationalPrice} onChange={(e) => setNationalPrice(e.target.value)} />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Car className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 space-y-1">
            <Label>Valor Mínimo Nacional (R$)</Label>
            <Input type="number" step="0.01" value={nationalMinValue} onChange={(e) => setNationalMinValue(e.target.value)} />
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? "Salvando..." : "Salvar Configurações"}
        </Button>
      </CardContent>
    </Card>
  );
}
