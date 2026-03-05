import { useEffect, useRef, useState, useCallback, lazy, Suspense, useMemo } from "react";
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
import { Bike, Car, MapPin, ArrowRight, Globe, Shield, Zap, Clock, MessageCircle, CalendarDays, Package, AlertTriangle, Truck, Plus, RotateCcw, Route } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import HeroSection from "@/components/HeroSection";
import SocialProof from "@/components/SocialProof";
import ServicesSection from "@/components/ServicesSection";
import ServicePhotosCarousel from "@/components/ServicePhotosCarousel";
import ThemeToggle from "@/components/ThemeToggle";
import AddressAutocomplete, { type AddressSelection } from "@/components/AddressAutocomplete";
import CityAutocomplete, { type CitySelection } from "@/components/CityAutocomplete";
import ExtraStopCard, { type ExtraStop, createExtraStop } from "@/components/ExtraStopCard";
import logoFrete from "@/assets/logo-frete-garca.png";
import type { Tables } from "@/integrations/supabase/types";

const FreightMap = lazy(() => import("@/components/FreightMap"));

type City = Tables<"cities">;

interface FreightResult {
  distance_km: number;
  final_value: number;
  estimated_time_min?: number;
}

const WEIGHT_OPTIONS = [
  { value: "1kg", label: "Até 1 kg", example: "📦 Pacote de café (500g)" },
  { value: "3kg", label: "Até 3 kg", example: "🍍 Abacaxi médio" },
  { value: "5kg", label: "Até 5 kg", example: "💻 Notebook" },
  { value: "10kg", label: "Até 10 kg", example: "📦 Caixa pequena" },
];

const CATEGORIES = [
  { value: "documentos", label: "📄 Documentos" },
  { value: "eletronicos", label: "📱 Eletrônicos" },
  { value: "alimentacao", label: "🍔 Alimentação" },
  { value: "pacotes", label: "📦 Pacotes" },
  { value: "outros", label: "🎁 Outros" },
];

const VOLUME_KEYWORDS = ["sofá", "sofa", "geladeira", "fogão", "fogao", "guarda-roupa", "guarda roupa", "armário", "armario", "cama", "mesa grande"];

const WHATSAPP_FIXED = "5547988042341";

const ITAPEMA_LAT = -27.09;
const ITAPEMA_LNG = -48.61;

function buildGoogleMapsLink(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Nearest-neighbor + 2-opt route optimization
function optimizeStopOrder(origin: [number, number], stops: ExtraStop[], dest: [number, number]): string[] {
  const validStops = stops.filter(s => s.address);
  if (validStops.length <= 1) return validStops.map(s => s.id);

  // Build distance matrix
  const points: [number, number][] = [origin, ...validStops.map(s => [s.address!.lat, s.address!.lng] as [number, number]), dest];
  const n = points.length;
  const dist = (i: number, j: number) => haversineDistance(points[i][0], points[i][1], points[j][0], points[j][1]);

  // Nearest-neighbor to get initial order (indices 1..n-2 are stops)
  const stopIndices = Array.from({ length: validStops.length }, (_, i) => i + 1);
  const ordered: number[] = [];
  const remaining = new Set(stopIndices);
  let current = 0; // origin

  while (remaining.size > 0) {
    let bestIdx = -1;
    let bestDist = Infinity;
    for (const idx of remaining) {
      const d = dist(current, idx);
      if (d < bestDist) { bestDist = d; bestIdx = idx; }
    }
    ordered.push(bestIdx);
    current = bestIdx;
    remaining.delete(bestIdx);
  }

  // 2-opt improvement
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 0; i < ordered.length - 1; i++) {
      for (let j = i + 1; j < ordered.length; j++) {
        const prevI = i === 0 ? 0 : ordered[i - 1];
        const nextJ = j === ordered.length - 1 ? n - 1 : ordered[j + 1];
        const oldDist = dist(prevI, ordered[i]) + dist(ordered[j], nextJ);
        const newDist = dist(prevI, ordered[j]) + dist(ordered[i], nextJ);
        if (newDist < oldDist - 0.001) {
          // Reverse segment i..j
          const segment = ordered.slice(i, j + 1).reverse();
          ordered.splice(i, j - i + 1, ...segment);
          improved = true;
        }
      }
    }
  }

  return ordered.map(idx => validStops[idx - 1].id);
}

