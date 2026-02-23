import { createNotification } from '@/lib/api/notifications';
import { supabase } from '@/lib/supabase';
import type {
    League,
    LeagueCatch,
    LeagueParticipantWithProfile,
    LeagueStandingEntry,
    SpeciesScoringEntry,
} from '@/lib/types';
import type { Database } from '@/lib/types/database';

export type LeagueType = 'liga' | 'campeonato';

export type CompetitionType = 'pieza_mayor' | 'rancho';

/** Payload para crear una liga */
export type CreateLigaPayload = {
  name: string;
  type: 'liga';
  description?: string | null;
  max_participants: number | null;
  start_date: string | null;
  end_date: string | null;
  zone_description: string | null;
  zone_point: { lat: number; lng: number } | null;
  zone_polygon: [number, number][] | null;
  additional_rules: string | null;
  species_scoring: SpeciesScoringEntry[];
  biggest_catch_prize: boolean;
  biggest_catch_points: number | null;
  biggest_catch_prize_description: string | null;
  is_public: boolean;
  premio?: string | null;
  cover_image_url?: string | null;
};

/** Payload para crear un campeonato (ahora con todas las funcionalidades) */
export type CreateCampeonatoPayload = {
  name: string;
  type: 'campeonato';
  description?: string | null;
  max_participants: number | null;
  start_date: string | null;
  end_date: string | null;
  zone_description: string | null;
  zone_point: { lat: number; lng: number } | null;
  zone_polygon: [number, number][] | null;
  additional_rules: string | null;
  species_scoring: SpeciesScoringEntry[];
  competition_type: CompetitionType;
  is_public: boolean;
  premio?: string | null;
  cover_image_url?: string | null;
};

export type CreateLeaguePayload = CreateLigaPayload | CreateCampeonatoPayload;

/** Payload para editar liga (solo admin). Campos opcionales. */
export type UpdateLigaPayload = {
  name?: string;
  description?: string | null;
  max_participants?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  zone_description?: string | null;
  zone_point?: { lat: number; lng: number } | null;
  zone_polygon?: [number, number][] | null;
  additional_rules?: string | null;
  species_scoring?: SpeciesScoringEntry[];
  biggest_catch_prize?: boolean;
  biggest_catch_points?: number | null;
  biggest_catch_prize_description?: string | null;
  is_public?: boolean;
  premio?: string | null;
  cover_image_url?: string | null;
};

/** Payload para editar campeonato (solo admin). */
export type UpdateCampeonatoPayload = {
  name?: string;
  description?: string | null;
  max_participants?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  zone_description?: string | null;
  zone_point?: { lat: number; lng: number } | null;
  zone_polygon?: [number, number][] | null;
  additional_rules?: string | null;
  species_scoring?: SpeciesScoringEntry[];
  competition_type?: CompetitionType;
  is_public?: boolean;
  premio?: string | null;
  cover_image_url?: string | null;
};

export type UpdateLeaguePayload = UpdateLigaPayload | UpdateCampeonatoPayload;

