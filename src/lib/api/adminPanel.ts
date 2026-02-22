import { supabase } from '@/lib/supabase';

// ==================== TIPOS ====================

export interface News {
  id: string;
  title: string;
  content: string | null;
  image_url: string | null;
  images: string[];
  link_url: string | null;
  is_published: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BlockedUser {
  id: string;
  user_id: string;
  reason: string | null;
  blocked_by: string | null;
  blocked_at: string;
  unblocked_at: string | null;
  is_active: boolean;
  user_profile?: {
    display_name: string | null;
    avatar_url: string | null;
    email?: string;
  };
}

export interface Report {
  id: string;
  reporter_id: string;
  reported_user_id: string | null;
  reported_content_type: 'user' | 'dive' | 'comment' | 'message' | 'quedada' | 'league';
  reported_content_id: string | null;
  reason: string;
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
  admin_notes: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  reporter_profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
  reported_user_profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

export interface HomeSection {
  id: string;
  title: string;
  subtitle: string | null;
  icon: string;
  content_type: 'html' | 'link' | 'image' | 'carousel';
  content: Record<string, unknown>;
  images: string[];
  links: { url: string; label: string }[];
  sort_order: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BroadcastMessage {
  id: string;
  title: string;
  content: string;
  sent_by: string | null;
  sent_at: string;
  recipient_count: number;
}

export interface ModerationLog {
  id: string;
  action_type: 'delete_post' | 'delete_comment' | 'delete_dive' | 'warn_user' | 'other';
  target_type: 'shared_dive' | 'comment' | 'message' | 'league' | 'quedada' | 'user';
  target_id: string;
  target_user_id: string | null;
  reason: string;
  moderator_id: string | null;
  created_at: string;
}

export interface SharedDiveForAdmin {
  id: string;
  user_id: string;
  description: string | null;
  photo_urls: string[];
  video_url: string | null;
  created_at: string;
  user_profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

export interface CommentForAdmin {
  id: string;
  shared_dive_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user_profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

export interface DiveScenario {
  id: string;
  user_id: string;
  dive_date: string;
  location_name: string | null;
  gps_lat: number | null;
  gps_lng: number | null;
  notes: string | null;
  created_at: string;
  user_profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

export interface UserForAdmin {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  email: string;
  is_app_admin: boolean;
  is_blocked: boolean;
  member_since: string | null;
}

// ==================== NOTICIAS ====================

export async function getNews(includeUnpublished = false): Promise<News[]> {
  let query = supabase
    .from('news')
    .select('*')
    .order('created_at', { ascending: false });

  if (!includeUnpublished) {
    query = query.eq('is_published', true);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as News[];
}

export async function createNews(news: {
  title: string;
  content?: string;
  image_url?: string;
  images?: string[];
  link_url?: string;
  is_published?: boolean;
}): Promise<News> {
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from('news')
    .insert({
      ...news,
      images: news.images || [],
      created_by: user?.id,
    })
    .select()
    .single();

  if (error) throw error;
  return data as News;
}

export async function uploadAdminImage(file: File, folder: string): Promise<string> {
  const ext = file.name.split('.').pop();
  const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage
    .from('admin-media')
    .upload(fileName, file, { cacheControl: '3600', upsert: false });

  if (error) throw error;

  const { data: urlData } = supabase.storage
    .from('admin-media')
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}

export async function updateNews(id: string, updates: Partial<News>): Promise<News> {
  const { data, error } = await supabase
    .from('news')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as News;
}

export async function deleteNews(id: string): Promise<void> {
  const { error } = await supabase.from('news').delete().eq('id', id);
  if (error) throw error;
}

// ==================== USUARIOS Y BLOQUEOS ====================

export async function getAllUsers(): Promise<UserForAdmin[]> {
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, is_app_admin, member_since')
    .order('display_name', { ascending: true });

  if (error) throw error;

  // Obtener emails de auth.users (solo disponible para admins via RPC o edge function)
  // Por ahora usamos los perfiles directamente
  const { data: blockedData } = await supabase
    .from('blocked_users')
    .select('user_id')
    .eq('is_active', true);

  const blockedIds = new Set((blockedData || []).map(b => b.user_id));

  return (profiles || []).map(p => ({
    id: p.id,
    display_name: p.display_name,
    avatar_url: p.avatar_url,
    email: '', // Se puede obtener con edge function si es necesario
    is_app_admin: p.is_app_admin || false,
    is_blocked: blockedIds.has(p.id),
    member_since: p.member_since,
  }));
}

export async function getBlockedUsers(): Promise<BlockedUser[]> {
  const { data, error } = await supabase
    .from('blocked_users')
    .select('*')
    .eq('is_active', true)
    .order('blocked_at', { ascending: false });

  if (error) throw error;

  // Obtener perfiles de usuarios bloqueados
  const userIds = (data || []).map(b => b.user_id);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .in('id', userIds);

  const profileMap = new Map((profiles || []).map(p => [p.id, p]));

  return (data || []).map(b => ({
    ...b,
    user_profile: profileMap.get(b.user_id) || null,
  })) as BlockedUser[];
}

export async function blockUser(userId: string, reason?: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase.from('blocked_users').insert({
    user_id: userId,
    reason,
    blocked_by: user?.id,
  });

  if (error) throw error;
}

export async function unblockUser(userId: string): Promise<void> {
  const { error } = await supabase
    .from('blocked_users')
    .update({ is_active: false, unblocked_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('is_active', true);

  if (error) throw error;
}

// ==================== REPORTES ====================

export async function getReports(status?: string): Promise<Report[]> {
  let query = supabase
    .from('reports')
    .select('*')
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) throw error;

  // Obtener perfiles
  const reporterIds = [...new Set((data || []).map(r => r.reporter_id))];
  const reportedIds = [...new Set((data || []).map(r => r.reported_user_id).filter(Boolean))];
  const allIds = [...new Set([...reporterIds, ...reportedIds])];

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .in('id', allIds);

  const profileMap = new Map((profiles || []).map(p => [p.id, p]));

  return (data || []).map(r => ({
    ...r,
    reporter_profile: profileMap.get(r.reporter_id) || null,
    reported_user_profile: r.reported_user_id ? profileMap.get(r.reported_user_id) || null : null,
  })) as Report[];
}

export async function updateReportStatus(
  id: string,
  status: Report['status'],
  adminNotes?: string
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();

  const updates: Record<string, unknown> = { status };
  if (adminNotes !== undefined) updates.admin_notes = adminNotes;
  if (status === 'resolved' || status === 'dismissed') {
    updates.resolved_by = user?.id;
    updates.resolved_at = new Date().toISOString();
  }

  const { error } = await supabase.from('reports').update(updates).eq('id', id);
  if (error) throw error;
}

// ==================== SECCIONES HOME ====================

export async function getHomeSections(includeInactive = false): Promise<HomeSection[]> {
  let query = supabase
    .from('home_sections')
    .select('*')
    .order('sort_order', { ascending: true });

  if (!includeInactive) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as HomeSection[];
}

export async function createHomeSection(section: {
  title: string;
  subtitle?: string;
  icon?: string;
  content_type: HomeSection['content_type'];
  content?: Record<string, unknown>;
  sort_order?: number;
}): Promise<HomeSection> {
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('home_sections')
    .insert({
      ...section,
      created_by: user?.id,
    })
    .select()
    .single();

  if (error) throw error;
  return data as HomeSection;
}

export async function updateHomeSection(id: string, updates: Partial<HomeSection>): Promise<HomeSection> {
  const { data, error } = await supabase
    .from('home_sections')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as HomeSection;
}

export async function deleteHomeSection(id: string): Promise<void> {
  const { error } = await supabase.from('home_sections').delete().eq('id', id);
  if (error) throw error;
}

// ==================== LUGARES DE PESCA ====================

export async function deleteFishingSpot(id: string): Promise<void> {
  const { error } = await supabase.from('fishing_spots').delete().eq('id', id);
  if (error) throw error;
}

export async function getFishingSpots(): Promise<Array<{
  id: string;
  name: string;
  lat: number;
  lng: number;
  created_at: string;
}>> {
  const { data, error } = await supabase
    .from('fishing_spots')
    .select('id, name, lat, lng, created_at')
    .order('name', { ascending: true });

  if (error) throw error;
  return (data || []) as Array<{ id: string; name: string; lat: number; lng: number; created_at: string }>;
}

// ==================== ESTADÍSTICAS ====================

export async function getAdminStats(): Promise<{
  totalUsers: number;
  blockedUsers: number;
  pendingReports: number;
  totalNews: number;
  totalDives: number;
  totalLeagues: number;
}> {
  const [
    { count: totalUsers },
    { count: blockedUsers },
    { count: pendingReports },
    { count: totalNews },
    { count: totalDives },
    { count: totalLeagues },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('blocked_users').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('news').select('*', { count: 'exact', head: true }),
    supabase.from('shared_dives').select('*', { count: 'exact', head: true }),
    supabase.from('leagues').select('*', { count: 'exact', head: true }),
  ]);

  return {
    totalUsers: totalUsers || 0,
    blockedUsers: blockedUsers || 0,
    pendingReports: pendingReports || 0,
    totalNews: totalNews || 0,
    totalDives: totalDives || 0,
    totalLeagues: totalLeagues || 0,
  };
}

// ==================== MENSAJES MASIVOS ====================

export async function sendBroadcastMessage(title: string, content: string): Promise<BroadcastMessage> {
  const { data: { user } } = await supabase.auth.getUser();

  // Obtener todos los usuarios
  const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true });

