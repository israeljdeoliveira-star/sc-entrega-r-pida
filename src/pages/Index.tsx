import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Truck, Bike, Car, MapPin, ArrowRight, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type City = Tables<"cities">;
type Neighborhood = Tables<"neighborhoods">;

interface FreightResult {
  distance_km: number;
  base_value: number;
  origin_fee: number;
  destination_fee: number;
  min_value: number;
  final_value: number;
}

export default function Index() {
  const [cities, setCities] = useState<City[]>([]);
  const [originCity, setOriginCity] = useState("");
  const [destinationCity, setDestinationCity] = useState("");
  const [originNeighborhoods, setOriginNeighborhoods] = useState<Neighborhood[]>([]);
  const [destNeighborhoods, setDestNeighborhoods] = useState<Neighborhood[]>([]);
  const [originNeighborhood, setOriginNeighborhood] = useState("");
  const [destNeighborhood, setDestNeighborhood] = useState("");
  const [vehicleType, setVehicleType] = useState<"moto" | "car">("moto");
  const [result, setResult] = useState<FreightResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    supabase.from("cities").select("*").eq("is_active", true).order("name")
      .then(({ data }) => { if (data) setCities(data); });
  }, []);

  useEffect(() => {
    if (!originCity) { setOriginNeighborhoods([]); setOriginNeighborhood(""); return; }
    supabase.from("neighborhoods").select("*").eq("city_id", originCity).order("name")
      .then(({ data }) => { if (data) setOriginNeighborhoods(data); });
    setOriginNeighborhood("");
  }, [originCity]);

  useEffect(() => {
    if (!destinationCity) { setDestNeighborhoods([]); setDestNeighborhood(""); return; }
    supabase.from("neighborhoods").select("*").eq("city_id", destinationCity).order("name")
      .then(({ data }) => { if (data) setDestNeighborhoods(data); });
    setDestNeighborhood("");
  }, [destinationCity]);

  const handleSimulate = async () => {
    setError(""); setResult(null);
    if (!originCity || !destinationCity) {
      setError("Selecione a cidade de origem e destino."); return;
    }

    setLoading(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("calculate-freight", {
        body: {
          origin_city_id: originCity,
          destination_city_id: destinationCity,
          origin_neighborhood_id: originNeighborhood || null,
          destination_neighborhood_id: destNeighborhood || null,
          vehicle_type: vehicleType,
        },
      });

      if (fnError) throw fnError;
      if (data?.error) { setError(data.error); return; }
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Erro ao calcular frete.");
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const originCityName = cities.find(c => c.id === originCity)?.name;
  const destCityName = cities.find(c => c.id === destinationCity)?.name;

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <Truck className="h-7 w-7 text-primary" />
            <h1 className="text-xl font-bold">Simulador de Frete SC</h1>
          </div>
          <Link to="/login">
            <Button variant="ghost" size="sm"><Settings className="mr-1 h-4 w-4" /> Admin</Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Simular Frete</CardTitle>
            <CardDescription>Calcule o valor do frete entre cidades de Santa Catarina</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Origem */}
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <MapPin className="h-4 w-4 text-primary" /> Origem
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>Cidade</Label>
                  <Select value={originCity} onValueChange={setOriginCity}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {cities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Bairro (opcional)</Label>
                  <Select value={originNeighborhood} onValueChange={setOriginNeighborhood} disabled={!originNeighborhoods.length}>
                    <SelectTrigger><SelectValue placeholder={originNeighborhoods.length ? "Selecione" : "Nenhum bairro"} /></SelectTrigger>
                    <SelectContent>
                      {originNeighborhoods.map(n => <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Destino */}
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <MapPin className="h-4 w-4 text-destructive" /> Destino
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>Cidade</Label>
                  <Select value={destinationCity} onValueChange={setDestinationCity}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {cities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Bairro (opcional)</Label>
                  <Select value={destNeighborhood} onValueChange={setDestNeighborhood} disabled={!destNeighborhoods.length}>
                    <SelectTrigger><SelectValue placeholder={destNeighborhoods.length ? "Selecione" : "Nenhum bairro"} /></SelectTrigger>
                    <SelectContent>
                      {destNeighborhoods.map(n => <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Tipo de veículo */}
            <div className="space-y-2">
              <Label>Tipo de Veículo</Label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant={vehicleType === "moto" ? "default" : "outline"}
                  onClick={() => setVehicleType("moto")}
                  className="gap-2"
                >
                  <Bike className="h-5 w-5" /> Moto
                </Button>
                <Button
                  type="button"
                  variant={vehicleType === "car" ? "default" : "outline"}
                  onClick={() => setVehicleType("car")}
                  className="gap-2"
                >
                  <Car className="h-5 w-5" /> Carro
                </Button>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button onClick={handleSimulate} disabled={loading} className="w-full gap-2" size="lg">
              {loading ? "Calculando..." : <>Simular Frete <ArrowRight className="h-4 w-4" /></>}
            </Button>

            {/* Resultado */}
            {result && (
              <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-6 space-y-3">
                <h3 className="font-semibold text-lg">Resultado da Simulação</h3>
                <div className="text-sm text-muted-foreground">
                  {originCityName} → {destCityName} • {vehicleType === "moto" ? "Moto" : "Carro"}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Distância</span>
                    <span className="font-medium">{result.distance_km.toFixed(1)} km</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Valor base</span>
                    <span>R$ {result.base_value.toFixed(2)}</span>
                  </div>
                  {result.origin_fee > 0 && (
                    <div className="flex justify-between">
                      <span>Taxa bairro origem</span>
                      <span>R$ {result.origin_fee.toFixed(2)}</span>
                    </div>
                  )}
                  {result.destination_fee > 0 && (
                    <div className="flex justify-between">
                      <span>Taxa bairro destino</span>
                      <span>R$ {result.destination_fee.toFixed(2)}</span>
                    </div>
                  )}
                  {result.min_value > 0 && result.base_value + result.origin_fee + result.destination_fee < result.min_value && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Valor mínimo aplicado</span>
                      <span>R$ {result.min_value.toFixed(2)}</span>
                    </div>
                  )}
                </div>
                <div className="border-t pt-3 flex justify-between items-center">
                  <span className="text-lg font-bold">Valor do Frete</span>
                  <span className="text-2xl font-bold text-primary">R$ {result.final_value.toFixed(2)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