export default function Index() {
  const simulatorRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"sc" | "national">("sc");
  const [cities, setCities] = useState<City[]>([]);
  const { toast } = useToast();

  const [navVisible, setNavVisible] = useState(true);
  const lastScrollY = useRef(0);

  const isCalculatingRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout>>();

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
  const [originCityName, setOriginCityName] = useState("");
  const [destCityName, setDestCityName] = useState("");
  const [originAddress, setOriginAddress] = useState<AddressSelection | null>(null);
  const [destAddress, setDestAddress] = useState<AddressSelection | null>(null);
  const [originRef, setOriginRef] = useState("");
  const [destRef, setDestRef] = useState("");
  const [destName, setDestName] = useState("");
  const [weight, setWeight] = useState("");
  const [category, setCategory] = useState("");
  const [motoReturn, setMotoReturn] = useState(false);
  const [extraStops, setExtraStops] = useState<ExtraStop[]>([]);
  const [optimizeRoute, setOptimizeRoute] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // Car state
  const [carOriginCityId, setCarOriginCityId] = useState("");
  const [carOriginCityName, setCarOriginCityName] = useState("");
  const [carOriginState, setCarOriginState] = useState("");
  const [carDestCityId, setCarDestCityId] = useState("");
  const [carDestCityName, setCarDestCityName] = useState("");
  const [carOriginAddress, setCarOriginAddress] = useState<AddressSelection | null>(null);
  const [carDestAddress, setCarDestAddress] = useState<AddressSelection | null>(null);
  const [carOriginRef, setCarOriginRef] = useState("");
  const [carDestRef, setCarDestRef] = useState("");
  const [carDestName, setCarDestName] = useState("");
  const [originFarWarning, setOriginFarWarning] = useState(false);

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
  const resultRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [volumeAlert, setVolumeAlert] = useState(false);

  const scrollToSimulator = () => {
    if (simulatorRef.current) {
      const headerOffset = 80;
      const elementPosition = simulatorRef.current.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: elementPosition - headerOffset, behavior: "smooth" });
    }
  };
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });
  const scrollToSection = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  useEffect(() => {
    supabase.from("cities").select("*").eq("is_active", true).eq("vehicle_type", "moto").order("name")
      .then(({ data }) => { if (data) setCities(data); });
  }, []);

  // Extra stop management
  const handleAddStop = useCallback(() => {
    setExtraStops(prev => [...prev, createExtraStop(prev.length)]);
  }, []);

  const handleRemoveStop = useCallback((id: string) => {
    setExtraStops(prev => prev.filter(s => s.id !== id));
  }, []);

  const handleUpdateStop = useCallback((id: string, updates: Partial<ExtraStop>) => {
    setExtraStops(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, []);

  const handleMoveStopUp = useCallback((id: string) => {
    setExtraStops(prev => {
      const idx = prev.findIndex(s => s.id === id);
      if (idx <= 0) return prev;
      const arr = [...prev];
      [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
      return arr;
    });
  }, []);

  const handleMoveStopDown = useCallback((id: string) => {
    setExtraStops(prev => {
      const idx = prev.findIndex(s => s.id === id);
      if (idx < 0 || idx >= prev.length - 1) return prev;
      const arr = [...prev];
      [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
      return arr;
    });
  }, []);

  const handleDragEnd = useCallback(() => {
    if (dragId && dragOverId && dragId !== dragOverId) {
      setExtraStops(prev => {
        const fromIdx = prev.findIndex(s => s.id === dragId);
        const toIdx = prev.findIndex(s => s.id === dragOverId);
        if (fromIdx < 0 || toIdx < 0) return prev;
        const arr = [...prev];
        const [moved] = arr.splice(fromIdx, 1);
        arr.splice(toIdx, 0, moved);
        return arr;
      });
    }
    setDragId(null);
    setDragOverId(null);
  }, [dragId, dragOverId]);

  const getOriginCityName = () => {
    if (mode === "sc") return originCityName;
    return carOriginCityName;
  };
  const getDestCityName = () => {
    if (mode === "sc") return destCityName;
    return carDestCityName;
  };

  const handleOriginSelect = useCallback((sel: AddressSelection) => { setOriginAddress(sel); setOriginCoords([sel.lat, sel.lng]); setOriginCityName(sel.cityName || ""); }, []);
  const handleDestSelect = useCallback((sel: AddressSelection) => { setDestAddress(sel); setDestCoords([sel.lat, sel.lng]); setDestCityName(sel.cityName || ""); }, []);
  const handleCarOriginSelect = useCallback((sel: AddressSelection) => {
    setCarOriginAddress(sel);
    setOriginCoords([sel.lat, sel.lng]);
    const dist = haversineDistance(sel.lat, sel.lng, ITAPEMA_LAT, ITAPEMA_LNG);
    setOriginFarWarning(dist > 50);
  }, []);
  const handleCarDestSelect = useCallback((sel: AddressSelection) => { setCarDestAddress(sel); setDestCoords([sel.lat, sel.lng]); }, []);
  const handleRouteCalculated = useCallback((distKm: number, durMin: number) => { setRouteDistance(distKm); setRouteDuration(durMin); }, []);

  const handleCarOriginCitySelect = useCallback((sel: CitySelection) => {
    setCarOriginCityId(sel.cityId || "");
    setCarOriginCityName(sel.cityName);
    setCarOriginState(sel.state || "");
    setCarOriginAddress(null);
    setOriginCoords(null);
    setOriginFarWarning(false);
  }, []);

  const handleCarDestCitySelect = useCallback((sel: CitySelection) => {
    setCarDestCityId(sel.cityId || "");
    setCarDestCityName(sel.cityName);
    setCarDestAddress(null);
    setDestCoords(null);
  }, []);

  // Reset on mode change
  useEffect(() => { setResult(null); setError(""); setOriginCoords(null); setDestCoords(null); setRouteDistance(null); setRouteDuration(null); }, [mode]);

  // Compute final stop order (optimized or manual)
  const orderedStops = useMemo((): ExtraStop[] => {
    const withAddress = extraStops.filter(s => s.address);
    if (withAddress.length <= 1 || !optimizeRoute || !originCoords || !destCoords) {
      return extraStops; // keep manual order
    }
    // Get optimized ID order
    const optimizedIds = optimizeStopOrder(originCoords, extraStops, destCoords);
    // Map back to full stops array preserving stops without address in place
    const withoutAddress = extraStops.filter(s => !s.address);
    const optimizedStops = optimizedIds.map(id => extraStops.find(s => s.id === id)!);
    return [...optimizedStops, ...withoutAddress];
  }, [extraStops, optimizeRoute, originCoords, destCoords]);

  // Compute extra stop coords for map
  const extraStopCoords = useMemo((): [number, number][] => {
    return orderedStops
      .filter(s => s.address)
      .map(s => [s.address!.lat, s.address!.lng] as [number, number]);
  }, [orderedStops]);

  // Compute unified point labels (A, B, C...) for map and cards
  const pointLabels = useMemo((): string[] => {
    if (mode !== "sc") return [];
    let idx = 0;
    const labels: string[] = [];
    if (originCoords) labels.push(String.fromCharCode(65 + idx++));
    const stopsToShow = optimizeRoute ? orderedStops : extraStops;
    stopsToShow.filter(s => s.address).forEach(() => {
      labels.push(String.fromCharCode(65 + idx++));
    });
    if (destCoords) labels.push(String.fromCharCode(65 + idx++));
    return labels;
  }, [mode, originCoords, destCoords, extraStops, orderedStops, optimizeRoute]);

  // Compute stop card labels (including stops without address)
  const stopCardLabels = useMemo((): string[] => {
    if (mode !== "sc") return [];
    const startIdx = originAddress ? 1 : 0;
    const stopsToShow = optimizeRoute ? orderedStops : extraStops;
    return stopsToShow.map((_, i) => String.fromCharCode(65 + startIdx + i));
  }, [mode, originAddress, extraStops, orderedStops, optimizeRoute]);

  const destLabel = useMemo((): string => {
    if (mode !== "sc") return "";
    const startIdx = originAddress ? 1 : 0;
    const stopsToShow = optimizeRoute ? orderedStops : extraStops;
    return String.fromCharCode(65 + startIdx + stopsToShow.length);
  }, [mode, originAddress, extraStops, orderedStops, optimizeRoute]);

  // Determine which city each stop belongs to (for pricing)
  const getStopCityIds = useCallback((): { lat: number; lng: number }[] => {
    return orderedStops
      .filter(s => s.address)
      .map(s => ({ lat: s.address!.lat, lng: s.address!.lng }));
  }, [orderedStops]);

  // Stable ref for handleSimulate to avoid loop
  const handleSimulateRef = useRef<(distance: number) => Promise<void>>();

  const handleSimulate = useCallback(async (distance: number) => {
    if (isCalculatingRef.current) return;
    isCalculatingRef.current = true;

    // Safety timeout — never stay stuck more than 15s
    const safetyTimer = setTimeout(() => {
      isCalculatingRef.current = false;
      setLoading(false);
    }, 15000);

    if (mode === "national") {
      if (!carItemDescription.trim()) { setError("Informe o que será transportado."); isCalculatingRef.current = false; clearTimeout(safetyTimer); return; }
      if (!carItemDetails.trim()) { setError("Descreva os itens a serem transportados."); isCalculatingRef.current = false; clearTimeout(safetyTimer); return; }
    }

    setError(""); setLoading(true);

    try {
      const isCar = mode === "national";
      const carAdditionals = isCar ? {
        helper: carNeedHelper,
        stairs: carNeedStairs,
        no_elevator: carIsApartment && !carHasElevator,
        bubble_wrap: carNeedBubbleWrap,
        fragile: carHasFragile,
      } : {};

      const extraStops = !isCar ? getStopCityIds() : [];

      const body = isCar
        ? {
            mode: carOriginCityId && carDestCityId ? "sc" : "national",
            origin_city_id: carOriginCityId || undefined,
            destination_city_id: carDestCityId || undefined,
            origin_state: carOriginState || undefined,
            vehicle_type: "car",
            distance_km: distance,
            car_additionals: carAdditionals,
            multi_trip: carMultiTrip,
          }
        : {
            mode: "sc",
            origin_city_name: originCityName,
            destination_city_name: destCityName,
            origin_lat: originAddress?.lat,
            origin_lng: originAddress?.lng,
            vehicle_type: "moto",
            distance_km: distance,
            moto_return: motoReturn,
            return_distance_km: distance,
            extra_stops: extraStops,
          };

      const { data, error: fnError } = await supabase.functions.invoke("calculate-freight", { body });
      if (fnError) throw fnError;
      if (data?.error) { setError(data.error); return; }

      setResult({ ...data, estimated_time_min: routeDuration ? Math.round(routeDuration) : undefined });
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);

      await logSimulation({
        origin_city: getOriginCityName() || undefined,
        destination_city: getDestCityName() || undefined,
        vehicle_type: isCar ? "car" : "moto",
        mode: carOriginCityId && carDestCityId ? "sc" : "national",
        distance_km: data.distance_km,
        final_value: data.final_value,
      });
      trackEvent("simulation_completed", { mode, distance });
    } catch (err: any) {
      setError(err.message || "Erro ao calcular frete.");
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      clearTimeout(safetyTimer);
      setLoading(false);
      isCalculatingRef.current = false;
    }
  }, [mode, carItemDescription, carItemDetails, carNeedHelper, carNeedStairs, carIsApartment, carHasElevator, carNeedBubbleWrap, carHasFragile, carMultiTrip, carOriginCityId, carDestCityId, originCityName, destCityName, motoReturn, routeDuration, toast, getStopCityIds]);

  // Keep ref always pointing to latest handleSimulate
  useEffect(() => {
    handleSimulateRef.current = handleSimulate;
  }, [handleSimulate]);

  // Auto-calculate when route changes — uses ref to avoid loop from toggle changes
  useEffect(() => {
    if (!routeDistance || routeDistance <= 0) return;
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      handleSimulateRef.current?.(routeDistance);
    }, 300);
    return () => { if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current); };
  }, [routeDistance]);

  // Recalculate when motoReturn or extraStops change (if route already exists)
  useEffect(() => {
    if (!routeDistance || routeDistance <= 0 || mode !== "sc") return;
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      handleSimulateRef.current?.(routeDistance);
    }, 300);
    return () => { if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current); };
  }, [motoReturn, extraStops, optimizeRoute]);

  // Volume alert for car
  useEffect(() => {
    const text = (carItemDescription + " " + carItemDetails).toLowerCase();
    const hits = VOLUME_KEYWORDS.filter(kw => text.includes(kw));
    setVolumeAlert(hits.length >= 2);
  }, [carItemDescription, carItemDetails]);

  // Clear car validation error immediately when fields become valid
  useEffect(() => {
    if (mode !== "national") return;
    if (error && carItemDescription.trim() && carItemDetails.trim()) {
      setError(null);
    }
  }, [carItemDescription, carItemDetails, mode, error]);

  // Auto-recalculate when car-specific fields change (with debounce)
  useEffect(() => {
    if (mode !== "national" || !routeDistance || routeDistance <= 0) return;
    if (!carItemDescription.trim() || !carItemDetails.trim()) return;
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      handleSimulateRef.current?.(routeDistance);
    }, 400);
    return () => { if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current); };
  }, [carItemDescription, carItemDetails, carNeedHelper, carNeedStairs, carIsApartment, carHasElevator, carNeedBubbleWrap, carHasFragile, carMultiTrip]);

  const buildWhatsAppUrl = () => {
    if (!result) return "#";
    const tipo = mode === "sc" ? "Moto" : "Carro";
    const oAddr = mode === "sc" ? originAddress : carOriginAddress;
    const dAddr = mode === "sc" ? destAddress : carDestAddress;
    const oCityName = getOriginCityName();
    const dCityName = getDestCityName();
    const oRef = mode === "sc" ? originRef : carOriginRef;
    const dRef = mode === "sc" ? destRef : carDestRef;
    const dName = mode === "sc" ? destName : carDestName;

    const originText = `${oAddr?.street || ""}${oAddr?.houseNumber ? `, ${oAddr.houseNumber}` : ""} - ${oAddr?.neighborhood || ""} - ${oCityName}`;
    const destText = `${dAddr?.street || ""}${dAddr?.houseNumber ? `, ${dAddr.houseNumber}` : ""} - ${dAddr?.neighborhood || ""} - ${dCityName}`;

    const originMapLink = oAddr ? buildGoogleMapsLink(oAddr.lat, oAddr.lng) : "";
    const destMapLink = dAddr ? buildGoogleMapsLink(dAddr.lat, dAddr.lng) : "";

    const isMotoboy = mode === "sc";

    let msg = isMotoboy
      ? `Ol\u00e1! \uD83D\uDC4B

Acabei de fazer uma simula\u00e7\u00e3o e gostaria de solicitar uma entrega via motoboy.

\uD83D\uDCCD Coleta: ${originText}${oRef ? `\n\uD83D\uDCCC Ref: ${oRef}` : ""}${originMapLink ? `\n\uD83D\uDDFA\uFE0F Mapa: ${originMapLink}` : ""}

\uD83D\uDCCD Entrega: ${destText}${dName ? `\n\uD83D\uDC64 Destinat\u00e1rio: ${dName}` : ""}${dRef ? `\n\uD83D\uDCCC Ref: ${dRef}` : ""}${destMapLink ? `\n\uD83D\uDDFA\uFE0F Mapa: ${destMapLink}` : ""}`
      : `\uD83D\uDE9B FRETE GAR\u00C7A \u2014 SIMULA\u00C7\u00C3O

Ol\u00e1! \uD83D\uDC4B

Acabei de fazer uma simula\u00e7\u00e3o e gostaria de solicitar um frete.

\uD83D\uDCCD Coleta: ${originText}${oRef ? `\n\uD83D\uDCCC Ref: ${oRef}` : ""}${originMapLink ? `\n\uD83D\uDDFA\uFE0F Mapa: ${originMapLink}` : ""}

\uD83D\uDCCD Entrega: ${destText}${dName ? `\n\uD83D\uDC64 Destinat\u00e1rio: ${dName}` : ""}${dRef ? `\n\uD83D\uDCCC Ref: ${dRef}` : ""}${destMapLink ? `\n\uD83D\uDDFA\uFE0F Mapa: ${destMapLink}` : ""}`;

    // Extra stops
    if (mode === "sc" && extraStops.length > 0) {
      const stopsForMsg = optimizeRoute ? orderedStops : extraStops;
      stopsForMsg.forEach((stop, i) => {
        const stopAddr = stop.address;
        const stopRef = stop.reference || "";
        if (stopAddr) {
          const stopText = `${stopAddr.street}${stopAddr.houseNumber ? `, ${stopAddr.houseNumber}` : ""} - ${stopAddr.neighborhood || ""} - ${stop.cityName || oCityName}`;
          const stopMapLink = buildGoogleMapsLink(stopAddr.lat, stopAddr.lng);
          msg += `\n\n\uD83D\uDCCD Parada ${i + 1}: ${stopText}${stopRef ? `\n\uD83D\uDCCC Ref: ${stopRef}` : ""}\n\uD83D\uDDFA\uFE0F Mapa: ${stopMapLink}`;
        } else {
          msg += `\n\n\uD83D\uDCCD Parada ${i + 1}: (endere\u00e7o n\u00e3o informado)`;
        }
      });
    }

    msg += `\n\n\uD83D\uDE9A Tipo: ${tipo}\n\uD83D\uDCCF Dist\u00e2ncia: ${result.distance_km.toFixed(1)} km\n\uD83D\uDCB0 Valor estimado: R$ ${result.final_value.toFixed(2)}`;

    msg += `\n\n\u26A0\uFE0F Esta \u00e9 uma simula\u00e7\u00e3o autom\u00e1tica.\nO valor pode sofrer altera\u00e7\u00e3o ap\u00f3s confer\u00eancia de detalhes.`;

    if (!isMotoboy) {
      msg += `\n\n\uD83D\uDCE6 Itens fr\u00e1geis devem estar bem embalados.\nRealizamos apenas o transporte.`;
    }

    if (carMultiTrip && mode === "national") {
      msg += "\n\nSe precisar de mais de uma viagem, aplicamos desconto conforme informado.";
    }
    if (mode === "national" && carHasFragile) {
      msg += "\n\n\uD83D\uDD0E Esta \u00e9 uma simula\u00e7\u00e3o autom\u00e1tica. O valor pode sofrer ajustes ap\u00f3s confer\u00eancia dos itens.";
    }

    msg += "\n\nEstamos \u00e0 disposi\u00e7\u00e3o! \uD83D\uDE0A";

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
                    <div className="space-y-1">
                      <Label className="text-sm">Cidade</Label>
                      <Select value={originCityName} onValueChange={(v) => {
                        setOriginCityName(v);
                        setOriginAddress(null);
                        setOriginCoords(null);
                        setResult(null);
                      }}>
                        <SelectTrigger><SelectValue placeholder="Selecione a cidade" /></SelectTrigger>
                        <SelectContent>
                          {cities.map(c => <SelectItem key={c.id} value={c.name}>{c.name} - {c.state}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm">Rua + Número</Label>
                      <AddressAutocomplete placeholder="Ex: Rua Brasil, 123" cityName={originCityName} disabled={!originCityName} onSelect={handleOriginSelect} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm text-muted-foreground">Ponto de referência</Label>
                      <Input value={originRef} onChange={e => setOriginRef(e.target.value)} placeholder="Ex: Próximo ao mercado, casa azul..." className="text-sm" />
                    </div>
                  </div>

                  <div className="border-t border-border" />

                  {/* Destino */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold"><MapPin className="h-4 w-4 text-destructive" /> 📍 Destino</div>
                    <div className="space-y-1">
                      <Label className="text-sm">Cidade</Label>
                      <Select value={destCityName} onValueChange={(v) => {
                        setDestCityName(v);
                        setDestAddress(null);
                        setDestCoords(null);
                        setResult(null);
                      }}>
                        <SelectTrigger><SelectValue placeholder="Selecione a cidade" /></SelectTrigger>
                        <SelectContent>
                          {cities.map(c => <SelectItem key={c.id} value={c.name}>{c.name} - {c.state}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm">Rua + Número</Label>
                      <AddressAutocomplete placeholder="Ex: Rua Brasil, 123" cityName={destCityName} disabled={!destCityName} onSelect={handleDestSelect} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm">Nome do destinatário</Label>
                      <Input value={destName} onChange={e => setDestName(e.target.value)} placeholder="Nome de quem vai receber" className="text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm text-muted-foreground">Ponto de referência</Label>
                      <Input value={destRef} onChange={e => setDestRef(e.target.value)} placeholder="Ex: Em frente à padaria..." className="text-sm" />
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
                        <p className="text-xs text-muted-foreground mt-1 pl-1">
                          💡 Equivale a: {selectedWeight.example}
                        </p>
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
                        <span className="text-sm font-medium">📍 Paradas extras ({extraStops.length})</span>
                        <Button variant="outline" size="sm" className="h-8 gap-1" onClick={handleAddStop}>
                          <Plus className="h-3.5 w-3.5" /> Adicionar
                        </Button>
                      </div>
                      {extraStops.length > 0 && <p className="text-xs text-muted-foreground pl-4">✅ {extraStops.length} parada(s) extra(s) — R$ 7,00 por parada adicionada.</p>}
                    </div>

                    {/* Optimize route toggle */}
                    {extraStops.length > 1 && (
                      <>
                        <ToggleQuestion label="Otimizar rota?" emoji="🗺️" checked={optimizeRoute} onChange={setOptimizeRoute} />
                        <p className="text-xs text-muted-foreground pl-4">
                          {optimizeRoute ? "✅ Ordem automática otimizada (nearest-neighbor + 2-opt)" : "📋 Ordem manual"}
                        </p>
                      </>
                    )}

                    {/* Unified route overview */}
                    {(originAddress || extraStops.length > 0 || destAddress) && (
                      <div className="space-y-2 mt-2">
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                          <Route className="h-3.5 w-3.5" />
                          Roteiro {extraStops.length > 1 ? (optimizeRoute ? "• Ordem otimizada" : "• Ordem manual") : ""}
                        </div>

                        {/* Origin indicator */}
                        {originAddress && (
                          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200/50 dark:border-green-800/50">
                            <span className="flex items-center justify-center h-6 w-6 rounded-full text-xs font-bold text-white" style={{ background: "hsl(142, 70%, 45%)" }}>A</span>
                            <div className="flex-1 min-w-0">
                              <span className="text-xs font-semibold text-green-700 dark:text-green-300">Coleta</span>
                              <p className="text-xs text-muted-foreground truncate">{originAddress.street}{originAddress.houseNumber ? `, ${originAddress.houseNumber}` : ""} — {originCityName}</p>
                            </div>
                          </div>
                        )}

                        {/* Stop cards with letters */}
                        {extraStops.length > 0 && (
                          <div className="space-y-2">
                            {(optimizeRoute ? orderedStops : extraStops).map((stop, i) => (
                              <ExtraStopCard
                                key={stop.id}
                                stop={stop}
                                index={i}
                                total={extraStops.length}
                                cities={cities}
                                onUpdate={handleUpdateStop}
                                onRemove={handleRemoveStop}
                                onMoveUp={handleMoveStopUp}
                                onMoveDown={handleMoveStopDown}
                                onDragStart={setDragId}
                                onDragOver={setDragOverId}
                                onDragEnd={handleDragEnd}
                                isDragging={dragId === stop.id}
                                isDragOver={dragOverId === stop.id}
                                label={stopCardLabels[i]}
                                pointType="stop"
                              />
                            ))}
                          </div>
                        )}

                        {/* Destination indicator */}
                        {destAddress && (
                          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200/50 dark:border-red-800/50">
                            <span className="flex items-center justify-center h-6 w-6 rounded-full text-xs font-bold text-white" style={{ background: "hsl(0, 70%, 50%)" }}>{destLabel}</span>
                            <div className="flex-1 min-w-0">
                              <span className="text-xs font-semibold text-red-700 dark:text-red-300">Entrega</span>
                              <p className="text-xs text-muted-foreground truncate">{destAddress.street}{destAddress.houseNumber ? `, ${destAddress.houseNumber}` : ""} — {destCityName}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
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
                      <CityAutocomplete
                        placeholder="Digite a cidade de origem..."
                        onSelect={handleCarOriginCitySelect}
                      />
                    </div>
                    {carOriginCityName && (
                      <div className="space-y-1">
                        <Label className="text-sm">Rua + Número</Label>
                        <AddressAutocomplete
                          cityName={carOriginCityName}
                          disabled={!carOriginCityName}
                          placeholder="Ex: Rua 230, 570"
                          onSelect={handleCarOriginSelect}
                        />
                      </div>
                    )}
                    {originFarWarning && (
                      <Alert className="border-yellow-400/50 bg-yellow-50 dark:bg-yellow-950/30">
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        <AlertDescription className="text-sm text-yellow-800 dark:text-yellow-200">
                          📍 Somos de Itapema/SC. A distância da origem pode impactar o valor do frete.
                        </AlertDescription>
                      </Alert>
                    )}
                    <div className="space-y-1">
                      <Label className="text-sm text-muted-foreground">Ponto de referência</Label>
                      <Input value={carOriginRef} onChange={e => setCarOriginRef(e.target.value)} placeholder="Ex: Próximo ao mercado, casa azul..." className="text-sm" />
                    </div>
                  </div>

                  <div className="border-t border-border" />

                  {/* Destino */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold"><MapPin className="h-4 w-4 text-destructive" /> 📍 Destino</div>
                    <div className="space-y-2">
                      <Label className="text-sm">Cidade</Label>
                      <CityAutocomplete
                        placeholder="Digite a cidade de destino..."
                        onSelect={handleCarDestCitySelect}
                      />
                    </div>
                    {carDestCityName && (
                      <div className="space-y-1">
                        <Label className="text-sm">Rua + Número</Label>
                        <AddressAutocomplete
                          cityName={carDestCityName}
                          disabled={!carDestCityName}
                          placeholder="Ex: Rua 230, 570"
                          onSelect={handleCarDestSelect}
                        />
                      </div>
                    )}
                    <div className="space-y-1">
                      <Label className="text-sm">Nome do destinatário</Label>
                      <Input value={carDestName} onChange={e => setCarDestName(e.target.value)} placeholder="Nome de quem vai receber" className="text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm text-muted-foreground">Ponto de referência</Label>
                      <Input value={carDestRef} onChange={e => setCarDestRef(e.target.value)} placeholder="Ex: Em frente à padaria..." className="text-sm" />
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
                <Suspense fallback={<div className="w-full h-[300px] rounded-xl bg-muted animate-pulse" />}>
                  <FreightMap
                    originCoords={originCoords}
                    destCoords={destCoords}
                    extraStopCoords={extraStopCoords}
                    onRouteCalculated={handleRouteCalculated}
                  />
                </Suspense>
              )}

              {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

              {loading && (
                <div className="relative overflow-hidden rounded-xl border-2 border-primary/30 bg-primary/5 p-6">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent animate-[shimmer_1.5s_ease-in-out_infinite]" 
                    style={{ backgroundSize: "200% 100%", animation: "shimmer 1.5s ease-in-out infinite" }} />
                  <div className="flex flex-col items-center gap-3 relative z-10">
                    <div className="relative">
                      <div className="h-10 w-10 animate-spin rounded-full border-3 border-primary/30 border-t-primary" />
                      <span className="absolute inset-0 flex items-center justify-center text-lg">🛵</span>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-primary animate-pulse">Calculando sua rota...</p>
                      <p className="text-xs text-muted-foreground mt-1">Buscando o melhor valor para você</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Result */}
              {result && (
                <div ref={resultRef} className="rounded-xl border-2 border-primary/20 bg-accent/50 p-4 sm:p-6 space-y-4">
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
