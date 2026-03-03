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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Bike, Car, MapPin, ArrowRight, Globe, Shield, Zap, Clock, MessageCircle, CalendarDays, Package, AlertTriangle, Truck } from "lucide-react";
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
  final_value: number;
  estimated_time_min?: number;
}

const WEIGHT_OPTIONS = [
  { value: "1 kg", label: "1 kg — ☕ pacote de café" },
  { value: "2 kg", label: "2 kg — 💻 notebook" },
  { value: "3 kg", label: "3 kg — 🍍 abacaxi" },
  { value: "5 kg", label: "5 kg — 🍉 melancia pequena" },
  { value: "10 kg", label: "10 kg — 📦 micro-ondas" },
  { value: "15 kg", label: "15 kg — 🖥️ monitor" },
  { value: "20 kg", label: "20 kg — 🧳 mala grande" },
];

const WHATSAPP_FIXED = "5547988042341";

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
      setNavVisible(currentY <= lastScrollY.current || currentY <= 80);
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
  const [weight, setWeight] = useState("");
  const [category, setCategory] = useState("");

  // National (car) mode state
  const [natOriginCity, setNatOriginCity] = useState("");
  const [natDestCity, setNatDestCity] = useState("");
  const [natOriginAddress, setNatOriginAddress] = useState<AddressSelection | null>(null);
  const [natDestAddress, setNatDestAddress] = useState<AddressSelection | null>(null);
  const [natOriginNumber, setNatOriginNumber] = useState("");
  const [natDestNumber, setNatDestNumber] = useState("");

  // Car-specific fields
  const [carItemDescription, setCarItemDescription] = useState("");
  const [carItemDetails, setCarItemDetails] = useState("");
  const [carNeedHelper, setCarNeedHelper] = useState(false);
  const [carIsApartment, setCarIsApartment] = useState(false);
  const [carHasElevator, setCarHasElevator] = useState(false);
  const [carNeedStairs, setCarNeedStairs] = useState(false);
  const [carHasFragile, setCarHasFragile] = useState(false);
  const [carNeedBubbleWrap, setCarNeedBubbleWrap] = useState(false);
  const [carMultiTrip, setCarMultiTrip] = useState(false);

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
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });
  const scrollToSection = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  useEffect(() => {
    supabase.from("cities").select("*").eq("is_active", true).order("name")
      .then(({ data }) => { if (data) setCities(data); });
  }, []);

  const originCityName = mode === "sc" ? cities.find(c => c.id === originCityId)?.name || "" : natOriginCity;
  const destCityName = mode === "sc" ? cities.find(c => c.id === destCityId)?.name || "" : natDestCity;

  const handleOriginSelect = useCallback((sel: AddressSelection) => { setOriginAddress(sel); setOriginCoords([sel.lat, sel.lng]); }, []);
  const handleDestSelect = useCallback((sel: AddressSelection) => { setDestAddress(sel); setDestCoords([sel.lat, sel.lng]); }, []);
  const handleNatOriginSelect = useCallback((sel: AddressSelection) => { setNatOriginAddress(sel); setOriginCoords([sel.lat, sel.lng]); }, []);
  const handleNatDestSelect = useCallback((sel: AddressSelection) => { setNatDestAddress(sel); setDestCoords([sel.lat, sel.lng]); }, []);
  const handleRouteCalculated = useCallback((distKm: number, durMin: number) => { setRouteDistance(distKm); setRouteDuration(durMin); }, []);

  useEffect(() => { setResult(null); setError(""); setOriginCoords(null); setDestCoords(null); setRouteDistance(null); setRouteDuration(null); }, [mode]);
  useEffect(() => { setOriginAddress(null); setOriginCoords(null); }, [originCityId]);
  useEffect(() => { setDestAddress(null); setDestCoords(null); }, [destCityId]);
  useEffect(() => { if (routeDistance && routeDistance > 0) handleSimulate(); }, [routeDistance]);

  const handleSimulate = async () => {
    if (!routeDistance) { setError("Aguarde o cálculo da rota no mapa."); return; }

    // Car validation
    if (mode === "national") {
      if (!carItemDescription.trim()) { setError("Informe o que será transportado."); return; }
      if (!carItemDetails.trim()) { setError("Descreva os itens a serem transportados."); return; }
    }

    setError(""); setResult(null); setLoading(true);

    try {
      const carAdditionals = mode === "national" ? {
        helper: carNeedHelper,
        stairs: carNeedStairs,
        no_elevator: carIsApartment && !carHasElevator,
        bubble_wrap: carNeedBubbleWrap,
        fragile: carHasFragile,
      } : {};

      const body = mode === "sc"
        ? { mode: "sc", origin_city_id: originCityId, destination_city_id: destCityId, vehicle_type: "moto", distance_km: routeDistance }
        : {
            mode: "national", origin_text: natOriginCity.trim(), destination_text: natDestCity.trim(),
            vehicle_type: "car", distance_km: routeDistance,
            car_additionals: carAdditionals, multi_trip: carMultiTrip,
          };

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
    const tipo = mode === "sc" ? "Moto" : "Carro";
    const oAddr = mode === "sc" ? originAddress : natOriginAddress;
    const dAddr = mode === "sc" ? destAddress : natDestAddress;
    const oNum = mode === "sc" ? originNumber : natOriginNumber;
    const dNum = mode === "sc" ? destNumber : natDestNumber;

    const originText = `${oAddr?.street || ""}${oNum ? `, Nº ${oNum}` : ""} - ${oAddr?.neighborhood || ""} - ${originCityName}`;
    const destText = `${dAddr?.street || ""}${dNum ? `, Nº ${dNum}` : ""} - ${dAddr?.neighborhood || ""} - ${destCityName}`;

    const msg = `🚛 FRETE GARÇA — SIMULAÇÃO

Olá! 👋

Segue a simulação do seu frete:

📍 Coleta: ${originText}
📍 Entrega: ${destText}
🚚 Tipo: ${tipo}
💰 Valor estimado: R$ ${result.final_value.toFixed(2)}

⚠️ Esta é uma simulação automática.
O valor pode sofrer alteração após conferência de detalhes.

📦 Itens frágeis devem estar bem embalados.
Realizamos apenas o transporte.
${carMultiTrip ? "\nSe precisar de mais de uma viagem, aplicamos desconto conforme informado." : ""}
Estamos à disposição! 😊`;

    return `https://wa.me/${WHATSAPP_FIXED}?text=${encodeURIComponent(msg)}`;
  };

  // --- Render helpers ---
  const AddressBlock = ({ label, icon, citySelect, addressComp, numberVal, setNumber }: {
    label: string; icon: React.ReactNode; citySelect: React.ReactNode; addressComp: React.ReactNode;
    numberVal: string; setNumber: (v: string) => void;
  }) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">{icon} {label}</div>
      {citySelect}
      <div className="space-y-1">
        <Label className="text-sm">Rua + Número</Label>
        {addressComp}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background" id="top">
      {/* Tagline */}
      <div className="bg-primary text-primary-foreground text-center text-xs sm:text-sm py-1.5 font-medium">
        📍 Somos de Itapema — fretes via motoboy a partir de <span className="font-bold">R$ 15,00</span>
      </div>

      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-md transition-transform duration-300"
        style={{ transform: navVisible ? "translateY(0)" : "translateY(-100%)" }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2">
          <button onClick={scrollToTop} className="flex items-center gap-2.5 cursor-pointer bg-transparent border-0 p-0">
            <img src={logoFrete} alt="Frete Garça" className="h-12 object-contain" />
          </button>
          <nav className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => scrollToSection("top")} className="hidden md:inline-flex text-xs">Início</Button>
            <Button variant="ghost" size="sm" onClick={() => scrollToSection("simulator")} className="hidden sm:inline-flex text-xs">Simulador</Button>
            <Button variant="ghost" size="sm" onClick={() => scrollToSection("services")} className="hidden md:inline-flex text-xs">Serviços</Button>
            <Button variant="ghost" size="sm" onClick={() => scrollToSection("reviews")} className="hidden md:inline-flex text-xs">Avaliações</Button>
            <ThemeToggle />
          </nav>
        </div>
      </header>

      <HeroSection onSimulateClick={scrollToSimulator} />

      {/* Social Proof Bar */}
      <section className="border-b bg-card/60">
        <div className="mx-auto max-w-6xl px-4 py-2.5">
          <div className="flex items-center justify-around divide-x divide-border">
            {[{ value: "2.500+", label: "Entregas" }, { value: "98%", label: "Satisfação" }, { value: "< 5min", label: "Cotação" }].map(stat => (
              <div key={stat.label} className="flex-1 text-center px-2">
                <span className="text-sm sm:text-base font-semibold text-primary">{stat.value}</span>
                <span className="text-[10px] sm:text-[11px] text-muted-foreground ml-1">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Simulator */}
      <section ref={simulatorRef} className="py-8 sm:py-14 bg-gradient-to-br from-blue-50/50 via-background to-blue-100/30 dark:from-blue-950/30 dark:via-background dark:to-blue-900/20" id="simulator">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <Card className="bg-blue-50/60 dark:bg-blue-950/40 backdrop-blur-xl border border-blue-200/50 dark:border-blue-400/20 shadow-[0_8px_32px_rgba(59,130,246,0.15)] ring-1 ring-blue-100/30 dark:ring-blue-500/10">
            <CardHeader className="text-center pb-1 px-4 sm:px-8">
              <CardTitle className="text-xl sm:text-2xl font-bold">Simule seu frete</CardTitle>
              <CardDescription className="text-sm">Calcule o valor em segundos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-4 px-4 sm:px-8">
              <Tabs value={mode} onValueChange={(v) => setMode(v as "sc" | "national")}>
                <TabsList className="w-full">
                  <TabsTrigger value="sc" className="flex-1 gap-1.5"><Bike className="h-4 w-4" /> Motoboy</TabsTrigger>
                  <TabsTrigger value="national" className="flex-1 gap-1.5"><Car className="h-4 w-4" /> Carro</TabsTrigger>
                </TabsList>

                {/* === MOTOBOY === */}
                <TabsContent value="sc" className="space-y-5 mt-5">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold"><MapPin className="h-4 w-4 text-primary" /> Local de Coleta</div>
                    <div className="space-y-2">
                      <Label className="text-sm">Cidade</Label>
                      <Select value={originCityId} onValueChange={setOriginCityId}>
                        <SelectTrigger><SelectValue placeholder="Selecione a cidade" /></SelectTrigger>
                        <SelectContent>{cities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm">Rua</Label>
                      <AddressAutocomplete cityName={originCityName} disabled={!originCityId} placeholder="Rua + número..." onSelect={handleOriginSelect} />
                    </div>
                  </div>

                  <div className="border-t border-border" />

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold"><MapPin className="h-4 w-4 text-destructive" /> Destino</div>
                    <div className="space-y-2">
                      <Label className="text-sm">Cidade</Label>
                      <Select value={destCityId} onValueChange={setDestCityId}>
                        <SelectTrigger><SelectValue placeholder="Selecione a cidade" /></SelectTrigger>
                        <SelectContent>{cities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm">Rua</Label>
                      <AddressAutocomplete cityName={destCityName} disabled={!destCityId} placeholder="Rua + número..." onSelect={handleDestSelect} />
                    </div>
                  </div>

                  <div className="border-t border-border" />

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold"><Package className="h-4 w-4 text-primary" /> Detalhes da carga</div>
                    <div className="space-y-2">
                      <Label className="text-sm">Categoria</Label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {["Eletrônicos","Documentos","Alimentos","Chaves","Pacotes","Outros"].map(c =>
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Peso estimado</Label>
                      <Select value={weight} onValueChange={setWeight}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>{WEIGHT_OPTIONS.map(w => <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>

                {/* === CARRO === */}
                <TabsContent value="national" className="space-y-5 mt-5">
                  {/* Transport notice */}
                  <Alert className="border-primary/30 bg-primary/5">
                    <Truck className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      🚚 Realizamos apenas o transporte. Não realizamos desmontagem, montagem ou içamento de móveis.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold"><MapPin className="h-4 w-4 text-primary" /> Origem</div>
                    <div className="space-y-2">
                      <Label className="text-sm">Cidade</Label>
                      <Input value={natOriginCity} onChange={e => setNatOriginCity(e.target.value)} placeholder="Ex: Itapema, SC" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm">Rua</Label>
                      <AddressAutocomplete cityName={natOriginCity} state="" disabled={!natOriginCity.trim()} placeholder="Rua + número..." onSelect={handleNatOriginSelect} />
                    </div>
                  </div>

                  <div className="border-t border-border" />

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold"><MapPin className="h-4 w-4 text-destructive" /> Destino</div>
                    <div className="space-y-2">
                      <Label className="text-sm">Cidade</Label>
                      <Input value={natDestCity} onChange={e => setNatDestCity(e.target.value)} placeholder="Ex: Bal. Camboriú, SC" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm">Rua</Label>
                      <AddressAutocomplete cityName={natDestCity} state="" disabled={!natDestCity.trim()} placeholder="Rua + número..." onSelect={handleNatDestSelect} />
                    </div>
                  </div>

                  <div className="border-t border-border" />

                  {/* Car-specific fields */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-semibold"><Package className="h-4 w-4 text-primary" /> Detalhes do transporte</div>
                    <div className="space-y-2">
                      <Label className="text-sm">O que será transportado? *</Label>
                      <Input value={carItemDescription} onChange={e => setCarItemDescription(e.target.value)} placeholder="Ex: Mudança, móveis, eletrodomésticos..." />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Descreva os itens *</Label>
                      <Textarea value={carItemDetails} onChange={e => setCarItemDetails(e.target.value)} placeholder="Ex: 1 sofá, 2 caixas, 1 geladeira..." rows={3} />
                    </div>

                    <div className="space-y-3">
                      <ToggleQuestion label="Precisa de ajudante?" checked={carNeedHelper} onChange={setCarNeedHelper} />
                      <ToggleQuestion label="É apartamento?" checked={carIsApartment} onChange={setCarIsApartment} />
                      {carIsApartment && <ToggleQuestion label="Tem elevador?" checked={carHasElevator} onChange={setCarHasElevator} indent />}
                      <ToggleQuestion label="Precisa descer/subir escada?" checked={carNeedStairs} onChange={setCarNeedStairs} />
                      <ToggleQuestion label="Possui itens frágeis?" checked={carHasFragile} onChange={setCarHasFragile} />
                      {carHasFragile && (
                        <Alert className="border-yellow-400/50 bg-yellow-50 dark:bg-yellow-950/30">
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                          <AlertDescription className="text-sm text-yellow-800 dark:text-yellow-200">
                            ⚠️ Pedimos que itens frágeis estejam bem embalados. O Frete Garça realiza apenas o transporte e não se responsabiliza por danos decorrentes de embalagem inadequada.
                          </AlertDescription>
                        </Alert>
                      )}
                      <ToggleQuestion label="Precisa de embalagem bolha?" checked={carNeedBubbleWrap} onChange={setCarNeedBubbleWrap} />
                      <ToggleQuestion label="Será necessário mais de uma viagem?" checked={carMultiTrip} onChange={setCarMultiTrip} />
                      {carMultiTrip && (
                        <p className="text-sm text-muted-foreground pl-4">✅ Desconto automático será aplicado para múltiplas viagens.</p>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

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
                    <p className="text-sm text-muted-foreground">{originCityName} → {destCityName} • {mode === "sc" ? "Motoboy" : "Carro"}</p>
                  </div>
                  <div className="space-y-2.5 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Distância</span><span className="font-medium">{result.distance_km.toFixed(1)} km</span></div>
                    {result.estimated_time_min && (
                      <div className="flex justify-between"><span className="text-muted-foreground">Tempo estimado</span><span className="font-medium">{result.estimated_time_min} min</span></div>
                    )}
                  </div>
                  <div className="border-t pt-4 flex flex-col items-center gap-1">
                    <span className="text-sm text-muted-foreground">Valor da entrega</span>
                    <span className="text-3xl font-extrabold text-primary">R$ {result.final_value.toFixed(2)}</span>
                    <p className="text-xs text-muted-foreground text-center mt-1">
                      Valor calculado com base na distância e condições da entrega.
                    </p>
                  </div>

                  <Button asChild className="w-full gap-2 py-6 text-base font-semibold text-white" style={{ backgroundColor: "hsl(142, 70%, 45%)" }} size="lg">
                    <a href={buildWhatsAppUrl()} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="h-5 w-5" /> Solicitar pelo WhatsApp
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
            ].map(f => (
              <Card key={f.title} className="border-0 shadow-md bg-card hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent mb-4">
                    <f.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <div id="services"><ServicesSection /></div>
      <ServicePhotosCarousel />
      <SocialProof />

      {/* Footer */}
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
                <li><a href="#simulator" className="hover:text-primary transition-colors">Frete Carro</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm">Cidades Atendidas</h4>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {["Itapema","Porto Belo","Bal. Camboriú","Tijucas","Bombinhas","Itajaí"].map(c => <li key={c}>{c}</li>)}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm">Contato</h4>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <li><a href={`https://wa.me/${WHATSAPP_FIXED}`} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">WhatsApp</a></li>
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

// --- Toggle Question component ---
function ToggleQuestion({ label, checked, onChange, indent }: { label: string; checked: boolean; onChange: (v: boolean) => void; indent?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-2 px-3 rounded-lg bg-background border ${indent ? "ml-4" : ""}`}>
      <span className="text-sm font-medium">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
