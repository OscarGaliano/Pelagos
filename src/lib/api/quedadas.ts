import { createNotification } from '@/lib/api/notifications';
import { supabase } from '@/lib/supabase';
import type { Quedada } from '@/lib/types';

export type JoinMode = 'invite' | 'open' | 'request';

export async function getQuedadas(userId: string | undefined): Promise<Quedada[]> {
  const { data: quedadas, error } = await supabase
    .from('quedadas')
    .select('*')
    .order('meetup_date', { ascending: true })
    .order('meetup_time', { ascending: true });

  if (error) throw error;
  const list = (quedadas ?? []) as (Quedada & { admin_id: string })[];

  const ids = list.map((q) => q.id);
  const [participantsRes, invitationsRes, requestsRes] = await Promise.all([
    supabase.from('quedada_participants').select('quedada_id, user_id, role').in('quedada_id', ids),
    userId ? supabase.from('quedada_invitations').select('quedada_id, user_id, status').eq('user_id', userId).in('quedada_id', ids) : { data: [] },
    userId ? supabase.from('quedada_join_requests').select('quedada_id, user_id, status').eq('user_id', userId).in('quedada_id', ids) : { data: [] },
  ]);

  const participantsByQuedada = new Map<string, { user_id: string; role: string }[]>();
  (participantsRes.data ?? []).forEach((p: { quedada_id: string; user_id: string; role: string }) => {
    if (!participantsByQuedada.has(p.quedada_id)) participantsByQuedada.set(p.quedada_id, []);
    participantsByQuedada.get(p.quedada_id)!.push({ user_id: p.user_id, role: p.role });
  });

  const myInvitations = new Map<string, string>();
  (invitationsRes.data ?? []).forEach((i: { quedada_id: string; status: string }) => myInvitations.set(i.quedada_id, i.status));
  const myRequests = new Map<string, string>();
  (requestsRes.data ?? []).forEach((r: { quedada_id: string; status: string }) => myRequests.set(r.quedada_id, r.status));

  // Perfiles para creador y participantes (lista) — siempre para mostrar avatares
  const allUserIds = new Set<string>(list.map((q) => q.admin_id));
  (participantsRes.data ?? []).forEach((p: { user_id: string }) => allUserIds.add(p.user_id));
  const userIds = Array.from(allUserIds);
  const profileMap = new Map<string, { display_name: string | null; avatar_url: string | null }>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .in('id', userIds);
    (profiles ?? []).forEach((pr: { id: string; display_name: string | null; avatar_url: string | null }) => {
      profileMap.set(pr.id, { display_name: pr.display_name, avatar_url: pr.avatar_url });
    });
  }

  return list.map((q) => {
    const participants = participantsByQuedada.get(q.id) ?? [];
    const isAdmin = userId ? q.admin_id === userId : false;
    const isParticipant = userId ? participants.some((p) => p.user_id === userId) : false;
    const creator_profile = profileMap.get(q.admin_id) ?? null;
    const list_participants = participants.map((p) => ({
      user_id: p.user_id,
      role: p.role,
      ...(profileMap.get(p.user_id) ?? { display_name: null, avatar_url: null }),
    }));
    return {
      ...q,
      participants_count: participants.length,
      is_admin: isAdmin,
      is_participant: isParticipant,
      my_invitation: (userId ? myInvitations.get(q.id) : undefined) as Quedada['my_invitation'],
      my_request: (userId ? myRequests.get(q.id) : undefined) as Quedada['my_request'],
      creator_profile,
      list_participants,
    };
  }) as Quedada[];
}

