// =============================================================================
// Edge Function: getZonaTides
// Devuelve mareas del día para una zona. Cache 24 horas en zona_cache (tipo 'tides').
// Por ahora usa datos mock (fácil sustituir por API premium de mareas después).
// El frontend solo llama a esta función; nunca a APIs externas.
// =============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const TIDES_TTL_MINUTES = 24 * 60;

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

// Genera mareas mock para el día indicado (UTC). Horas siempre enteras para ISO válido.
// IMPORTANTE: Son datos orientativos. Los coeficientes reales (p. ej. tablademareas.com) varían por día y franja (mañana/tarde).
// dateStr: YYYY-MM-DD; si no se pasa, se usa hoy.
function generateMockTides(
  lat: number,
  lon: number,
  dateStr?: string
): { events: Array<{ type: string; time: string; height_m: number }>; coefficient?: number } {
  const day = dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? dateStr : new Date().toISOString().slice(0, 10);
  const base = Math.abs(Math.floor((lat + lon) * 100) % 12);
  // Coeficiente que varía por fecha y zona: rango 36–55 (más cercano a valores típicos 40–50 que en fuentes como tablademareas.com)
  const dayNum = day.replace(/-/g, "").slice(0, 8);
  const dateSeed = parseInt(dayNum, 10) % 1000;
  const coeff = 36 + ((dateSeed + base * 7) % 20);
  const h1 = String((5 + (base % 3)) % 24).padStart(2, "0");
  const h2 = String((11 + (base % 2)) % 24).padStart(2, "0");
  const h3 = String((17 + (base % 2)) % 24).padStart(2, "0");
  return {
    events: [
      { type: "high", time: `${day}T${h1}:42:00.000Z`, height_m: Math.round((2.8 + (base % 10) / 10) * 10) / 10 },
      { type: "low", time: `${day}T${h2}:18:00.000Z`, height_m: Math.round((0.6 + (base % 5) / 10) * 10) / 10 },
      { type: "high", time: `${day}T${h3}:54:00.000Z`, height_m: Math.round((3.0 + (base % 10) / 10) * 10) / 10 },
      { type: "low", time: `${day}T23:30:00.000Z`, height_m: 0.8 },
    ],
    coefficient: coeff,
  };
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
    const dateParam = body?.date as string | undefined; // YYYY-MM-DD opcional; si no es hoy, no cacheamos

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
    const today = new Date().toISOString().slice(0, 10);
    const isToday = !dateParam || dateParam === today;

    let tides: { events: Array<{ type: string; time: string; height_m: number }>; coefficient?: number };

    if (isToday) {
      const { data: cache } = await supabase
        .from("zona_cache")
        .select("data, updated_at")
        .eq("zona_id", zonaId)
        .eq("tipo", "tides")
        .single();

      if (cache?.data && isCacheValid(cache.updated_at, TIDES_TTL_MINUTES)) {
        tides = cache.data as typeof tides;
      } else {
        tides = generateMockTides(Number(lat), Number(lon), today);
        await supabase.from("zona_cache").upsert(
          { zona_id: zonaId, tipo: "tides", data: tides, updated_at: new Date().toISOString() },
          { onConflict: "zona_id,tipo" }
        );
      }
    } else {
      tides = generateMockTides(Number(lat), Number(lon), dateParam);
    }

    return new Response(
      JSON.stringify({ zona: { id: zona.id, nombre: (zona as Zona).nombre }, tides }),
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
