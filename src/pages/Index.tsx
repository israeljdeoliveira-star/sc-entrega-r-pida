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
import { Bike, Car, MapPin, ArrowRight, Globe, Shield, Zap, Clock, MessageCircle, CalendarDays, Package, AlertTriangle, Truck, Plus, RotateCcw } from "lucide-react";
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
  { value: "500g", label: "500g", example: "📦 Pacote de café (500g)" },
  { value: "1kg", label: "1 kg", example: "📚 Livro grande" },
  { value: "3kg", label: "3 kg", example: "🍍 Abacaxi médio (~3kg)" },
  { value: "5kg", label: "5 kg", example: "🍉 Melancia pequena" },
  { value: "10kg", label: "10 kg", example: "🧴 Galão de água" },
  { value: "15kg", label: "15 kg", example: "🖥️ Monitor" },
  { value: "20kg", label: "20 kg", example: "🧳 Mala grande" },
];

const CATEGORIES = [
  { value: "documentos", label: "📄 Documentos" },
  { value: "eletronicos", label: "💻 Eletrônicos" },
  { value: "alimentacao", label: "🍔 Alimentação" },
  { value: "presentes", label: "🎁 Presentes" },
  { value: "malotes", label: "🧾 Malotes" },
  { value: "outros", label: "📦 Outros" },
];

const VOLUME_KEYWORDS = ["sofá", "sofa", "geladeira", "fogão", "fogao", "guarda-roupa", "guarda roupa", "armário", "armario", "cama", "mesa grande"];

const WHATSAPP_FIXED = "5547988042341";

