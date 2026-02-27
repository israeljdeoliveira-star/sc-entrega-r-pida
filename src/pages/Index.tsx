import { useEffect, useRef, useState, useCallback } from "react";
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
import { Bike, Car, MapPin, ArrowRight, Settings, Globe, Shield, Zap, Clock, MessageCircle, Weight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import HeroSection from "@/components/HeroSection";
import SocialProof from "@/components/SocialProof";
import AddressAutocomplete, { type AddressSelection } from "@/components/AddressAutocomplete";
import FreightMap from "@/components/FreightMap";
import logoFrete from "@/assets/logo-frete-garca.png";
import type { Tables } from "@/integrations/supabase/types";

type City = Tables<"cities">;

interface FreightResult {
  distance_km: number;
  base_value: number;
  origin_fee: number;
  destination_fee: number;
  fixed_fee?: number;
  pedagios?: number;
  taxa_retorno?: number;
  min_value: number;
  final_value: number;
  multiplier_applied?: number;
  commission_percentage?: number;
  driver_value?: number;
  platform_value?: number;
  estimated_time_min?: number;
}

export default function Index() {
  const simulatorRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"sc" | "national">("sc");
  const [cities, setCities] = useState<City[]>([]);
  const { toast } = useToast();

  // SC mode state
  const [originCityId, setOriginCityId] = useState("");
  const [destCityId, setDestCityId] = useState("");
  const [originAddress, setOriginAddress] = useState<AddressSelection | null>(null);
  const [destAddress, setDestAddress] = useState<AddressSelection | null>(null);
  const [originNumber, setOriginNumber] = useState("");
  const [destNumber, setDestNumber] = useState("");
  const [originComplement, setOriginComplement] = useState("");
  const [destComplement, setDestComplement] = useState("");
  const [weight, setWeight] = useState("");

  // National mode state
  const [natOriginCity, setNatOriginCity] = useState("");
  const [natDestCity, setNatDestCity] = useState("");
  const [natOriginAddress, setNatOriginAddress] = useState<AddressSelection | null>(null);
  const [natDestAddress, setNatDestAddress] = useState<AddressSelection | null>(null);
  const [natOriginNumber, setNatOriginNumber] = useState("");
  const [natDestNumber, setNatDestNumber] = useState("");

  // Map & route state
  const [originCoords, setOriginCoords] = useState<[number, number] | null>(null);
  const [destCoords, setDestCoords] = useState<[number, number] | null>(null);
  const [routeDistance, setRouteDistance] = useState<number | null>(null);
  const [routeDuration, setRouteDuration] = useState<number | null>(null);

  // Result
  const [result, setResult] = useState<FreightResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const scrollToSimulator = () => {
    simulatorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  useEffect(() => {
    supabase.from("cities").select("*").eq("is_active", true).order("name")
      .then(({ data }) => { if (data) setCities(data); });
  }, []);

  const originCityName = mode === "sc"
    ? cities.find(c => c.id === originCityId)?.name || ""
    : natOriginCity;
  const destCityName = mode === "sc"
    ? cities.find(c => c.id === destCityId)?.name || ""
    : natDestCity;

  // Update coords when address is selected
  const handleOriginSelect = useCallback((sel: AddressSelection) => {
    setOriginAddress(sel);
    setOriginCoords([sel.lat, sel.lng]);
  }, []);
  const handleDestSelect = useCallback((sel: AddressSelection) => {
    setDestAddress(sel);
    setDestCoords([sel.lat, sel.lng]);
  }, []);
  const handleNatOriginSelect = useCallback((sel: AddressSelection) => {
    setNatOriginAddress(sel);
    setOriginCoords([sel.lat, sel.lng]);
  }, []);
  const handleNatDestSelect = useCallback((sel: AddressSelection) => {
    setNatDestAddress(sel);
    setDestCoords([sel.lat, sel.lng]);
  }, []);

  const handleRouteCalculated = useCallback((distKm: number, durMin: number) => {
    setRouteDistance(distKm);
    setRouteDuration(durMin);
  }, []);

  // Reset on mode change
  useEffect(() => {
    setResult(null);
    setError("");
    setOriginCoords(null);
    setDestCoords(null);
    setRouteDistance(null);
    setRouteDuration(null);
  }, [mode]);

  // Reset address when city changes (SC)
  useEffect(() => { setOriginAddress(null); setOriginCoords(null); }, [originCityId]);
  useEffect(() => { setDestAddress(null); setDestCoords(null); }, [destCityId]);

  // Auto-calculate when route is ready
  useEffect(() => {
    if (routeDistance && routeDistance > 0) {
      handleSimulate();
    }
  }, [routeDistance]);

  const handleSimulate = async () => {
    if (!routeDistance) {
      setError("Aguarde o cálculo da rota no mapa.");
      return;
    }
    setError("");
    setResult(null);
    setLoading(true);

    try {
      const body = mode === "sc"
        ? {
            mode: "sc",
            origin_city_id: originCityId,
            destination_city_id: destCityId,
            vehicle_type: "moto",
            distance_km: routeDistance,
          }
        : {
            mode: "national",
            origin_text: natOriginCity.trim(),
            destination_text: natDestCity.trim(),
            vehicle_type: "car",
            distance_km: routeDistance,
          };

      const { data, error: fnError } = await supabase.functions.invoke("calculate-freight", { body });
      if (fnError) throw fnError;
      if (data?.error) { setError(data.error); return; }

      setResult({
        ...data,
        estimated_time_min: routeDuration ? Math.round(routeDuration) : undefined,
      });

      await logSimulation({
        origin_city: originCityName || undefined,
        destination_city: destCityName || undefined,
        vehicle_type: mode === "national" ? "car" : "moto",
        mode,
        distance_km: data.distance_km,
        final_value: data.final_value,
      });
      trackEvent("simulation_completed", { mode, distance: routeDistance });
    } catch (err: any) {
      setError(err.message || "Erro ao calcular frete.");
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // WhatsApp message builder
  const buildWhatsAppUrl = () => {
    if (!result) return "#";
    const modalidade = mode === "sc" ? "MOTO" : "CARRO";
    const oAddr = mode === "sc" ? originAddress : natOriginAddress;
    const dAddr = mode === "sc" ? destAddress : natDestAddress;
    const oNum = mode === "sc" ? originNumber : natOriginNumber;
    const dNum = mode === "sc" ? destNumber : natDestNumber;
    const oCity = originCityName;
    const dCity = destCityName;

    const originText = `${oAddr?.street || ""}${oNum ? `, Nº ${oNum}` : ""} - ${oAddr?.neighborhood || ""} - ${oCity}`;
    const destText = `${dAddr?.street || ""}${dNum ? `, Nº ${dNum}` : ""} - ${dAddr?.neighborhood || ""} - ${dCity}`;

    const mapsLink = originCoords && destCoords
      ? `https://www.google.com/maps/dir/?api=1&origin=${originCoords[0]},${originCoords[1]}&destination=${destCoords[0]},${destCoords[1]}`
      : "";

    const msg = `Olá, gostaria de solicitar um frete:

Modalidade: ${modalidade}
Origem: ${originText}
Destino: ${destText}
Distância: ${result.distance_km.toFixed(1)} km
Tempo estimado: ${result.estimated_time_min || "—"} minutos
Valor calculado: R$ ${result.final_value.toFixed(2)}
${weight ? `Peso estimado: ${weight}` : ""}
Rota: ${mapsLink}`;

    return `https://wa.me/5547999999999?text=${encodeURIComponent(msg)}`;
  };

  const currentVehicleLabel = mode === "national" ? "Carro" : "Moto";

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <img src={logoFrete} alt="Frete Garça" className="h-9 object-contain" />
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
            <h2 className="text-2xl font-bold sm:text-3xl">Por que escolher a Frete Garça?</h2>
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

      {/* Social Proof Reviews */}
      <SocialProof />

      {/* Simulator Section */}
      <section ref={simulatorRef} className="py-16 bg-muted/50" id="simulator">
        <div className="mx-auto max-w-4xl px-4">
          <Card className="shadow-xl border-0">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl">Simule seu frete</CardTitle>
              <CardDescription>Calcule o valor do frete para sua entrega em segundos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
              <Tabs value={mode} onValueChange={(v) => setMode(v as "sc" | "national")}>
                <TabsList className="w-full">
                  <TabsTrigger value="sc" className="flex-1 gap-1.5"><Bike className="h-4 w-4" /> Moto (SC)</TabsTrigger>
                  <TabsTrigger value="national" className="flex-1 gap-1.5"><Car className="h-4 w-4" /> Carro (Brasil)</TabsTrigger>
                </TabsList>

                {/* SC (MOTO) */}
                <TabsContent value="sc" className="space-y-5 mt-5">
                  {/* Origin */}
                  <div className="rounded-xl border bg-card p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium"><MapPin className="h-4 w-4 text-primary" /> Local de Coleta</div>
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Cidade de coleta</Label>
                        <Select value={originCityId} onValueChange={setOriginCityId}>
                          <SelectTrigger><SelectValue placeholder="Selecione a cidade" /></SelectTrigger>
                          <SelectContent>{cities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Rua</Label>
                        <AddressAutocomplete
                          cityName={originCityName}
                          disabled={!originCityId}
                          placeholder="Digite o nome da rua..."
                          onSelect={handleOriginSelect}
                        />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Número</Label>
                          <Input value={originNumber} onChange={e => setOriginNumber(e.target.value)} placeholder="Nº" />
                        </div>
                        <div className="space-y-1.5 sm:col-span-2">
                          <Label className="text-xs">Complemento (opcional)</Label>
                          <Input value={originComplement} onChange={e => setOriginComplement(e.target.value)} placeholder="Apto, bloco..." />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Destination */}
                  <div className="rounded-xl border bg-card p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium"><MapPin className="h-4 w-4 text-destructive" /> Destino</div>
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Cidade de destino</Label>
                        <Select value={destCityId} onValueChange={setDestCityId}>
                          <SelectTrigger><SelectValue placeholder="Selecione a cidade" /></SelectTrigger>
                          <SelectContent>{cities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Rua</Label>
                        <AddressAutocomplete
                          cityName={destCityName}
                          disabled={!destCityId}
                          placeholder="Digite o nome da rua..."
                          onSelect={handleDestSelect}
                        />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Número</Label>
                          <Input value={destNumber} onChange={e => setDestNumber(e.target.value)} placeholder="Nº" />
                        </div>
                        <div className="space-y-1.5 sm:col-span-2">
                          <Label className="text-xs">Complemento (opcional)</Label>
                          <Input value={destComplement} onChange={e => setDestComplement(e.target.value)} placeholder="Apto, bloco..." />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Weight */}
                  <div className="rounded-xl border bg-card p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium"><Weight className="h-4 w-4 text-primary" /> Peso estimado</div>
                    <Input
                      value={weight}
                      onChange={e => setWeight(e.target.value)}
                      placeholder="Ex: 5kg - cesta de frutas, 15kg - caixa de frutas"
                    />
                    <p className="text-xs text-muted-foreground">Informe o peso aproximado para melhor atendimento.</p>
                  </div>
                </TabsContent>

                {/* NATIONAL (CARRO) */}
                <TabsContent value="national" className="space-y-5 mt-5">
                  <div className="rounded-xl border bg-card p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium"><MapPin className="h-4 w-4 text-primary" /> Origem</div>
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Cidade de origem</Label>
                        <Input value={natOriginCity} onChange={e => setNatOriginCity(e.target.value)} placeholder="Ex: São Paulo, SP" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Rua</Label>
                        <AddressAutocomplete
                          cityName={natOriginCity}
                          state=""
                          disabled={!natOriginCity.trim()}
                          placeholder="Digite o nome da rua..."
                          onSelect={handleNatOriginSelect}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Número</Label>
                        <Input value={natOriginNumber} onChange={e => setNatOriginNumber(e.target.value)} placeholder="Nº" />
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border bg-card p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium"><MapPin className="h-4 w-4 text-destructive" /> Destino</div>
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Cidade de destino</Label>
                        <Input value={natDestCity} onChange={e => setNatDestCity(e.target.value)} placeholder="Ex: Rio de Janeiro, RJ" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Rua</Label>
                        <AddressAutocomplete
                          cityName={natDestCity}
                          state=""
                          disabled={!natDestCity.trim()}
                          placeholder="Digite o nome da rua..."
                          onSelect={handleNatDestSelect}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Número</Label>
                        <Input value={natDestNumber} onChange={e => setNatDestNumber(e.target.value)} placeholder="Nº" />
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Map */}
              {(originCoords || destCoords) && (
                <FreightMap
                  originCoords={originCoords}
                  destCoords={destCoords}
                  onRouteCalculated={handleRouteCalculated}
                />
              )}

              {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

              {!result && (
                <Button
                  onClick={() => { trackEvent("button_click", { button: "simulate_freight" }); handleSimulate(); }}
                  disabled={loading || !routeDistance}
                  className="w-full gap-2 py-6 text-base font-semibold"
                  size="lg"
                >
                  {loading ? "Calculando..." : <>Calcular Valor <ArrowRight className="h-5 w-5" /></>}
                </Button>
              )}

              {/* Result */}
              {result && (
                <div className="rounded-xl border-2 border-primary/20 bg-accent/50 p-6 space-y-4">
                  <div>
                    <h3 className="font-bold text-lg">Resultado da Simulação</h3>
                    <p className="text-sm text-muted-foreground">{originCityName} → {destCityName} • {currentVehicleLabel}</p>
                  </div>
                  <div className="space-y-2.5 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Distância</span><span className="font-medium">{result.distance_km.toFixed(1)} km</span></div>
                    {result.estimated_time_min && (
                      <div className="flex justify-between"><span className="text-muted-foreground">Tempo estimado</span><span className="font-medium">{result.estimated_time_min} min</span></div>
                    )}
                    <div className="flex justify-between"><span className="text-muted-foreground">Valor base</span><span>R$ {result.base_value.toFixed(2)}</span></div>
                    {result.origin_fee > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Taxa bairro origem</span><span>R$ {result.origin_fee.toFixed(2)}</span></div>}
                    {result.destination_fee > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Taxa bairro destino</span><span>R$ {result.destination_fee.toFixed(2)}</span></div>}
                    {(result.fixed_fee ?? 0) > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Taxa fixa</span><span>R$ {(result.fixed_fee ?? 0).toFixed(2)}</span></div>}
                    {(result.pedagios ?? 0) > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Pedágios</span><span>R$ {(result.pedagios ?? 0).toFixed(2)}</span></div>}
                    {(result.taxa_retorno ?? 0) > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Taxa de retorno</span><span>R$ {(result.taxa_retorno ?? 0).toFixed(2)}</span></div>}
                    {(result.multiplier_applied ?? 1) > 1 && <div className="flex justify-between"><span className="text-muted-foreground">Multiplicador</span><span className="font-medium text-primary">{(result.multiplier_applied ?? 1).toFixed(2)}x</span></div>}
                  </div>
                  <div className="border-t pt-4 flex justify-between items-center">
                    <span className="text-lg font-bold">Valor do Frete</span>
                    <span className="text-3xl font-extrabold text-primary">R$ {result.final_value.toFixed(2)}</span>
                  </div>

                  {/* WhatsApp CTA */}
                  <Button
                    asChild
                    className="w-full gap-2 py-6 text-base font-semibold bg-[hsl(142,70%,45%)] hover:bg-[hsl(142,70%,40%)] text-white"
                    size="lg"
                  >
                    <a href={buildWhatsAppUrl()} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="h-5 w-5" />
                      Solicitar pelo WhatsApp
                    </a>
                  </Button>
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
            <img src={logoFrete} alt="Frete Garça" className="h-8 object-contain" />
          </div>
          <p className="text-sm text-muted-foreground">© 2026 Frete Garça. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
