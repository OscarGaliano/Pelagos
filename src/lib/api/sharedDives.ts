import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/types/database';

export type SharedDive = Database['public']['Tables']['shared_dives']['Row'] & {
  user_profile?: { display_name: string | null; avatar_url: string | null } | null;
  tagged_profiles?: Array<{ id: string; display_name: string | null; avatar_url: string | null }> | null;
  likes_count: number;
  comments_count: number;
  user_liked: boolean;
};

export type SharedDiveComment = Database['public']['Tables']['shared_dive_comments']['Row'] & {
  user_profile?: { display_name: string | null; avatar_url: string | null } | null;
};

export type CreateSharedDivePayload = {
  description?: string | null;
  depth_min?: number | null;
  depth_max?: number | null;
  apnea_time_seconds?: number | null;
  current_type?: string | null;
  dive_id?: string | null;
};

const SHARED_DIVES_BUCKET = 'shared-dives-media';

/** Obtiene jornadas compartidas con opciones de filtrado */
export async function getSharedDives(options?: {
  currentUserId?: string;  // Para saber qué ha dado like el usuario actual
  filterByUserId?: string; // Para filtrar por un usuario específico
  onlyMine?: boolean;      // Si true, solo devuelve las del usuario actual
  limit?: number;          // Límite de resultados
}): Promise<SharedDive[]> {
  const { currentUserId, filterByUserId, onlyMine, limit } = options ?? {};

  let query = supabase
    .from('shared_dives')
    .select('*')
    .order('created_at', { ascending: false });

  // Filtrar por usuario específico o solo las propias
  if (filterByUserId) {
    query = query.eq('user_id', filterByUserId);
  } else if (onlyMine && currentUserId) {
    query = query.eq('user_id', currentUserId);
  }

  if (limit) {
    query = query.limit(limit);
  }

  const { data: dives, error } = await query;

  if (error) throw error;
  if (!dives || dives.length === 0) return [];

  const userIds = [...new Set(dives.map((d) => d.user_id))];
  const diveIds = dives.map((d) => d.id);

  const [profilesRes, likesRes, commentsRes, userLikesRes] = await Promise.all([
    supabase.from('profiles').select('id, display_name, avatar_url').in('id', userIds),
    supabase.from('shared_dive_likes').select('shared_dive_id').in('shared_dive_id', diveIds),
    supabase.from('shared_dive_comments').select('shared_dive_id').in('shared_dive_id', diveIds),
    currentUserId
      ? supabase.from('shared_dive_likes').select('shared_dive_id').eq('user_id', currentUserId).in('shared_dive_id', diveIds)
      : Promise.resolve({ data: [] }),
  ]);

  const profileMap = new Map<string, { id: string; display_name: string | null; avatar_url: string | null }>();
  (profilesRes.data ?? []).forEach((p) => {
    profileMap.set(p.id, { id: p.id, display_name: p.display_name, avatar_url: p.avatar_url });
  });

  const likesCount = new Map<string, number>();
  (likesRes.data ?? []).forEach((l) => {
    likesCount.set(l.shared_dive_id, (likesCount.get(l.shared_dive_id) ?? 0) + 1);
  });

  const commentsCount = new Map<string, number>();
  (commentsRes.data ?? []).forEach((c) => {
    commentsCount.set(c.shared_dive_id, (commentsCount.get(c.shared_dive_id) ?? 0) + 1);
  });

  const userLikedSet = new Set((userLikesRes.data ?? []).map((l) => l.shared_dive_id));

  const taggedIdsByDive = (dives as Array<{ id: string; tagged_user_ids?: string[] | null }>).map((d) => ({
    id: d.id,
    ids: d.tagged_user_ids ?? [],
  }));
  return dives.map((d) => {
    const tagged = taggedIdsByDive.find((t) => t.id === d.id);
    const tagged_profiles = (tagged?.ids ?? [])
      .map((id) => profileMap.get(id))
      .filter(Boolean) as Array<{ id: string; display_name: string | null; avatar_url: string | null }>;
    return {
      ...d,
      photo_urls: d.photo_urls ?? [],
      user_profile: profileMap.get(d.user_id) ?? null,
      tagged_profiles: tagged_profiles.length ? tagged_profiles : null,
      likes_count: likesCount.get(d.id) ?? 0,
      comments_count: commentsCount.get(d.id) ?? 0,
      user_liked: userLikedSet.has(d.id),
    };
  });
}

