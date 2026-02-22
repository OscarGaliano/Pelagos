// =============================================================================
// Edge Function: getZonaHistoricalConditions
// Devuelve viento (y opcionalmente más) para una zona en una fecha pasada,
// usando Open-Meteo Archive API. Para oleaje no hay histórico gratuito; se devuelve null.
// =============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

interface Zona {
  id: string;
  nombre: string;
  lat: number;
  lon: number;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, apikey, x-client-info",
  "Access-Control-Max-Age": "86400",
  "Content-Type": "application/json",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const zonaId = body?.zona_id as string | undefined;
    const dateStr = body?.date as string | undefined; // YYYY-MM-DD
    const hour = typeof body?.hour === "number" ? Math.max(0, Math.min(23, Math.floor(body.hour))) : 0;

    if (!zonaId || !dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return new Response(
        JSON.stringify({ error: "zona_id y date (YYYY-MM-DD) son obligatorios" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const today = new Date().toISOString().slice(0, 10);
    if (dateStr >= today) {
      return new Response(
        JSON.stringify({ error: "Usar pronóstico para hoy o fechas futuras" }),
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
    const tz = "Europe/Madrid";
    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${dateStr}&end_date=${dateStr}&hourly=wind_speed_10m,wind_direction_10m&timezone=${tz}`;
    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Archive API failed: ${res.status} ${text}`);
    }
    const json = await res.json();
    const times = json.hourly?.time as string[] | undefined;
    const windSpeed = json.hourly?.wind_speed_10m as number[] | undefined;
    const windDir = json.hourly?.wind_direction_10m as number[] | undefined;

    if (!times?.length || !windSpeed?.length) {
      return new Response(
        JSON.stringify({
          weather: { wind_speed_10m: null, wind_direction_10m: null },
          marine: null,
        }),
        { headers: corsHeaders }
      );
    }

    const index = Math.min(hour, times.length - 1);
    const wind_speed_10m = windSpeed[index] ?? null;
    const wind_direction_10m = windDir?.[index] ?? null;

    return new Response(
      JSON.stringify({
        weather: { wind_speed_10m, wind_direction_10m },
        marine: null,
      }),
      { headers: corsHeaders }
    );
  } catch (e) {
    console.error(e);
    return new Response(
      JSON.stringify({ error: String((e as Error)?.message || e) }),
      { status: 500, headers: corsHeaders }
    );
  }
});
