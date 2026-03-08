import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function num(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface KmTier {
  km_ate: number;
  valor: number;
}

function buscarValorPorKm(distancia: number, tiers: KmTier[]): number {
  if (tiers.length === 0) return 0;
  // tiers should be sorted by km_ate ascending
  const sorted = [...tiers].sort((a, b) => a.km_ate - b.km_ate);
  for (const tier of sorted) {
    if (distancia <= tier.km_ate) return tier.valor;
  }
  // exceeded all tiers → use last
  return sorted[sorted.length - 1].valor;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const mode = body.mode || "sc";
    const vehicle_type = body.vehicle_type || "moto";

    if (vehicle_type !== "moto" && vehicle_type !== "car") {
      return jsonResponse({ error: "Tipo de veículo inválido." }, 400);
    }

    const clientDistance = body.distance_km != null ? num(body.distance_km) : null;
    if (body.distance_km != null && (!clientDistance || clientDistance <= 0 || clientDistance > 10000)) {
      return jsonResponse({ error: "Distância inválida." }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: settings } = await supabase.from("freight_settings").select("*").limit(1).single();
    if (!settings) return jsonResponse({ error: "Configurações não encontradas." }, 500);

    const isMoto = vehicle_type === "moto";
    const conditions = body.conditions || {};

    // --- Car additionals ---
    let additionalsTotal = 0;
    if (!isMoto) {
      const carAdditionals = body.car_additionals || {};
      if (carAdditionals.helper) additionalsTotal += num(settings.car_fee_helper);
      if (carAdditionals.stairs) additionalsTotal += num(settings.car_fee_stairs);
      if (carAdditionals.no_elevator) additionalsTotal += num(settings.car_fee_no_elevator);
      if (carAdditionals.bubble_wrap) additionalsTotal += num(settings.car_fee_bubble_wrap);
      if (carAdditionals.fragile) additionalsTotal += num(settings.car_fee_fragile);
    }

    const multiTrip = !!body.multi_trip;
    const multiTripDiscountPct = multiTrip ? num(settings.multi_trip_discount_pct) : 0;

    // ===========================================
    // MOTO MODE — new logic based on filial + km tiers
    // ===========================================
    if (isMoto && mode === "sc") {
      if (!clientDistance || clientDistance <= 0) {
        return jsonResponse({ error: "Distância não informada." }, 400);
      }

      // Load filial config
      const { data: filial } = await supabase.from("filial_config").select("*").limit(1).single();
      if (!filial) {
        return jsonResponse({ error: "Filial não configurada. Configure a filial no painel administrativo." }, 400);
      }

      // Load KM tiers
      const { data: tiersData } = await supabase.from("km_tiers").select("km_ate, valor").order("km_ate");
      const tiers: KmTier[] = (tiersData || []) as unknown as KmTier[];
      if (tiers.length === 0) {
        return jsonResponse({ error: "Tabela de quilometragem não configurada." }, 400);
      }

      // Radius limit check
      if (settings.enable_radius_limit && clientDistance > num(settings.max_radius_km)) {
        return jsonResponse({ error: `Distância de ${clientDistance.toFixed(1)} km excede o raio máximo de ${settings.max_radius_km} km.` }, 400);
      }

      // Determine if pickup is in filial city
      const cidadeColeta = body.origin_city_name || "";
      const isColetaNaFilial = cidadeColeta.toLowerCase().trim() === (filial.cidade_filial as string).toLowerCase().trim();

      // RULE 1: Calculate delivery value from KM tiers
      const distanciaEntrega = clientDistance;
      const valorEntrega = buscarValorPorKm(distanciaEntrega, tiers);

      // RULE 2: Calculate displacement cost if pickup outside filial
      let distanciaDeslocamento = 0;
      let custoDeslocamento = 0;

      if (!isColetaNaFilial && filial.cobrar_deslocamento_fora_filial) {
        // Use origin coords and filial coords to compute displacement
        const originLat = num(body.origin_lat);
        const originLng = num(body.origin_lng);
        const filialLat = num(filial.latitude_filial);
        const filialLng = num(filial.longitude_filial);

        if (originLat !== 0 && originLng !== 0 && filialLat !== 0 && filialLng !== 0) {
          // Use OSRM for real route distance if possible, fallback to haversine * 1.3
          try {
            const coordsStr = `${filialLng},${filialLat};${originLng},${originLat}`;
            const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=false`;
            const osrmRes = await fetch(osrmUrl);
            const osrmData = await osrmRes.json();
            if (osrmData.routes?.[0]) {
              distanciaDeslocamento = osrmData.routes[0].distance / 1000;
            } else {
              distanciaDeslocamento = haversine(filialLat, filialLng, originLat, originLng) * 1.3;
            }
          } catch {
            distanciaDeslocamento = haversine(num(filial.latitude_filial), num(filial.longitude_filial), originLat, originLng) * 1.3;
          }
          // Displacement = max(minimum, km * rate)
          const minDeslocamento = num(filial.valor_minimo_filial, 15);
          custoDeslocamento = Math.max(minDeslocamento, distanciaDeslocamento * num(filial.valor_km_deslocamento));
        }
      }

      // Total
      let total = valorEntrega + custoDeslocamento;

      // Apply minimum ONLY when pickup is in filial city
      if (isColetaNaFilial) {
        const minFilial = num(filial.valor_minimo_filial, 15);
        if (total < minFilial) total = minFilial;
      }

      // Safety: never return zero
      if (total <= 0) total = num(filial.valor_minimo_filial, 15);

      const valorFinal = Math.ceil(total);

      // Moto extras (return fee, extra stops)
      let motoExtras = 0;
      let returnFeeApplied = 0;
      if (body.moto_return) {
        const returnMode = String(settings.moto_return_mode || "hybrid");
        const baseFixed = num(settings.moto_return_fee);
        const includedKm = num(settings.moto_return_included_km, 8);
        const pricePerKmReturn = num(settings.moto_return_price_per_km, 2.5);
        const minFee = num(settings.moto_return_min_fee, 10);
        const returnDistKm = num(body.return_distance_km || distanciaEntrega);

        if (returnMode === "fixed") {
          returnFeeApplied = baseFixed;
        } else if (returnMode === "per_km") {
          returnFeeApplied = Math.max(minFee, returnDistKm * pricePerKmReturn);
        } else {
          // hybrid
          const excedente = Math.max(0, returnDistKm - includedKm);
          returnFeeApplied = Math.max(minFee, baseFixed + excedente * pricePerKmReturn);
        }
        motoExtras += returnFeeApplied;
      }

      // Extra stops — each adds configured extra stop fee
      const extraStops = body.extra_stops || [];
      if (Array.isArray(extraStops) && extraStops.length > 0) {
        motoExtras += extraStops.length * num(settings.moto_extra_stop_fee, 7);
      }

      const totalFinal = Math.ceil(valorFinal + motoExtras);

      const configSnapshot = {
        mode: "sc", vehicle_type: "moto",
        distanciaEntrega, valorEntrega,
        distanciaDeslocamento: Math.round(distanciaDeslocamento * 10) / 10,
        custoDeslocamento: Math.round(custoDeslocamento * 100) / 100,
        isColetaNaFilial, motoExtras, totalFinal,
        filialCidade: filial.cidade_filial,
        returnFee: body.moto_return ? {
          mode: String(settings.moto_return_mode || "hybrid"),
          included_km: num(settings.moto_return_included_km, 8),
          price_per_km: num(settings.moto_return_price_per_km, 2.5),
          min_fee: num(settings.moto_return_min_fee, 10),
          return_distance_km: num(body.return_distance_km || distanciaEntrega),
          return_fee_applied: returnFeeApplied,
        } : undefined,
      };

      const { data: simRow } = await supabase.from("simulations_log").insert({
        mode: "sc", vehicle_type: "moto",
        origin_city: cidadeColeta || body.origin_city || null,
        destination_city: body.destination_city_name || body.destination_city || null,
        origin_neighborhood: body.origin_neighborhood || null,
        destination_neighborhood: body.destination_neighborhood || null,
        distance_km: distanciaEntrega,
        distancia_deslocamento_km: distanciaDeslocamento > 0 ? Math.round(distanciaDeslocamento * 10) / 10 : null,
        valor_entrega: valorEntrega,
        valor_deslocamento: custoDeslocamento > 0 ? Math.round(custoDeslocamento * 100) / 100 : null,
        final_value: totalFinal,
        operational_value: valorEntrega + custoDeslocamento,
        margin_applied: 0,
        config_snapshot: configSnapshot,
        ip_hash: body.ip_hash || null,
      }).select("id").single();

      return jsonResponse({ final_value: totalFinal, distance_km: distanciaEntrega, estimated_time_min: null, simulation_id: simRow?.id || null });
    }

    // ===========================================
    // CAR MODE — existing logic (SC or national)
    // ===========================================
    if (mode === "sc" && !isMoto) {
      const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const isValidUUID = (v: unknown): v is string => typeof v === "string" && UUID_RE.test(v);

      const { origin_city_id, destination_city_id } = body;
      if (!isValidUUID(origin_city_id)) return jsonResponse({ error: "Selecione a cidade de origem." }, 400);
      if (!isValidUUID(destination_city_id)) return jsonResponse({ error: "Selecione a cidade de destino." }, 400);

      const [{ data: originCity }, { data: destCity }] = await Promise.all([
        supabase.from("cities").select("*").eq("id", origin_city_id).single(),
        supabase.from("cities").select("*").eq("id", destination_city_id).single(),
      ]);

      if (!originCity || !destCity) return jsonResponse({ error: "Cidade não encontrada." }, 404);

      const distanceKm = clientDistance || 50;

      if (settings.enable_radius_limit && distanceKm > num(settings.max_radius_km)) {
        return jsonResponse({ error: `Distância excede o raio máximo de ${settings.max_radius_km} km.` }, 400);
      }

      const pricePerKm = num(settings.price_per_km_car);
      const cityBaseValue = Math.max(num(originCity.base_value), num(destCity.base_value));
      const carMinValue = num(settings.car_min_value, 98);
      const baseForCalc = Math.max(cityBaseValue, carMinValue);

      const DENSITY_MULT: Record<string, number> = { baixa: 0.9, media: 1.0, alta: 1.15 };
      const densityOrder = ["baixa", "media", "alta"];
      const originDensityIdx = densityOrder.indexOf(originCity.density || "media");
      const destDensityIdx = densityOrder.indexOf(destCity.density || "media");
      const effectiveDensity = originDensityIdx >= destDensityIdx ? (originCity.density || "media") : (destCity.density || "media");
      const densityMult = DENSITY_MULT[effectiveDensity] || 1.0;

      const calcConditionMult = (prefix: string) => {
        let m = densityMult;
        if (conditions.peak) m *= num(settings[`${prefix}peak`], 1);
        if (conditions.night) m *= num(settings[`${prefix}night`], 1);
        if (conditions.rain) m *= num(settings[`${prefix}rain`], 1);
        if (conditions.severe) m *= num(settings[`${prefix}severe`], 1);
        if (conditions.risk_medium) m *= num(settings[`${prefix}risk_medium`], 1);
        if (conditions.risk_high) m *= num(settings[`${prefix}risk_high`], 1);
        return m;
      };

      const combinedMult = calcConditionMult("mult_car_");
      const isSameCity = origin_city_id === destination_city_id;
      const useNewPricing = !!settings.use_new_car_pricing;
      const valorOperacional = isSameCity
        ? baseForCalc + additionalsTotal
        : useNewPricing
          ? Math.max(carMinValue, carMinValue + Math.max(0, distanceKm - 1) * pricePerKm * combinedMult) + additionalsTotal
          : baseForCalc + (distanceKm * pricePerKm) * combinedMult + additionalsTotal;

      const calcMargin = () => {
        let m = num(settings.margin_base);
        if (conditions.peak) m += num(settings.margin_peak);
        if (conditions.rain) m += num(settings.margin_rain);
        if (conditions.risk_high) m += num(settings.margin_risk_high);
        if (distanceKm > num(settings.long_distance_km, 50)) m += num(settings.margin_long_distance);
        return Math.max(m, 0);
      };

      const margemTotal = isSameCity ? 0 : calcMargin();
      let valorFinal = Math.ceil(valorOperacional * (1 + margemTotal / 100));
      const cityMinValue = Math.max(num(originCity.min_value), num(destCity.min_value));
      valorFinal = Math.max(valorFinal, Math.max(cityMinValue, carMinValue));

      if (multiTripDiscountPct > 0) {
        valorFinal = Math.ceil(valorFinal * (1 - multiTripDiscountPct / 100));
      }

      await supabase.from("simulations_log").insert({
        mode, vehicle_type,
        origin_city: originCity.name,
        destination_city: destCity.name,
        distance_km: distanceKm,
        final_value: valorFinal,
        operational_value: valorOperacional,
        margin_applied: margemTotal,
        config_snapshot: { mode, vehicle_type, baseForCalc, margemTotal, additionalsTotal, valorFinal },
        ip_hash: body.ip_hash || null,
      });

      return jsonResponse({ final_value: valorFinal, distance_km: distanceKm, estimated_time_min: null });
    }

    // --- NATIONAL MODE ---
    if (mode === "national") {
      if (!clientDistance) return jsonResponse({ error: "Distância não informada." }, 400);

      if (settings.enable_radius_limit && clientDistance > num(settings.max_radius_km)) {
        return jsonResponse({ error: `Distância excede o raio máximo de ${settings.max_radius_km} km.` }, 400);
      }

      const originState = body.origin_state || null;
      let stateBaseValue = num(settings.valor_base_nacional);
      let stateMinValue = num(settings.national_min_value);

      if (originState) {
        const { data: servedState } = await supabase
          .from("served_states")
          .select("*")
          .eq("state_code", originState)
          .eq("is_active", true)
          .single();
        if (servedState) {
          stateBaseValue = Math.max(num(servedState.base_value), stateBaseValue);
          stateMinValue = Math.max(num(servedState.min_value), stateMinValue);
        }
      }

      const pricePerKm = num(settings.national_price_per_km);
      const carMinValue = num(settings.car_min_value, 98);
      const baseValue = Math.max(stateBaseValue, carMinValue);

      const calcConditionMult2 = () => {
        let m = 1.0;
        if (conditions.peak) m *= num(settings.mult_car_peak, 1);
        if (conditions.night) m *= num(settings.mult_car_night, 1);
        if (conditions.rain) m *= num(settings.mult_car_rain, 1);
        if (conditions.severe) m *= num(settings.mult_car_severe, 1);
        if (conditions.risk_medium) m *= num(settings.mult_car_risk_medium, 1);
        if (conditions.risk_high) m *= num(settings.mult_car_risk_high, 1);
        return m;
      };

      const combinedMult = calcConditionMult2();
      // New pricing: min R$98 for first km, then per-km for excess (controlled by use_new_car_pricing flag)
      const useNewPricing = !!settings.use_new_car_pricing;
      const valorOperacional = useNewPricing
        ? Math.max(carMinValue, carMinValue + Math.max(0, clientDistance - 1) * pricePerKm * combinedMult) + additionalsTotal
        : baseValue + (clientDistance * pricePerKm) * combinedMult + additionalsTotal;

      const calcMarginNational = () => {
        let m = num(settings.margin_base);
        if (conditions.peak) m += num(settings.margin_peak);
        if (conditions.rain) m += num(settings.margin_rain);
        if (conditions.risk_high) m += num(settings.margin_risk_high);
        if (clientDistance > num(settings.long_distance_km, 50)) m += num(settings.margin_long_distance);
        return Math.max(m, 0);
      };

      const margemTotal = calcMarginNational();
      let valorFinal = Math.ceil(valorOperacional * (1 + margemTotal / 100));
      valorFinal = Math.max(valorFinal, Math.max(stateMinValue, carMinValue));

      if (multiTripDiscountPct > 0) {
        valorFinal = Math.ceil(valorFinal * (1 - multiTripDiscountPct / 100));
      }

      await supabase.from("simulations_log").insert({
        mode, vehicle_type,
        origin_city: body.origin_text || null,
        destination_city: body.destination_text || null,
        distance_km: clientDistance,
        final_value: valorFinal,
        operational_value: valorOperacional,
        margin_applied: margemTotal,
        config_snapshot: { mode, vehicle_type, baseValue, combinedMult, margemTotal, additionalsTotal, valorFinal },
        ip_hash: body.ip_hash || null,
      });

      return jsonResponse({ final_value: valorFinal, distance_km: clientDistance, estimated_time_min: null });
    }

    return jsonResponse({ error: "Modo inválido." }, 400);

  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
});