/** Obtener solo mis jornadas compartidas */
export async function getMySharedDives(userId: string): Promise<SharedDive[]> {
  return getSharedDives({ currentUserId: userId, onlyMine: true });
}

/** Obtener todas las jornadas (feed social) */
export async function getAllSharedDives(currentUserId?: string, limit?: number): Promise<SharedDive[]> {
  return getSharedDives({ currentUserId, limit });
}

/** Obtener jornadas de un usuario específico */
export async function getUserSharedDives(targetUserId: string, currentUserId?: string): Promise<SharedDive[]> {
  return getSharedDives({ currentUserId, filterByUserId: targetUserId });
}

/** Historias: jornadas de las últimas 24h, agrupadas por usuario. Usuarios con contenido nuevo primero. */
export type StoriesByUser = {
  user_id: string;
  user_profile: { display_name: string | null; avatar_url: string | null } | null;
  stories: SharedDive[];
  has_unseen: boolean;
};

export async function getStoriesFeed(
  currentUserId?: string,
  filterByUserId?: string
): Promise<StoriesByUser[]> {
  const since = new Date();
  since.setHours(since.getHours() - 24);
  const sinceIso = since.toISOString();

  let query = supabase
    .from('shared_dives')
    .select('*')
    .gte('created_at', sinceIso)
    .order('created_at', { ascending: false });

  if (filterByUserId) {
    query = query.eq('user_id', filterByUserId);
  }

  const { data: dives, error } = await query;
  if (error) throw error;
  if (!dives || dives.length === 0) return [];

  const userIds = [...new Set(dives.map((d) => d.user_id))];
  const diveIds = dives.map((d) => d.id);
  const [profilesRes, likesRes, commentsRes, userLikesRes] = await Promise.all([
    supabase.from('profiles').select('id, display_name, avatar_url').in('id', userIds),
    supabase.from('shared_dive_likes').select('shared_dive_id').in('shared_dive_id', diveIds),
    supabase.from('shared_dive_comments').select('shared_dive_id').in('shared_dive_id', diveIds),
    currentUserId
      ? supabase.from('shared_dive_likes').select('shared_dive_id').eq('user_id', currentUserId).in('shared_dive_id', diveIds)
      : Promise.resolve({ data: [] }),
  ]);

  const profileMap = new Map<string, { display_name: string | null; avatar_url: string | null }>();
  (profilesRes.data ?? []).forEach((p) => profileMap.set(p.id, { display_name: p.display_name, avatar_url: p.avatar_url }));

  const likesCount = new Map<string, number>();
  (likesRes.data ?? []).forEach((l) => likesCount.set(l.shared_dive_id, (likesCount.get(l.shared_dive_id) ?? 0) + 1));
  const commentsCount = new Map<string, number>();
  (commentsRes.data ?? []).forEach((c) => commentsCount.set(c.shared_dive_id, (commentsCount.get(c.shared_dive_id) ?? 0) + 1));
  const userLikedSet = new Set((userLikesRes.data ?? []).map((l) => l.shared_dive_id));

  const enriched: SharedDive[] = dives.map((d) => ({
    ...d,
    photo_urls: d.photo_urls ?? [],
    user_profile: profileMap.get(d.user_id) ?? null,
    likes_count: likesCount.get(d.id) ?? 0,
    comments_count: commentsCount.get(d.id) ?? 0,
    user_liked: userLikedSet.has(d.id),
  }));

  const grouped = new Map<string, SharedDive[]>();
  enriched.forEach((d) => {
    if (!grouped.has(d.user_id)) grouped.set(d.user_id, []);
    grouped.get(d.user_id)!.push(d);
  });

  const seenIds = getSeenStoryIds();

  const result: StoriesByUser[] = [];
  grouped.forEach((stories, uid) => {
    const hasUnseen = stories.some((s) => !seenIds.has(s.id));
    result.push({
      user_id: uid,
      user_profile: profileMap.get(uid) ?? null,
      stories,
      has_unseen: hasUnseen,
    });
  });

  result.sort((a, b) => {
    if (a.has_unseen && !b.has_unseen) return -1;
    if (!a.has_unseen && b.has_unseen) return 1;
    const aLatest = a.stories[0]?.created_at ?? '';
    const bLatest = b.stories[0]?.created_at ?? '';
    return bLatest.localeCompare(aLatest);
  });

  return result;
}

