import { supabase } from '@/lib/supabase';
import type { DiveSpot } from '@/lib/types';

export type DiveSpotWithCreator = DiveSpot & {
  creator?: { display_name: string | null; avatar_url: string | null } | null;
  /** Número de jornadas registradas en este escenario. */
  dive_count?: number;
  /** Número de capturas registradas en este escenario. */
  catch_count?: number;
};

/** Lista todos los puntos de pesca con creador y número de jornadas. */
export async function getDiveSpots(): Promise<DiveSpotWithCreator[]> {
  const { data: spots, error } = await supabase
    .from('dive_spots')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  const list = (spots ?? []) as DiveSpot[];

  const userIds = [...new Set(list.map((s) => s.user_id).filter(Boolean))];
  const spotIds = list.map((s) => s.id);

  const profilesRes =
    userIds.length > 0
      ? await supabase.from('profiles').select('id, display_name, avatar_url').in('id', userIds)
      : { data: [] as unknown[] };

  let diveCountBySpot = new Map<string, number>();
  try {
    const { data: divesData, error: divesErr } = await supabase
      .from('dives')
      .select('dive_spot_id')
      .not('dive_spot_id', 'is', null);
    if (!divesErr && divesData) {
      for (const row of divesData) {
        const id = (row as { dive_spot_id: string }).dive_spot_id;
        if (id) diveCountBySpot.set(id, (diveCountBySpot.get(id) ?? 0) + 1);
      }
    }
  } catch {
    diveCountBySpot = new Map();
  }

  let catchCountBySpot = new Map<string, number>();
  try {
    const { data: divesForSpots, error: divesErr2 } = await supabase
      .from('dives')
      .select('id, dive_spot_id')
      .not('dive_spot_id', 'is', null)
      .in('dive_spot_id', spotIds);
    if (!divesErr2 && divesForSpots?.length) {
      const diveIdToSpotId = new Map<string, string>();
      for (const row of divesForSpots) {
        const r = row as { id: string; dive_spot_id: string };
        diveIdToSpotId.set(r.id, r.dive_spot_id);
      }
      const diveIds = [...diveIdToSpotId.keys()];
      const { data: catchesData, error: catchesErr } = await supabase
        .from('catches')
        .select('dive_id')
        .in('dive_id', diveIds);
      if (!catchesErr && catchesData) {
        for (const row of catchesData) {
          const spotId = diveIdToSpotId.get((row as { dive_id: string }).dive_id);
          if (spotId) catchCountBySpot.set(spotId, (catchCountBySpot.get(spotId) ?? 0) + 1);
        }
      }
    }
  } catch {
    catchCountBySpot = new Map();
  }

  const byId = new Map<string, { display_name: string | null; avatar_url: string | null }>();
  for (const p of profilesRes.data ?? []) {
    byId.set((p as { id: string }).id, {
      display_name: (p as { display_name: string | null }).display_name ?? null,
      avatar_url: (p as { avatar_url: string | null }).avatar_url ?? null,
    });
  }

  return list.map((spot) => ({
    ...spot,
    creator: byId.get(spot.user_id) ?? null,
    dive_count: diveCountBySpot.get(spot.id) ?? 0,
    catch_count: catchCountBySpot.get(spot.id) ?? 0,
  })) as DiveSpotWithCreator[];
}

export async function createDiveSpot(spot: {
  user_id: string;
  name: string;
  lat: number;
  lng: number;
  city?: string | null;
  depth_range?: string | null;
  conditions?: string | null;
  species?: string | null;
  description?: string | null;
  image_url?: string | null;
  rating?: number;
}) {
  const { data, error } = await supabase
    .from('dive_spots')
    .insert({
      user_id: spot.user_id,
      name: spot.name,
      lat: spot.lat,
      lng: spot.lng,
      city: spot.city ?? null,
      depth_range: spot.depth_range ?? null,
      conditions: spot.conditions ?? null,
      species: spot.species ?? null,
      description: spot.description ?? null,
      image_url: spot.image_url ?? null,
      rating: spot.rating ?? 5,
      total_dives: 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data as DiveSpot;
}

export async function updateDiveSpot(
  spotId: string,
  updates: {
    name?: string;
    lat?: number;
    lng?: number;
    city?: string | null;
    depth_range?: string | null;
    conditions?: string | null;
    species?: string | null;
    description?: string | null;
    image_url?: string | null;
    rating?: number;
  }
) {
  const { data, error } = await supabase
    .from('dive_spots')
    .update(updates)
    .eq('id', spotId)
    .select()
    .single();

  if (error) throw error;
  return data as DiveSpot;
}

const DIVE_SPOT_IMAGES_BUCKET = 'captures';
const DIVE_SPOT_IMAGES_PREFIX = 'dive-spots';

/** Sube la foto del sitio y actualiza dive_spots.image_url. */
export async function uploadDiveSpotImage(spotId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${DIVE_SPOT_IMAGES_PREFIX}/${spotId}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from(DIVE_SPOT_IMAGES_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type || 'image/jpeg' });
  if (uploadError) throw uploadError;
  const { data: urlData } = supabase.storage.from(DIVE_SPOT_IMAGES_BUCKET).getPublicUrl(path);
  await updateDiveSpot(spotId, { image_url: urlData.publicUrl });
  return urlData.publicUrl;
}

export async function deleteDiveSpot(spotId: string): Promise<void> {
  const { error } = await supabase.from('dive_spots').delete().eq('id', spotId);
  if (error) throw error;
}