export async function getLeagues(userId: string | undefined): Promise<League[]> {
  const { data: rows, error } = await supabase
    .from('leagues')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  const list = (rows ?? []) as (Database['public']['Tables']['leagues']['Row'] & Record<string, unknown>)[];

  if (list.length === 0) return [] as League[];

  const ids = list.map((l) => l.id);
  const [participantsRes, requestsRes, invitationsRes] = await Promise.all([
    supabase.from('league_participants').select('league_id, user_id').in('league_id', ids),
    userId ? supabase.from('league_join_requests').select('league_id, user_id, status').eq('user_id', userId).in('league_id', ids) : { data: [] },
    userId ? supabase.from('league_invitations').select('league_id, user_id, status').eq('user_id', userId).in('league_id', ids) : { data: [] },
  ]);
  // Si las tablas no existen (migraciones no aplicadas), Supabase devuelve error; usamos [] para no romper la UI
  const participantsData = participantsRes.error ? [] : ((participantsRes.data ?? []) as { league_id: string; user_id: string }[]);
  const requestsData = requestsRes.error ? [] : ((requestsRes.data ?? []) as { league_id: string; status: string }[]);
  const invitationsData = invitationsRes.error ? [] : ((invitationsRes.data ?? []) as { league_id: string; status: string }[]);

  const participantsByLeague = new Map<string, number>();
  participantsData.forEach((p) => {
    participantsByLeague.set(p.league_id, (participantsByLeague.get(p.league_id) ?? 0) + 1);
  });
  const myParticipation = new Set<string>();
  participantsData.forEach((p) => {
    if (p.user_id === userId) myParticipation.add(p.league_id);
  });
  const myRequests = new Map<string, string>();
  requestsData.forEach((r) => myRequests.set(r.league_id, r.status));
  const myInvitations = new Map<string, string>();
  invitationsData.forEach((i) => myInvitations.set(i.league_id, i.status));

  const adminIds = [...new Set(list.map((l) => l.admin_id))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .in('id', adminIds);

  const profileMap = new Map<string, { display_name: string | null; avatar_url: string | null }>();
  (profiles ?? []).forEach((p: { id: string; display_name: string | null; avatar_url: string | null }) => {
    profileMap.set(p.id, { display_name: p.display_name, avatar_url: p.avatar_url });
  });

  return list.map((l) => ({
    ...l,
    is_admin: userId ? l.admin_id === userId : false,
    admin_profile: profileMap.get(l.admin_id) ?? null,
    participants_count: participantsByLeague.get(l.id) ?? 0,
    is_participant: myParticipation.has(l.id),
    my_join_request: (userId ? myRequests.get(l.id) : undefined) as League['my_join_request'],
    my_invitation: (userId ? myInvitations.get(l.id) : undefined) as League['my_invitation'],
  })) as League[];
}

function leagueInsertRow(
  userId: string,
  payload: CreateLeaguePayload
): Database['public']['Tables']['leagues']['Insert'] {
  const base = {
    admin_id: userId,
    name: payload.name.trim(),
    type: payload.type,
    description: payload.description?.trim() || null,
    cover_image_url: payload.cover_image_url?.trim() || null,
  };
  if (payload.type === 'liga') {
    const liga = payload as CreateLigaPayload;
    return {
      ...base,
      max_participants: liga.max_participants ?? null,
      start_date: liga.start_date || null,
      end_date: liga.end_date || null,
      zone_description: liga.zone_description?.trim() || null,
      zone_point: liga.zone_point ?? null,
      zone_polygon: liga.zone_polygon ?? null,
      additional_rules: liga.additional_rules?.trim() || null,
      species_scoring: (liga.species_scoring ?? []) as unknown as Database['public']['Tables']['leagues']['Row']['species_scoring'],
      biggest_catch_prize: liga.biggest_catch_prize ?? false,
      biggest_catch_points: liga.biggest_catch_points ?? null,
      biggest_catch_prize_description: liga.biggest_catch_prize_description?.trim() || null,
      is_public: liga.is_public ?? true,
      premio: liga.premio?.trim() || null,
      competition_type: 'rancho',
    };
  }
  const camp = payload as CreateCampeonatoPayload;
  return {
    ...base,
    max_participants: camp.max_participants ?? null,
    start_date: camp.start_date || null,
    end_date: camp.end_date || null,
    zone_description: camp.zone_description?.trim() || null,
    zone_point: camp.zone_point ?? null,
    zone_polygon: camp.zone_polygon ?? null,
    additional_rules: camp.additional_rules?.trim() || null,
    species_scoring: (camp.species_scoring ?? []) as unknown as Database['public']['Tables']['leagues']['Row']['species_scoring'],
    biggest_catch_prize: false,
    biggest_catch_points: null,
    biggest_catch_prize_description: null,
    is_public: camp.is_public ?? true,
    premio: camp.premio?.trim() || null,
    competition_type: camp.competition_type ?? 'rancho',
  };
}

/** Calcula puntos para una captura según la especie y reglas de la liga */
export function calculatePoints(
  speciesScoring: SpeciesScoringEntry[],
  species: string,
  scoreBy: 'weight' | 'length',
  value: number
): { points: number; minValue: number } {
  const entry = speciesScoring.find(
    (s) => s.species.toLowerCase().trim() === species.toLowerCase().trim() && s.scoreBy === scoreBy
  );
  if (!entry) throw new Error('Especie no encontrada en las reglas de la liga');
  if (value < entry.minValue) throw new Error(`Por debajo del mínimo: ${entry.minValue} ${scoreBy === 'weight' ? 'kg' : 'cm'}`);
  const points = Math.round((value - entry.minValue) * entry.pointsPerUnit * 100) / 100;
  return { points, minValue: entry.minValue };
}

export async function createLeague(userId: string, payload: CreateLeaguePayload): Promise<League> {
  const row = leagueInsertRow(userId, payload);
  const { data, error } = await supabase.from('leagues').insert(row).select().single();
  if (error) throw error;
  const league = data as Database['public']['Tables']['leagues']['Row'];

  // Añadir al creador como primer participante
  await supabase.from('league_participants').insert({ league_id: league.id, user_id: userId }).then(() => {});

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .eq('id', league.admin_id)
    .single();

  return {
    ...league,
    is_admin: true,
    admin_profile: profile ? { display_name: profile.display_name, avatar_url: profile.avatar_url } : null,
    participants_count: 1,
    is_participant: true,
  } as League;
}

function leagueUpdateRow(payload: UpdateLeaguePayload): Database['public']['Tables']['leagues']['Update'] {
  const base: Database['public']['Tables']['leagues']['Update'] = {
    updated_at: new Date().toISOString(),
  };
  if (payload.name !== undefined) base.name = payload.name.trim();
  if (payload.description !== undefined) base.description = payload.description?.trim() || null;
  if (payload.cover_image_url !== undefined) base.cover_image_url = payload.cover_image_url?.trim() || null;
  if ('max_participants' in payload && payload.max_participants !== undefined) base.max_participants = payload.max_participants;
  if ('start_date' in payload) base.start_date = payload.start_date || null;
  if ('end_date' in payload) base.end_date = payload.end_date || null;
  if ('zone_description' in payload) base.zone_description = payload.zone_description?.trim() || null;
  if ('zone_point' in payload) base.zone_point = payload.zone_point ?? null;
  if ('zone_polygon' in payload) base.zone_polygon = payload.zone_polygon ?? null;
  if ('additional_rules' in payload) base.additional_rules = payload.additional_rules?.trim() || null;
  if ('species_scoring' in payload && Array.isArray(payload.species_scoring)) {
    base.species_scoring = payload.species_scoring as unknown as Database['public']['Tables']['leagues']['Row']['species_scoring'];
  }
  if ('biggest_catch_prize' in payload) base.biggest_catch_prize = payload.biggest_catch_prize ?? false;
  if ('biggest_catch_points' in payload) base.biggest_catch_points = payload.biggest_catch_points ?? null;
  if ('biggest_catch_prize_description' in payload) base.biggest_catch_prize_description = payload.biggest_catch_prize_description?.trim() || null;
  if ('is_public' in payload) base.is_public = payload.is_public ?? true;
  if ('premio' in payload) base.premio = payload.premio?.trim() || null;
  if ('competition_type' in payload) base.competition_type = payload.competition_type ?? 'rancho';
  return base;
}

/** Editar liga o campeonato. Solo el administrador. */
export async function updateLeague(
  leagueId: string,
  userId: string,
  payload: UpdateLeaguePayload
): Promise<League> {
  const row = leagueUpdateRow(payload);
  const { data, error } = await supabase
    .from('leagues')
    .update(row)
    .eq('id', leagueId)
    .eq('admin_id', userId)
    .select()
    .single();
  if (error) throw error;
  const league = data as Database['public']['Tables']['leagues']['Row'];
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .eq('id', league.admin_id)
    .single();
  return {
    ...league,
    is_admin: true,
    admin_profile: profile ? { display_name: profile.display_name, avatar_url: profile.avatar_url } : null,
  } as League;
}

const LEAGUE_COVERS_BUCKET = 'league-covers';

/** Sube la foto de portada de una liga/campeonato. Solo el admin. Crea el bucket "league-covers" en Supabase Storage si no existe. */
export async function uploadLeagueCoverImage(leagueId: string, adminId: string, file: File): Promise<string> {
  const { data: league } = await supabase.from('leagues').select('admin_id').eq('id', leagueId).single();
  if (!league || (league as { admin_id: string }).admin_id !== adminId) throw new Error('No autorizado');
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${leagueId}/cover.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from(LEAGUE_COVERS_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type || 'image/jpeg' });
  if (uploadError) throw uploadError;
  const { data: urlData } = supabase.storage.from(LEAGUE_COVERS_BUCKET).getPublicUrl(path);
  const { error: updateError } = await supabase
    .from('leagues')
    .update({ cover_image_url: urlData.publicUrl, updated_at: new Date().toISOString() })
    .eq('id', leagueId)
    .eq('admin_id', adminId);
  if (updateError) throw updateError;
  return urlData.publicUrl;
}

