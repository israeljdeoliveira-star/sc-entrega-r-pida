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

async function geocode(orsKey: string, query: string) {
  const res = await fetch(
    `https://api.openrouteservice.org/geocode/search?api_key=${orsKey}&text=${encodeURIComponent(query)}&boundary.country=BR&size=1`
  );
  const data = await res.json();
  if (!data.features?.length) return null;
  return data.features[0].geometry.coordinates as [number, number];
}

async function getRouteDistance(orsKey: string, origin: [number, number], dest: [number, number]) {
  const res = await fetch(
    `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${orsKey}&start=${origin[0]},${origin[1]}&end=${dest[0]},${dest[1]}`
  );
  const data = await res.json();
  if (!data.features?.length) return null;
  return data.features[0].properties.segments[0].distance / 1000;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const mode = body.mode || "sc";

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const orsKey = Deno.env.get("ORS_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch freight settings
    const { data: settings } = await supabase.from("freight_settings").select("*").limit(1).single();
    if (!settings) return jsonResponse({ error: "Configurações de frete não encontradas." });

    // Fetch active dynamic rules and calculate combined multiplier
    const { data: dynamicRules } = await supabase.from("dynamic_rules").select("multiplier").eq("is_active", true);
    const dynamicMultiplier = (dynamicRules || []).reduce((acc: number, r: any) => acc * Number(r.multiplier), 1.0);

    if (mode === "national") {
      // --- NATIONAL MODE (CARRO) ---
      const { origin_text, destination_text } = body;
      if (!origin_text || !destination_text) {
        return jsonResponse({ error: "Informe a cidade de origem e destino." });
      }

      if (!orsKey) return jsonResponse({ error: "Serviço de mapas não configurado." });

      const originCoords = await geocode(orsKey, `${origin_text}, Brazil`);
      const destCoords = await geocode(orsKey, `${destination_text}, Brazil`);

      if (!originCoords || !destCoords) {
        return jsonResponse({ error: "Não foi possível localizar as cidades informadas." });
      }

      const distanceKm = await getRouteDistance(orsKey, originCoords, destCoords);
      if (!distanceKm) return jsonResponse({ error: "Não foi possível calcular a rota." });

      const fixedFee = Number(settings.fixed_fee || 0);
      const pricePerKm = Number(settings.national_price_per_km);
      const valorBaseNacional = Number(settings.valor_base_nacional || 0);
      const pedagios = Number(settings.pedagios_padrao || 0);
      const taxaRetorno = Number(settings.taxa_retorno_carro || 0);
      const multiplicadorCarro = Number(settings.multiplicador_carro || 1);
      const margemMinimaCarro = Number(settings.margem_minima_carro || 0);
      const minValue = Number(settings.national_min_value);
      const comissaoCarro = Number(settings.comissao_carro || 15);

      const baseValue = valorBaseNacional + (distanceKm * pricePerKm);
      const totalMultiplier = multiplicadorCarro * dynamicMultiplier;
      const totalBeforeMin = (baseValue + pedagios + taxaRetorno + fixedFee) * totalMultiplier;
      const finalValue = Math.max(totalBeforeMin, margemMinimaCarro, minValue);

      const platformValue = finalValue * (comissaoCarro / 100);
      const driverValue = finalValue - platformValue;

      return jsonResponse({
        distance_km: distanceKm,
        base_value: baseValue,
        origin_fee: 0,
        destination_fee: 0,
        fixed_fee: fixedFee,
        pedagios: pedagios,
        taxa_retorno: taxaRetorno,
        min_value: minValue,
        final_value: finalValue,
        multiplier_applied: totalMultiplier,
        commission_percentage: comissaoCarro,
        driver_value: driverValue,
        platform_value: platformValue,
      });
    }

    // --- SC MODE (MOTO/CARRO) ---
    const { origin_city_id, destination_city_id, origin_neighborhood_id, destination_neighborhood_id, vehicle_type } = body;

    const { data: originCity } = await supabase.from("cities").select("*").eq("id", origin_city_id).single();
    const { data: destCity } = await supabase.from("cities").select("*").eq("id", destination_city_id).single();

    if (!originCity || !destCity) return jsonResponse({ error: "Cidade não encontrada ou não cadastrada." });
    if (!originCity.is_active || !destCity.is_active) return jsonResponse({ error: "Uma das cidades selecionadas não está ativa." });

    let originFee = 0;
    let destFee = 0;

    if (origin_neighborhood_id) {
      const { data: n } = await supabase.from("neighborhoods").select("additional_fee").eq("id", origin_neighborhood_id).single();
      if (n) originFee = Number(n.additional_fee);
    }

    if (destination_neighborhood_id) {
      const { data: n } = await supabase.from("neighborhoods").select("additional_fee").eq("id", destination_neighborhood_id).single();
      if (n) destFee = Number(n.additional_fee);
    }

    // Build geocoding queries
    const originQuery = origin_neighborhood_id
      ? `${(await supabase.from("neighborhoods").select("name").eq("id", origin_neighborhood_id).single()).data?.name}, ${originCity.name}, SC, Brazil`
      : `${originCity.name}, SC, Brazil`;

    const destQuery = destination_neighborhood_id
      ? `${(await supabase.from("neighborhoods").select("name").eq("id", destination_neighborhood_id).single()).data?.name}, ${destCity.name}, SC, Brazil`
      : `${destCity.name}, SC, Brazil`;

    let distanceKm: number;

    if (orsKey) {
      const originCoords = await geocode(orsKey, originQuery);
      const destCoords = await geocode(orsKey, destQuery);

      if (!originCoords || !destCoords) {
        return jsonResponse({ error: "Não foi possível localizar os endereços. Verifique as cidades/bairros." });
      }

      const dist = await getRouteDistance(orsKey, originCoords, destCoords);
      if (!dist) return jsonResponse({ error: "Não foi possível calcular a rota." });
      distanceKm = dist;
    } else {
      distanceKm = 50;
    }

    const fixedFee = Number(settings.fixed_fee || 0);
    const isMoto = vehicle_type === "moto";
    const pricePerKm = isMoto ? Number(settings.price_per_km_moto) : Number(settings.price_per_km_car);
    const multiplicador = isMoto ? Number(settings.multiplicador_moto || 1) : Number(settings.multiplicador_carro || 1);
    const margemMinima = isMoto ? Number(settings.margem_minima_moto || 0) : Number(settings.margem_minima_carro || 0);
    const comissao = isMoto ? Number(settings.comissao_moto || 15) : Number(settings.comissao_carro || 15);

    const cityMinValue = Math.max(Number(originCity.min_value), Number(destCity.min_value));
    const baseValue = distanceKm * pricePerKm;
    const totalMultiplier = multiplicador * dynamicMultiplier;
    const totalBeforeMin = (Math.max(baseValue, cityMinValue) + originFee + destFee + fixedFee) * totalMultiplier;
    const finalValue = Math.max(totalBeforeMin, margemMinima);

    const platformValue = finalValue * (comissao / 100);
    const driverValue = finalValue - platformValue;

    return jsonResponse({
      distance_km: distanceKm,
      base_value: baseValue,
      origin_fee: originFee,
      destination_fee: destFee,
      fixed_fee: fixedFee,
      min_value: cityMinValue,
      final_value: finalValue,
      multiplier_applied: totalMultiplier,
      commission_percentage: comissao,
      driver_value: driverValue,
      platform_value: platformValue,
    });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
});
