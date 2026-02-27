import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { origin_city_id, destination_city_id, origin_neighborhood_id, destination_neighborhood_id, vehicle_type } =
      await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const orsKey = Deno.env.get("ORS_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch origin and destination cities
    const { data: originCity } = await supabase.from("cities").select("*").eq("id", origin_city_id).single();
    const { data: destCity } = await supabase.from("cities").select("*").eq("id", destination_city_id).single();

    if (!originCity || !destCity) {
      return new Response(JSON.stringify({ error: "Cidade não encontrada ou não cadastrada." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!originCity.is_active || !destCity.is_active) {
      return new Response(JSON.stringify({ error: "Uma das cidades selecionadas não está ativa." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch freight settings
    const { data: settings } = await supabase.from("freight_settings").select("*").limit(1).single();
    if (!settings) {
      return new Response(JSON.stringify({ error: "Configurações de frete não encontradas." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch neighborhoods fees
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

    // Build search queries
    const originQuery = origin_neighborhood_id
      ? `${(await supabase.from("neighborhoods").select("name").eq("id", origin_neighborhood_id).single()).data?.name}, ${originCity.name}, SC, Brazil`
      : `${originCity.name}, SC, Brazil`;

    const destQuery = destination_neighborhood_id
      ? `${(await supabase.from("neighborhoods").select("name").eq("id", destination_neighborhood_id).single()).data?.name}, ${destCity.name}, SC, Brazil`
      : `${destCity.name}, SC, Brazil`;

    let distanceKm: number;

    if (orsKey) {
      // Geocode origin
      const geoOrigin = await fetch(
        `https://api.openrouteservice.org/geocode/search?api_key=${orsKey}&text=${encodeURIComponent(originQuery)}&boundary.country=BR&size=1`
      );
      const geoOriginData = await geoOrigin.json();

      const geoDest = await fetch(
        `https://api.openrouteservice.org/geocode/search?api_key=${orsKey}&text=${encodeURIComponent(destQuery)}&boundary.country=BR&size=1`
      );
      const geoDestData = await geoDest.json();

      if (!geoOriginData.features?.length || !geoDestData.features?.length) {
        return new Response(JSON.stringify({ error: "Não foi possível localizar os endereços. Verifique as cidades/bairros." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const [origLon, origLat] = geoOriginData.features[0].geometry.coordinates;
      const [destLon, destLat] = geoDestData.features[0].geometry.coordinates;

      // Calculate route
      const routeRes = await fetch(
        `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${orsKey}&start=${origLon},${origLat}&end=${destLon},${destLat}`
      );
      const routeData = await routeRes.json();

      if (!routeData.features?.length) {
        return new Response(JSON.stringify({ error: "Não foi possível calcular a rota." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      distanceKm = routeData.features[0].properties.segments[0].distance / 1000;
    } else {
      // Fallback: estimate distance (this is a rough estimate without API key)
      distanceKm = 50; // default fallback
    }

    const pricePerKm = vehicle_type === "moto" ? Number(settings.price_per_km_moto) : Number(settings.price_per_km_car);
    const baseValue = distanceKm * pricePerKm;
    const totalBeforeMin = baseValue + originFee + destFee;

    // Apply min value (use the higher min_value between origin and destination)
    const minValue = Math.max(Number(originCity.min_value), Number(destCity.min_value));
    const finalValue = Math.max(totalBeforeMin, minValue);

    return new Response(
      JSON.stringify({
        distance_km: distanceKm,
        base_value: baseValue,
        origin_fee: originFee,
        destination_fee: destFee,
        min_value: minValue,
        final_value: finalValue,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
