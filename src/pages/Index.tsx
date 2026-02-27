import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent, logSimulation } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Truck, Bike, Car, MapPin, ArrowRight, Settings, Globe, Shield, Zap, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import HeroSection from "@/components/HeroSection";
import type { Tables } from "@/integrations/supabase/types";

type City = Tables<"cities">;
type Neighborhood = Tables<"neighborhoods">;

interface FreightResult {
  distance_km: number;
  base_value: number;
  origin_fee: number;
  destination_fee: number;
  fixed_fee?: number;
  min_value: number;
  final_value: number;
}

export default function Index() {
  const simulatorRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"sc" | "national">("sc");
  const [cities, setCities] = useState<City[]>([]);
  const [originCity, setOriginCity] = useState("");
  const [destinationCity, setDestinationCity] = useState("");
  const [originNeighborhoods, setOriginNeighborhoods] = useState<Neighborhood[]>([]);
  const [destNeighborhoods, setDestNeighborhoods] = useState<Neighborhood[]>([]);
  const [originNeighborhood, setOriginNeighborhood] = useState("");
  const [destNeighborhood, setDestNeighborhood] = useState("");
  const [vehicleType, setVehicleType] = useState<"moto" | "car">("moto");
  const [nationalOrigin, setNationalOrigin] = useState("");
  const [nationalDestination, setNationalDestination] = useState("");
  const [result, setResult] = useState<FreightResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  const scrollToSimulator = () => {
    simulatorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

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
    if (mode === "sc") {
      if (!originCity || !destinationCity) { setError("Selecione a cidade de origem e destino."); return; }
    } else {
      if (!nationalOrigin.trim() || !nationalDestination.trim()) { setError("Digite a cidade de origem e destino."); return; }
    }

    setLoading(true);
    try {
      const body = mode === "sc"
        ? { mode: "sc", origin_city_id: originCity, destination_city_id: destinationCity, origin_neighborhood_id: originNeighborhood || null, destination_neighborhood_id: destNeighborhood || null, vehicle_type: vehicleType }
        : { mode: "national", origin_text: nationalOrigin.trim(), destination_text: nationalDestination.trim(), vehicle_type: "car" };

      const { data, error: fnError } = await supabase.functions.invoke("calculate-freight", { body });
      if (fnError) throw fnError;
      if (data?.error) { setError(data.error); return; }
      setResult(data);

      const originName = mode === "sc" ? cities.find(c => c.id === originCity)?.name : nationalOrigin;
      const destName = mode === "sc" ? cities.find(c => c.id === destinationCity)?.name : nationalDestination;
      logSimulation({ origin_city: originName || undefined, destination_city: destName || undefined, vehicle_type: mode === "national" ? "car" : vehicleType, mode, distance_km: data.distance_km, final_value: data.final_value });
      trackEvent("simulation_completed", { mode, vehicle_type: mode === "national" ? "car" : vehicleType });
    } catch (err: any) {
      setError(err.message || "Erro ao calcular frete.");
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const originCityName = mode === "sc" ? cities.find(c => c.id === originCity)?.name : nationalOrigin;
  const destCityName = mode === "sc" ? cities.find(c => c.id === destinationCity)?.name : nationalDestination;
  const currentVehicleLabel = mode === "national" ? "Carro" : (vehicleType === "moto" ? "Moto" : "Carro");

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Truck className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight">FreteExpress</span>
          </div>
          <nav className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={scrollToSimulator} className="hidden sm:inline-flex">
              Simular
            </Button>
            <Link to="/login">
              <Button variant="outline" size="sm"><Settings className="mr-1.5 h-3.5 w-3.5" /> Admin</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <HeroSection onSimulateClick={scrollToSimulator} />

      {/* Social Proof Bar */}
      <section className="border-b bg-card">
        <div className="mx-auto max-w-6xl px-4 py-5">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { value: "2.500+", label: "Entregas realizadas" },
              { value: "98%", label: "Taxa de satisfação" },
              { value: "< 5min", label: "Cotação instantânea" },
              { value: "24/7", label: "Suporte disponível" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl font-bold text-primary">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-background">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold sm:text-3xl">Por que escolher a FreteExpress?</h2>
            <p className="mt-2 text-muted-foreground">Tecnologia e confiança em cada entrega</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              { icon: Zap, title: "Velocidade", desc: "Cotação em segundos com cálculo inteligente de rotas e preços em tempo real." },
              { icon: Shield, title: "Segurança", desc: "Seguro total em todas as entregas. Sua mercadoria protegida do início ao fim." },
              { icon: Clock, title: "Pontualidade", desc: "Motoristas verificados e rastreamento em tempo real para total tranquilidade." },
            ].map((feature) => (
              <Card key={feature.title} className="border-0 shadow-md bg-card hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Simulator Section */}
      <section ref={simulatorRef} className="py-16 bg-muted/50" id="simulator">
        <div className="mx-auto max-w-3xl px-4">
          <Card className="shadow-xl border-0">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl">Simular Frete</CardTitle>
              <CardDescription>Calcule o valor do frete para sua entrega em segundos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
              <Tabs value={mode} onValueChange={(v) => { setMode(v as "sc" | "national"); setResult(null); setError(""); }}>
                <TabsList className="w-full">
                  <TabsTrigger value="sc" className="flex-1 gap-1.5"><MapPin className="h-4 w-4" /> Santa Catarina</TabsTrigger>
                  <TabsTrigger value="national" className="flex-1 gap-1.5"><Globe className="h-4 w-4" /> Nacional</TabsTrigger>
                </TabsList>

                <TabsContent value="sc" className="space-y-5 mt-5">
                  <div className="rounded-xl border bg-card p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium"><MapPin className="h-4 w-4 text-primary" /> Origem</div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Cidade</Label>
                        <Select value={originCity} onValueChange={setOriginCity}>
                          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>{cities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Bairro (opcional)</Label>
                        <Select value={originNeighborhood} onValueChange={setOriginNeighborhood} disabled={!originNeighborhoods.length}>
                          <SelectTrigger><SelectValue placeholder={originNeighborhoods.length ? "Selecione" : "Nenhum bairro"} /></SelectTrigger>
                          <SelectContent>{originNeighborhoods.map(n => <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border bg-card p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium"><MapPin className="h-4 w-4 text-destructive" /> Destino</div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Cidade</Label>
                        <Select value={destinationCity} onValueChange={setDestinationCity}>
                          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>{cities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Bairro (opcional)</Label>
                        <Select value={destNeighborhood} onValueChange={setDestNeighborhood} disabled={!destNeighborhoods.length}>
                          <SelectTrigger><SelectValue placeholder={destNeighborhoods.length ? "Selecione" : "Nenhum bairro"} /></SelectTrigger>
                          <SelectContent>{destNeighborhoods.map(n => <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Tipo de Veículo</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <Button type="button" variant={vehicleType === "moto" ? "default" : "outline"} onClick={() => setVehicleType("moto")} className="gap-2"><Bike className="h-5 w-5" /> Moto</Button>
                      <Button type="button" variant={vehicleType === "car" ? "default" : "outline"} onClick={() => setVehicleType("car")} className="gap-2"><Car className="h-5 w-5" /> Carro</Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="national" className="space-y-5 mt-5">
                  <div className="rounded-xl border bg-card p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium"><MapPin className="h-4 w-4 text-primary" /> Origem</div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Cidade de origem</Label>
                      <Input value={nationalOrigin} onChange={(e) => setNationalOrigin(e.target.value)} placeholder="Ex: São Paulo, SP" />
                    </div>
                  </div>
                  <div className="rounded-xl border bg-card p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium"><MapPin className="h-4 w-4 text-destructive" /> Destino</div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Cidade de destino</Label>
                      <Input value={nationalDestination} onChange={(e) => setNationalDestination(e.target.value)} placeholder="Ex: Rio de Janeiro, RJ" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl border p-4 bg-accent/50">
                    <Car className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium">Veículo: Carro (frete nacional)</span>
                  </div>
                </TabsContent>
              </Tabs>

              {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

              <Button onClick={() => { trackEvent("button_click", { button: "simulate_freight" }); handleSimulate(); }} disabled={loading} className="w-full gap-2 py-6 text-base font-semibold" size="lg">
                {loading ? "Calculando..." : <>Simular Frete Agora <ArrowRight className="h-5 w-5" /></>}
              </Button>

              {result && (
                <div className="rounded-xl border-2 border-primary/20 bg-accent/50 p-6 space-y-4">
                  <div>
                    <h3 className="font-bold text-lg">Resultado da Simulação</h3>
                    <p className="text-sm text-muted-foreground">{originCityName} → {destCityName} • {currentVehicleLabel}</p>
                  </div>
                  <div className="space-y-2.5 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Distância</span><span className="font-medium">{result.distance_km.toFixed(1)} km</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Valor base</span><span>R$ {result.base_value.toFixed(2)}</span></div>
                    {result.origin_fee > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Taxa bairro origem</span><span>R$ {result.origin_fee.toFixed(2)}</span></div>}
                    {result.destination_fee > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Taxa bairro destino</span><span>R$ {result.destination_fee.toFixed(2)}</span></div>}
                    {(result.fixed_fee ?? 0) > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Taxa fixa</span><span>R$ {(result.fixed_fee ?? 0).toFixed(2)}</span></div>}
                    {result.min_value > 0 && result.base_value + result.origin_fee + result.destination_fee + (result.fixed_fee ?? 0) < result.min_value && (
                      <div className="flex justify-between text-muted-foreground"><span>Valor mínimo aplicado</span><span>R$ {result.min_value.toFixed(2)}</span></div>
                    )}
                  </div>
                  <div className="border-t pt-4 flex justify-between items-center">
                    <span className="text-lg font-bold">Valor do Frete</span>
                    <span className="text-3xl font-extrabold text-primary">R$ {result.final_value.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card py-8">
        <div className="mx-auto max-w-6xl px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
              <Truck className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold">FreteExpress</span>
          </div>
          <p className="text-sm text-muted-foreground">© 2026 FreteExpress. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
