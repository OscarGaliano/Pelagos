/**
 * Normaliza un nombre de ciudad para comparación (evitar duplicados tipo "Málaga" / "Malaga").
 * Quita acentos y pasa a minúsculas.
 */
export function normalizeCity(city: string | null | undefined): string {
  if (city == null || typeof city !== 'string') return '';
  const t = city.trim();
  if (!t) return '';
  return t
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

/** Pueblos conocidos → ciudad para que no aparezcan como filtro (ej. Coin → Málaga). Clave = normalizado. */
const TOWN_TO_CITY: Record<string, string> = {
  coin: 'Málaga',
  coín: 'Málaga',
};

/**
 * Extrae solo la ciudad de un campo "ubicación":
 * - "Pueblo, Ciudad" → Ciudad
 * - "Coín (pueblo de Málaga)" o "Coin" solo → Málaga (pueblos mapeados a ciudad)
 * - "Ciudad" → Ciudad
 */
export function extractCityFromLocation(location: string | null | undefined): string {
  const raw = (location ?? '').trim();
  if (!raw) return '';
  const puebloDeMatch = raw.match(/\(pueblo\s+de\s+([^)]+)\)/i);
  if (puebloDeMatch) return puebloDeMatch[1].trim();
  const idx = raw.lastIndexOf(',');
  let city = idx === -1 ? raw : raw.slice(idx + 1).trim() || raw;
  const normalized = city.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  return TOWN_TO_CITY[normalized] ?? city;
}

/** Preferir como display la variante con tilde (ej. Málaga frente a malaga). */
function preferDisplayWithAccent(current: string, candidate: string): string {
  const hasAccent = (s: string) => /[áéíóúñÁÉÍÓÚÑ]/.test(s);
  if (hasAccent(candidate) && !hasAccent(current)) return candidate;
  return current;
}

/**
 * Dado una lista de nombres de ciudad (o ubicaciones "Pueblo, Ciudad", "X (pueblo de Y)"), devuelve opciones únicas por ciudad:
 * una sola entrada por ciudad (con o sin tilde), mostrando preferentemente la forma con tilde (ej. Málaga).
 */
export function uniqueCitiesByNormalized(locations: (string | null | undefined)[]): Array<{ normalized: string; display: string }> {
  const seen = new Map<string, string>();
  for (const loc of locations) {
    const city = extractCityFromLocation(loc);
    if (!city) continue;
    const n = normalizeCity(city);
    const existing = seen.get(n);
    seen.set(n, existing ? preferDisplayWithAccent(existing, city) : city);
  }
  return Array.from(seen.entries()).map(([normalized, display]) => ({ normalized, display }));
}
