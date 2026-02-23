import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';

const AVATAR_BUCKET = 'avatars';

/** Texto para mostrar tipo de pesca (para perfil propio o de otros usuarios en comunidad, etc.). */
export function formatFishingModalities(profile: { fishing_infantry?: boolean; fishing_boat?: boolean } | null): string {
  if (!profile) return '—';
  const parts = [];
  if (profile.fishing_infantry) parts.push('Infantería');
  if (profile.fishing_boat) parts.push('Embarcación');
  return parts.length ? parts.join(', ') : '—';
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

/** Lista de perfiles para la sección Pescasub (avatar, nivel, zona, miembro desde, tipo pesca). */
export async function getProfilesForPescasub(): Promise<Array<{
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  experience_level: string;
  location: string | null;
  member_since: string | null;
  fishing_infantry: boolean;
  fishing_boat: boolean;
}>> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, experience_level, location, member_since, fishing_infantry, fishing_boat')
    .order('display_name', { ascending: true, nullsFirst: false });

  if (error) throw error;
  return (data ?? []) as Array<{
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    experience_level: string;
    location: string | null;
    member_since: string | null;
    fishing_infantry: boolean;
    fishing_boat: boolean;
  }>;
}

/** Crea la fila de perfil si no existe (para usuarios recién registrados). */
export async function ensureProfile(userId: string): Promise<Profile> {
  const existing = await getProfile(userId);
  if (existing) return existing;
  const { data, error } = await supabase
    .from('profiles')
    .insert({ id: userId })
    .select()
    .single();
  if (error) throw error;
  return data as Profile;
}

export async function updateProfile(
  userId: string,
  updates: Partial<Pick<Profile, 'display_name' | 'avatar_url' | 'emergency_contact' | 'depth_limit_m' | 'share_location' | 'experience_level' | 'phone' | 'location' | 'fishing_infantry' | 'fishing_boat'>>
) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Solicita eliminar la cuenta del usuario actual. Llama a la Edge Function que usa Admin API. */
export async function deleteAccount(): Promise<void> {
  const { data, error } = await supabase.functions.invoke('deleteUser', { method: 'POST' });
  if (error) throw error;
  const body = data as { error?: string } | null;
  if (body?.error) throw new Error(body.error);
}

/** Sube una imagen como avatar y devuelve la URL pública. Actualiza el perfil con esa URL. */
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${userId}/avatar.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type || 'image/jpeg' });
  if (uploadError) throw uploadError;
  const { data: urlData } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  const publicUrl = urlData.publicUrl;
  await updateProfile(userId, { avatar_url: publicUrl });
  return publicUrl;
}