export async function getLeagueById(id: string, userId: string | undefined): Promise<League | null> {
  const { data, error } = await supabase.from('leagues').select('*').eq('id', id).single();
  if (error || !data) return null;
  const row = data as Database['public']['Tables']['leagues']['Row'] & Record<string, unknown>;

  const [participantsRes, myRequestRes, myInvitationRes] = await Promise.all([
    supabase.from('league_participants').select('user_id').eq('league_id', id),
    userId ? supabase.from('league_join_requests').select('status').eq('league_id', id).eq('user_id', userId).maybeSingle() : { data: null },
    userId ? supabase.from('league_invitations').select('status').eq('league_id', id).eq('user_id', userId).maybeSingle() : { data: null },
  ]);

  const participantsList = participantsRes.error ? [] : (participantsRes.data ?? []);
  const participants_count = (participantsList as { user_id: string }[]).length;
  const is_participant = userId ? (participantsList as { user_id: string }[]).some((p) => p.user_id === userId) : false;
  const my_join_request = (myRequestRes.data as { status: string } | null)?.status as League['my_join_request'];
  const my_invitation = (myInvitationRes.data as { status: string } | null)?.status as League['my_invitation'];

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .eq('id', row.admin_id)
    .single();

  return {
    ...row,
    is_admin: userId ? row.admin_id === userId : false,
    admin_profile: profile ? { display_name: profile.display_name, avatar_url: profile.avatar_url } : null,
    participants_count,
    is_participant,
    my_join_request,
    my_invitation,
  } as League;
}

