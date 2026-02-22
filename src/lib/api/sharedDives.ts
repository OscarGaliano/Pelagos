import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/types/database';

export type SharedDive = Database['public']['Tables']['shared_dives']['Row'] & {
  user_profile?: { display_name: string | null; avatar_url: string | null } | null;
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

  const profileMap = new Map<string, { display_name: string | null; avatar_url: string | null }>();
  (profilesRes.data ?? []).forEach((p) => {
    profileMap.set(p.id, { display_name: p.display_name, avatar_url: p.avatar_url });
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

  return dives.map((d) => ({
    ...d,
    photo_urls: d.photo_urls ?? [],
    user_profile: profileMap.get(d.user_id) ?? null,
    likes_count: likesCount.get(d.id) ?? 0,
    comments_count: commentsCount.get(d.id) ?? 0,
    user_liked: userLikedSet.has(d.id),
  }));
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