  // Crear el registro del broadcast
  const { data: broadcast, error: broadcastError } = await supabase
    .from('broadcast_messages')
    .insert({
      title,
      content,
      sent_by: user?.id,
      recipient_count: count || 0,
    })
    .select()
    .single();

  if (broadcastError) throw broadcastError;

  // Obtener todos los IDs de usuarios
  const { data: profiles } = await supabase.from('profiles').select('id');

  // Crear notificaciones para todos los usuarios
  if (profiles && profiles.length > 0) {
    const notifications = profiles.map(p => ({
      user_id: p.id,
      type: 'broadcast',
      title,
      body: content,
      data: { broadcast_id: broadcast.id },
    }));

    await supabase.from('notifications').insert(notifications);
  }

  return broadcast as BroadcastMessage;
}

export async function getBroadcastHistory(): Promise<BroadcastMessage[]> {
  const { data, error } = await supabase
    .from('broadcast_messages')
    .select('*')
    .order('sent_at', { ascending: false });

  if (error) throw error;
  return (data || []) as BroadcastMessage[];
}

// ==================== MODERACIÓN ====================

export async function getAllSharedDivesAdmin(): Promise<SharedDiveForAdmin[]> {
  const { data, error } = await supabase
    .from('shared_dives')
    .select('id, user_id, description, photo_urls, video_url, created_at')
    .order('created_at', { ascending: false });

  if (error) throw error;

  const userIds = [...new Set((data || []).map(d => d.user_id))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .in('id', userIds);

  const profileMap = new Map((profiles || []).map(p => [p.id, p]));

  return (data || []).map(d => ({
    ...d,
    user_profile: profileMap.get(d.user_id) || null,
  })) as SharedDiveForAdmin[];
}

export async function getAllCommentsAdmin(): Promise<CommentForAdmin[]> {
  const { data, error } = await supabase
    .from('shared_dive_comments')
    .select('id, shared_dive_id, user_id, content, created_at')
    .order('created_at', { ascending: false });

  if (error) throw error;

  const userIds = [...new Set((data || []).map(c => c.user_id))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .in('id', userIds);

  const profileMap = new Map((profiles || []).map(p => [p.id, p]));

  return (data || []).map(c => ({
    ...c,
    user_profile: profileMap.get(c.user_id) || null,
  })) as CommentForAdmin[];
}

export async function deleteSharedDiveAdmin(id: string, reason: string, targetUserId?: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();

  // Log de moderación
  await supabase.from('moderation_log').insert({
    action_type: 'delete_dive',
    target_type: 'shared_dive',
    target_id: id,
    target_user_id: targetUserId || null,
    reason,
    moderator_id: user?.id,
  });

  // Eliminar la publicación
  const { error } = await supabase.from('shared_dives').delete().eq('id', id);
  if (error) throw error;

  // Notificar al usuario si existe
  if (targetUserId) {
    await supabase.from('notifications').insert({
      user_id: targetUserId,
      type: 'moderation',
      title: 'Publicación eliminada',
      body: `Tu publicación ha sido eliminada. Motivo: ${reason}`,
      data: { dive_id: id },
    });
  }
}

export async function deleteCommentAdmin(id: string, reason: string, targetUserId?: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();

  // Log de moderación
  await supabase.from('moderation_log').insert({
    action_type: 'delete_comment',
    target_type: 'comment',
    target_id: id,
    target_user_id: targetUserId || null,
    reason,
    moderator_id: user?.id,
  });

  // Eliminar el comentario
  const { error } = await supabase.from('shared_dive_comments').delete().eq('id', id);
  if (error) throw error;

  // Notificar al usuario si existe
  if (targetUserId) {
    await supabase.from('notifications').insert({
      user_id: targetUserId,
      type: 'moderation',
      title: 'Comentario eliminado',
      body: `Tu comentario ha sido eliminado. Motivo: ${reason}`,
      data: { comment_id: id },
    });
  }
}

export async function getModerationLog(): Promise<ModerationLog[]> {
  const { data, error } = await supabase
    .from('moderation_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw error;
  return (data || []) as ModerationLog[];
}

// ==================== FISHING SPOTS (mejorado) ====================

export async function createFishingSpot(spot: {
  name: string;
  description?: string;
  lat: number;
  lng: number;
  spot_type?: string;
  is_public?: boolean;
}): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase.from('fishing_spots').insert({
    ...spot,
    created_by: user?.id,
  });

  if (error) throw error;
}

// ==================== ESCENARIOS DE PESCA (DIVES) ====================

export async function getAllDiveScenarios(): Promise<DiveScenario[]> {
  const { data, error } = await supabase
    .from('dives')
    .select('id, user_id, dive_date, location_name, gps_lat, gps_lng, notes, created_at')
    .not('gps_lat', 'is', null)
    .not('gps_lng', 'is', null)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const userIds = [...new Set((data || []).map(d => d.user_id))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .in('id', userIds);

  const profileMap = new Map((profiles || []).map(p => [p.id, p]));

  return (data || []).map(d => ({
    ...d,
    user_profile: profileMap.get(d.user_id) || null,
  })) as DiveScenario[];
}

export async function deleteDiveScenario(id: string, reason: string, targetUserId?: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();

  // Log de moderación
  await supabase.from('moderation_log').insert({
    action_type: 'delete_dive',
    target_type: 'shared_dive',
    target_id: id,
    target_user_id: targetUserId || null,
    reason,
    moderator_id: user?.id,
  });

  // Eliminar el escenario
  const { error } = await supabase.from('dives').delete().eq('id', id);
  if (error) throw error;

  // Notificar al usuario
  if (targetUserId) {
    await supabase.from('notifications').insert({
      user_id: targetUserId,
      type: 'moderation',
      title: 'Escenario eliminado',
      body: `Tu escenario de pesca ha sido eliminado. Motivo: ${reason}`,
      data: { dive_id: id },
    });
  }
}
