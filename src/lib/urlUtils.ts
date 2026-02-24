/**
 * Convierte una URL posiblemente relativa o sin protocolo en URL absoluta.
 * Evita que valores como "pelagos.vercel.app" se interpreten como path relativo
 * al origen actual (p. ej. supabase.co) y provoquen 404.
 */
export function ensureAbsoluteUrl(url: string | null | undefined): string {
  if (url == null || typeof url !== 'string') return '';
  const t = url.trim();
  if (!t) return '';
  if (t.startsWith('http://') || t.startsWith('https://')) return t;
  if (t.startsWith('//')) return 'https:' + t;
  if (t.includes(' ') || !t.includes('.')) return t;
  return 'https://' + t;
}

/** Aplica ensureAbsoluteUrl a cada elemento de un array (p. ej. imágenes). */
export function ensureAbsoluteUrls(urls: (string | null | undefined)[] | null | undefined): string[] {
  if (urls == null || !Array.isArray(urls)) return [];
  return urls.map(ensureAbsoluteUrl).filter(Boolean);
}
