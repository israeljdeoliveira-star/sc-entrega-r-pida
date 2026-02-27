import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent, logSimulation } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bike, Car, MapPin, ArrowRight, Globe, Shield, Zap, Clock, MessageCircle, CalendarDays, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import HeroSection from "@/components/HeroSection";
import SocialProof from "@/components/SocialProof";
import ServicesSection from "@/components/ServicesSection";
import ServicePhotosCarousel from "@/components/ServicePhotosCarousel";
import ThemeToggle from "@/components/ThemeToggle";
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

const WEIGHT_OPTIONS = [
  { value: "1 kg", label: "1 kg — 🍎 Uma maçã grande" },
  { value: "2 kg", label: "2 kg — 🍊 Duas laranjas" },
  { value: "3 kg", label: "3 kg — 🍍 Um abacaxi" },
  { value: "5 kg", label: "5 kg — 🍉 Uma melancia pequena" },
  { value: "10 kg", label: "10 kg — 🎃 Uma abóbora média" },
  { value: "15 kg", label: "15 kg — 🍉🍉 Duas melancias" },
  { value: "20 kg", label: "20 kg — 🎃🎃 Duas abóboras" },
];

export default function Index() {
  const simulatorRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"sc" | "national">("sc");
  const [cities, setCities] = useState<City[]>([]);
  const { toast } = useToast();

  // Navbar scroll hide
  const [navVisible, setNavVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      if (currentY > lastScrollY.current && currentY > 80) {
        setNavVisible(false);
      } else {
        setNavVisible(true);
      }
      lastScrollY.current = currentY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
  const [category, setCategory] = useState("");

  // National mode state
  const [natOriginCity, setNatOriginCity] = useState("");
  const [natDestCity, setNatDestCity] = useState("");
  const [natOriginAddress, setNatOriginAddress] = useState<AddressSelection | null>(null);
  const [natDestAddress, setNatDestAddress] = useState<AddressSelection | null>(null);
  const [natOriginNumber, setNatOriginNumber] = useState("");
  const [natDestNumber, setNatDestNumber] = useState("");

  // Urgency & scheduling
  const [deliveryWhen, setDeliveryWhen] = useState<"hoje" | "agendar">("hoje");
  const [deliveryTime, setDeliveryTime] = useState("");
  const [urgency, setUrgency] = useState<"express" | "normal" | "urgente">("normal");

  // Map & route state
  const [originCoords, setOriginCoords] = useState<[number, number] | null>(null);
  const [destCoords, setDestCoords] = useState<[number, number] | null>(null);
  const [routeDistance, setRouteDistance] = useState<number | null>(null);
  const [routeDuration, setRouteDuration] = useState<number | null>(null);

  // WhatsApp number
  const [whatsappNumber, setWhatsappNumber] = useState("5547999999999");

  // Result
  const [result, setResult] = useState<FreightResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const scrollToSimulator = () => {
    simulatorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    supabase.from("cities").select("*").eq("is_active", true).order("name")
      .then(({ data }) => { if (data) setCities(data); });
    supabase.from("site_settings").select("whatsapp_number").limit(1).single()
      .then(({ data }) => { if (data) setWhatsappNumber(data.whatsapp_number); });
  }, []);

  const originCityName = mode === "sc"
    ? cities.find(c => c.id === originCityId)?.name || ""
    : natOriginCity;
  const destCityName = mode === "sc"
    ? cities.find(c => c.id === destCityId)?.name || ""
    : natDestCity;

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

  useEffect(() => {
    setResult(null); setError(""); setOriginCoords(null); setDestCoords(null);
    setRouteDistance(null); setRouteDuration(null);
  }, [mode]);

  useEffect(() => { setOriginAddress(null); setOriginCoords(null); }, [originCityId]);
  useEffect(() => { setDestAddress(null); setDestCoords(null); }, [destCityId]);

  useEffect(() => {
    if (routeDistance && routeDistance > 0) handleSimulate();
  }, [routeDistance]);

  const handleSimulate = async () => {
    if (!routeDistance) { setError("Aguarde o cálculo da rota no mapa."); return; }
    setError(""); setResult(null); setLoading(true);

    try {
      const body = mode === "sc"
        ? { mode: "sc", origin_city_id: originCityId, destination_city_id: destCityId, vehicle_type: "moto", distance_km: routeDistance }
        : { mode: "national", origin_text: natOriginCity.trim(), destination_text: natDestCity.trim(), vehicle_type: "car", distance_km: routeDistance };

      const { data, error: fnError } = await supabase.functions.invoke("calculate-freight", { body });
      if (fnError) throw fnError;
      if (data?.error) { setError(data.error); return; }

      setResult({ ...data, estimated_time_min: routeDuration ? Math.round(routeDuration) : undefined });

      await logSimulation({
        origin_city: originCityName || undefined,
        destination_city: destCityName || undefined,
        vehicle_type: mode === "national" ? "car" : "moto",
        mode, distance_km: data.distance_km, final_value: data.final_value,
      });
      trackEvent("simulation_completed", { mode, distance: routeDistance });
    } catch (err: any) {
      setError(err.message || "Erro ao calcular frete.");
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  const buildWhatsAppUrl = () => {
    if (!result) return "#";
    const modalidade = mode === "sc" ? "MOTOBOY" : "CARRO/CAMIONETE";
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

    const urgencyLabels = { express: "Express (até 1 hora)", normal: "Normal (40-45 min)", urgente: "Urgente (até 30 min)" };

    const categoryLabel = category ? `\nCategoria: ${category}` : "";

    const msg = `Olá, gostaria de solicitar um frete:

Modalidade: ${modalidade}
Origem: ${originText}
Destino: ${destText}
Distância: ${result.distance_km.toFixed(1)} km
Tempo estimado: ${result.estimated_time_min || "—"} minutos
Valor calculado: R$ ${result.final_value.toFixed(2)}${categoryLabel}
${weight ? `Peso estimado: ${weight}` : ""}
Entrega: ${deliveryWhen === "hoje" ? "Hoje" : "Agendada"}${deliveryTime ? ` às ${deliveryTime}` : ""}
Urgência: ${urgencyLabels[urgency]}
Rota: ${mapsLink}`;

    return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(msg)}`;
  };

  const currentVehicleLabel = mode === "national" ? "Carro/Camionete" : "Motoboy";

  return (
    <div className="min-h-screen bg-background" id="top">
      {/* Tagline Top Bar — always visible */}
      <div className="bg-primary text-primary-foreground text-center text-xs sm:text-sm py-1.5 font-medium">
        📍 Somos de Itapema — fretes via motoboy a partir de <span className="font-bold">R$ 15,00</span>
      </div>

      {/* Navbar — auto-hide on scroll down */}
      <header
        className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-md transition-transform duration-300"
        style={{ transform: navVisible ? "translateY(0)" : "translateY(-100%)" }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2">
          <button onClick={scrollToTop} className="flex items-center gap-2.5 cursor-pointer bg-transparent border-0 p-0">
            <img src={logoFrete} alt="Frete Garça" className="h-12 object-contain" />
          </button>
          <nav className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => scrollToSection("top")} className="hidden md:inline-flex text-xs">
              Início
            </Button>
            <Button variant="ghost" size="sm" onClick={() => scrollToSection("simulator")} className="hidden sm:inline-flex text-xs">
              Simulador
            </Button>
            <Button variant="ghost" size="sm" onClick={() => scrollToSection("services")} className="hidden md:inline-flex text-xs">
              Serviços
            </Button>
            <Button variant="ghost" size="sm" onClick={() => scrollToSection("reviews")} className="hidden md:inline-flex text-xs">
              Avaliações
            </Button>
            <ThemeToggle />
          </nav>
        </div>
      </header>

      <HeroSection onSimulateClick={scrollToSimulator} />

      {/* Social Proof Bar — single line, subtle, no "24/7 Suporte" */}
      <section className="border-b bg-card/60">
        <div className="mx-auto max-w-6xl px-4 py-2.5">
          <div className="flex items-center justify-around divide-x divide-border">
            {[
              { value: "2.500+", label: "Entregas" },
              { value: "98%", label: "Satisfação" },
              { value: "< 5min", label: "Cotação" },
            ].map((stat) => (
              <div key={stat.label} className="flex-1 text-center px-2">
                <span className="text-sm sm:text-base font-semibold text-primary">{stat.value}</span>
                <span className="text-[10px] sm:text-[11px] text-muted-foreground ml-1">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Simulator Section */}
      <section ref={simulatorRef} className="py-8 sm:py-14 bg-gradient-to-br from-blue-50/50 via-background to-blue-100/30 dark:from-blue-950/30 dark:via-background dark:to-blue-900/20" id="simulator">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <Card className="bg-blue-50/60 dark:bg-blue-950/40 backdrop-blur-xl border border-blue-200/50 dark:border-blue-400/20 shadow-[0_8px_32px_rgba(59,130,246,0.15)] ring-1 ring-blue-100/30 dark:ring-blue-500/10">
            <CardHeader className="text-center pb-1 px-4 sm:px-8">
              <CardTitle className="text-xl sm:text-2xl font-bold">Simule seu frete</CardTitle>
              <CardDescription className="text-sm">Calcule o valor em segundos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-4 px-4 sm:px-8">
              <Tabs value={mode} onValueChange={(v) => setMode(v as "sc" | "national")}>
                <TabsList className="w-full">
                  <TabsTrigger value="sc" className="flex-1 gap-1.5"><Bike className="h-4 w-4" /> Motoboy</TabsTrigger>
                  <TabsTrigger value="national" className="flex-1 gap-1.5"><Car className="h-4 w-4" /> Carro / Camionete</TabsTrigger>
                </TabsList>

                {/* SC (MOTOBOY) */}
                <TabsContent value="sc" className="space-y-6 mt-5">
                  {/* Coleta */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <MapPin className="h-4 w-4 text-primary" /> Local de Coleta
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Cidade</Label>
                      <Select value={originCityId} onValueChange={setOriginCityId}>
                        <SelectTrigger><SelectValue placeholder="Selecione a cidade" /></SelectTrigger>
                        <SelectContent>{cities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Rua</Label>
                      <AddressAutocomplete cityName={originCityName} disabled={!originCityId} placeholder="Digite o nome da rua..." onSelect={handleOriginSelect} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Número</Label>
                      <Input value={originNumber} onChange={e => setOriginNumber(e.target.value)} placeholder="Nº" />
                    </div>
                  </div>

                  <div className="border-t border-border" />

                  {/* Destino */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <MapPin className="h-4 w-4 text-destructive" /> Destino
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Cidade</Label>
                      <Select value={destCityId} onValueChange={setDestCityId}>
                        <SelectTrigger><SelectValue placeholder="Selecione a cidade" /></SelectTrigger>
                        <SelectContent>{cities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Rua</Label>
                      <AddressAutocomplete cityName={destCityName} disabled={!destCityId} placeholder="Digite o nome da rua..." onSelect={handleDestSelect} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Número</Label>
                      <Input value={destNumber} onChange={e => setDestNumber(e.target.value)} placeholder="Nº" />
                    </div>
                  </div>

                  <div className="border-t border-border" />

                  {/* Category & Weight — flat layout */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Package className="h-4 w-4 text-primary" /> Detalhes da carga
                    </div>
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label className="text-sm">Categoria</Label>
                        <Select value={category} onValueChange={setCategory}>
                          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Eletrônicos">Eletrônicos</SelectItem>
                            <SelectItem value="Documentos">Documentos</SelectItem>
                            <SelectItem value="Alimentos">Alimentos</SelectItem>
                            <SelectItem value="Chaves">Chaves</SelectItem>
                            <SelectItem value="Pacotes">Pacotes</SelectItem>
                            <SelectItem value="Outros">Outros</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Peso estimado</Label>
                        <Select value={weight} onValueChange={setWeight}>
                          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>
                            {WEIGHT_OPTIONS.map(w => (
                              <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* NATIONAL (CARRO / CAMIONETE) */}
                <TabsContent value="national" className="space-y-6 mt-5">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <MapPin className="h-4 w-4 text-primary" /> Origem
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Cidade</Label>
                      <Input value={natOriginCity} onChange={e => setNatOriginCity(e.target.value)} placeholder="Ex: São Paulo, SP" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Rua</Label>
                      <AddressAutocomplete cityName={natOriginCity} state="" disabled={!natOriginCity.trim()} placeholder="Digite o nome da rua..." onSelect={handleNatOriginSelect} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Número</Label>
                      <Input value={natOriginNumber} onChange={e => setNatOriginNumber(e.target.value)} placeholder="Nº" />
                    </div>
                  </div>

                  <div className="border-t border-border" />

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <MapPin className="h-4 w-4 text-destructive" /> Destino
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Cidade</Label>
                      <Input value={natDestCity} onChange={e => setNatDestCity(e.target.value)} placeholder="Ex: Rio de Janeiro, RJ" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Rua</Label>
                      <AddressAutocomplete cityName={natDestCity} state="" disabled={!natDestCity.trim()} placeholder="Digite o nome da rua..." onSelect={handleNatDestSelect} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Número</Label>
                      <Input value={natDestNumber} onChange={e => setNatDestNumber(e.target.value)} placeholder="Nº" />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="border-t border-border" />

              {/* Scheduling & Urgency — cleaner layout */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <CalendarDays className="h-4 w-4 text-primary" /> Entrega
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={deliveryWhen === "hoje" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDeliveryWhen("hoje")}
                  >
                    Hoje
                  </Button>
                  <Button
                    type="button"
                    variant={deliveryWhen === "agendar" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDeliveryWhen("agendar")}
                  >
                    Agendar
                  </Button>
                </div>
                {deliveryWhen === "hoje" && (
                  <div className="space-y-2">
                    <Label className="text-sm">Horário preferencial (opcional)</Label>
                    <Input type="time" value={deliveryTime} onChange={e => setDeliveryTime(e.target.value)} />
                  </div>
                )}
                {deliveryWhen === "agendar" && (
                  <div className="space-y-2">
                    <Label className="text-sm">Data e horário</Label>
                    <Input type="datetime-local" value={deliveryTime} onChange={e => setDeliveryTime(e.target.value)} />
                  </div>
                )}
              </div>

              {/* Urgency chips */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Zap className="h-4 w-4 text-primary" /> Urgência
                </div>
                <div className="flex flex-wrap gap-2">
                  {([
                    { value: "normal" as const, label: "Normal", desc: "40–45 min", icon: "🕐" },
                    { value: "express" as const, label: "Express", desc: "Até 1h", icon: "⏱" },
                    { value: "urgente" as const, label: "Urgente", desc: "Até 30 min", icon: "⚡" },
                  ]).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setUrgency(opt.value)}
                      className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors border ${
                        urgency === opt.value
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-foreground border-border hover:bg-accent"
                      }`}
                    >
                      <span>{opt.icon}</span>
                      <span>{opt.label}</span>
                      <span className="text-xs opacity-70">({opt.desc})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Map */}
              {(originCoords || destCoords) && (
                <FreightMap originCoords={originCoords} destCoords={destCoords} onRouteCalculated={handleRouteCalculated} />
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
                <div className="rounded-xl border-2 border-primary/20 bg-accent/50 p-4 sm:p-6 space-y-4">
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

                  <Button
                    asChild
                    className="w-full gap-2 py-6 text-base font-semibold text-white"
                    style={{ backgroundColor: "hsl(142, 70%, 45%)" }}
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

      {/* Features */}
      <section className="py-16 bg-background" id="features">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold sm:text-3xl">Por que escolher a Frete Garça?</h2>
            <p className="mt-2 text-muted-foreground">Tecnologia e confiança em cada entrega</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              { icon: Zap, title: "Velocidade", desc: "Cotação em segundos com cálculo inteligente de rotas e preços em tempo real." },
              { icon: Shield, title: "Segurança", desc: "Seguro total em todas as entregas. Sua mercadoria protegida do início ao fim." },
              { icon: Clock, title: "Pontualidade", desc: "Motoboys verificados e rastreamento em tempo real para total tranquilidade." },
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

      {/* Services */}
      <div id="services">
        <ServicesSection />
      </div>

      {/* Service Photos Carousel */}
      <ServicePhotosCarousel />

      {/* Social Proof Reviews */}
      <SocialProof />

      {/* Footer SEO */}
      <footer className="border-t bg-card py-10">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <img src={logoFrete} alt="Frete Garça" className="h-10 object-contain mb-3" />
              <p className="text-sm text-muted-foreground leading-relaxed">
                Entregas rápidas via motoboy e frete com carro na região de Itapema e litoral de Santa Catarina.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm">Serviços</h4>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <li><a href="#simulator" className="hover:text-primary transition-colors">Simulador de Frete</a></li>
                <li><a href="#services" className="hover:text-primary transition-colors">Entregas Motoboy</a></li>
                <li><a href="#simulator" className="hover:text-primary transition-colors">Frete Carro/Camionete</a></li>
                <li><a href="#features" className="hover:text-primary transition-colors">Entrega Expressa</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm">Cidades Atendidas</h4>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <li>Itapema</li>
                <li>Porto Belo</li>
                <li>Bal. Camboriú</li>
                <li>Tijucas</li>
                <li>Bombinhas</li>
                <li>Itajaí</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm">Links Úteis</h4>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <li><a href="#reviews" className="hover:text-primary transition-colors">Avaliações Google</a></li>
                <li><a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">WhatsApp</a></li>
                <li><a href="#top" className="hover:text-primary transition-colors">Início</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t mt-8 pt-6 text-center">
            <p className="text-xs text-muted-foreground">© 2026 Frete Garça. Todos os direitos reservados. Itapema - SC</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
