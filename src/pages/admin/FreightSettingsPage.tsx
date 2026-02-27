import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Bike, Car } from "lucide-react";

export default function FreightSettingsPage() {
  const [motoPrice, setMotoPrice] = useState("2.50");
  const [carPrice, setCarPrice] = useState("4.00");
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    supabase.from("freight_settings").select("*").limit(1).single().then(({ data }) => {
      if (data) {
        setSettingsId(data.id);
        setMotoPrice(String(data.price_per_km_moto));
        setCarPrice(String(data.price_per_km_car));
      }
    });
  }, []);

  const handleSave = async () => {
    if (!settingsId) return;
    setSaving(true);
    const { error } = await supabase.from("freight_settings").update({
      price_per_km_moto: parseFloat(motoPrice),
      price_per_km_car: parseFloat(carPrice),
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
        <CardDescription>Defina o valor por quilômetro para cada tipo de veículo</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
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
            <Label>Valor por KM - Carro (R$)</Label>
            <Input type="number" step="0.01" value={carPrice} onChange={(e) => setCarPrice(e.target.value)} />
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? "Salvando..." : "Salvar Configurações"}
        </Button>
      </CardContent>
    </Card>
  );
}
