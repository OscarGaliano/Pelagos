// =============================================================================
// Edge Function: getZonaConditions
// Obtiene tiempo (Open-Meteo Weather) y condiciones marinas (Open-Meteo Marine)
// para una zona. Usa Postgres (zona_cache) como cache por zona.
// Cache: weather 30 min, marine 60 min.
// El frontend NUNCA llama a APIs externas; todo pasa por esta función.
// =============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const WEATHER_TTL_MINUTES = 30;
const MARINE_TTL_MINUTES = 60;
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
    const rawId = body?.zona_id;
    const zonaId = rawId != null && rawId !== "" ? String(rawId).trim() : null;
    if (!zonaId) {
      return new Response(
        JSON.stringify({ error: "zona_id es obligatorio" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 1) Obtener zona (lat, lon)
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

    // 2) Cache weather
    const { data: cacheWeather } = await supabase
      .from("zona_cache")
      .select("data, updated_at")
      .eq("zona_id", zonaId)
      .eq("tipo", "weather")
      .single();

    let weather: Record<string, unknown>;
    if (cacheWeather?.data && isCacheValid(cacheWeather.updated_at, WEATHER_TTL_MINUTES)) {
      weather = cacheWeather.data as Record<string, unknown>;
    } else {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,cloud_cover,precipitation,weather_code,wind_speed_10m,wind_direction_10m`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Open-Meteo weather failed");
      const json = await res.json();
      weather = {
        temperature_2m: json.current?.temperature_2m,
        relative_humidity_2m: json.current?.relative_humidity_2m,
        cloud_cover: json.current?.cloud_cover,
        precipitation: json.current?.precipitation,
        weather_code: json.current?.weather_code,
        wind_speed_10m: json.current?.wind_speed_10m,
        wind_direction_10m: json.current?.wind_direction_10m,
      };
      await supabase.from("zona_cache").upsert(
        { zona_id: zonaId, tipo: "weather", data: weather, updated_at: new Date().toISOString() },
        { onConflict: "zona_id,tipo" }
      );
    }

    // 3) Cache marine
    const { data: cacheMarine } = await supabase
      .from("zona_cache")
      .select("data, updated_at")
      .eq("zona_id", zonaId)
      .eq("tipo", "marine")
      .single();

    let marine: Record<string, unknown>;
    if (cacheMarine?.data && isCacheValid(cacheMarine.updated_at, MARINE_TTL_MINUTES)) {
      marine = cacheMarine.data as Record<string, unknown>;
    } else {
      const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&current=wave_height,wave_direction,wave_period`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Open-Meteo marine failed");
      const json = await res.json();
      marine = {
        wave_height: json.current?.wave_height,
        wave_direction: json.current?.wave_direction,
        wave_period: json.current?.wave_period,
      };
      await supabase.from("zona_cache").upsert(
        { zona_id: zonaId, tipo: "marine", data: marine, updated_at: new Date().toISOString() },
        { onConflict: "zona_id,tipo" }
      );
    }

    // 4) Forecast 7 días (daily + hourly) para día y franja horaria
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

    return new Response(
      JSON.stringify({ zona: { id: zona.id, nombre: (zona as Zona).nombre, lat, lon }, weather, marine, forecast }),
      { headers: corsHeaders }
    );
  } catch (e) {
    console.error(e);
    return new Response(
      JSON.stringify({ error: String(e?.message || e) }),
      { status: 500, headers: corsHeaders }
    );
  }
});
