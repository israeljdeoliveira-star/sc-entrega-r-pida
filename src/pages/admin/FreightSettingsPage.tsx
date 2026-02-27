import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Bike, Car, Globe, DollarSign } from "lucide-react";

export default function FreightSettingsPage() {
  const [motoPrice, setMotoPrice] = useState("2.50");
  const [carPrice, setCarPrice] = useState("4.00");
  const [nationalPrice, setNationalPrice] = useState("3.50");
  const [nationalMinValue, setNationalMinValue] = useState("50.00");
  const [fixedFee, setFixedFee] = useState("0");
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
        setFixedFee(String(data.fixed_fee));
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
      fixed_fee: parseFloat(fixedFee),
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
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Frete Regional (SC)</CardTitle>
          <CardDescription>Valores para entregas dentro de Santa Catarina</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Bike className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 space-y-1">
              <Label>Valor por KM - Moto (R$)</Label>
              <Input type="number" step="0.01" value={motoPrice} onChange={(e) => setMotoPrice(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Car className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 space-y-1">
              <Label>Valor por KM - Carro (R$)</Label>
              <Input type="number" step="0.01" value={carPrice} onChange={(e) => setCarPrice(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Frete Nacional (Carro)</CardTitle>
          <CardDescription>Valores para entregas em todo o Brasil</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Globe className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 space-y-1">
              <Label>Valor por KM - Nacional (R$)</Label>
              <Input type="number" step="0.01" value={nationalPrice} onChange={(e) => setNationalPrice(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 space-y-1">
              <Label>Valor Mínimo Nacional (R$)</Label>
              <Input type="number" step="0.01" value={nationalMinValue} onChange={(e) => setNationalMinValue(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Taxa Fixa</CardTitle>
          <CardDescription>Taxa fixa aplicada a todas as simulações (opcional)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 max-w-md">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 space-y-1">
              <Label>Taxa Fixa (R$)</Label>
              <Input type="number" step="0.01" value={fixedFee} onChange={(e) => setFixedFee(e.target.value)} />
            </div>
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
