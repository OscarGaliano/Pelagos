import {
    acceptLeagueInvitation,
    approveLeagueCapture,
    calculatePoints,
    createLeague,
    getLeagueById,
    getLeagueCaptures,
    getLeagueParticipants,
    getLeagues,
    getLeagueStandings,
    joinLeague,
    leaveLeague,
    rejectLeagueCapture,
    requestToJoinLeague,
    submitLeagueCapture,
    updateLeague,
    uploadLeagueCatchImage,
    uploadLeagueCoverImage,
    type CompetitionType,
    type CreateCampeonatoPayload,
    type CreateLigaPayload,
    type LeagueType,
    type UpdateCampeonatoPayload,
    type UpdateLigaPayload,
} from '@/lib/api/leagues';
import { supabase } from '@/lib/supabase';
import type { League, LeagueCatch, LeagueParticipantWithProfile, LeagueStandingEntry, SpeciesScoringEntry } from '@/lib/types';
import {
    Calendar,
    Check,
    ChevronDown,
    ChevronLeft,
    ChevronUp,
    Fish,
    ImagePlus,
    Loader2,
    MapPin,
    Pencil,
    Plus,
    Shield,
    Trophy,
    Users,
    X,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useCallback, useEffect, useState } from 'react';
import { ZoneMapPicker, type ZonePoint, type ZonePolygon } from './ZoneMapPicker';
import { ZoneMapPreview } from './ZoneMapPreview';

const TYPE_LABELS: Record<LeagueType, string> = {
  liga: 'Liga',
  campeonato: 'Campeonato',
};

interface CampeonatosViewProps {
  onBack: () => void;
}