/** Quedadas/salidas publicadas en novedades (para Inicio). */
export async function getNovedadesQuedadas(userId: string | undefined): Promise<Quedada[]> {
  const { data: quedadas, error } = await supabase
    .from('quedadas')
    .select('*')
    .eq('published_in_novedades', true)
    .order('meetup_date', { ascending: true })
    .order('meetup_time', { ascending: true });

  if (error) throw error;
  const list = (quedadas ?? []) as (Quedada & { admin_id: string })[];

  if (list.length === 0) return [];

  const ids = list.map((q) => q.id);
  const [participantsRes, invitationsRes, requestsRes] = await Promise.all([
    supabase.from('quedada_participants').select('quedada_id, user_id, role').in('quedada_id', ids),
    userId ? supabase.from('quedada_invitations').select('quedada_id, user_id, status').eq('user_id', userId).in('quedada_id', ids) : { data: [] },
    userId ? supabase.from('quedada_join_requests').select('quedada_id, user_id, status').eq('user_id', userId).in('quedada_id', ids) : { data: [] },
  ]);

  const participantsByQuedada = new Map<string, { user_id: string; role: string }[]>();
  (participantsRes.data ?? []).forEach((p: { quedada_id: string; user_id: string; role: string }) => {
    if (!participantsByQuedada.has(p.quedada_id)) participantsByQuedada.set(p.quedada_id, []);
    participantsByQuedada.get(p.quedada_id)!.push({ user_id: p.user_id, role: p.role });
  });

  const myInvitations = new Map<string, string>();
  (invitationsRes.data ?? []).forEach((i: { quedada_id: string; status: string }) => myInvitations.set(i.quedada_id, i.status));
  const myRequests = new Map<string, string>();
  (requestsRes.data ?? []).forEach((r: { quedada_id: string; status: string }) => myRequests.set(r.quedada_id, r.status));

  const allUserIds = new Set<string>(list.map((q) => q.admin_id));
  (participantsRes.data ?? []).forEach((p: { user_id: string }) => allUserIds.add(p.user_id));
  const userIds = Array.from(allUserIds);
  const profileMap = new Map<string, { display_name: string | null; avatar_url: string | null }>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .in('id', userIds);
    (profiles ?? []).forEach((pr: { id: string; display_name: string | null; avatar_url: string | null }) => {
      profileMap.set(pr.id, { display_name: pr.display_name, avatar_url: pr.avatar_url });
    });
  }

  return list.map((q) => {
    const participants = participantsByQuedada.get(q.id) ?? [];
    const isAdmin = userId ? q.admin_id === userId : false;
    const isParticipant = userId ? participants.some((p) => p.user_id === userId) : false;
    const creator_profile = profileMap.get(q.admin_id) ?? null;
    const list_participants = participants.map((p) => ({
      user_id: p.user_id,
      role: p.role,
      ...(profileMap.get(p.user_id) ?? { display_name: null, avatar_url: null }),
    }));
    return {
      ...q,
      participants_count: participants.length,
      is_admin: isAdmin,
      is_participant: isParticipant,
      my_invitation: (userId ? myInvitations.get(q.id) : undefined) as Quedada['my_invitation'],
      my_request: (userId ? myRequests.get(q.id) : undefined) as Quedada['my_request'],
      creator_profile,
      list_participants,
    };
  }) as Quedada[];
}

export async function getQuedadaById(quedadaId: string, userId: string | undefined): Promise<Quedada | null> {
  const { data, error } = await supabase
    .from('quedadas')
    .select('*')
    .eq('id', quedadaId)
    .single();

  if (error || !data) return null;
  const q = data as Quedada & { admin_id: string };

  const [{ data: participants }, { data: myInv }, { data: myReq }] = await Promise.all([
    supabase.from('quedada_participants').select('user_id, role').eq('quedada_id', quedadaId),
    userId ? supabase.from('quedada_invitations').select('status').eq('quedada_id', quedadaId).eq('user_id', userId).maybeSingle() : { data: null },
    userId ? supabase.from('quedada_join_requests').select('status').eq('quedada_id', quedadaId).eq('user_id', userId).maybeSingle() : { data: null },
  ]);

  return {
    ...q,
    participants_count: (participants ?? []).length,
    is_admin: q.admin_id === userId,
    is_participant: (participants ?? []).some((p: { user_id: string }) => p.user_id === userId),
    my_invitation: (myInv as { status: string } | null)?.status as Quedada['my_invitation'],
    my_request: (myReq as { status: string } | null)?.status as Quedada['my_request'],
  } as Quedada;
}

export type EventoTipo = 'quedada' | 'salida';