export async function deleteLeague(id: string, userId: string): Promise<void> {
  const { error } = await supabase.from('leagues').delete().eq('id', id).eq('admin_id', userId);
  if (error) throw error;
}

// ——— Inscripción y solicitudes ———

export async function joinLeague(leagueId: string, userId: string): Promise<void> {
  const { data: league } = await supabase.from('leagues').select('is_public, max_participants').eq('id', leagueId).single();
  if (!league || !(league as { is_public: boolean }).is_public) throw new Error('Esta liga no es pública');
  const max = (league as { max_participants: number | null }).max_participants;
  const { count } = await supabase.from('league_participants').select('*', { count: 'exact', head: true }).eq('league_id', leagueId);
  if (max != null && (count ?? 0) >= max) throw new Error('La liga está completa');
  const { error } = await supabase.from('league_participants').insert({ league_id: leagueId, user_id: userId });
  if (error) throw error;
}

export async function leaveLeague(leagueId: string, userId: string): Promise<void> {
  const { error } = await supabase.from('league_participants').delete().eq('league_id', leagueId).eq('user_id', userId);
  if (error) throw error;
}

export async function requestToJoinLeague(leagueId: string, userId: string): Promise<void> {
  const { data: league, error: leagueErr } = await supabase.from('leagues').select('admin_id, name').eq('id', leagueId).single();
  if (leagueErr || !league) throw new Error('Liga no encontrada');
  const { error } = await supabase.from('league_join_requests').insert({ league_id: leagueId, user_id: userId, status: 'pending' });
  if (error) throw error;
  const { data: requester } = await supabase.from('profiles').select('display_name').eq('id', userId).single();
  const name = (requester as { display_name?: string } | null)?.display_name ?? 'Un usuario';
  await createNotification(
    (league as { admin_id: string }).admin_id,
    'league_join_request',
    'Nueva solicitud',
    `${name} quiere unirse a "${(league as { name: string }).name}"`,
    { league_id: leagueId, user_id: userId }
  );
}

export async function acceptJoinRequest(leagueId: string, adminId: string, requestingUserId: string): Promise<void> {
  const { data: league } = await supabase.from('leagues').select('admin_id, max_participants, name').eq('id', leagueId).single();
  if (!league || (league as { admin_id: string }).admin_id !== adminId) throw new Error('No autorizado');
  const max = (league as { max_participants: number | null }).max_participants;
  const { count } = await supabase.from('league_participants').select('*', { count: 'exact', head: true }).eq('league_id', leagueId);
  if (max != null && (count ?? 0) >= max) throw new Error('La liga está completa');
  await supabase.from('league_join_requests').update({ status: 'accepted', reviewed_at: new Date().toISOString(), reviewed_by: adminId }).eq('league_id', leagueId).eq('user_id', requestingUserId);
  await supabase.from('league_participants').insert({ league_id: leagueId, user_id: requestingUserId });
  await createNotification(
    requestingUserId,
    'league_request_accepted',
    'Solicitud aceptada',
    `Tu solicitud para unirte a "${(league as { name: string }).name}" ha sido aceptada`,
    { league_id: leagueId }
  );
}