export default function Index() {
  const simulatorRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"sc" | "national">("sc");
  const [cities, setCities] = useState<City[]>([]);
  const { toast } = useToast();

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

  // SC Moto state
  const [originCityId, setOriginCityId] = useState("");
  const [destCityId, setDestCityId] = useState("");
  const [originAddress, setOriginAddress] = useState<AddressSelection | null>(null);
  const [destAddress, setDestAddress] = useState<AddressSelection | null>(null);
  const [weight, setWeight] = useState("");
  const [category, setCategory] = useState("");
  const [motoReturn, setMotoReturn] = useState(false);
  const [motoExtraStops, setMotoExtraStops] = useState(0);

  // Car state - uses same city dropdown
  const [carOriginCityId, setCarOriginCityId] = useState("");
  const [carDestCityId, setCarDestCityId] = useState("");
  const [carOriginAddress, setCarOriginAddress] = useState<AddressSelection | null>(null);
  const [carDestAddress, setCarDestAddress] = useState<AddressSelection | null>(null);

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
  const [volumeAlert, setVolumeAlert] = useState(false);

  const scrollToSimulator = () => simulatorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });
  const scrollToSection = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  useEffect(() => {
    supabase.from("cities").select("*").eq("is_active", true).order("name")
      .then(({ data }) => { if (data) setCities(data); });
  }, []);

  const getOriginCityName = () => {
    if (mode === "sc") return cities.find(c => c.id === originCityId)?.name || "";
    return cities.find(c => c.id === carOriginCityId)?.name || "";
  };
  const getDestCityName = () => {
    if (mode === "sc") return cities.find(c => c.id === destCityId)?.name || "";
    return cities.find(c => c.id === carDestCityId)?.name || "";
  };

  const handleOriginSelect = useCallback((sel: AddressSelection) => { setOriginAddress(sel); setOriginCoords([sel.lat, sel.lng]); }, []);
  const handleDestSelect = useCallback((sel: AddressSelection) => { setDestAddress(sel); setDestCoords([sel.lat, sel.lng]); }, []);
  const handleCarOriginSelect = useCallback((sel: AddressSelection) => { setCarOriginAddress(sel); setOriginCoords([sel.lat, sel.lng]); }, []);
  const handleCarDestSelect = useCallback((sel: AddressSelection) => { setCarDestAddress(sel); setDestCoords([sel.lat, sel.lng]); }, []);
  const handleRouteCalculated = useCallback((distKm: number, durMin: number) => { setRouteDistance(distKm); setRouteDuration(durMin); }, []);

  // Reset on mode change
  useEffect(() => { setResult(null); setError(""); setOriginCoords(null); setDestCoords(null); setRouteDistance(null); setRouteDuration(null); }, [mode]);
  useEffect(() => { setOriginAddress(null); setOriginCoords(null); }, [originCityId]);
  useEffect(() => { setDestAddress(null); setDestCoords(null); }, [destCityId]);
  useEffect(() => { setCarOriginAddress(null); setOriginCoords(null); }, [carOriginCityId]);
  useEffect(() => { setCarDestAddress(null); setDestCoords(null); }, [carDestCityId]);

  // Auto-calculate when route is ready
  useEffect(() => {
    if (routeDistance && routeDistance > 0) handleSimulate();
  }, [routeDistance, motoReturn, motoExtraStops, carNeedHelper, carNeedStairs, carIsApartment, carHasElevator, carHasFragile, carNeedBubbleWrap, carMultiTrip]);

  // Volume alert for car
  useEffect(() => {
    const text = (carItemDescription + " " + carItemDetails).toLowerCase();
    const hits = VOLUME_KEYWORDS.filter(kw => text.includes(kw));
    setVolumeAlert(hits.length >= 2);
  }, [carItemDescription, carItemDetails]);

  const handleSimulate = async () => {
    if (!routeDistance) return;

    if (mode === "national") {
      if (!carItemDescription.trim()) { setError("Informe o que será transportado."); return; }
      if (!carItemDetails.trim()) { setError("Descreva os itens a serem transportados."); return; }
    }

    setError(""); setResult(null); setLoading(true);

    try {
      const isCar = mode === "national";
      const carAdditionals = isCar ? {
        helper: carNeedHelper,
        stairs: carNeedStairs,
        no_elevator: carIsApartment && !carHasElevator,
        bubble_wrap: carNeedBubbleWrap,
        fragile: carHasFragile,
      } : {};

      const body = isCar
        ? {
            mode: "sc",
            origin_city_id: carOriginCityId,
            destination_city_id: carDestCityId,
            vehicle_type: "car",
            distance_km: routeDistance,
            car_additionals: carAdditionals,
            multi_trip: carMultiTrip,
          }
        : {
            mode: "sc",
            origin_city_id: originCityId,
            destination_city_id: destCityId,
            vehicle_type: "moto",
            distance_km: routeDistance,
            moto_return: motoReturn,
            moto_extra_stops: motoExtraStops,
          };

      const { data, error: fnError } = await supabase.functions.invoke("calculate-freight", { body });
      if (fnError) throw fnError;
      if (data?.error) { setError(data.error); return; }

      setResult({ ...data, estimated_time_min: routeDuration ? Math.round(routeDuration) : undefined });

      await logSimulation({
        origin_city: getOriginCityName() || undefined,
        destination_city: getDestCityName() || undefined,
        vehicle_type: isCar ? "car" : "moto",
        mode: "sc", distance_km: data.distance_km, final_value: data.final_value,
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
    const oAddr = mode === "sc" ? originAddress : carOriginAddress;
    const dAddr = mode === "sc" ? destAddress : carDestAddress;
    const oCityName = getOriginCityName();
    const dCityName = getDestCityName();

    const originText = `${oAddr?.street || ""} - ${oAddr?.neighborhood || ""} - ${oCityName}`;
    const destText = `${dAddr?.street || ""} - ${dAddr?.neighborhood || ""} - ${dCityName}`;

    let msg = `🚛 FRETE GARÇA — SIMULAÇÃO

Olá! 👋

Segue a simulação do seu frete:

📍 Coleta: ${originText}
📍 Entrega: ${destText}
🚚 Tipo: ${tipo}
📏 Distância: ${result.distance_km.toFixed(1)} km
💰 Valor estimado: R$ ${result.final_value.toFixed(2)}

⚠️ Esta é uma simulação automática.
O valor pode sofrer alteração após conferência de detalhes.

📦 Itens frágeis devem estar bem embalados.
Realizamos apenas o transporte.`;

    if (carMultiTrip && mode === "national") {
      msg += "\n\nSe precisar de mais de uma viagem, aplicamos desconto conforme informado.";
    }
    if ((mode === "national" && carHasFragile) || mode === "sc") {
      msg += "\n\n🔎 Esta é uma simulação automática. O valor pode sofrer ajustes após conferência dos itens.";
    }

    msg += "\n\nEstamos à disposição! 😊";

    return `https://wa.me/${WHATSAPP_FIXED}?text=${encodeURIComponent(msg)}`;
  };

  const selectedWeight = WEIGHT_OPTIONS.find(w => w.value === weight);

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
                  <TabsTrigger value="sc" className="flex-1 gap-1.5"><Bike className="h-4 w-4" /> 🛵 Motoboy</TabsTrigger>
                  <TabsTrigger value="national" className="flex-1 gap-1.5"><Car className="h-4 w-4" /> 🚗 Carro</TabsTrigger>
                </TabsList>

                {/* === MOTOBOY === */}
                <TabsContent value="sc" className="space-y-5 mt-5">
                  {/* Coleta */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold"><MapPin className="h-4 w-4 text-primary" /> 📍 Local de Coleta</div>
                    <div className="space-y-2">
                      <Label className="text-sm">Cidade</Label>
                      <Select value={originCityId} onValueChange={setOriginCityId}>
                        <SelectTrigger><SelectValue placeholder="Selecione a cidade" /></SelectTrigger>
                        <SelectContent>{cities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm">Rua + Número</Label>
                      <AddressAutocomplete cityName={cities.find(c => c.id === originCityId)?.name || ""} disabled={!originCityId} placeholder="Ex: Rua Brasil, 123" onSelect={handleOriginSelect} />
                    </div>
                  </div>

                  <div className="border-t border-border" />

                  {/* Destino */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold"><MapPin className="h-4 w-4 text-destructive" /> 📍 Destino</div>
                    <div className="space-y-2">
                      <Label className="text-sm">Cidade</Label>
                      <Select value={destCityId} onValueChange={setDestCityId}>
                        <SelectTrigger><SelectValue placeholder="Selecione a cidade" /></SelectTrigger>
                        <SelectContent>{cities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm">Rua + Número</Label>
                      <AddressAutocomplete cityName={cities.find(c => c.id === destCityId)?.name || ""} disabled={!destCityId} placeholder="Ex: Rua Brasil, 123" onSelect={handleDestSelect} />
                    </div>
                  </div>

                  <div className="border-t border-border" />

                  {/* Detalhes da carga */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold"><Package className="h-4 w-4 text-primary" /> 📦 Detalhes da carga</div>
                    <div className="space-y-2">
                      <Label className="text-sm">Categoria</Label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Peso estimado</Label>
                      <Select value={weight} onValueChange={setWeight}>
                        <SelectTrigger><SelectValue placeholder="Selecione o peso" /></SelectTrigger>
                        <SelectContent>{WEIGHT_OPTIONS.map(w => <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>)}</SelectContent>
                      </Select>
                      {selectedWeight && (
                        <p className="text-xs text-muted-foreground ml-1">{selectedWeight.example}</p>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-border" />

                  {/* Opções extras moto */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold"><RotateCcw className="h-4 w-4 text-primary" /> 🔁 Opções adicionais</div>
                    <ToggleQuestion label="Precisa de retorno?" emoji="🔁" checked={motoReturn} onChange={setMotoReturn} />
                    {motoReturn && <p className="text-xs text-muted-foreground pl-4">✅ Taxa de retorno será adicionada automaticamente.</p>}

                    <div className="space-y-2">
                      <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-background border">
                        <span className="text-sm font-medium">📍 Paradas extras</span>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="icon" className="h-8 w-8" disabled={motoExtraStops <= 0} onClick={() => setMotoExtraStops(v => Math.max(0, v - 1))}>-</Button>
                          <span className="text-sm font-semibold w-6 text-center">{motoExtraStops}</span>
                          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setMotoExtraStops(v => v + 1)}>
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {motoExtraStops > 0 && <p className="text-xs text-muted-foreground pl-4">✅ {motoExtraStops} parada(s) extra(s) adicionada(s) ao valor.</p>}
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

                  {/* Origem */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold"><MapPin className="h-4 w-4 text-primary" /> 📍 Origem</div>
                    <div className="space-y-2">
                      <Label className="text-sm">Cidade</Label>
                      <Select value={carOriginCityId} onValueChange={setCarOriginCityId}>
                        <SelectTrigger><SelectValue placeholder="Selecione a cidade" /></SelectTrigger>
                        <SelectContent>{cities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm">Rua + Número</Label>
                      <AddressAutocomplete cityName={cities.find(c => c.id === carOriginCityId)?.name || ""} disabled={!carOriginCityId} placeholder="Ex: Rua 230, 570" onSelect={handleCarOriginSelect} />
                    </div>
                  </div>

                  <div className="border-t border-border" />

                  {/* Destino */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold"><MapPin className="h-4 w-4 text-destructive" /> 📍 Destino</div>
                    <div className="space-y-2">
                      <Label className="text-sm">Cidade</Label>
                      <Select value={carDestCityId} onValueChange={setCarDestCityId}>
                        <SelectTrigger><SelectValue placeholder="Selecione a cidade" /></SelectTrigger>
                        <SelectContent>{cities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm">Rua + Número</Label>
                      <AddressAutocomplete cityName={cities.find(c => c.id === carDestCityId)?.name || ""} disabled={!carDestCityId} placeholder="Ex: Rua 230, 570" onSelect={handleCarDestSelect} />
                    </div>
                  </div>

                  <div className="border-t border-border" />

                  {/* Car-specific fields */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-semibold"><Package className="h-4 w-4 text-primary" /> 📦 Detalhes do transporte</div>
                    <div className="space-y-2">
                      <Label className="text-sm">O que será transportado? *</Label>
                      <Input value={carItemDescription} onChange={e => setCarItemDescription(e.target.value)} placeholder="Ex: Mudança, móveis, eletrodomésticos..." />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Descreva os itens *</Label>
                      <Textarea value={carItemDetails} onChange={e => setCarItemDetails(e.target.value)} placeholder="Ex: 1 sofá, 2 caixas, 1 geladeira..." rows={3} />
                    </div>

                    {volumeAlert && (
                      <Alert className="border-orange-400/50 bg-orange-50 dark:bg-orange-950/30">
                        <Truck className="h-4 w-4 text-orange-600" />
                        <AlertDescription className="text-sm text-orange-800 dark:text-orange-200">
                          🚛 Observação: Pelo volume informado, pode ser necessário realizar duas viagens.
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="space-y-3">
                      <ToggleQuestion label="Precisa de ajudante?" emoji="👷" checked={carNeedHelper} onChange={setCarNeedHelper} />
                      <ToggleQuestion label="É apartamento?" emoji="🏢" checked={carIsApartment} onChange={setCarIsApartment} />
                      {carIsApartment && <ToggleQuestion label="Tem elevador?" emoji="🛗" checked={carHasElevator} onChange={setCarHasElevator} indent />}
                      <ToggleQuestion label="Precisa descer/subir escada?" emoji="🪜" checked={carNeedStairs} onChange={setCarNeedStairs} />
                      <ToggleQuestion label="Possui itens frágeis?" emoji="⚠️" checked={carHasFragile} onChange={setCarHasFragile} />
                      {carHasFragile && (
                        <Alert className="border-yellow-400/50 bg-yellow-50 dark:bg-yellow-950/30">
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                          <AlertDescription className="text-sm text-yellow-800 dark:text-yellow-200">
                            💛 Atenção: recomendamos que itens frágeis sejam muito bem embalados pelo cliente. Trabalhamos com transporte, mas não nos responsabilizamos por avarias em itens frágeis mal embalados.
                          </AlertDescription>
                        </Alert>
                      )}
                      <ToggleQuestion label="Precisa de embalagem bolha?" emoji="📦" checked={carNeedBubbleWrap} onChange={setCarNeedBubbleWrap} />
                      <ToggleQuestion label="Será necessário mais de uma viagem?" emoji="🔁" checked={carMultiTrip} onChange={setCarMultiTrip} />
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

              {loading && (
                <div className="flex items-center justify-center py-4 gap-2 text-sm text-muted-foreground">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  Calculando...
                </div>
              )}

              {/* Result - sticky on mobile */}
              {result && (
                <div className="rounded-xl border-2 border-primary/20 bg-accent/50 p-4 sm:p-6 space-y-4">
                  <div>
                    <h3 className="font-bold text-lg">Resultado da Simulação</h3>
                    <p className="text-sm text-muted-foreground">{getOriginCityName()} → {getDestCityName()} • {mode === "sc" ? "🛵 Motoboy" : "🚗 Carro"}</p>
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
                {cities.map(c => <li key={c.id}>{c.name}</li>)}
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

function ToggleQuestion({ label, checked, onChange, indent, emoji }: { label: string; checked: boolean; onChange: (v: boolean) => void; indent?: boolean; emoji?: string }) {
  return (
    <div className={`flex items-center justify-between py-3 px-3 rounded-lg bg-background border ${indent ? "ml-4" : ""}`}>
      <span className="text-sm font-medium">{emoji && <span className="mr-1.5">{emoji}</span>}{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
