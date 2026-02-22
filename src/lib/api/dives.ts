import { supabase } from '@/lib/supabase';
import type { Dive } from '@/lib/types';

export async function getDives(userId: string): Promise<Dive[]> {
  const { data, error } = await supabase
    .from('dives')
    .select(`
      *,
      catches (*)
    `)
    .eq('user_id', userId)
    .order('dive_date', { ascending: false });

  if (error) throw error;
  return (data ?? []) as Dive[];
}

/** Profundidad máxima registrada del usuario (personal best). Devuelve null si no hay inmersiones con max_depth_m. */
export async function getPersonalBestMaxDepth(userId: string): Promise<number | null> {
  const { data, error } = await supabase
    .from('dives')
    .select('max_depth_m')
    .eq('user_id', userId)
    .not('max_depth_m', 'is', null);

  if (error) throw error;
  const values = (data ?? []).map((r: { max_depth_m: number }) => r.max_depth_m).filter((m): m is number => typeof m === 'number' && m > 0);
  return values.length > 0 ? Math.max(...values) : null;
}

export async function createDive(dive: {
  user_id: string;
  dive_date: string;
  duration_minutes: number;
  max_depth_m?: number;
  temperature_c?: number;
  tide_coefficient?: number;
  wind_speed_kmh?: number;
  wind_direction?: string;
  wave_height_m?: number;
  location_name?: string;
  gps_lat?: number;
  gps_lng?: number;
  dive_spot_id?: string | null;
  notes?: string;
}) {
  const { data, error } = await supabase.from('dives').insert(dive).select().single();
  if (error) throw error;
  return data;
}

export async function addCatch(catchData: {
  dive_id: string;
  species: string;
  weight_kg?: number;
  image_url?: string;
}) {
  const { data, error } = await supabase.from('catches').insert(catchData).select().single();
  if (error) throw error;
  return data;
}

export async function updateDive(
  diveId: string,
  updates: {
    dive_date?: string;
    duration_minutes?: number;
    max_depth_m?: number | null;
    temperature_c?: number | null;
    tide_coefficient?: number | null;
    wind_speed_kmh?: number | null;
    wind_direction?: string | null;
    wave_height_m?: number | null;
    location_name?: string | null;
    dive_spot_id?: string | null;
    notes?: string | null;
  }
) {
  const { data, error } = await supabase
    .from('dives')
    .update(updates)
    .eq('id', diveId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteDive(diveId: string): Promise<void> {
  const { error: catchesError } = await supabase.from('catches').delete().eq('dive_id', diveId);
  if (catchesError) throw catchesError;
  const { error: diveError } = await supabase.from('dives').delete().eq('id', diveId);
  if (diveError) throw diveError;
}

/** Sustituye todas las capturas de una jornada por la lista de especies (cada string = una captura). */
export async function replaceCatches(diveId: string, speciesList: string[]): Promise<void> {
  const { error: delError } = await supabase.from('catches').delete().eq('dive_id', diveId);
  if (delError) throw delError;
  for (const species of speciesList) {
    if (!species.trim()) continue;
    await addCatch({ dive_id: diveId, species: species.trim() });
  }
}

/** Captura con datos de la jornada (para galería). */
export interface CatchWithDive {
  id: string;
  dive_id: string;
  species: string;
  weight_kg: number | null;
  image_url: string | null;
  created_at: string;
  dive?: { dive_date: string; location_name: string | null };
}

/** Capturas de jornadas realizadas en un escenario de pesca (para mostrar en el detalle del escenario). */
export interface CatchAtSpot {
  id: string;
  species: string;
  dive_date: string;
  image_url: string | null;
}

export async function getCatchesByDiveSpotId(spotId: string): Promise<CatchAtSpot[]> {
  try {
    const { data: dives, error } = await supabase
      .from('dives')
      .select('id, dive_date, catches(id, species, image_url)')
      .eq('dive_spot_id', spotId)
      .order('dive_date', { ascending: false });
    if (error) return [];
    const out: CatchAtSpot[] = [];
    for (const d of dives ?? []) {
      const catches = (d as { catches?: { id: string; species: string; image_url: string | null }[] }).catches ?? [];
      for (const c of catches) {
        out.push({
          id: c.id,
          species: c.species,
          dive_date: (d as { dive_date: string }).dive_date,
          image_url: c.image_url,
        });
      }
    }
    return out;
  } catch {
    return [];
  }
}

/** Lista de capturas que tienen foto, con datos de la jornada. Solo del usuario. */
export async function getCatchesWithImages(userId: string): Promise<CatchWithDive[]> {
  const { data: dives, error } = await supabase
    .from('dives')
    .select('id, dive_date, location_name, catches(id, dive_id, species, weight_kg, image_url, created_at)')
    .eq('user_id', userId)
    .order('dive_date', { ascending: false });
  if (error) throw error;
  const out: CatchWithDive[] = [];
  for (const d of dives ?? []) {
    const catches = (d as { catches?: CatchWithDive[] }).catches ?? [];
    for (const c of catches) {
      if (c.image_url) {
        out.push({ ...c, dive: { dive_date: d.dive_date, location_name: d.location_name ?? null } });
      }
    }
  }
  out.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return out;
}

export async function updateCatch(
  catchId: string,
  updates: { image_url?: string | null }
) {
  const { data, error } = await supabase
    .from('catches')
    .update(updates)
    .eq('id', catchId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

const CATCH_IMAGES_BUCKET = 'captures';

/** Sube una imagen para una captura y actualiza catch.image_url. Una foto por captura. */
export async function uploadCatchImage(userId: string, catchId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${userId}/${catchId}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from(CATCH_IMAGES_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type || 'image/jpeg' });
  if (uploadError) throw uploadError;
  const { data: urlData } = supabase.storage.from(CATCH_IMAGES_BUCKET).getPublicUrl(path);
  await updateCatch(catchId, { image_url: urlData.publicUrl });
  return urlData.publicUrl;
}
