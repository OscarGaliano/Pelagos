/**
 * Tipos comunes para todas las fuentes de webcams.
 * Solo se embeberá desde las URLs oficiales; no se descarga ni redistribuye el vídeo.
 */

export interface WebcamItem {
  id: string;
  title: string;
  /** Ciudad o región para filtrar (ej. Asturias, Tenerife, Alicante) */
  city: string;
  location: string;
  url: string;
  /** Imagen de la playa (preview) */
  thumbnailUrl?: string;
}

export type WebcamProviderId = 'hispacams' | 'skylinewebcams' | 'livecamworld';

export interface WebcamProvider {
  id: WebcamProviderId;
  name: string;
  description: string;
  items: WebcamItem[];
}
