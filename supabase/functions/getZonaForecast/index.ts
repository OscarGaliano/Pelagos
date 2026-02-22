// =============================================================================
// Edge Function: getZonaForecast
// Devuelve solo el pronóstico 7 días (hourly) para día y franja horaria.
// Misma lógica que el bloque forecast de getZonaConditions; uso en frontend
// para garantizar que día/franja funcionen aunque getZonaConditions no devuelva forecast.
// =============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const FORECAST_TTL_MINUTES = 60;

interface Zona {
  id: string;
  nombre: string;
  lat: number;
  lon: number;
}

function isCacheValid(updatedAt: string, ttlMinutes: number): boolean {
  const updated = new Date(updatedAt).getTime();
  const now = Date.now();
  return (now - updated) < ttlMinutes * 60 * 1000;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, apikey, x-client-info",
  "Content-Type": "application/json",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const zonaId = body?.zona_id as string | undefined;
    if (!zonaId) {
      return new Response(
        JSON.stringify({ error: "zona_id es obligatorio" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: zona, error: zonaError } = await supabase
      .from("zonas")
      .select("id, nombre, lat, lon")
      .eq("id", zonaId)
      .single();

    if (zonaError || !zona) {
      return new Response(
        JSON.stringify({ error: "Zona no encontrada" }),
        { status: 404, headers: corsHeaders }
      );
    }

    const { lat, lon } = zona as Zona;

    const { data: cacheForecast } = await supabase
      .from("zona_cache")
      .select("data, updated_at")
      .eq("zona_id", zonaId)
      .eq("tipo", "forecast")
      .single();

    let forecast: { weather: Record<string, unknown>; marine: Record<string, unknown> };
    if (cacheForecast?.data && isCacheValid(cacheForecast.updated_at, FORECAST_TTL_MINUTES)) {
      forecast = cacheForecast.data as { weather: Record<string, unknown>; marine: Record<string, unknown> };
    } else {
      const tz = "Europe/Madrid";
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_direction_10m&daily=temperature_2m_max,temperature_2m_min,weather_code,wind_speed_10m_max,wind_direction_10m_dominant&timezone=${tz}&forecast_days=7`;
      const marineUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&hourly=wave_height,wave_direction,wave_period&timezone=${tz}&forecast_days=7`;
      const [weatherRes, marineRes] = await Promise.all([fetch(weatherUrl), fetch(marineUrl)]);
      if (!weatherRes.ok) throw new Error("Open-Meteo weather forecast failed");
      if (!marineRes.ok) throw new Error("Open-Meteo marine forecast failed");
      const weatherJson = await weatherRes.json();
      const marineJson = await marineRes.json();
      forecast = {
        weather: {
          daily: weatherJson.daily ?? {},
          hourly: {
            time: weatherJson.hourly?.time ?? [],
            temperature_2m: weatherJson.hourly?.temperature_2m ?? [],
            relative_humidity_2m: weatherJson.hourly?.relative_humidity_2m ?? [],
            precipitation: weatherJson.hourly?.precipitation ?? [],
            weather_code: weatherJson.hourly?.weather_code ?? [],
            wind_speed_10m: weatherJson.hourly?.wind_speed_10m ?? [],
            wind_direction_10m: weatherJson.hourly?.wind_direction_10m ?? [],
          },
        },
        marine: {
          hourly: {
            time: marineJson.hourly?.time ?? [],
            wave_height: marineJson.hourly?.wave_height ?? [],
            wave_direction: marineJson.hourly?.wave_direction ?? [],
            wave_period: marineJson.hourly?.wave_period ?? [],
          },
        },
      };
      await supabase.from("zona_cache").upsert(
        { zona_id: zonaId, tipo: "forecast", data: forecast, updated_at: new Date().toISOString() },
        { onConflict: "zona_id,tipo" }
      );
    }

    return new Response(JSON.stringify({ forecast }), { headers: corsHeaders });
  } catch (e) {
    console.error(e);
    return new Response(
      JSON.stringify({ error: String(e?.message || e) }),
      { status: 500, headers: corsHeaders }
    );
  }
});
