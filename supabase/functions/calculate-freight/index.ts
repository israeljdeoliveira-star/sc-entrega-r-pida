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

// --- Validation ---
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidUUID(v: unknown): v is string { return typeof v === "string" && UUID_RE.test(v); }
function safeNumber(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// --- Density multiplier map ---
const DENSITY_MULT: Record<string, number> = { baixa: 0.9, media: 1.0, alta: 1.15 };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();

    // Validate mode
    const mode = body.mode || "sc";
    if (mode !== "sc" && mode !== "national") {
      return jsonResponse({ error: "Modo inválido. Use 'sc' ou 'national'." }, 400);
    }

    // Validate distance
    const clientDistance = body.distance_km != null ? safeNumber(body.distance_km) : null;
    if (body.distance_km != null && (clientDistance === null || clientDistance <= 0 || clientDistance > 10000)) {
      return jsonResponse({ error: "Distância inválida. Deve ser um número positivo até 10.000 km." }, 400);
    }

    // Validate vehicle_type
    const vehicle_type = body.vehicle_type || "moto";
    if (vehicle_type !== "moto" && vehicle_type !== "car") {
      return jsonResponse({ error: "Tipo de veículo inválido. Use 'moto' ou 'car'." }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch settings
    const { data: settings } = await supabase.from("freight_settings").select("*").limit(1).single();
    if (!settings) return jsonResponse({ error: "Configurações de frete não encontradas." }, 500);

    const isMoto = vehicle_type === "moto";

    if (mode === "national") {
      // --- NATIONAL MODE ---
      if (!clientDistance) return jsonResponse({ error: "Distância não informada." }, 400);

      // Radius check
      if (settings.enable_radius_limit && clientDistance > Number(settings.max_radius_km)) {
        return jsonResponse({ error: `Distância excede o raio máximo de ${settings.max_radius_km} km.` }, 400);
      }

      const pricePerKm = Number(settings.national_price_per_km);
      const valorBase = Number(settings.valor_base_nacional || 0);

      // Multipliers (car for national)
      const multPeak = Number(settings.mult_car_peak || 1);
      const multNight = Number(settings.mult_car_night || 1);
      const multRain = Number(settings.mult_car_rain || 1);
      const multSevere = Number(settings.mult_car_severe || 1);
      const multRiskMed = Number(settings.mult_car_risk_medium || 1);
      const multRiskHigh = Number(settings.mult_car_risk_high || 1);

      // For now, apply multiplier = 1 unless conditions are passed
      // Conditions from body (optional)
      const conditions = body.conditions || {};
      let combinedMult = 1.0;
      if (conditions.peak) combinedMult *= multPeak;
      if (conditions.night) combinedMult *= multNight;
      if (conditions.rain) combinedMult *= multRain;
      if (conditions.severe) combinedMult *= multSevere;
      if (conditions.risk_medium) combinedMult *= multRiskMed;
      if (conditions.risk_high) combinedMult *= multRiskHigh;

      const valorOperacional = valorBase + (clientDistance * pricePerKm) * combinedMult;

      // Smart margin
      let margemTotal = Number(settings.margin_base || 0);
      if (conditions.peak) margemTotal += Number(settings.margin_peak || 0);
      if (conditions.rain) margemTotal += Number(settings.margin_rain || 0);
      if (conditions.risk_high) margemTotal += Number(settings.margin_risk_high || 0);
      if (clientDistance > Number(settings.long_distance_km || 50)) {
        margemTotal += Number(settings.margin_long_distance || 0);
      }
      margemTotal = Math.max(margemTotal, 0);

      const valorFinal = Math.round(valorOperacional * (1 + margemTotal / 100) * 100) / 100;
      const minValue = Number(settings.national_min_value || 0);
      const finalValue = Math.max(valorFinal, minValue);

      // Build config snapshot
      const configSnapshot = {
        mode, vehicle_type, pricePerKm, valorBase, combinedMult, margemTotal,
        valorOperacional, valorFinal: finalValue,
      };

      // Log simulation
      await supabase.from("simulations_log").insert({
        mode, vehicle_type,
        origin_city: body.origin_text || null,
        destination_city: body.destination_text || null,
        distance_km: clientDistance,
        final_value: finalValue,
        operational_value: valorOperacional,
        margin_applied: margemTotal,
        config_snapshot: configSnapshot,
        ip_hash: body.ip_hash || null,
      });

      return jsonResponse({
        final_value: finalValue,
        distance_km: clientDistance,
        estimated_time_min: null,
      });
    }

    // --- SC MODE ---
    const { origin_city_id, destination_city_id, origin_neighborhood_id, destination_neighborhood_id } = body;

    if (!isValidUUID(origin_city_id)) return jsonResponse({ error: "ID da cidade de origem inválido." }, 400);
    if (!isValidUUID(destination_city_id)) return jsonResponse({ error: "ID da cidade de destino inválido." }, 400);

    // Fetch cities
    const { data: originCity } = await supabase.from("cities").select("*").eq("id", origin_city_id).single();
    const { data: destCity } = await supabase.from("cities").select("*").eq("id", destination_city_id).single();

    if (!originCity || !destCity) return jsonResponse({ error: "Cidade não encontrada ou não cadastrada." }, 404);
    if (!originCity.is_active) return jsonResponse({ error: "No momento não atendemos essa cidade." }, 400);
    if (!destCity.is_active) return jsonResponse({ error: "No momento não atendemos essa cidade." }, 400);

    // Validate neighborhoods belong to cities
    if (origin_neighborhood_id && isValidUUID(origin_neighborhood_id)) {
      const { data: n } = await supabase.from("neighborhoods").select("city_id").eq("id", origin_neighborhood_id).single();
      if (n && n.city_id !== origin_city_id) {
        return jsonResponse({ error: "O bairro de origem não pertence à cidade selecionada." }, 400);
      }
    }
    if (destination_neighborhood_id && isValidUUID(destination_neighborhood_id)) {
      const { data: n } = await supabase.from("neighborhoods").select("city_id").eq("id", destination_neighborhood_id).single();
      if (n && n.city_id !== destination_city_id) {
        return jsonResponse({ error: "O bairro de destino não pertence à cidade selecionada." }, 400);
      }
    }

    const distanceKm = clientDistance || 50;

    // Radius check
    if (settings.enable_radius_limit && distanceKm > Number(settings.max_radius_km)) {
      return jsonResponse({ error: `Distância de ${distanceKm.toFixed(1)} km excede o raio máximo de ${settings.max_radius_km} km.` }, 400);
    }

    // Price per KM based on vehicle
    const pricePerKm = isMoto ? Number(settings.price_per_km_moto) : Number(settings.price_per_km_car);

    // City base value (use higher of the two)
    const cityBaseValue = Math.max(Number(originCity.base_value || 0), Number(destCity.base_value || 0));

    // Density multiplier (use higher density city)
    const densityOrder = ["baixa", "media", "alta"];
    const originDensityIdx = densityOrder.indexOf(originCity.density || "media");
    const destDensityIdx = densityOrder.indexOf(destCity.density || "media");
    const effectiveDensity = originDensityIdx >= destDensityIdx ? (originCity.density || "media") : (destCity.density || "media");
    const densityMult = DENSITY_MULT[effectiveDensity] || 1.0;

    // Vehicle-specific multipliers
    const prefix = isMoto ? "mult_moto_" : "mult_car_";
    const conditions = body.conditions || {};
    let combinedMult = densityMult;
    if (conditions.peak) combinedMult *= Number(settings[`${prefix}peak`] || 1);
    if (conditions.night) combinedMult *= Number(settings[`${prefix}night`] || 1);
    if (conditions.rain) combinedMult *= Number(settings[`${prefix}rain`] || 1);
    if (conditions.severe) combinedMult *= Number(settings[`${prefix}severe`] || 1);
    if (conditions.risk_medium) combinedMult *= Number(settings[`${prefix}risk_medium`] || 1);
    if (conditions.risk_high) combinedMult *= Number(settings[`${prefix}risk_high`] || 1);

    // Operational value
    const valorOperacional = cityBaseValue + (distanceKm * pricePerKm) * combinedMult;

    // Smart margin
    let margemTotal = Number(settings.margin_base || 0);
    if (conditions.peak) margemTotal += Number(settings.margin_peak || 0);
    if (conditions.rain) margemTotal += Number(settings.margin_rain || 0);
    if (conditions.risk_high) margemTotal += Number(settings.margin_risk_high || 0);
    if (distanceKm > Number(settings.long_distance_km || 50)) {
      margemTotal += Number(settings.margin_long_distance || 0);
    }
    margemTotal = Math.max(margemTotal, 0);

    const valorFinal = Math.round(valorOperacional * (1 + margemTotal / 100) * 100) / 100;

    // Apply min value
    const cityMinValue = Math.max(Number(originCity.min_value || 0), Number(destCity.min_value || 0));
    const finalValue = Math.max(valorFinal, cityMinValue);

    // Config snapshot
    const configSnapshot = {
      mode, vehicle_type, pricePerKm, cityBaseValue, densityMult, combinedMult,
      margemTotal, valorOperacional, cityMinValue, valorFinal: finalValue,
    };

    // Log
    await supabase.from("simulations_log").insert({
      mode, vehicle_type,
      origin_city: originCity.name,
      destination_city: destCity.name,
      distance_km: distanceKm,
      final_value: finalValue,
      operational_value: valorOperacional,
      margin_applied: margemTotal,
      config_snapshot: configSnapshot,
      ip_hash: body.ip_hash || null,
    });

    // Return ONLY what client needs
    return jsonResponse({
      final_value: finalValue,
      distance_km: distanceKm,
      estimated_time_min: null,
    });

  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
});
