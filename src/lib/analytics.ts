import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export async function trackEvent(eventType: string, eventData?: Record<string, Json>, page?: string) {
  try {
    await supabase.from("analytics_events").insert([{
      event_type: eventType,
      event_data: eventData || {},
      page: page || window.location.pathname,
    }]);
  } catch (e) {
    // Silent fail - analytics should never break the app
  }
}

export async function logSimulation(data: {
  origin_city?: string;
  destination_city?: string;
  origin_neighborhood?: string;
  destination_neighborhood?: string;
  vehicle_type: string;
  mode: string;
  distance_km?: number;
  final_value?: number;
}) {
  try {
    const { data: result } = await supabase.from("simulations_log").insert([data]).select("id").single();
    return result?.id;
  } catch (e) {
    return null;
  }
}