export async function denyJoinRequest(leagueId: string, adminId: string, requestingUserId: string): Promise<void> {
  const { data: league } = await supabase.from('leagues').select('name').eq('id', leagueId).single();
  const { error } = await supabase
    .from('league_join_requests')
    .update({ status: 'denied', reviewed_at: new Date().toISOString(), reviewed_by: adminId })
    .eq('league_id', leagueId)
    .eq('user_id', requestingUserId);
  if (error) throw error;
  await createNotification(
    requestingUserId,
    'league_request_rejected',
    'Solicitud denegada',
    `Tu solicitud para unirte a "${(league as { name: string } | null)?.name ?? 'la liga'}" ha sido denegada`,
    { league_id: leagueId }
  );
}

export async function inviteToLeague(leagueId: string, adminId: string, invitedUserId: string): Promise<void> {
  const { error } = await supabase.from('league_invitations').insert({ league_id: leagueId, user_id: invitedUserId, status: 'pending' });
  if (error) throw error;
}

export async function acceptLeagueInvitation(leagueId: string, userId: string): Promise<void> {
  const { data: league } = await supabase.from('leagues').select('max_participants').eq('id', leagueId).single();
  if (!league) throw new Error('Liga no encontrada');
  const max = (league as { max_participants: number | null }).max_participants;
  const { count } = await supabase.from('league_participants').select('*', { count: 'exact', head: true }).eq('league_id', leagueId);
  if (max != null && (count ?? 0) >= max) throw new Error('La liga está completa');
  await supabase.from('league_invitations').update({ status: 'accepted' }).eq('league_id', leagueId).eq('user_id', userId);
  await supabase.from('league_participants').insert({ league_id: leagueId, user_id: userId });
}

export async function denyLeagueInvitation(leagueId: string, userId: string): Promise<void> {
  await supabase.from('league_invitations').update({ status: 'denied' }).eq('league_id', leagueId).eq('user_id', userId);
}

// ——— Participantes con perfiles y clasificación ———

export async function getLeagueParticipants(leagueId: string): Promise<LeagueParticipantWithProfile[]> {
  const { data: league } = await supabase.from('leagues').select('admin_id').eq('id', leagueId).single();
  if (!league) return [];
  const adminId = (league as { admin_id: string }).admin_id;
  const { data: participants } = await supabase
    .from('league_participants')
    .select('user_id')
    .eq('league_id', leagueId);
  if (!participants?.length) return [];
  const userIds = participants.map((p: { user_id: string }) => p.user_id);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .in('id', userIds);
  const profileMap = new Map<string, { display_name: string | null; avatar_url: string | null }>();
  (profiles ?? []).forEach((p: { id: string; display_name: string | null; avatar_url: string | null }) => {
    profileMap.set(p.id, { display_name: p.display_name, avatar_url: p.avatar_url });
  });
  return userIds.map((uid) => {
    const p = profileMap.get(uid) ?? { display_name: null, avatar_url: null };
    return { user_id: uid, ...p, is_admin: uid === adminId };
  });
}

export async function submitLeagueCapture(
  leagueId: string,
  userId: string,
  payload: { species: string; scoreBy: 'weight' | 'length'; value: number; image_url?: string | null }
): Promise<LeagueCatch> {
  const { data: league } = await supabase.from('leagues').select('species_scoring').eq('id', leagueId).single();
  if (!league) throw new Error('Liga no encontrada');
  const scoring = (league as { species_scoring: SpeciesScoringEntry[] }).species_scoring ?? [];
  const { points } = calculatePoints(scoring, payload.species, payload.scoreBy, payload.value);
  const { data, error } = await supabase
    .from('league_catches')
    .insert({
      league_id: leagueId,
      user_id: userId,
      species: payload.species.trim(),
      score_by: payload.scoreBy,
      value: payload.value,
      points,
      image_url: payload.image_url?.trim() || null,
      status: 'pending',
    })
    .select()
    .single();
  if (error) throw error;
  return data as LeagueCatch;
}

const LEAGUE_CATCH_IMAGES_BUCKET = 'league-catch-images';

