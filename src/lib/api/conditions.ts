/**
 * Servicio de Condiciones y Mareas.
 *
 * ARQUITECTURA:
 * - El frontend NUNCA llama a APIs externas (Open-Meteo, etc.).
 * - Todo pasa por Supabase Edge Functions (getZonaConditions, getZonaTides).
 * - Los datos se cachean por zona en Postgres (zona_cache); son compartidos entre usuarios.
 *
 * Flujo: UI → conditions_service (este archivo) → Edge Functions → Cache o APIs externas.
 * Preparado para añadir después: datos premium, alertas, históricos (misma entrada, otra Edge Function).
 */

import { supabase } from '@/lib/supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

/** Llama a una Edge Function por URL con anon key (evita 401 cuando JWT está desactivado). */
async function invokeFunction<T>(name: string, body: object): Promise<T> {
  const url = `${SUPABASE_URL}/functions/v1/${name}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  const data = await res.json();
  if (data?.error) throw new Error(data.error);
  return data as T;
}

export type Zona = {
  id: string;
  nombre: string;
  lat: number;
  lon: number;
};

export type WeatherData = {
  temperature_2m?: number;
  relative_humidity_2m?: number;
  cloud_cover?: number;
  precipitation?: number;
  weather_code?: number;
  wind_speed_10m?: number;
  wind_direction_10m?: number;
};

export type MarineData = {
  wave_height?: number;
  wave_direction?: number;
  wave_period?: number;
};

/** Forecast por día y horario (7 días, datos horarios). */
export type ForecastData = {
  weather: {
    daily: { time?: string[]; temperature_2m_max?: number[]; temperature_2m_min?: number[]; weather_code?: number[]; wind_speed_10m_max?: number[]; wind_direction_10m_dominant?: number[] };
    hourly: { time: string[]; temperature_2m: number[]; relative_humidity_2m?: number[]; precipitation?: number[]; weather_code: number[]; wind_speed_10m: number[]; wind_direction_10m: number[] };
  };
  marine: {
    hourly: { time: string[]; wave_height: number[]; wave_direction: number[]; wave_period: number[] };
  };
};

export type TideEvent = {
  type: 'high' | 'low';
  time: string;
  height_m: number;
};

export type TidesData = {
  events: TideEvent[];
  coefficient?: number;
};

const FAVORITE_ZONES_KEY = 'weather_favorite_zones';
const LAST_ZONA_ID_KEY = 'weather_last_zona_id';

export function getLastZonaId(): string | null {
  try {
    return localStorage.getItem(LAST_ZONA_ID_KEY);
  } catch {
    return null;
  }
}

export function setLastZonaId(zonaId: string): void {
  try {
    localStorage.setItem(LAST_ZONA_ID_KEY, zonaId);
  } catch {
    /* ignore */
  }
}

/** Zonas frecuentes guardadas (id + nombre). Máximo 10. */
export function getFavoriteZones(): Array<{ id: string; nombre: string }> {
  try {
    const raw = localStorage.getItem(FAVORITE_ZONES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, 10) : [];
  } catch {
    return [];
  }
}

export function addFavoriteZone(zona: Zona): Array<{ id: string; nombre: string }> {
  const list = getFavoriteZones();
  if (list.some((z) => z.id === zona.id)) return list;
  const next = [{ id: zona.id, nombre: zona.nombre }, ...list].slice(0, 10);
  localStorage.setItem(FAVORITE_ZONES_KEY, JSON.stringify(next));
  return next;
}

export function removeFavoriteZone(zonaId: string): Array<{ id: string; nombre: string }> {
  const next = getFavoriteZones().filter((z) => z.id !== zonaId);
  localStorage.setItem(FAVORITE_ZONES_KEY, JSON.stringify(next));
  return next;
}

/** Lista de zonas disponibles (desde Postgres). Los datos de condiciones se piden por zona_id. */
export async function getZonas(): Promise<Zona[]> {
  const { data, error } = await supabase.from('zonas').select('id, nombre, lat, lon').order('nombre');
  if (error) throw error;
  return (data ?? []) as Zona[];
}

/**
 * Obtiene tiempo + condiciones marinas (+ forecast si la función lo devuelve) para una zona.
 */
export async function getZonaConditions(zonaId: string): Promise<{
  zona: Zona;
  weather: WeatherData;
  marine: MarineData;
  forecast?: ForecastData;
}> {
  return invokeFunction<{ zona: Zona; weather: WeatherData; marine: MarineData; forecast?: ForecastData }>(
    'getZonaConditions',
    { zona_id: zonaId }
  );
}

/**
 * Obtiene solo el pronóstico 7 días (horario) para día y franja.
 * Usar siempre en paralelo para que día/franja funcionen aunque getZonaConditions no devuelva forecast.
 */
export async function getZonaForecast(zonaId: string): Promise<{ forecast: ForecastData }> {
  return invokeFunction<{ forecast: ForecastData }>('getZonaForecast', { zona_id: zonaId });
}

/**
 * Condiciones históricas (viento) para una fecha pasada. Oleaje no disponible en API gratuita.
 */
export async function getZonaHistoricalConditions(
  zonaId: string,
  date: string,
  hour: number
): Promise<{ weather: { wind_speed_10m: number | null; wind_direction_10m: number | null }; marine: null }> {
  return invokeFunction('getZonaHistoricalConditions', { zona_id: zonaId, date, hour });
}

/** Franjas horarias: hora inicio y etiqueta. Hora central usada para mostrar datos. */
export const FRANJAS = [
  { id: 'madrugada', label: 'Madrugada', start: 0, end: 6, hourCenter: 3 },
  { id: 'manana', label: 'Mañana', start: 6, end: 12, hourCenter: 9 },
  { id: 'tarde', label: 'Tarde', start: 12, end: 18, hourCenter: 15 },
  { id: 'noche', label: 'Noche', start: 18, end: 24, hourCenter: 21 },
] as const;

/**
 * Dado día (0=hoy, 6=+6) y franja (hora central), devuelve datos de tiempo y mar del forecast.
 * Índice: día 0 = hoy, hora 0-23; la API devuelve desde 00:00 local (timezone en la petición).
 */
export function getForecastAt(
  forecast: ForecastData | undefined,
  dayIndex: number,
  franjaHourCenter: number
): { weather: Partial<WeatherData>; marine: Partial<MarineData> } | null {
  if (!forecast?.weather?.hourly?.time?.length) return null;
  const hourly = forecast.weather.hourly;
  const marineHourly = forecast.marine?.hourly;
  const index = dayIndex * 24 + franjaHourCenter;
  if (index >= hourly.time.length) return null;
  const safeIndex = index;
  const marineIndex =
    marineHourly?.time?.length && index < marineHourly.time.length ? index : -1;
  return {
    weather: {
      temperature_2m: hourly.temperature_2m?.[safeIndex],
      relative_humidity_2m: hourly.relative_humidity_2m?.[safeIndex],
      precipitation: hourly.precipitation?.[safeIndex],
      weather_code: hourly.weather_code?.[safeIndex],
      wind_speed_10m: hourly.wind_speed_10m?.[safeIndex],
      wind_direction_10m: hourly.wind_direction_10m?.[safeIndex],
    },
    marine:
      marineIndex >= 0 && marineHourly
        ? {
            wave_height: marineHourly.wave_height?.[marineIndex],
            wave_direction: marineHourly.wave_direction?.[marineIndex],
            wave_period: marineHourly.wave_period?.[marineIndex],
          }
        : {},
  };
}

/**
 * Obtiene mareas del día para una zona.
 * date: opcional YYYY-MM-DD; si se indica, se devuelven mareas para ese día (no se cachea).
 */
export async function getZonaTides(zonaId: string, date?: string): Promise<{
  zona: Zona;
  tides: TidesData;
}> {
  return invokeFunction<{ zona: Zona; tides: TidesData }>(
    'getZonaTides',
    date ? { zona_id: zonaId, date } : { zona_id: zonaId }
  );
}

/** Dirección en grados a texto (N, NE, E, ...). */
export function windDirectionLabel(deg: number | undefined): string {
  if (deg == null) return '—';
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const i = Math.round(((deg % 360) / 45)) % 8;
  return dirs[i] ?? '—';
}

/** Código tiempo Open-Meteo a texto breve. */
export function weatherCodeLabel(code: number | undefined): string {
  if (code == null) return '—';
  const map: Record<number, string> = {
    0: 'Despejado', 1: 'Mayormente despejado', 2: 'Parcialmente nuboso', 3: 'Nublado',
    45: 'Niebla', 48: 'Niebla helada', 51: 'Llovizna', 53: 'Llovizna', 55: 'Llovizna densa',
    61: 'Lluvia ligera', 63: 'Lluvia', 65: 'Lluvia fuerte', 71: 'Nieve ligera', 73: 'Nieve', 75: 'Nieve fuerte',
    80: 'Chubascos', 81: 'Chubascos', 82: 'Chubascos fuertes', 95: 'Tormenta', 96: 'Tormenta con granizo', 99: 'Tormenta fuerte con granizo',
  };
  return map[code] ?? `Código ${code}`;
}