/** Quedada: el admin elige cuántas personas pueden unirse (o sin límite). Salida: max 4, abierta o privada. */
export async function createQuedada(
  adminId: string,
  payload: {
    tipo: EventoTipo;
    title?: string;
    meetup_date: string;
    meetup_time: string;
    place: string;
    place_lat?: number | null;
    place_lng?: number | null;
    lugar_pesca?: string | null;
    zona_id?: string | null;
    dive_spot_id?: string | null;
    /** Quedada: número elegido por admin o null (sin límite). Salida: siempre 4. */
    max_participants?: number | null;
    /** Quedada y salida: 'open' (abierta) o 'request' (privada). */
    join_mode?: JoinMode;
    published_in_novedades?: boolean;
  }
) {
  const isQuedada = payload.tipo === 'quedada';
  const maxParticipants = isQuedada ? (payload.max_participants ?? null) : 4;
  const joinMode: JoinMode = payload.join_mode ?? 'open';

  const { data: quedada, error } = await supabase
    .from('quedadas')
    .insert({
      admin_id: adminId,
      tipo: payload.tipo,
      title: payload.title ?? null,
      meetup_date: payload.meetup_date,
      meetup_time: payload.meetup_time,
      place: payload.place,
      place_lat: payload.place_lat ?? null,
      place_lng: payload.place_lng ?? null,
      lugar_pesca: payload.lugar_pesca ?? null,
      zona_id: payload.zona_id ?? null,
      dive_spot_id: payload.dive_spot_id ?? null,
      max_participants: maxParticipants,
      join_mode: joinMode,
      published_in_novedades: payload.published_in_novedades ?? false,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  await supabase.from('quedada_participants').insert({
    quedada_id: quedada.id,
    user_id: adminId,
    role: 'admin',
  });
  return quedada;
}

export async function updateQuedada(
  quedadaId: string,
  adminId: string,
  updates: {
    title?: string | null;
    meetup_date?: string;
    meetup_time?: string;
    place?: string;
    place_lat?: number | null;
    place_lng?: number | null;
    lugar_pesca?: string | null;
    zona_id?: string | null;
    dive_spot_id?: string | null;
    max_participants?: number | null;
    join_mode?: JoinMode;
    published_in_novedades?: boolean;
  }
) {
  const { data, error } = await supabase
    .from('quedadas')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', quedadaId)
    .eq('admin_id', adminId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getParticipants(quedadaId: string) {
  const { data, error } = await supabase
    .from('quedada_participants')
    .select('user_id, role, joined_at')
    .eq('quedada_id', quedadaId)
    .order('joined_at', { ascending: true });
  if (error) throw error;
  const list = (data ?? []) as Array<{ user_id: string; role: string; joined_at: string }>;
  if (list.length === 0) return [];
  const { data: profiles } = await supabase.from('profiles').select('id, display_name, avatar_url').in('id', list.map((p) => p.user_id));
  const profileMap = new Map((profiles ?? []).map((pr: { id: string; display_name: string | null; avatar_url: string | null }) => [pr.id, pr]));
  return list.map((p) => ({ ...p, profiles: profileMap.get(p.user_id) ?? null }));
}

export async function getInvitations(quedadaId: string) {
  const { data, error } = await supabase
    .from('quedada_invitations')
    .select('user_id, status, invited_at')
    .eq('quedada_id', quedadaId);
  if (error) throw error;
  return data ?? [];
}

export async function getJoinRequests(quedadaId: string) {
  const { data, error } = await supabase
    .from('quedada_join_requests')
    .select('user_id, status, requested_at')
    .eq('quedada_id', quedadaId)
    .eq('status', 'pending');
  if (error) throw error;
  const list = (data ?? []) as Array<{ user_id: string; status: string; requested_at: string }>;
  if (list.length === 0) return [];
  const { data: profiles } = await supabase.from('profiles').select('id, display_name, avatar_url').in('id', list.map((r) => r.user_id));
  const profileMap = new Map((profiles ?? []).map((pr: { id: string; display_name: string | null; avatar_url: string | null }) => [pr.id, pr]));
  return list.map((r) => ({ ...r, profiles: profileMap.get(r.user_id) ?? null }));
}

export async function inviteUser(quedadaId: string, adminId: string, userId: string) {
  const { error } = await supabase.from('quedada_invitations').insert({
    quedada_id: quedadaId,
    user_id: userId,
    status: 'pending',
  });
  if (error) throw error;
}

export async function acceptInvitation(quedadaId: string, userId: string) {
  const { error: upd } = await supabase
    .from('quedada_invitations')
    .update({ status: 'accepted' })
    .eq('quedada_id', quedadaId)
    .eq('user_id', userId);
  if (upd) throw upd;
  const { error: ins } = await supabase.from('quedada_participants').insert({
    quedada_id: quedadaId,
    user_id: userId,
    role: 'participant',
  });
  if (ins) throw ins;
}

export async function joinOpen(quedadaId: string, userId: string) {
  const { data: q } = await supabase.from('quedadas').select('max_participants').eq('id', quedadaId).single();
  if (q) {
    const { count } = await supabase.from('quedada_participants').select('*', { count: 'exact', head: true }).eq('quedada_id', quedadaId);
    if (q.max_participants != null && (count ?? 0) >= q.max_participants) throw new Error('Plazas completas');
  }
  const { error } = await supabase.from('quedada_participants').insert({
    quedada_id: quedadaId,
    user_id: userId,
    role: 'participant',
  });
  if (error) throw error;
}

export async function requestToJoin(quedadaId: string, userId: string) {
  const { data: q } = await supabase.from('quedadas').select('admin_id, title').eq('id', quedadaId).single();
  if (!q) throw new Error('Quedada no encontrada');
  const { error } = await supabase.from('quedada_join_requests').insert({
    quedada_id: quedadaId,
    user_id: userId,
    status: 'pending',
  });
  if (error) throw error;
  const { data: requester } = await supabase.from('profiles').select('display_name').eq('id', userId).single();
  const name = (requester as { display_name?: string } | null)?.display_name ?? 'Un usuario';
  await createNotification(
    (q as { admin_id: string }).admin_id,
    'quedada_join_request',
    'Nueva solicitud',
    `${name} quiere unirse a la quedada "${(q as { title?: string }).title ?? 'Sin título'}"`,
    { quedada_id: quedadaId, user_id: userId }
  );
}

export async function acceptJoinRequest(quedadaId: string, adminId: string, userId: string) {
  const { data: q } = await supabase.from('quedadas').select('max_participants, title').eq('id', quedadaId).single();
  if (q) {
    const { count } = await supabase.from('quedada_participants').select('*', { count: 'exact', head: true }).eq('quedada_id', quedadaId);
    if (q.max_participants != null && (count ?? 0) >= q.max_participants) throw new Error('Plazas completas');
  }
  const { error: upd } = await supabase
    .from('quedada_join_requests')
    .update({ status: 'accepted', reviewed_at: new Date().toISOString(), reviewed_by: adminId })
    .eq('quedada_id', quedadaId)
    .eq('user_id', userId);
  if (upd) throw upd;
  const { error: ins } = await supabase.from('quedada_participants').insert({
    quedada_id: quedadaId,
    user_id: userId,
    role: 'participant',
  });
  if (ins) throw ins;
  const title = (q as { title?: string } | null)?.title ?? 'la quedada';
  await createNotification(
    userId,
    'quedada_request_accepted',
    'Solicitud aceptada',
    `Tu solicitud para unirte a "${title}" ha sido aceptada`,
    { quedada_id: quedadaId }
  );
}

export async function denyJoinRequest(quedadaId: string, adminId: string, userId: string) {
  const { data: q } = await supabase.from('quedadas').select('title').eq('id', quedadaId).single();
  const { error } = await supabase
    .from('quedada_join_requests')
    .update({ status: 'denied', reviewed_at: new Date().toISOString(), reviewed_by: adminId })
    .eq('quedada_id', quedadaId)
    .eq('user_id', userId);
  if (error) throw error;
  const title = (q as { title?: string } | null)?.title ?? 'la quedada';
  await createNotification(
    userId,
    'quedada_request_rejected',
    'Solicitud denegada',
    `Tu solicitud para unirte a "${title}" ha sido denegada`,
    { quedada_id: quedadaId }
  );
}

export async function leaveQuedada(quedadaId: string, userId: string) {
  const { data: q } = await supabase.from('quedadas').select('admin_id').eq('id', quedadaId).single();
  if (q?.admin_id === userId) throw new Error('El administrador no puede abandonar la quedada');
  const { error } = await supabase.from('quedada_participants').delete().eq('quedada_id', quedadaId).eq('user_id', userId);
  if (error) throw error;
}

export async function searchUsersForInvite(query: string, limit = 20) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .or(`display_name.ilike.%${query}%,location.ilike.%${query}%`)
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}