/** Sube la imagen de una captura. El usuario debe ser participante de la liga. */
export async function uploadLeagueCatchImage(
  catchId: string,
  leagueId: string,
  userId: string,
  file: File
): Promise<string> {
  const { data: part } = await supabase
    .from('league_participants')
    .select('user_id')
    .eq('league_id', leagueId)
    .eq('user_id', userId)
    .maybeSingle();
  if (!part) throw new Error('No autorizado');
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${leagueId}/${catchId}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from(LEAGUE_CATCH_IMAGES_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type || 'image/jpeg' });
  if (uploadError) throw uploadError;
  const { data: urlData } = supabase.storage.from(LEAGUE_CATCH_IMAGES_BUCKET).getPublicUrl(path);
  const { error: updateError } = await supabase
    .from('league_catches')
    .update({ image_url: urlData.publicUrl })
    .eq('id', catchId)
    .eq('user_id', userId);
  if (updateError) throw updateError;
  return urlData.publicUrl;
}

export async function getLeagueCaptures(
  leagueId: string,
  status?: 'pending' | 'approved' | 'rejected'
): Promise<LeagueCatch[]> {
  let q = supabase.from('league_catches').select('*').eq('league_id', leagueId).order('submitted_at', { ascending: false });
  if (status) q = q.eq('status', status);
  const { data: rows, error } = await q;
  if (error) throw error;
  const list = (rows ?? []) as Database['public']['Tables']['league_catches']['Row'][];
  if (list.length === 0) return [];
  const userIds = [...new Set(list.map((c) => c.user_id))];
  const { data: profiles } = await supabase.from('profiles').select('id, display_name, avatar_url').in('id', userIds);
  const profileMap = new Map<string, { display_name: string | null; avatar_url: string | null }>();
  (profiles ?? []).forEach((p: { id: string; display_name: string | null; avatar_url: string | null }) => {
    profileMap.set(p.id, { display_name: p.display_name, avatar_url: p.avatar_url });
  });
  return list.map((c) => ({
    ...c,
    user_profile: profileMap.get(c.user_id) ?? null,
  })) as LeagueCatch[];
}

export async function approveLeagueCapture(captureId: string, adminId: string): Promise<void> {
  const { data: cap } = await supabase.from('league_catches').select('league_id').eq('id', captureId).single();
  if (!cap) throw new Error('Captura no encontrada');
  const { data: league } = await supabase.from('leagues').select('admin_id').eq('id', (cap as { league_id: string }).league_id).single();
  if (!league || (league as { admin_id: string }).admin_id !== adminId) throw new Error('No autorizado');
  const { error } = await supabase
    .from('league_catches')
    .update({ status: 'approved', reviewed_at: new Date().toISOString(), reviewed_by: adminId })
    .eq('id', captureId);
  if (error) throw error;
}

export async function rejectLeagueCapture(captureId: string, adminId: string): Promise<void> {
  const { data: cap } = await supabase.from('league_catches').select('league_id').eq('id', captureId).single();
  if (!cap) throw new Error('Captura no encontrada');
  const { data: league } = await supabase.from('leagues').select('admin_id').eq('id', (cap as { league_id: string }).league_id).single();
  if (!league || (league as { admin_id: string }).admin_id !== adminId) throw new Error('No autorizado');
  const { error } = await supabase
    .from('league_catches')
    .update({ status: 'rejected', reviewed_at: new Date().toISOString(), reviewed_by: adminId })
    .eq('id', captureId);
  if (error) throw error;
}

export async function getLeagueStandings(leagueId: string): Promise<LeagueStandingEntry[]> {
  const { data: rows, error } = await supabase
    .from('league_catches')
    .select('user_id, points')
    .eq('league_id', leagueId)
    .eq('status', 'approved');
  if (error) throw error;
  const list = (rows ?? []) as { user_id: string; points: number }[];
  const byUser = new Map<string, { total_points: number; count: number }>();
  list.forEach((r) => {
    const cur = byUser.get(r.user_id) ?? { total_points: 0, count: 0 };
    byUser.set(r.user_id, { total_points: cur.total_points + r.points, count: cur.count + 1 });
  });
  const userIds = Array.from(byUser.keys());
  if (userIds.length === 0) return [];
  const { data: profiles } = await supabase.from('profiles').select('id, display_name, avatar_url').in('id', userIds);
  const profileMap = new Map<string, { display_name: string | null; avatar_url: string | null }>();
  (profiles ?? []).forEach((p: { id: string; display_name: string | null; avatar_url: string | null }) => {
    profileMap.set(p.id, { display_name: p.display_name, avatar_url: p.avatar_url });
  });
  return userIds
    .map((uid) => {
      const agg = byUser.get(uid)!;
      const p = profileMap.get(uid) ?? { display_name: null, avatar_url: null };
      return { user_id: uid, ...p, total_points: agg.total_points, approved_count: agg.count };
    })
    .sort((a, b) => b.total_points - a.total_points);
}