export const STORIES_SEEN_KEY = 'pelagos_seen_stories';
export const STORIES_SEEN_DATE_KEY = 'pelagos_seen_stories_date';

/** Clave para guardar cuándo se vio cada publicación del feed (main page) */
export const FEED_SEEN_KEY = 'pelagos_feed_seen';

/** Marca una publicación del feed como vista (usa timestamp para calcular 24h) */
export function markFeedPublicationAsSeen(diveId: string): void {
  try {
    const stored = localStorage.getItem(FEED_SEEN_KEY);
    const seen: Record<string, string> = stored ? JSON.parse(stored) : {};
    seen[diveId] = new Date().toISOString();
    // Mantener solo entradas de los últimos 7 días para no inflar localStorage
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const cleaned: Record<string, string> = {};
    for (const [id, ts] of Object.entries(seen)) {
      if (new Date(ts).getTime() > cutoff) cleaned[id] = ts;
    }
    localStorage.setItem(FEED_SEEN_KEY, JSON.stringify(cleaned));
  } catch {
    /* ignore */
  }
}

/** Devuelve mapa id -> timestamp de publicaciones vistas. Solo entradas vistas hace < 7 días. */
export function getFeedSeenTimestamps(): Record<string, string> {
  try {
    const stored = localStorage.getItem(FEED_SEEN_KEY);
    const seen: Record<string, string> = stored ? JSON.parse(stored) : {};
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const out: Record<string, string> = {};
    for (const [id, ts] of Object.entries(seen)) {
      if (new Date(ts).getTime() > cutoff) out[id] = ts;
    }
    return out;
  } catch {
    return {};
  }
}

/** Filtra y ordena publicaciones del feed: oculta las vistas hace > 24h; prioridad a no vistas */
export function filterAndSortFeedBySeen<T extends { id: string; created_at: string }>(
  dives: T[],
  seenTimestamps: Record<string, string>
): T[] {
  const now = Date.now();
  const TWENTY_FOUR_H = 24 * 60 * 60 * 1000;

  const visible = dives.filter((d) => {
    const seenAt = seenTimestamps[d.id];
    if (!seenAt) return true; // no vista → siempre visible
    const elapsed = now - new Date(seenAt).getTime();
    return elapsed < TWENTY_FOUR_H; // vista hace < 24h → visible
  });

  // Prioridad: no vistas primero, luego por fecha más reciente
  return visible.sort((a, b) => {
    const aSeen = !!seenTimestamps[a.id];
    const bSeen = !!seenTimestamps[b.id];
    if (!aSeen && bSeen) return -1;
    if (aSeen && !bSeen) return 1;
    return (b.created_at ?? '').localeCompare(a.created_at ?? '');
  });
}

export function markStoriesAsSeen(diveIds: string[]): void {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const storedDate = localStorage.getItem(STORIES_SEEN_DATE_KEY);
    let seen = new Set<string>();
    if (storedDate === today) {
      const stored = localStorage.getItem(STORIES_SEEN_KEY);
      if (stored) seen = new Set(JSON.parse(stored));
    }
    diveIds.forEach((id) => seen.add(id));
    localStorage.setItem(STORIES_SEEN_DATE_KEY, today);
    localStorage.setItem(STORIES_SEEN_KEY, JSON.stringify([...seen]));
  } catch {
    /* ignore */
  }
}