export function CampeonatosView({ onBack }: CampeonatosViewProps) {
  const [userId, setUserId] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'create' | 'detail'>('list');
  const [leagues, setLeagues] = useState<League[]>([]);
  const [selectedLeague, setSelectedLeague] = useState<League | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLeagues = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id ?? null);
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getLeagues(user.id);
      setLeagues(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar ligas y campeonatos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLeagues();
  }, [loadLeagues]);

  const openDetail = async (league: League) => {
    setLoading(true);
    setError(null);
    try {
      const full = await getLeagueById(league.id, userId ?? undefined);
      setSelectedLeague(full ?? league);
      setView('detail');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  };

  const getBackAction = () => {
    if (view === 'detail') {
      return () => {
        setView('list');
        setSelectedLeague(null);
      };
    }
    if (view === 'create') {
      return () => setView('list');
    }
    return onBack;
  };

  const headerTitle =
    view === 'list'
      ? 'Campeonatos y ligas'
      : view === 'create'
        ? 'Crear liga o campeonato'
        : selectedLeague?.name ?? 'Detalle';

  const header = (
    <div className="sticky top-0 z-30 backdrop-blur-xl bg-[#0a1628]/90 border-b border-cyan-400/20">
      <div className="px-4 py-3 flex items-center gap-3">
        <motion.button
          onClick={getBackAction()}
          whileTap={{ scale: 0.9 }}
          className="p-2 -ml-1 rounded-full hover:bg-white/10 flex items-center gap-1"
        >
          <ChevronLeft className="w-6 h-6 text-cyan-400" />
          <span className="text-cyan-400 text-sm font-medium">Volver</span>
        </motion.button>
        <h1 className="text-white text-xl font-medium truncate">{headerTitle}</h1>
      </div>
    </div>
  );

  // Vista crear
  if (view === 'create' && userId) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a1628] via-[#0c1f3a] to-[#0a1628]">
        {header}
        <CreateLeagueForm
          userId={userId}
          onSuccess={() => {
            loadLeagues();
            setView('list');
          }}
          onCancel={() => setView('list')}
        />
      </div>
    );
  }

  // Vista detalle
  if (view === 'detail' && selectedLeague) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a1628] via-[#0c1f3a] to-[#0a1628]">
        {header}
        <LeagueDetail
          league={selectedLeague}
          userId={userId}
          onJoined={async () => {
            if (!selectedLeague || !userId) return;
            const updated = await getLeagueById(selectedLeague.id, userId);
            if (updated) setSelectedLeague(updated);
          }}
          onLeave={() => {
            setSelectedLeague(null);
            setView('list');
            loadLeagues();
          }}
          onRequestSent={async () => {
            if (!selectedLeague || !userId) return;
            const updated = await getLeagueById(selectedLeague.id, userId);
            if (updated) setSelectedLeague(updated);
          }}
          onLeagueUpdated={(updated) => setSelectedLeague(updated)}
        />
      </div>
    );
  }

  // Vista lista
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a1628] via-[#0c1f3a] to-[#0a1628]">
      {header}
      <div className="px-4 pt-4 pb-8">
        {error && (
          <div className="mb-4 rounded-xl bg-red-500/20 border border-red-400/40 text-red-200 px-4 py-2 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          </div>
        ) : !userId ? (
          <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-cyan-400/20 p-8 text-center text-cyan-200">
            Inicia sesión para ver y crear ligas o campeonatos.
          </div>
        ) : (
          <>
            <motion.button
              type="button"
              onClick={() => setView('create')}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500/80 to-amber-600/80 py-3.5 text-white font-medium mb-6 border border-amber-400/30"
            >
              <Plus className="w-5 h-5" />
              Crear liga o campeonato
            </motion.button>

            {leagues.length === 0 ? (
              <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-cyan-400/20 p-8 text-center">
                <Trophy className="w-12 h-12 text-cyan-400 mx-auto mb-3 opacity-70" />
                <p className="text-cyan-200 mb-1">Aún no hay ligas ni campeonatos</p>
                <p className="text-cyan-300/80 text-sm">
                  Crea una liga o un campeonato y serás su administrador.
                </p>
              </div>
            ) : (
              <ul className="space-y-4">
                {leagues.map((league) => (
                  <motion.li
                    key={league.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <button
                      type="button"
                      onClick={() => openDetail(league)}
                      className="w-full text-left backdrop-blur-xl bg-white/5 rounded-2xl border border-cyan-400/20 overflow-hidden hover:bg-white/10 transition-colors"
                    >
                      {league.cover_image_url ? (
                        <div className="aspect-video w-full bg-white/5">
                          <img src={league.cover_image_url} alt="" className="w-full h-full object-cover" />
                        </div>
                      ) : null}
                      <div className="p-4 flex items-start gap-3">
                      <div className="h-10 w-10 flex-shrink-0 rounded-full bg-amber-500/30 flex items-center justify-center border border-amber-400/30 overflow-hidden">
                        {league.cover_image_url ? (
                          <img src={league.cover_image_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Trophy className="w-5 h-5 text-amber-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-white font-medium truncate">{league.name}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/30 text-cyan-200">
                            {TYPE_LABELS[league.type === 'liga' ? 'liga' : 'campeonato']}
                          </span>
                          {league.is_admin && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-200 flex items-center gap-1">
                              <Shield className="w-3 h-3" />
                              Admin
                            </span>
                          )}
                        </div>
                        <p className="text-cyan-300/70 text-xs mt-0.5">
                          Creado por {league.admin_profile?.display_name ?? 'Usuario'}
                        </p>
                      </div>
                      </div>
                    </button>
                  </motion.li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function LeagueDetail({
  league,
  userId,
  onJoined,
  onLeave,
  onRequestSent,
  onLeagueUpdated,
}: {
  league: League;
  userId: string | null;
  onJoined: () => void | Promise<void>;
  onLeave: () => void;
  onRequestSent: () => void | Promise<void>;
  onLeagueUpdated?: (updated: League) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<LeagueParticipantWithProfile[]>([]);
  const [showClasificacion, setShowClasificacion] = useState(false);
  const [standings, setStandings] = useState<LeagueStandingEntry[]>([]);
  const [standingsLoading, setStandingsLoading] = useState(false);
  const [pendingCaptures, setPendingCaptures] = useState<LeagueCatch[]>([]);
  const [pendingCapturesLoading, setPendingCapturesLoading] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const isLiga = league.type === 'liga';
  const speciesScoring = (league.species_scoring as SpeciesScoringEntry[] | null) ?? [];

  const loadParticipants = useCallback(async () => {
    const list = await getLeagueParticipants(league.id);
    setParticipants(list);
  }, [league.id]);

  useEffect(() => {
    loadParticipants();
  }, [loadParticipants]);

  useEffect(() => {
    if (!showClasificacion || speciesScoring.length === 0) return;
    setStandingsLoading(true);
    getLeagueStandings(league.id)
      .then(setStandings)
      .finally(() => setStandingsLoading(false));
  }, [league.id, showClasificacion, speciesScoring.length]);

  useEffect(() => {
    if (!league.is_admin || speciesScoring.length === 0) return;
    setPendingCapturesLoading(true);
    getLeagueCaptures(league.id, 'pending')
      .then(setPendingCaptures)
      .finally(() => setPendingCapturesLoading(false));
  }, [league.id, league.is_admin, speciesScoring.length]);

  const handleJoin = async () => {
    if (!userId) return;
    setError(null);
    setLoading(true);
    try {
      await joinLeague(league.id, userId);
      await onJoined();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al inscribirse');
    } finally {
      setLoading(false);
    }
  };

  const handleRequest = async () => {
    if (!userId) return;
    setError(null);
    setLoading(true);
    try {
      await requestToJoinLeague(league.id, userId);
      await onRequestSent();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al solicitar');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async () => {
    if (!userId) return;
    setError(null);
    setLoading(true);
    try {
      await acceptLeagueInvitation(league.id, userId);
      await onJoined();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al aceptar');
    } finally {
      setLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!userId) return;
    setError(null);
    setLoading(true);
    try {
      await leaveLeague(league.id, userId);
      onLeave();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al abandonar');
    } finally {
      setLoading(false);
    }
  };

  const maxP = league.max_participants ?? null;
  const participantsLabel = maxP != null
    ? `${league.participants_count ?? 0} / ${maxP} participantes`
    : `${league.participants_count ?? 0} participantes`;

  if (showEditForm && userId) {
    return (
      <div className="p-6 pb-10">
        <EditLeagueForm
          league={league}
          userId={userId}
          onSuccess={async (updated) => {
            onLeagueUpdated?.(updated);
            setShowEditForm(false);
          }}
          onCancel={() => setShowEditForm(false)}
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {error && (
        <div className="rounded-xl bg-red-500/20 border border-red-400/40 text-red-200 px-4 py-2 text-sm">
          {error}
        </div>
      )}
      <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-cyan-400/20 overflow-hidden">
        {league.cover_image_url && (
          <div className="aspect-video w-full bg-white/5">
            <img src={league.cover_image_url} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="h-12 w-12 rounded-full bg-amber-500/30 flex items-center justify-center border border-amber-400/30 flex-shrink-0 overflow-hidden">
            {league.cover_image_url ? (
              <img src={league.cover_image_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <Trophy className="w-6 h-6 text-amber-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-white text-lg font-semibold truncate">{league.name}</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/30 text-cyan-200">
              {TYPE_LABELS[league.type]}
            </span>
            {league.is_public != null && (
              <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-white/10 text-cyan-300">
                {league.is_public ? 'Pública' : 'Privada'}
              </span>
            )}
          </div>
        </div>
        {league.description && (
          <p className="text-cyan-200 text-sm mb-4 whitespace-pre-wrap">{league.description}</p>
        )}
        <div className="flex items-center gap-2 text-cyan-300/90 text-sm mb-2">
          <Shield className="w-4 h-4 flex-shrink-0" />
          <span>Administrador: {league.admin_profile?.display_name ?? 'Usuario'}</span>
        </div>
        {(league.start_date || league.end_date) && (
          <div className="flex items-center gap-2 text-cyan-300/90 text-sm mb-2">
            <Calendar className="w-4 h-4" />
            <span>
              {league.start_date && new Date(league.start_date).toLocaleDateString('es-ES')}
              {league.start_date && league.end_date && ' — '}
              {league.end_date && new Date(league.end_date).toLocaleDateString('es-ES')}
            </span>
          </div>
        )}
        <div className="flex items-center gap-2 text-cyan-300/90 text-sm mb-2">
          <Users className="w-4 h-4" />
          <span>{participantsLabel}</span>
        </div>
        {!isLiga && league.competition_type && (
          <div className="flex items-center gap-2 text-cyan-300/90 text-sm mb-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>
              Ganador por: {league.competition_type === 'pieza_mayor' ? 'Pieza mayor' : 'Rancho (conjunto de capturas)'}
            </span>
          </div>
        )}
        {(league.zone_description || league.zone_point || (league.zone_polygon && (league.zone_polygon as [number, number][]).length > 0)) && (
          <div className="mt-3 pt-3 border-t border-cyan-400/20">
            <p className="text-cyan-200 text-xs font-medium mb-1">Zona de pesca permitida</p>
            {league.zone_description && (
              <p className="text-cyan-300/90 text-sm whitespace-pre-wrap">{league.zone_description}</p>
            )}
            {(league.zone_point || (league.zone_polygon && (league.zone_polygon as [number, number][]).length > 0)) && (
              <ZoneMapPreview
                point={league.zone_point as ZonePoint | null}
                polygon={league.zone_polygon as ZonePolygon | null}
              />
            )}
          </div>
        )}
        {league.additional_rules && (
          <div className="mt-3 pt-3 border-t border-cyan-400/20">
            <p className="text-cyan-200 text-xs font-medium mb-1">Reglas {isLiga ? 'adicionales' : 'del campeonato'}</p>
            <p className="text-cyan-300/90 text-sm whitespace-pre-wrap">{league.additional_rules}</p>
          </div>
        )}
        {speciesScoring.length > 0 && (
          <div className="mt-3 pt-3 border-t border-cyan-400/20">
            <p className="text-cyan-200 text-xs font-medium mb-2 flex items-center gap-1">
              <Fish className="w-3.5 h-3.5" />
              Puntuación por especie
            </p>
            <ul className="space-y-1 text-sm text-cyan-300/90">
              {speciesScoring.map((s, i) => (
                <li key={i}>
                  {s.species}: {s.scoreBy === 'weight' ? 'por peso' : 'por talla'} — {s.pointsPerUnit} pts/{s.scoreBy === 'weight' ? 'kg' : 'cm'}, mín. {s.minValue} {s.scoreBy === 'weight' ? 'kg' : 'cm'}
                </li>
              ))}
            </ul>
          </div>
        )}
        {isLiga && league.biggest_catch_prize && (
          <div className="mt-3 pt-3 border-t border-cyan-400/20">
            <p className="text-cyan-200 text-xs font-medium mb-1">Premio a pieza mayor</p>
            <p className="text-cyan-300/90 text-sm">
              {league.biggest_catch_points != null && `${league.biggest_catch_points} puntos. `}
              {league.biggest_catch_prize_description ?? ''}
            </p>
          </div>
        )}
        {league.premio && (
          <div className="mt-3 pt-3 border-t border-cyan-400/20">
            <p className="text-cyan-200 text-xs font-medium mb-1">Premio</p>
            <p className="text-cyan-300/90 text-sm whitespace-pre-wrap">{league.premio}</p>
          </div>
        )}
        {league.is_admin && (
          <div className="mt-4 pt-4 border-t border-cyan-400/20 flex flex-wrap items-center gap-3">
            <p className="text-amber-300/90 text-sm font-medium flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Eres el administrador
            </p>
            <motion.button
              type="button"
              onClick={() => setShowEditForm(true)}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 py-2 px-3 rounded-xl bg-amber-500/30 border border-amber-400/40 text-amber-200 text-sm font-medium"
            >
              <Pencil className="w-4 h-4" />
              Editar {isLiga ? 'liga' : 'campeonato'}
            </motion.button>
          </div>
        )}
        </div>
      </div>

      {/* Participantes con avatares y admin */}
      {participants.length > 0 && (
        <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-cyan-400/20 p-4">
          <p className="text-cyan-200 text-sm font-medium mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Participantes ({participants.length})
          </p>
          <div className="flex flex-wrap gap-3">
            {participants.map((p) => (
              <div key={p.user_id} className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-full bg-cyan-500/30 border border-cyan-400/30 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {p.avatar_url ? (
                    <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-cyan-200 text-xs font-medium">
                      {(p.display_name || p.user_id.slice(0, 2)).slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <span className="text-cyan-200 text-sm truncate max-w-[100px]">
                  {p.display_name || 'Usuario'}
                  {p.is_admin && (
                    <span className="ml-1 text-amber-300 text-xs">(admin)</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Botón y panel Clasificación */}
      {speciesScoring.length > 0 && (
        <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-cyan-400/20 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowClasificacion((v) => !v)}
            className="w-full px-4 py-3 flex items-center justify-between text-left text-cyan-200 hover:bg-white/10"
          >
            <span className="font-medium flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              Clasificación
            </span>
            {showClasificacion ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
          {showClasificacion && (
            <div className="px-4 pb-4 border-t border-cyan-400/20">
              {standingsLoading ? (
                <div className="py-6 flex justify-center"><Loader2 className="w-6 h-6 text-cyan-400 animate-spin" /></div>
              ) : standings.length === 0 ? (
                <p className="text-cyan-300/70 text-sm py-4">Aún no hay capturas aprobadas.</p>
              ) : (
                <ul className="space-y-2 mt-2">
                  {standings.map((s, i) => (
                    <li key={s.user_id} className="flex items-center gap-3 py-2 rounded-lg bg-white/5 px-3">
                      <span className="text-amber-400 font-bold w-6">{i + 1}º</span>
                      <div className="h-8 w-8 rounded-full bg-cyan-500/30 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {s.avatar_url ? (
                          <img src={s.avatar_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-cyan-200 text-xs">{(s.display_name || '?').slice(0, 2).toUpperCase()}</span>
                        )}
                      </div>
                      <span className="text-white text-sm flex-1 truncate">{s.display_name || 'Usuario'}</span>
                      <span className="text-cyan-300 font-medium">{s.total_points} pts</span>
                      <span className="text-cyan-300/70 text-xs">{s.approved_count} capturas</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {/* Registrar captura (participantes) */}
      {league.is_participant && userId && speciesScoring.length > 0 && (
        <RegisterCaptureBlock
          leagueId={league.id}
          userId={userId}
          speciesScoring={speciesScoring}
          onSubmitted={async () => {
            setShowClasificacion(true);
            const s = await getLeagueStandings(league.id);
            setStandings(s);
          }}
        />
      )}

      {/* Capturas pendientes de revisión (admin) */}
      {league.is_admin && speciesScoring.length > 0 && (
        <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-cyan-400/20 p-4">
          <p className="text-cyan-200 text-sm font-medium mb-3 flex items-center gap-2">
            <Fish className="w-4 h-4" />
            Capturas pendientes de revisión
          </p>
          {pendingCapturesLoading ? (
            <div className="py-4 flex justify-center"><Loader2 className="w-6 h-6 text-cyan-400 animate-spin" /></div>
          ) : pendingCaptures.length === 0 ? (
            <p className="text-cyan-300/70 text-sm">No hay capturas pendientes.</p>
          ) : (
            <ul className="space-y-3">
              {pendingCaptures.map((c) => (
                <li key={c.id} className="rounded-xl bg-white/5 border border-cyan-400/20 p-3 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-cyan-500/30 flex items-center justify-center overflow-hidden">
                      {c.user_profile?.avatar_url ? (
                        <img src={c.user_profile.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-cyan-200 text-xs">{(c.user_profile?.display_name || '?').slice(0, 2).toUpperCase()}</span>
                      )}
                    </div>
                    <span className="text-cyan-200 text-sm">{c.user_profile?.display_name ?? 'Usuario'}</span>
                  </div>
                  <p className="text-cyan-300 text-sm">
                    {c.species} — {c.value} {c.score_by === 'weight' ? 'kg' : 'cm'} → <strong>{c.points} pts</strong>
                  </p>
                  {c.image_url && (
                    <div className="mt-1">
                      <p className="text-cyan-300/80 text-xs mb-1">Imagen de la captura:</p>
                      <a href={c.image_url} target="_blank" rel="noopener noreferrer" className="block rounded-lg overflow-hidden border border-cyan-400/30 max-w-[200px]">
                        <img src={c.image_url} alt="Captura" className="w-full h-auto max-h-40 object-cover" />
                      </a>
                    </div>
                  )}
                  <div className="flex gap-2 mt-1">
                    <motion.button
                      type="button"
                      onClick={async () => {
                        try {
                          await approveLeagueCapture(c.id, userId!);
                          setPendingCaptures((prev) => prev.filter((x) => x.id !== c.id));
                          const s = await getLeagueStandings(league.id);
                          setStandings(s);
                        } catch {}
                      }}
                      className="flex-1 py-2 rounded-lg bg-green-500/30 text-green-200 text-sm font-medium flex items-center justify-center gap-1"
                    >
                      <Check className="w-4 h-4" /> Aceptar
                    </motion.button>
                    <motion.button
                      type="button"
                      onClick={async () => {
                        try {
                          await rejectLeagueCapture(c.id, userId!);
                          setPendingCaptures((prev) => prev.filter((x) => x.id !== c.id));
                        } catch {}
                      }}
                      className="flex-1 py-2 rounded-lg bg-red-500/30 text-red-200 text-sm font-medium flex items-center justify-center gap-1"
                    >
                      <X className="w-4 h-4" /> Rechazar
                    </motion.button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Acciones: inscribirse / solicitar / aceptar invitación / abandonar */}
      {userId && !league.is_admin && (
        <div className="flex flex-col gap-2">
          {league.is_participant ? (
            <motion.button
              type="button"
              onClick={handleLeave}
              disabled={loading}
              whileTap={{ scale: 0.98 }}
              className="py-3 rounded-xl border border-red-400/40 text-red-200 font-medium hover:bg-red-500/20 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Abandonar liga'}
            </motion.button>
          ) : league.my_invitation === 'pending' ? (
            <motion.button
              type="button"
              onClick={handleAcceptInvitation}
              disabled={loading}
              whileTap={{ scale: 0.98 }}
              className="py-3 rounded-xl bg-cyan-500/40 text-cyan-100 font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Aceptar invitación'}
            </motion.button>
          ) : league.my_join_request === 'pending' ? (
            <p className="text-cyan-300/80 text-sm text-center py-2">Solicitud enviada. El administrador la revisará.</p>
          ) : league.is_public ? (
            <motion.button
              type="button"
              onClick={handleJoin}
              disabled={loading || (maxP != null && (league.participants_count ?? 0) >= maxP)}
              whileTap={{ scale: 0.98 }}
              className="py-3 rounded-xl bg-amber-500/80 text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Inscribirse'}
            </motion.button>
          ) : (
            <motion.button
              type="button"
              onClick={handleRequest}
              disabled={loading}
              whileTap={{ scale: 0.98 }}
              className="py-3 rounded-xl bg-amber-500/80 text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Solicitar inscripción'}
            </motion.button>
          )}
        </div>
      )}
    </div>
  );
}

type CaptureRow = {
  id: string;
  species: string;
  scoreBy: 'weight' | 'length';
  value: string;
  imageFile: File | null;
  imagePreview: string | null;
};

function RegisterCaptureBlock({
  leagueId,
  userId,
  speciesScoring,
  onSubmitted,
}: {
  leagueId: string;
  userId: string;
  speciesScoring: SpeciesScoringEntry[];
  onSubmitted: () => void | Promise<void>;
}) {
  const [rows, setRows] = useState<CaptureRow[]>(() => [
    { id: crypto.randomUUID(), species: '', scoreBy: 'weight', value: '', imageFile: null, imagePreview: null },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      { id: crypto.randomUUID(), species: '', scoreBy: 'weight', value: '', imageFile: null, imagePreview: null },
    ]);
  };

  const removeRow = (id: string) => {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const updateRow = (id: string, upd: Partial<CaptureRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...upd } : r)));
  };

  const setRowImage = (id: string, file: File | null) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        if (r.imagePreview) URL.revokeObjectURL(r.imagePreview);
        return {
          ...r,
          imageFile: file,
          imagePreview: file ? URL.createObjectURL(file) : null,
        };
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const num = parseFloat(r.value.replace(',', '.'));
      if (!r.species.trim() || Number.isNaN(num) || num <= 0) {
        setErr(`Captura ${i + 1}: indica especie y valor válido (peso o talla).`);
        return;
      }
      if (!r.imageFile) {
        setErr(`Captura ${i + 1}: añade una imagen de la captura (obligatoria).`);
        return;
      }
      const entry = speciesScoring.find(
        (s) => s.species.toLowerCase().trim() === r.species.toLowerCase().trim() && s.scoreBy === r.scoreBy
      );
      if (!entry) {
        setErr(`Captura ${i + 1}: esa especie no está en las reglas de la liga para este tipo (peso/talla).`);
        return;
      }
      if (num < entry.minValue) {
        setErr(`Captura ${i + 1}: por debajo del mínimo: ${entry.minValue} ${r.scoreBy === 'weight' ? 'kg' : 'cm'}`);
        return;
      }
    }
    setSubmitting(true);
    try {
      for (const r of rows) {
        const num = parseFloat(r.value.replace(',', '.'));
        const created = await submitLeagueCapture(leagueId, userId, {
          species: r.species.trim(),
          scoreBy: r.scoreBy,
          value: num,
          image_url: null,
        });
        if (r.imageFile) {
          await uploadLeagueCatchImage(created.id, leagueId, userId, r.imageFile);
        }
      }
      setRows([{ id: crypto.randomUUID(), species: '', scoreBy: 'weight', value: '', imageFile: null, imagePreview: null }]);
      await onSubmitted();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error al registrar');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-cyan-400/20 p-4">
      <p className="text-cyan-200 text-sm font-medium mb-3 flex items-center gap-2">
        <Fish className="w-4 h-4" />
        Registrar captura(s)
      </p>
      <p className="text-cyan-300/70 text-xs mb-3">
        Añade una o varias capturas. Cada una debe llevar imagen. La puntuación se calcula automáticamente. El administrador revisará cada captura.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        {err && (
          <div className="rounded-lg bg-red-500/20 border border-red-400/40 text-red-200 px-3 py-2 text-sm">{err}</div>
        )}
        {rows.map((row, index) => (
          <div key={row.id} className="rounded-xl bg-white/5 border border-cyan-400/20 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-cyan-300/80 text-xs font-medium">Captura {index + 1}</span>
              {rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  className="text-red-400 hover:text-red-300 p-1"
                  aria-label="Quitar captura"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div>
              <label className="block text-cyan-300 text-xs mb-1">Especie</label>
              <select
                value={row.species}
                onChange={(e) => updateRow(row.id, { species: e.target.value })}
                className="w-full rounded-lg bg-white/10 border border-cyan-400/30 px-3 py-2 text-white text-sm"
              >
                <option value="">Seleccionar...</option>
                {speciesScoring
                  .filter((s) => s.scoreBy === row.scoreBy)
                  .map((s) => (
                    <option key={`${s.species}-${s.scoreBy}`} value={s.species}>
                      {s.species}
                    </option>
                  ))}
              </select>
            </div>
            <div className="flex gap-2">
              <label className="flex items-center gap-2 text-cyan-300 text-sm">
                <input
                  type="radio"
                  checked={row.scoreBy === 'weight'}
                  onChange={() => updateRow(row.id, { scoreBy: 'weight' })}
                  className="rounded border-cyan-400 text-cyan-500"
                />
                Peso (kg)
              </label>
              <label className="flex items-center gap-2 text-cyan-300 text-sm">
                <input
                  type="radio"
                  checked={row.scoreBy === 'length'}
                  onChange={() => updateRow(row.id, { scoreBy: 'length' })}
                  className="rounded border-cyan-400 text-cyan-500"
                />
                Talla (cm)
              </label>
            </div>
            <div>
              <label className="block text-cyan-300 text-xs mb-1">Valor ({row.scoreBy === 'weight' ? 'kg' : 'cm'})</label>
              <input
                type="text"
                inputMode="decimal"
                value={row.value}
                onChange={(e) => updateRow(row.id, { value: e.target.value })}
                placeholder={row.scoreBy === 'weight' ? 'Ej: 2.5' : 'Ej: 45'}
                className="w-full rounded-lg bg-white/10 border border-cyan-400/30 px-3 py-2 text-white text-sm"
              />
              {row.species.trim() && row.value && !Number.isNaN(parseFloat(row.value.replace(',', '.'))) && (() => {
                try {
                  const num = parseFloat(row.value.replace(',', '.'));
                  const { points } = calculatePoints(speciesScoring, row.species.trim(), row.scoreBy, num);
                  return <p className="text-cyan-400 text-xs mt-1">Puntuación: <strong>{points} pts</strong></p>;
                } catch {
                  return null;
                }
              })()}
            </div>
            <div>
              <label className="block text-cyan-300 text-xs mb-1">Foto de la captura (obligatoria)</label>
              <p className="text-cyan-400/80 text-xs mb-1.5">Desde el móvil: toma una foto o elige de la galería</p>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setRowImage(row.id, e.target.files?.[0] ?? null)}
                className="w-full rounded-lg bg-white/10 border border-cyan-400/30 px-3 py-2 text-white text-sm file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-cyan-500/30 file:text-cyan-200 file:text-xs"
              />
              {row.imagePreview && (
                <div className="mt-2 rounded-lg overflow-hidden border border-cyan-400/30 max-w-[140px]">
                  <img src={row.imagePreview} alt="Vista previa" className="w-full h-auto max-h-24 object-cover" />
                </div>
              )}
            </div>
          </div>
        ))}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={addRow}
            className="flex items-center gap-2 py-2 px-3 rounded-xl bg-cyan-500/20 text-cyan-200 text-sm font-medium border border-cyan-400/30"
          >
            <Plus className="w-4 h-4" /> Añadir otra captura
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 py-2.5 rounded-xl bg-cyan-500/40 text-cyan-100 font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enviar todas (pendiente de revisión)'}
          </button>
        </div>
      </form>
    </div>
  );
}

function CreateLeagueForm({
  userId,
  onSuccess,
  onCancel,
}: {
  userId: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState<LeagueType>('liga');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Campos comunes para liga y campeonato
  const [maxParticipants, setMaxParticipants] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [zoneDescription, setZoneDescription] = useState('');
  const [zonePoint, setZonePoint] = useState<ZonePoint | null>(null);
  const [zonePolygon, setZonePolygon] = useState<ZonePolygon | null>(null);
  const [showZoneMapPicker, setShowZoneMapPicker] = useState(false);
  const [additionalRules, setAdditionalRules] = useState('');
  const [speciesScoring, setSpeciesScoring] = useState<SpeciesScoringEntry[]>([]);
  const [biggestCatchPrize, setBiggestCatchPrize] = useState(false);
  const [biggestCatchPoints, setBiggestCatchPoints] = useState<string>('');
  const [biggestCatchPrizeDescription, setBiggestCatchPrizeDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [premio, setPremio] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  // Campo específico de campeonato
  const [competitionType, setCompetitionType] = useState<CompetitionType>('rancho');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setFormError('El nombre es obligatorio.');
      return;
    }
    if (speciesScoring.length === 0) {
      setFormError('Añade al menos una especie con puntuación.');
      return;
    }
    setFormError(null);
    setSubmitting(true);
    try {
      let created: League;
      if (type === 'liga') {
        const payload: CreateLigaPayload = {
          name: trimmed,
          type: 'liga',
          description: description.trim() || null,
          max_participants: maxParticipants.trim() ? parseInt(maxParticipants, 10) : null,
          start_date: startDate || null,
          end_date: endDate || null,
          zone_description: zoneDescription.trim() || null,
          zone_point: zonePoint,
          zone_polygon: zonePolygon,
          additional_rules: additionalRules.trim() || null,
          species_scoring: speciesScoring,
          biggest_catch_prize: biggestCatchPrize,
          biggest_catch_points: biggestCatchPoints.trim() ? parseInt(biggestCatchPoints, 10) : null,
          biggest_catch_prize_description: biggestCatchPrizeDescription.trim() || null,
          is_public: isPublic,
          premio: premio.trim() || null,
        };
        created = await createLeague(userId, payload);
      } else {
        const payload: CreateCampeonatoPayload = {
          name: trimmed,
          type: 'campeonato',
          description: description.trim() || null,
          max_participants: maxParticipants.trim() ? parseInt(maxParticipants, 10) : null,
          start_date: startDate || null,
          end_date: endDate || null,
          zone_description: zoneDescription.trim() || null,
          zone_point: zonePoint,
          zone_polygon: zonePolygon,
          additional_rules: additionalRules.trim() || null,
          species_scoring: speciesScoring,
          competition_type: competitionType,
          is_public: isPublic,
          premio: premio.trim() || null,
        };
        created = await createLeague(userId, payload);
      }
      if (coverFile) {
        await uploadLeagueCoverImage(created.id, userId, coverFile);
      }
      onSuccess();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al crear');
    } finally {
      setSubmitting(false);
    }
  };

  const addSpecies = () => {
    setSpeciesScoring((prev) => [...prev, { species: '', scoreBy: 'weight', pointsPerUnit: 0, minValue: 0 }]);
  };
  const removeSpecies = (index: number) => {
    setSpeciesScoring((prev) => prev.filter((_, i) => i !== index));
  };
  const updateSpecies = (index: number, field: keyof SpeciesScoringEntry, value: string | number) => {
    setSpeciesScoring((prev) => {
      const next = [...prev];
      (next[index] as Record<string, unknown>)[field] = value;
      return next;
    });
  };

  return (
    <div className="p-6 pb-10">
      <form onSubmit={handleSubmit} className="space-y-5">
        {formError && (
          <div className="rounded-xl bg-red-500/20 border border-red-400/40 text-red-200 px-4 py-2 text-sm">
            {formError}
          </div>
        )}

        <div>
          <label className="block text-cyan-200 text-sm font-medium mb-1.5">Nombre {type === 'liga' ? 'de la liga' : ''}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={type === 'liga' ? 'Ej: Liga Costa Brava 2025' : 'Nombre del campeonato'}
            className="w-full rounded-xl bg-white/10 border border-cyan-400/30 px-4 py-3 text-white placeholder-cyan-400/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
            maxLength={120}
          />
        </div>

        <div>
          <label className="block text-cyan-200 text-sm font-medium mb-1.5">Foto de portada (opcional)</label>
          <p className="text-cyan-300/70 text-xs mb-2">Una imagen para identificar la liga o campeonato.</p>
          <div className="flex flex-col gap-2">
            {(coverPreview || coverFile) && (
              <div className="relative rounded-xl overflow-hidden border border-cyan-400/30 aspect-video max-h-40 bg-white/5">
                <img src={coverPreview ?? undefined} alt="Vista previa portada" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => { setCoverFile(null); setCoverPreview(null); }}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            {!coverPreview && !coverFile && (
              <label className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-cyan-400/40 bg-white/5 py-6 text-cyan-300/80 hover:bg-white/10 cursor-pointer">
                <ImagePlus className="w-5 h-5" />
                <span className="text-sm">Elegir foto de portada</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setCoverFile(file);
                      const url = URL.createObjectURL(file);
                      setCoverPreview(url);
                    }
                  }}
                />
              </label>
            )}
          </div>
        </div>

        <div>
          <label className="block text-cyan-200 text-sm font-medium mb-2">Tipo</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="type"
                checked={type === 'liga'}
                onChange={() => setType('liga')}
                className="rounded-full border-cyan-400 text-cyan-500 focus:ring-cyan-400"
              />
              <span className="text-cyan-200">Liga</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="type"
                checked={type === 'campeonato'}
                onChange={() => setType('campeonato')}
                className="rounded-full border-cyan-400 text-cyan-500 focus:ring-cyan-400"
              />
              <span className="text-cyan-200">Campeonato</span>
            </label>
          </div>
        </div>

        {/* Campos comunes para liga y campeonato */}
        <div>
          <label className="block text-cyan-200 text-sm font-medium mb-1.5">Participantes máximos (opcional)</label>
          <input
            type="number"
            min={0}
            step="any"
            value={maxParticipants}
            onChange={(e) => setMaxParticipants(e.target.value)}
            placeholder="Sin límite"
            className="w-full rounded-xl bg-white/10 border border-cyan-400/30 px-4 py-3 text-white placeholder-cyan-400/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
          />
        </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-cyan-200 text-sm font-medium mb-1.5">Fecha desde</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-xl bg-white/10 border border-cyan-400/30 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                />
              </div>
              <div>
                <label className="block text-cyan-200 text-sm font-medium mb-1.5">Fecha hasta</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-xl bg-white/10 border border-cyan-400/30 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                />
              </div>
            </div>
            <div>
              <label className="block text-cyan-200 text-sm font-medium mb-1.5">Zona de pesca permitida</label>
              <textarea
                value={zoneDescription}
                onChange={(e) => setZoneDescription(e.target.value)}
                placeholder="Describe la zona o límites (ej. costa entre X e Y, profundidad máx. 20 m)"
                rows={2}
                className="w-full rounded-xl bg-white/10 border border-cyan-400/30 px-4 py-3 text-white placeholder-cyan-400/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 resize-none"
              />
              <button
                type="button"
                onClick={() => setShowZoneMapPicker(true)}
                className="mt-2 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-cyan-500/20 border border-cyan-400/30 text-cyan-200 text-sm font-medium hover:bg-cyan-500/30"
              >
                <MapPin className="w-4 h-4" />
                {zonePoint || (zonePolygon && zonePolygon.length > 0)
                  ? 'Editar zona en el mapa'
                  : 'Seleccionar zona en el mapa'}
              </button>
              {zonePoint && (
                <p className="text-cyan-400/80 text-xs mt-1">
                  Punto: {zonePoint.lat.toFixed(5)}, {zonePoint.lng.toFixed(5)}
                </p>
              )}
              {zonePolygon && zonePolygon.length > 0 && (
                <p className="text-cyan-400/80 text-xs mt-1">
                  Área dibujada: {zonePolygon.length} puntos
                </p>
              )}
            </div>
            <div>
              <label className="block text-cyan-200 text-sm font-medium mb-1.5">Reglas adicionales</label>
              <textarea
                value={additionalRules}
                onChange={(e) => setAdditionalRules(e.target.value)}
                placeholder="Cualquier regla que los participantes deban conocer"
                rows={3}
                className="w-full rounded-xl bg-white/10 border border-cyan-400/30 px-4 py-3 text-white placeholder-cyan-400/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 resize-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-cyan-200 text-sm font-medium">Puntuación por especie</label>
                <button type="button" onClick={addSpecies} className="text-cyan-400 text-sm flex items-center gap-1">
                  <Plus className="w-4 h-4" /> Añadir especie
                </button>
              </div>
              <p className="text-cyan-300/70 text-xs mb-2">Puntos por unidad (peso o talla) y talla mínima. El admin elige las especies.</p>
              <div className="space-y-3">
                {speciesScoring.map((s, i) => (
                  <div key={i} className="rounded-xl bg-white/5 border border-cyan-400/20 p-3 flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <span className="text-cyan-300 text-xs">Especie {i + 1}</span>
                      <button type="button" onClick={() => removeSpecies(i)} className="p-1 rounded hover:bg-white/10 text-red-300">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={s.species}
                      onChange={(e) => updateSpecies(i, 'species', e.target.value)}
                      placeholder="Ej: lubina, dorada"
                      className="w-full rounded-lg bg-white/10 border border-cyan-400/30 px-3 py-2 text-white placeholder-cyan-400/50 text-sm"
                    />
                    <div className="flex gap-2 flex-wrap">
                      <select
                        value={s.scoreBy}
                        onChange={(e) => updateSpecies(i, 'scoreBy', e.target.value as 'weight' | 'length')}
                        className="rounded-lg bg-white/10 border border-cyan-400/30 px-3 py-2 text-white text-sm"
                      >
                        <option value="weight">Por peso (kg)</option>
                        <option value="length">Por talla (cm)</option>
                      </select>
                      <input
                        type="number"
                        step="any"
                        value={s.pointsPerUnit ?? ''}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          updateSpecies(i, 'pointsPerUnit', Number.isNaN(v) ? 0 : v);
                        }}
                        placeholder="Pts/unidad"
                        className="w-24 rounded-lg bg-white/10 border border-cyan-400/30 px-3 py-2 text-white text-sm"
                      />
                      <input
                        type="number"
                        step="any"
                        value={s.minValue ?? ''}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          updateSpecies(i, 'minValue', Number.isNaN(v) ? 0 : v);
                        }}
                        placeholder="Mín. (kg o cm)"
                        className="w-24 rounded-lg bg-white/10 border border-cyan-400/30 px-3 py-2 text-white text-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

        {/* Campo específico según tipo */}
        {type === 'liga' ? (
          <div>
            <label className="block text-cyan-200 text-sm font-medium mb-2">Premio a pieza mayor</label>
            <div className="flex gap-4 mb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={!biggestCatchPrize}
                  onChange={() => setBiggestCatchPrize(false)}
                  className="rounded-full border-cyan-400 text-cyan-500 focus:ring-cyan-400"
                />
                <span className="text-cyan-200">No</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={biggestCatchPrize}
                  onChange={() => setBiggestCatchPrize(true)}
                  className="rounded-full border-cyan-400 text-cyan-500 focus:ring-cyan-400"
                />
                <span className="text-cyan-200">Sí</span>
              </label>
            </div>
            {biggestCatchPrize && (
              <div className="space-y-2">
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={biggestCatchPoints}
                  onChange={(e) => setBiggestCatchPoints(e.target.value)}
                  placeholder="Puntos extra (opcional)"
                  className="w-full rounded-xl bg-white/10 border border-cyan-400/30 px-4 py-2 text-white placeholder-cyan-400/50 text-sm"
                />
                <input
                  type="text"
                  value={biggestCatchPrizeDescription}
                  onChange={(e) => setBiggestCatchPrizeDescription(e.target.value)}
                  placeholder="Descripción del premio (opcional)"
                  className="w-full rounded-xl bg-white/10 border border-cyan-400/30 px-4 py-2 text-white placeholder-cyan-400/50 text-sm"
                />
              </div>
            )}
          </div>
        ) : (
          <div>
            <label className="block text-cyan-200 text-sm font-medium mb-2">Tipo de competición</label>
            <p className="text-cyan-300/70 text-xs mb-2">Elige cómo se determina el ganador del campeonato</p>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 cursor-pointer p-3 rounded-xl bg-white/5 border border-cyan-400/20 hover:bg-white/10">
                <input
                  type="radio"
                  checked={competitionType === 'rancho'}
                  onChange={() => setCompetitionType('rancho')}
                  className="rounded-full border-cyan-400 text-cyan-500 focus:ring-cyan-400"
                />
                <div>
                  <span className="text-cyan-200 font-medium">Rancho (conjunto de capturas)</span>
                  <p className="text-cyan-400/70 text-xs">Gana quien sume más puntos con todas sus capturas</p>
                </div>
              </label>
              <label className="flex items-center gap-2 cursor-pointer p-3 rounded-xl bg-white/5 border border-cyan-400/20 hover:bg-white/10">
                <input
                  type="radio"
                  checked={competitionType === 'pieza_mayor'}
                  onChange={() => setCompetitionType('pieza_mayor')}
                  className="rounded-full border-cyan-400 text-cyan-500 focus:ring-cyan-400"
                />
                <div>
                  <span className="text-cyan-200 font-medium">Pieza mayor</span>
                  <p className="text-cyan-400/70 text-xs">Gana quien capture la pieza de mayor peso/tamaño</p>
                </div>
              </label>
            </div>
          </div>
        )}

        <div>
          <label className="block text-cyan-200 text-sm font-medium mb-1.5">Premio (opcional)</label>
          <input
            type="text"
            value={premio}
            onChange={(e) => setPremio(e.target.value)}
            placeholder="Descripción del premio"
            className="w-full rounded-xl bg-white/10 border border-cyan-400/30 px-4 py-3 text-white placeholder-cyan-400/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
          />
        </div>
        <div>
          <label className="block text-cyan-200 text-sm font-medium mb-2">Inscripción</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={isPublic}
                onChange={() => setIsPublic(true)}
                className="rounded-full border-cyan-400 text-cyan-500 focus:ring-cyan-400"
              />
              <span className="text-cyan-200">Pública</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={!isPublic}
                onChange={() => setIsPublic(false)}
                className="rounded-full border-cyan-400 text-cyan-500 focus:ring-cyan-400"
              />
              <span className="text-cyan-200">Privada (solicitud o invitación)</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-cyan-200 text-sm font-medium mb-1.5">Descripción (opcional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Resumen o normas generales..."
            rows={2}
            className="w-full rounded-xl bg-white/10 border border-cyan-400/30 px-4 py-3 text-white placeholder-cyan-400/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 resize-none"
          />
        </div>

        <p className="text-cyan-300/70 text-xs">
          Al crear serás el administrador de esta {type === 'liga' ? 'liga' : 'campeonato'}.
        </p>
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl border border-cyan-400/30 text-cyan-200 font-medium hover:bg-white/10"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 py-3 rounded-xl bg-amber-500/80 hover:bg-amber-500 text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Crear'}
          </button>
        </div>
      </form>
      {showZoneMapPicker && (
        <ZoneMapPicker
          point={zonePoint}
          polygon={zonePolygon}
          onPointChange={setZonePoint}
          onPolygonChange={setZonePolygon}
          onClose={() => setShowZoneMapPicker(false)}
        />
      )}
    </div>
  );
}

function EditLeagueForm({
  league,
  userId,
  onSuccess,
  onCancel,
}: {
  league: League;
  userId: string;
  onSuccess: (updated: League) => void | Promise<void>;
  onCancel: () => void;
}) {
  const isLiga = league.type === 'liga';
  const [name, setName] = useState(league.name);
  const [description, setDescription] = useState(league.description ?? '');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(league.cover_image_url ?? null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [maxParticipants, setMaxParticipants] = useState<string>(league.max_participants != null ? String(league.max_participants) : '');
  const [startDate, setStartDate] = useState(league.start_date ?? '');
  const [endDate, setEndDate] = useState(league.end_date ?? '');
  const [zoneDescription, setZoneDescription] = useState(league.zone_description ?? '');
  const [zonePoint, setZonePoint] = useState<ZonePoint | null>(
    (league.zone_point as ZonePoint | null) ?? null
  );
  const [zonePolygon, setZonePolygon] = useState<ZonePolygon | null>(
    (league.zone_polygon as ZonePolygon | null) ?? null
  );
  const [showZoneMapPicker, setShowZoneMapPicker] = useState(false);
  const [additionalRules, setAdditionalRules] = useState(league.additional_rules ?? '');
  const [speciesScoring, setSpeciesScoring] = useState<SpeciesScoringEntry[]>(
    (league.species_scoring as SpeciesScoringEntry[] | null) ?? []
  );
  const [biggestCatchPrize, setBiggestCatchPrize] = useState(league.biggest_catch_prize ?? false);
  const [biggestCatchPoints, setBiggestCatchPoints] = useState(league.biggest_catch_points != null ? String(league.biggest_catch_points) : '');
  const [biggestCatchPrizeDescription, setBiggestCatchPrizeDescription] = useState(league.biggest_catch_prize_description ?? '');
  const [isPublic, setIsPublic] = useState(league.is_public ?? true);
  const [premio, setPremio] = useState(league.premio ?? '');
  const [competitionType, setCompetitionType] = useState<CompetitionType>(
    (league.competition_type as CompetitionType) ?? 'rancho'
  );

  const addSpecies = () => {
    setSpeciesScoring((prev) => [...prev, { species: '', scoreBy: 'weight', pointsPerUnit: 0, minValue: 0 }]);
  };
  const removeSpecies = (index: number) => {
    setSpeciesScoring((prev) => prev.filter((_, i) => i !== index));
  };
  const updateSpecies = (index: number, field: keyof SpeciesScoringEntry, value: string | number) => {
    setSpeciesScoring((prev) => {
      const next = [...prev];
      (next[index] as Record<string, unknown>)[field] = value;
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setFormError('El nombre es obligatorio.');
      return;
    }
    if (speciesScoring.length === 0) {
      setFormError('Añade al menos una especie con puntuación.');
      return;
    }
    setFormError(null);
    setSubmitting(true);
    try {
      if (isLiga) {
        const payload: UpdateLigaPayload = {
          name: trimmed,
          description: description.trim() || null,
          max_participants: maxParticipants.trim() ? parseInt(maxParticipants, 10) : null,
          start_date: startDate || null,
          end_date: endDate || null,
          zone_description: zoneDescription.trim() || null,
          zone_point: zonePoint,
          zone_polygon: zonePolygon,
          additional_rules: additionalRules.trim() || null,
          species_scoring: speciesScoring,
          biggest_catch_prize: biggestCatchPrize,
          biggest_catch_points: biggestCatchPoints.trim() ? parseInt(biggestCatchPoints, 10) : null,
          biggest_catch_prize_description: biggestCatchPrizeDescription.trim() || null,
          is_public: isPublic,
          premio: premio.trim() || null,
        };
        await updateLeague(league.id, userId, payload);
      } else {
        const payload: UpdateCampeonatoPayload = {
          name: trimmed,
          description: description.trim() || null,
          max_participants: maxParticipants.trim() ? parseInt(maxParticipants, 10) : null,
          start_date: startDate || null,
          end_date: endDate || null,
          zone_description: zoneDescription.trim() || null,
          zone_point: zonePoint,
          zone_polygon: zonePolygon,
          additional_rules: additionalRules.trim() || null,
          species_scoring: speciesScoring,
          competition_type: competitionType,
          is_public: isPublic,
          premio: premio.trim() || null,
        };
        await updateLeague(league.id, userId, payload);
      }
      if (coverFile) {
        await uploadLeagueCoverImage(league.id, userId, coverFile);
      }
      const updated = await getLeagueById(league.id, userId);
      if (updated) await onSuccess(updated);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 pb-10">
      <p className="text-cyan-200 font-medium mb-4 flex items-center gap-2">
        <Pencil className="w-5 h-5" />
        Editar {isLiga ? 'liga' : 'campeonato'}
      </p>
      <form onSubmit={handleSubmit} className="space-y-5">
        {formError && (
          <div className="rounded-xl bg-red-500/20 border border-red-400/40 text-red-200 px-4 py-2 text-sm">
            {formError}
          </div>
        )}
        <div>
          <label className="block text-cyan-200 text-sm font-medium mb-1.5">Nombre</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl bg-white/10 border border-cyan-400/30 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
            maxLength={120}
          />
        </div>
        <div>
          <label className="block text-cyan-200 text-sm font-medium mb-1.5">Foto de portada (opcional)</label>
          <div className="flex flex-col gap-2">
            {(coverPreview || coverFile) && (
              <div className="relative rounded-xl overflow-hidden border border-cyan-400/30 aspect-video max-h-40 bg-white/5">
                <img src={coverPreview ?? undefined} alt="Portada" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => { setCoverFile(null); setCoverPreview(league.cover_image_url ?? null); }}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            {!coverPreview && !coverFile && (
              <label className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-cyan-400/40 bg-white/5 py-6 text-cyan-300/80 hover:bg-white/10 cursor-pointer">
                <ImagePlus className="w-5 h-5" />
                <span className="text-sm">Cambiar foto de portada</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setCoverFile(file);
                      setCoverPreview(URL.createObjectURL(file));
                    }
                  }}
                />
              </label>
            )}
          </div>
        </div>
        {/* Campos comunes */}
        <div>
          <label className="block text-cyan-200 text-sm font-medium mb-1.5">Participantes máx. (opcional)</label>
          <input type="number" min={0} step="any" value={maxParticipants} onChange={(e) => setMaxParticipants(e.target.value)} className="w-full rounded-xl bg-white/10 border border-cyan-400/30 px-4 py-3 text-white" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-cyan-200 text-sm font-medium mb-1.5">Fecha desde</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full rounded-xl bg-white/10 border border-cyan-400/30 px-4 py-3 text-white" />
          </div>
          <div>
            <label className="block text-cyan-200 text-sm font-medium mb-1.5">Fecha hasta</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full rounded-xl bg-white/10 border border-cyan-400/30 px-4 py-3 text-white" />
          </div>
        </div>
        <div>
          <label className="block text-cyan-200 text-sm font-medium mb-1.5">Zona de pesca</label>
          <textarea value={zoneDescription} onChange={(e) => setZoneDescription(e.target.value)} rows={2} placeholder="Describe la zona o límites" className="w-full rounded-xl bg-white/10 border border-cyan-400/30 px-4 py-3 text-white resize-none" />
          <button type="button" onClick={() => setShowZoneMapPicker(true)} className="mt-2 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-cyan-500/20 border border-cyan-400/30 text-cyan-200 text-sm font-medium hover:bg-cyan-500/30">
            <MapPin className="w-4 h-4" />
            {zonePoint || (zonePolygon && zonePolygon.length > 0) ? 'Editar zona en el mapa' : 'Seleccionar zona en el mapa'}
          </button>
          {zonePoint && <p className="text-cyan-400/80 text-xs mt-1">Punto: {zonePoint.lat.toFixed(5)}, {zonePoint.lng.toFixed(5)}</p>}
          {zonePolygon && zonePolygon.length > 0 && <p className="text-cyan-400/80 text-xs mt-1">Área dibujada: {zonePolygon.length} puntos</p>}
        </div>
        <div>
          <label className="block text-cyan-200 text-sm font-medium mb-1.5">Reglas {isLiga ? 'adicionales' : 'del campeonato'}</label>
          <textarea value={additionalRules} onChange={(e) => setAdditionalRules(e.target.value)} rows={3} className="w-full rounded-xl bg-white/10 border border-cyan-400/30 px-4 py-3 text-white resize-none" />
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-cyan-200 text-sm font-medium">Puntuación por especie</label>
            <button type="button" onClick={addSpecies} className="text-cyan-400 text-sm flex items-center gap-1"><Plus className="w-4 h-4" /> Añadir</button>
          </div>
          <div className="space-y-3">
            {speciesScoring.map((s, i) => (
              <div key={i} className="rounded-xl bg-white/5 border border-cyan-400/20 p-3 flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-cyan-300 text-xs">Especie {i + 1}</span>
                  <button type="button" onClick={() => removeSpecies(i)} className="p-1 rounded hover:bg-white/10 text-red-300"><X className="w-4 h-4" /></button>
                </div>
                <input type="text" value={s.species} onChange={(e) => updateSpecies(i, 'species', e.target.value)} placeholder="Ej: lubina" className="w-full rounded-lg bg-white/10 border border-cyan-400/30 px-3 py-2 text-white text-sm" />
                <div className="flex gap-2 flex-wrap">
                  <select value={s.scoreBy} onChange={(e) => updateSpecies(i, 'scoreBy', e.target.value as 'weight' | 'length')} className="rounded-lg bg-white/10 border border-cyan-400/30 px-3 py-2 text-white text-sm">
                    <option value="weight">Peso (kg)</option>
                    <option value="length">Talla (cm)</option>
                  </select>
                  <input type="number" step="any" min={0} value={s.pointsPerUnit ?? ''} onChange={(e) => { const v = parseFloat(e.target.value); updateSpecies(i, 'pointsPerUnit', Number.isNaN(v) ? 0 : v); }} placeholder="Pts/unidad" className="w-24 rounded-lg bg-white/10 border border-cyan-400/30 px-3 py-2 text-white text-sm" />
                  <input type="number" step="any" min={0} value={s.minValue ?? ''} onChange={(e) => { const v = parseFloat(e.target.value); updateSpecies(i, 'minValue', Number.isNaN(v) ? 0 : v); }} placeholder="Mín." className="w-24 rounded-lg bg-white/10 border border-cyan-400/30 px-3 py-2 text-white text-sm" />
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Campo específico según tipo */}
        {isLiga ? (
          <div>
            <label className="block text-cyan-200 text-sm font-medium mb-2">Premio a pieza mayor</label>
            <div className="flex gap-4 mb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={!biggestCatchPrize} onChange={() => setBiggestCatchPrize(false)} className="rounded-full border-cyan-400 text-cyan-500" />
                <span className="text-cyan-200">No</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={biggestCatchPrize} onChange={() => setBiggestCatchPrize(true)} className="rounded-full border-cyan-400 text-cyan-500" />
                <span className="text-cyan-200">Sí</span>
              </label>
            </div>
            {biggestCatchPrize && (
              <div className="space-y-2">
                <input type="number" min={0} step="any" value={biggestCatchPoints} onChange={(e) => setBiggestCatchPoints(e.target.value)} placeholder="Puntos extra" className="w-full rounded-xl bg-white/10 border border-cyan-400/30 px-4 py-2 text-white text-sm" />
                <input type="text" value={biggestCatchPrizeDescription} onChange={(e) => setBiggestCatchPrizeDescription(e.target.value)} placeholder="Descripción premio" className="w-full rounded-xl bg-white/10 border border-cyan-400/30 px-4 py-2 text-white text-sm" />
              </div>
            )}
          </div>
        ) : (
          <div>
            <label className="block text-cyan-200 text-sm font-medium mb-2">Tipo de competición</label>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 cursor-pointer p-3 rounded-xl bg-white/5 border border-cyan-400/20 hover:bg-white/10">
                <input type="radio" checked={competitionType === 'rancho'} onChange={() => setCompetitionType('rancho')} className="rounded-full border-cyan-400 text-cyan-500" />
                <div>
                  <span className="text-cyan-200 font-medium">Rancho (conjunto de capturas)</span>
                  <p className="text-cyan-400/70 text-xs">Gana quien sume más puntos</p>
                </div>
              </label>
              <label className="flex items-center gap-2 cursor-pointer p-3 rounded-xl bg-white/5 border border-cyan-400/20 hover:bg-white/10">
                <input type="radio" checked={competitionType === 'pieza_mayor'} onChange={() => setCompetitionType('pieza_mayor')} className="rounded-full border-cyan-400 text-cyan-500" />
                <div>
                  <span className="text-cyan-200 font-medium">Pieza mayor</span>
                  <p className="text-cyan-400/70 text-xs">Gana quien capture la pieza más grande</p>
                </div>
              </label>
            </div>
          </div>
        )}
        <div>
          <label className="block text-cyan-200 text-sm font-medium mb-1.5">Premio (opcional)</label>
          <input type="text" value={premio} onChange={(e) => setPremio(e.target.value)} className="w-full rounded-xl bg-white/10 border border-cyan-400/30 px-4 py-3 text-white" />
        </div>
        <div>
          <label className="block text-cyan-200 text-sm font-medium mb-2">Inscripción</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" checked={isPublic} onChange={() => setIsPublic(true)} className="rounded-full border-cyan-400 text-cyan-500" />
              <span className="text-cyan-200">Pública</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" checked={!isPublic} onChange={() => setIsPublic(false)} className="rounded-full border-cyan-400 text-cyan-500" />
              <span className="text-cyan-200">Privada</span>
            </label>
          </div>
        </div>
        <div>
          <label className="block text-cyan-200 text-sm font-medium mb-1.5">Descripción (opcional)</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full rounded-xl bg-white/10 border border-cyan-400/30 px-4 py-3 text-white resize-none" />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onCancel} className="flex-1 py-3 rounded-xl border border-cyan-400/30 text-cyan-200 font-medium hover:bg-white/10">Cancelar</button>
          <button type="submit" disabled={submitting} className="flex-1 py-3 rounded-xl bg-amber-500/80 hover:bg-amber-500 text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2">
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Guardar'}
          </button>
        </div>
      </form>
      {showZoneMapPicker && (
        <ZoneMapPicker
          point={zonePoint}
          polygon={zonePolygon}
          onPointChange={setZonePoint}
          onPolygonChange={setZonePolygon}
          onClose={() => setShowZoneMapPicker(false)}
        />
      )}
    </div>
  );
}
