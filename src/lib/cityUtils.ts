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

/** Pueblos/localidades → ciudad española (para Pescasub: mostrar solo ciudad, no localidad). Clave = normalizado. */
const TOWN_TO_CITY: Record<string, string> = {
  coin: 'Málaga',
  coín: 'Málaga',
  torremolinos: 'Málaga',
  fuengirola: 'Málaga',
  marbella: 'Málaga',
  estepona: 'Málaga',
  benalmadena: 'Málaga',
  benalmádena: 'Málaga',
  mijas: 'Málaga',
  nerja: 'Málaga',
  velezmalaga: 'Málaga',
  vélezmalaga: 'Málaga',
  'velez-malaga': 'Málaga',
  rincondelavictoria: 'Málaga',
  rincón: 'Málaga',
  alhaurin: 'Málaga',
  chiclana: 'Cádiz',
  'chiclana de la frontera': 'Cádiz',
  conil: 'Cádiz',
  'conil de la frontera': 'Cádiz',
  rota: 'Cádiz',
  'el puerto de santa maria': 'Cádiz',
  sanlucar: 'Cádiz',
  sanlúcar: 'Cádiz',
  'sanlucar de barrameda': 'Cádiz',
  chipiona: 'Cádiz',
  tarifa: 'Cádiz',
  barbate: 'Cádiz',
  algeciras: 'Cádiz',
  roquetas: 'Almería',
  'roquetas de mar': 'Almería',
  adra: 'Almería',
  almunecar: 'Granada',
  almuñécar: 'Granada',
  salobreña: 'Granada',
  motril: 'Granada',
  benidorm: 'Alicante',
  calpe: 'Alicante',
  denia: 'Alicante',
  'santa pola': 'Alicante',
  torrevieja: 'Alicante',
  villajoyosa: 'Alicante',
  villena: 'Alicante',
  alicante: 'Alicante',
  'costa brava': 'Girona',
  llagostera: 'Girona',
  pals: 'Girona',
  roses: 'Girona',
  "l'escala": 'Girona',
  lloret: 'Girona',
  'lloret de mar': 'Girona',
  sitges: 'Barcelona',
  vilanova: 'Barcelona',
  cambrils: 'Tarragona',
  salou: 'Tarragona',
  calafell: 'Tarragona',
  candelaria: 'Tenerife',
  'puerto de la cruz': 'Tenerife',
  'costa adeje': 'Tenerife',
  'los cristianos': 'Tenerife',
  'playa de las americas': 'Tenerife',
  arrecife: 'Lanzarote',
  'puerto del carmen': 'Lanzarote',
  'playa blanca': 'Lanzarote',
  corralejo: 'Fuerteventura',
  morrojable: 'Fuerteventura',
  mogan: 'Gran Canaria',
  'las palmas': 'Las Palmas',
  palma: 'Mallorca',
  'palma de mallorca': 'Mallorca',
  alcudia: 'Mallorca',
  pollensa: 'Mallorca',
  pollença: 'Mallorca',
  andratx: 'Mallorca',
  'santa eulalia': 'Ibiza',
  'sant antoni': 'Ibiza',
  'san antonio': 'Ibiza',
  mahon: 'Menorca',
  maó: 'Menorca',
  ciutadella: 'Menorca',
  sanxenxo: 'Pontevedra',
  'o grove': 'Pontevedra',
  vigo: 'Vigo',
  baiona: 'Pontevedra',
  cangas: 'Pontevedra',
  ribadeo: 'Lugo',
  ribadesella: 'Asturias',
  llanes: 'Asturias',
  cudillero: 'Asturias',
  aviles: 'Asturias',
  avilés: 'Asturias',
  suances: 'Santander',
  noja: 'Santander',
  'castro urdiales': 'Santander',
  laredo: 'Santander',
  ceuta: 'Ceuta',
  melilla: 'Melilla',
};

/**
 * Parsea "ubicación" en ciudad y localidad (pueblo).
 * - "Pueblo, Ciudad" → { city: Ciudad, locality: Pueblo }
 * - "Coín (pueblo de Málaga)" → { city: Málaga, locality: Coín }
 * - "Ciudad" → { city: Ciudad, locality: '' }
 */
export function parseLocationToCityAndLocality(location: string | null | undefined): { city: string; locality: string } {
  const raw = (location ?? '').trim();
  if (!raw) return { city: '', locality: '' };
  const puebloDeMatch = raw.match(/^(.+?)\s*\(pueblo\s+de\s+([^)]+)\)$/i);
  if (puebloDeMatch) return { city: puebloDeMatch[2].trim(), locality: puebloDeMatch[1].trim() };
  const idx = raw.lastIndexOf(',');
  if (idx === -1) return { city: raw, locality: '' };
  const locality = raw.slice(0, idx).trim();
  const city = raw.slice(idx + 1).trim();
  return { city, locality };
}

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
  if (puebloDeMatch) {
    const c = puebloDeMatch[1].trim();
    const n = normalizeCity(c);
    return TOWN_TO_CITY[n] ?? c;
  }
  const idx = raw.lastIndexOf(',');
  let city = idx === -1 ? raw : raw.slice(idx + 1).trim() || raw;
  // "Torremolinos (Málaga)" -> extraer Málaga del paréntesis
  const parenMatch = city.match(/\(([^)]+)\)/);
  if (parenMatch) {
    const inParen = parenMatch[1].trim();
    const nIn = normalizeCity(inParen);
    if (TOWN_TO_CITY[nIn] || inParen.length <= 30) city = inParen;
  }
  const normalized = normalizeCity(city);
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