export function getSeenStoryIds(): Set<string> {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const storedDate = localStorage.getItem(STORIES_SEEN_DATE_KEY);
    if (storedDate !== today) return new Set();
    const stored = localStorage.getItem(STORIES_SEEN_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

export async function createSharedDive(
  userId: string,
  payload: CreateSharedDivePayload
): Promise<SharedDive> {
  const { data, error } = await supabase
    .from('shared_dives')
    .insert({
      user_id: userId,
      description: payload.description?.trim() || null,
      depth_min: payload.depth_min ?? null,
      depth_max: payload.depth_max ?? null,
      apnea_time_seconds: payload.apnea_time_seconds ?? null,
      current_type: payload.current_type?.trim() || null,
      dive_id: payload.dive_id ?? null,
      tagged_user_ids: payload.tagged_user_ids ?? [],
      photo_urls: [],
      video_url: null,
    })
    .select()
    .single();

  if (error) throw error;

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, avatar_url')
    .eq('id', userId)
    .single();

  return {
    ...data,
    photo_urls: data.photo_urls ?? [],
    user_profile: profile ?? null,
    likes_count: 0,
    comments_count: 0,
    user_liked: false,
  };
}

export async function uploadSharedDivePhoto(
  sharedDiveId: string,
  userId: string,
  file: File,
  index: number
): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${userId}/${sharedDiveId}/photo_${index}_${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(SHARED_DIVES_BUCKET)
    .upload(path, file, { upsert: true });

  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage.from(SHARED_DIVES_BUCKET).getPublicUrl(path);
  const publicUrl = urlData.publicUrl;

  const { data: current } = await supabase
    .from('shared_dives')
    .select('photo_urls')
    .eq('id', sharedDiveId)
    .single();

  const currentUrls = (current?.photo_urls as string[]) ?? [];
  const newUrls = [...currentUrls, publicUrl].slice(0, 2);

  await supabase
    .from('shared_dives')
    .update({ photo_urls: newUrls, updated_at: new Date().toISOString() })
    .eq('id', sharedDiveId);

  return publicUrl;
}

export async function uploadSharedDiveVideo(
  sharedDiveId: string,
  userId: string,
  file: File
): Promise<string> {
  const ext = file.name.split('.').pop() || 'mp4';
  const path = `${userId}/${sharedDiveId}/video_${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(SHARED_DIVES_BUCKET)
    .upload(path, file, { upsert: true });

  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage.from(SHARED_DIVES_BUCKET).getPublicUrl(path);
  const publicUrl = urlData.publicUrl;

  await supabase
    .from('shared_dives')
    .update({ video_url: publicUrl, updated_at: new Date().toISOString() })
    .eq('id', sharedDiveId);

  return publicUrl;
}

export async function toggleLike(sharedDiveId: string, userId: string): Promise<boolean> {
  const { data: existing } = await supabase
    .from('shared_dive_likes')
    .select('shared_dive_id')
    .eq('shared_dive_id', sharedDiveId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('shared_dive_likes')
      .delete()
      .eq('shared_dive_id', sharedDiveId)
      .eq('user_id', userId);
    return false;
  } else {
    await supabase
      .from('shared_dive_likes')
      .insert({ shared_dive_id: sharedDiveId, user_id: userId });
    return true;
  }
}

export async function getComments(sharedDiveId: string): Promise<SharedDiveComment[]> {
  const { data: comments, error } = await supabase
    .from('shared_dive_comments')
    .select('*')
    .eq('shared_dive_id', sharedDiveId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  if (!comments || comments.length === 0) return [];

  const userIds = [...new Set(comments.map((c) => c.user_id))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .in('id', userIds);

  const profileMap = new Map<string, { display_name: string | null; avatar_url: string | null }>();
  (profiles ?? []).forEach((p) => {
    profileMap.set(p.id, { display_name: p.display_name, avatar_url: p.avatar_url });
  });

  return comments.map((c) => ({
    ...c,
    user_profile: profileMap.get(c.user_id) ?? null,
  }));
}

export async function addComment(
  sharedDiveId: string,
  userId: string,
  content: string
): Promise<SharedDiveComment> {
  const { data, error } = await supabase
    .from('shared_dive_comments')
    .insert({
      shared_dive_id: sharedDiveId,
      user_id: userId,
      content: content.trim(),
    })
    .select()
    .single();

  if (error) throw error;

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, avatar_url')
    .eq('id', userId)
    .single();

  return {
    ...data,
    user_profile: profile ?? null,
  };
}

export async function deleteComment(commentId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('shared_dive_comments')
    .delete()
    .eq('id', commentId)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function deleteSharedDive(sharedDiveId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('shared_dives')
    .delete()
    .eq('id', sharedDiveId)
    .eq('user_id', userId);

  if (error) throw error;
}
