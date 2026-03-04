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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidUUID(v: unknown): v is string { return typeof v === "string" && UUID_RE.test(v); }
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

const DENSITY_MULT: Record<string, number> = { baixa: 0.9, media: 1.0, alta: 1.15 };

function calcConditionMult(settings: Record<string, unknown>, prefix: string, conditions: Record<string, boolean>, densityMult: number) {
  let combinedMult = densityMult;
  if (conditions.peak) combinedMult *= num(settings[`${prefix}peak`], 1);
  if (conditions.night) combinedMult *= num(settings[`${prefix}night`], 1);
  if (conditions.rain) combinedMult *= num(settings[`${prefix}rain`], 1);
  if (conditions.severe) combinedMult *= num(settings[`${prefix}severe`], 1);
  if (conditions.risk_medium) combinedMult *= num(settings[`${prefix}risk_medium`], 1);
  if (conditions.risk_high) combinedMult *= num(settings[`${prefix}risk_high`], 1);
  return combinedMult;
}

function calcMargin(settings: Record<string, unknown>, conditions: Record<string, boolean>, distanceKm: number) {
  let margemTotal = num(settings.margin_base);
  if (conditions.peak) margemTotal += num(settings.margin_peak);
  if (conditions.rain) margemTotal += num(settings.margin_rain);
  if (conditions.risk_high) margemTotal += num(settings.margin_risk_high);
  if (distanceKm > num(settings.long_distance_km, 50)) {
    margemTotal += num(settings.margin_long_distance);
  }
  return Math.max(margemTotal, 0);
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

    // --- SC MODE ---
    if (mode === "sc") {
      const { origin_city_id, destination_city_id } = body;

      if (!isValidUUID(origin_city_id)) return jsonResponse({ error: "Selecione a cidade de origem." }, 400);
      if (!isValidUUID(destination_city_id)) return jsonResponse({ error: "Selecione a cidade de destino." }, 400);

      const [{ data: originCity }, { data: destCity }] = await Promise.all([
        supabase.from("cities").select("*").eq("id", origin_city_id).single(),
        supabase.from("cities").select("*").eq("id", destination_city_id).single(),
      ]);

      if (!originCity || !destCity) return jsonResponse({ error: "Cidade não encontrada ou não cadastrada." }, 404);
      if (!originCity.is_active) return jsonResponse({ error: "No momento não atendemos essa cidade." }, 400);
      if (!destCity.is_active) return jsonResponse({ error: "No momento não atendemos essa cidade." }, 400);

      const distanceKm = clientDistance || 50;

      if (settings.enable_radius_limit && distanceKm > num(settings.max_radius_km)) {
        return jsonResponse({ error: `Distância de ${distanceKm.toFixed(1)} km excede o raio máximo de ${settings.max_radius_km} km.` }, 400);
      }

      const pricePerKm = isMoto ? num(settings.price_per_km_moto) : num(settings.price_per_km_car);
      const cityBaseValue = Math.max(num(originCity.base_value), num(destCity.base_value));
      const carMinValue = !isMoto ? num(settings.car_min_value, 98) : 0;

      // Density
      const densityOrder = ["baixa", "media", "alta"];
      const originDensityIdx = densityOrder.indexOf(originCity.density || "media");
      const destDensityIdx = densityOrder.indexOf(destCity.density || "media");
      const effectiveDensity = originDensityIdx >= destDensityIdx ? (originCity.density || "media") : (destCity.density || "media");
      const densityMult = DENSITY_MULT[effectiveDensity] || 1.0;

      const prefix = isMoto ? "mult_moto_" : "mult_car_";
      const combinedMult = calcConditionMult(settings as Record<string, unknown>, prefix, conditions, densityMult);

      // Moto extras
      let motoExtras = 0;
      if (isMoto) {
        if (body.moto_return) motoExtras += num(settings.moto_return_fee);

        // Extra stops: charge base_value of nearest city
        const extraStops: { city_id?: string; lat?: number; lng?: number }[] = body.extra_stops || [];
        if (extraStops.length > 0) {
          for (const stop of extraStops) {
            if (stop.city_id && isValidUUID(stop.city_id)) {
              // Lookup city
              const { data: stopCity } = await supabase.from("cities").select("base_value").eq("id", stop.city_id).single();
              motoExtras += num(stopCity?.base_value, num(originCity.base_value));
            } else if (stop.lat != null && stop.lng != null) {
              // Determine nearest city via haversine (simplified: origin vs dest)
              // We don't have city coords, so use the city_id that frontend determined
              motoExtras += num(originCity.base_value);
            } else {
              motoExtras += num(originCity.base_value);
            }
          }
        } else {
          // Legacy: flat count
          const extraStopCount = Math.max(0, Math.min(10, num(body.moto_extra_stops)));
          if (extraStopCount > 0) {
            motoExtras += extraStopCount * num(originCity.base_value);
          }
        }
      }

      const baseForCalc = !isMoto ? Math.max(cityBaseValue, carMinValue) : cityBaseValue;

      // Same city = only base value (no KM charge). Inter-city = base + KM displacement.
      const isSameCity = origin_city_id === destination_city_id;
      const valorOperacional = isSameCity
        ? baseForCalc + additionalsTotal + motoExtras
        : baseForCalc + (distanceKm * pricePerKm) * combinedMult + additionalsTotal + motoExtras;
      // Same city: no margin applied (base_value IS the final price). Inter-city: apply margin.
      const margemTotal = isSameCity ? 0 : calcMargin(settings as Record<string, unknown>, conditions, distanceKm);

      let valorFinal = Math.ceil(valorOperacional * (1 + margemTotal / 100));
      const cityMinValue = Math.max(num(originCity.min_value), num(destCity.min_value));
      const effectiveMin = !isMoto ? Math.max(cityMinValue, carMinValue) : cityMinValue;
      valorFinal = Math.max(valorFinal, effectiveMin);

      if (multiTripDiscountPct > 0) {
        valorFinal = Math.ceil(valorFinal * (1 - multiTripDiscountPct / 100));
      }

      const configSnapshot = {
        mode, vehicle_type, pricePerKm, cityBaseValue: baseForCalc, densityMult, combinedMult,
        margemTotal, additionalsTotal, motoExtras, multiTripDiscountPct, valorFinal,
      };

      await supabase.from("simulations_log").insert({
        mode, vehicle_type,
        origin_city: originCity.name,
        destination_city: destCity.name,
        distance_km: distanceKm,
        final_value: valorFinal,
        operational_value: valorOperacional,
        margin_applied: margemTotal,
        config_snapshot: configSnapshot,
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

      // Try to find served_state for better pricing
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

      const combinedMult = calcConditionMult(settings as Record<string, unknown>, "mult_car_", conditions, 1.0);

      const baseValue = Math.max(stateBaseValue, carMinValue);
      const valorOperacional = baseValue + (clientDistance * pricePerKm) * combinedMult + additionalsTotal;
      const margemTotal = calcMargin(settings as Record<string, unknown>, conditions, clientDistance);

      let valorFinal = Math.ceil(valorOperacional * (1 + margemTotal / 100));
      const minValue = Math.max(stateMinValue, carMinValue);
      valorFinal = Math.max(valorFinal, minValue);

      if (multiTripDiscountPct > 0) {
        valorFinal = Math.ceil(valorFinal * (1 - multiTripDiscountPct / 100));
      }

      const configSnapshot = {
        mode, vehicle_type, pricePerKm, baseValue, combinedMult, margemTotal,
        additionalsTotal, multiTripDiscountPct, valorFinal, originState,
      };

      await supabase.from("simulations_log").insert({
        mode, vehicle_type,
        origin_city: body.origin_text || null,
        destination_city: body.destination_text || null,
        distance_km: clientDistance,
        final_value: valorFinal,
        operational_value: valorOperacional,
        margin_applied: margemTotal,
        config_snapshot: configSnapshot,
        ip_hash: body.ip_hash || null,
      });

      return jsonResponse({ final_value: valorFinal, distance_km: clientDistance, estimated_time_min: null });
    }

    return jsonResponse({ error: "Modo inválido." }, 400);

  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
});
