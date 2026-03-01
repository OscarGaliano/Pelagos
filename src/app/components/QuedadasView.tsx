import { getDiveSpots, type DiveSpotWithCreator } from '@/lib/api/diveSpots';
import { getProfile } from '@/lib/api/profiles';
import {
    acceptInvitation,
    acceptJoinRequest,
    createQuedada,
    denyJoinRequest,
    getCompletedQuedadas,
    getJoinRequests,
    getParticipants,
    getQuedadaById,
    getQuedadas,
    inviteUser,
    joinOpen,
    leaveQuedada,
    processExpiredQuedadas,
    publishSummary,
    requestToJoin,
    saveSummary,
    searchUsersForInvite,
    updateQuedada,
    type EventoTipo,
    type JoinMode,
} from '@/lib/api/quedadas';
import { supabase } from '@/lib/supabase';
import type { Quedada } from '@/lib/types';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
    CalendarDays,
    Check,
    ChevronLeft,
    Clock,
    History,
    ImagePlus,
    Loader2,
    MapPin,
    Megaphone,
    MessageSquare,
    Pencil,
    Plus,
    Search,
    Send,
    UserPlus,
    Users,
    X,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useCallback, useEffect, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';

const MAX_PARTICIPANTS_SALIDA = 4;

const JOIN_MODE_LABELS: Record<JoinMode, string> = {
  invite: 'Por invitación (admin invita a usuarios)',
  open: 'Abierta — Se añaden hasta completar cupo',
  request: 'Privada — Solicitud y admin acepta o no',
};

const TIPO_LABEL: Record<EventoTipo, string> = {
  quedada: 'Quedada',
  salida: 'Salida',
};

const defaultMarkerIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const DEFAULT_CENTER: [number, number] = [40.4, -3.7];

function MapPlacePicker({
  position,
  onSelect,
  onMyLocation,
}: {
  position: [number, number] | null;
  onSelect: (lat: number, lng: number) => void;
  onMyLocation: () => void;
}) {
  return (
    <div className="rounded-xl overflow-hidden border border-cyan-400/30 h-48">
      <MapContainer
        center={position ?? DEFAULT_CENTER}
        zoom={position ? 14 : 6}
        className="h-full w-full"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler onSelect={onSelect} position={position} />
        {position && <Marker position={position} icon={defaultMarkerIcon} />}
      </MapContainer>
      <div className="flex justify-end p-2 bg-[#0a1628]/90 border-t border-cyan-400/20">
        <button
          type="button"
          onClick={onMyLocation}
          className="text-xs px-3 py-1.5 rounded-lg bg-cyan-500/30 text-cyan-200 flex items-center gap-1"
        >
          <MapPin className="w-3.5 h-3.5" />
          Ubicarme (GPS)
        </button>
      </div>
    </div>
  );
}

function MapClickHandler({
  onSelect,
  position,
}: {
  onSelect: (lat: number, lng: number) => void;
  position: [number, number] | null;
}) {
  const map = useMap();
  useMapEvents({
    click: (e) => onSelect(e.latlng.lat, e.latlng.lng),
  });
  useEffect(() => {
    if (position) map.setView(position, 14);
  }, [position, map]);
  return null;
}

interface QuedadasViewProps {
  onBack: () => void;
  /** Si viene desde Inicio (novedades), abrir esta quedada al cargar. */
  initialQuedadaId?: string | null;
}

export function QuedadasView({ onBack, initialQuedadaId }: QuedadasViewProps) {
  const [userId, setUserId] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'create' | 'detail'>('list');
  const [tab, setTab] = useState<'active' | 'history'>('active');
  const [createTipo, setCreateTipo] = useState<EventoTipo>('salida');
  const [quedadas, setQuedadas] = useState<Quedada[]>([]);
  const [historyQuedadas, setHistoryQuedadas] = useState<Quedada[]>([]);
  const [selectedQuedada, setSelectedQuedada] = useState<Quedada | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summaryModal, setSummaryModal] = useState<Quedada | null>(null);

  const loadQuedadas = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id ?? null);
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Procesar quedadas expiradas primero
      await processExpiredQuedadas();
      // Cargar todas las quedadas
      const data = await getQuedadas(user.id);
      // Separar activas e historial
      const today = new Date().toISOString().slice(0, 10);
      const active = data.filter(q => q.meetup_date >= today && q.status === 'active');
      const history = data.filter(q => q.meetup_date < today || q.status === 'completed');
      setQuedadas(active);
      setHistoryQuedadas(history);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar quedadas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQuedadas();
  }, [loadQuedadas]);

  useEffect(() => {
    if (!initialQuedadaId || loading) return;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const full = await getQuedadaById(initialQuedadaId, user?.id ?? undefined);
      if (full) {
        setSelectedQuedada(full);
        setView('detail');
      }
    })();
  }, [initialQuedadaId, loading]);

  const openDetail = async (q: Quedada) => {
    const { data: { user } } = await supabase.auth.getUser();
    setLoading(true);
    setError(null);
    try {
      const full = await getQuedadaById(q.id, user?.id ?? undefined);
      setSelectedQuedada(full ?? q);
      setView('detail');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  };

  const header = (
    <div className="sticky top-0 z-30 backdrop-blur-xl bg-[#0a1628]/90 border-b border-cyan-400/20">
      <div className="px-4 py-3 flex items-center gap-3">
        <motion.button
          onClick={() => {
            if (view === 'detail') {
              setView('list');
              setSelectedQuedada(null);
            } else if (view === 'create') {
              setView('list');
            } else {
              onBack();
            }
          }}
          whileTap={{ scale: 0.9 }}
          className="p-2 rounded-full hover:bg-white/10"
        >
          <ChevronLeft className="w-6 h-6 text-cyan-400" />
        </motion.button>
        <h1 className="text-white text-xl font-medium">
          {view === 'list' && 'Quedadas y salidas'}
          {view === 'create' && (createTipo === 'quedada' ? 'Nueva quedada' : 'Nueva salida')}
          {view === 'detail' && (selectedQuedada?.title || TIPO_LABEL[(selectedQuedada as Quedada & { tipo?: EventoTipo })?.tipo ?? 'salida'])}
        </h1>
      </div>
    </div>
  );

  if (view === 'create') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a1628] via-[#0c1f3a] to-[#0a1628]">
        {header}
        <CreateEventoForm
          tipo={createTipo}
          userId={userId!}
          onSuccess={() => {
            loadQuedadas();
            setView('list');
          }}
          onCancel={() => setView('list')}
        />
      </div>
    );
  }

  if (view === 'detail' && selectedQuedada) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a1628] via-[#0c1f3a] to-[#0a1628]">
        {header}
        <QuedadaDetail
          quedada={selectedQuedada}
          userId={userId}
          onUpdate={openDetail}
          onLeave={() => {
            setSelectedQuedada(null);
            setView('list');
            loadQuedadas();
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a1628] via-[#0c1f3a] to-[#0a1628]">
      {header}
      <div className="p-6">
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
            Inicia sesión para ver y crear quedadas.
          </div>
        ) : (
          <>
            {/* Pestañas Activas / Historial */}
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setTab('active')}
                className={`flex-1 py-2.5 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                  tab === 'active'
                    ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-400/40'
                    : 'bg-white/5 text-cyan-300/60 border border-white/10'
                }`}
              >
                <Clock className="w-4 h-4" />
                Activas
                {quedadas.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-cyan-500/30 text-xs">{quedadas.length}</span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setTab('history')}
                className={`flex-1 py-2.5 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                  tab === 'history'
                    ? 'bg-amber-500/30 text-amber-200 border border-amber-400/40'
                    : 'bg-white/5 text-cyan-300/60 border border-white/10'
                }`}
              >
                <History className="w-4 h-4" />
                Historial
                {historyQuedadas.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-amber-500/30 text-xs">{historyQuedadas.length}</span>
                )}
              </button>
            </div>

            {/* Botones crear (solo en pestaña activas) */}
            {tab === 'active' && (
              <div className="grid grid-cols-2 gap-3 mb-6">
                <motion.button
                  onClick={() => { setCreateTipo('quedada'); setView('create'); }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 py-3 text-white font-medium"
                >
                  <Plus className="w-5 h-5" />
                  Crear quedada
                </motion.button>
                <motion.button
                  onClick={() => { setCreateTipo('salida'); setView('create'); }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center justify-center gap-2 rounded-xl border border-cyan-400/50 bg-cyan-500/20 py-3 text-cyan-200 font-medium"
                >
                  <Plus className="w-5 h-5" />
                  Crear salida
                </motion.button>
              </div>
            )}
            
            {/* Lista de quedadas activas */}
            {tab === 'active' && quedadas.length === 0 ? (
              <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-cyan-400/20 p-8 text-center">
                <CalendarDays className="w-12 h-12 text-cyan-400 mx-auto mb-3 opacity-70" />
                <p className="text-cyan-200 mb-1">Aún no hay quedadas</p>
                <p className="text-cyan-300/80 text-sm">Crea una para buscar compañeros de salida.</p>
              </div>
            ) : (
              <ul className="space-y-4">
                {quedadas.map((q) => {
                  const tipo = (q as Quedada & { tipo?: EventoTipo }).tipo ?? 'salida';
                  const creator = (q as Quedada & { creator_profile?: { display_name: string | null; avatar_url: string | null } }).creator_profile;
                  const listParticipants = (q as Quedada & { list_participants?: Array<{ user_id: string; role: string; display_name: string | null; avatar_url: string | null }> }).list_participants ?? [];
                  const adminId = (q as Quedada & { admin_id?: string }).admin_id;
                  const maxVisible = 5;
                  const showParticipants = listParticipants.slice(0, maxVisible);
                  const restCount = listParticipants.length - maxVisible;
                  return (
                  <motion.li
                    key={q.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="backdrop-blur-xl bg-white/5 rounded-2xl border border-cyan-400/20 overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => openDetail(q)}
                      className="w-full text-left p-4 flex flex-col gap-2"
                    >
                      {/* Creador: avatar + título y badges */}
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 flex-shrink-0 rounded-full bg-cyan-500/30 flex items-center justify-center overflow-hidden border border-cyan-400/30">
                          {creator?.avatar_url ? (
                            <img src={creator.avatar_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-cyan-200 text-sm font-medium">
                              {(creator?.display_name || adminId?.slice(0, 2) || '?').slice(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-white font-medium truncate">{q.title || TIPO_LABEL[tipo]}</span>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-cyan-200">
                                {TIPO_LABEL[tipo]}
                              </span>
                              {q.is_admin && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/30 text-cyan-200">Admin</span>
                              )}
                            </div>
                          </div>
                          <p className="text-cyan-300/70 text-xs mt-0.5">Creado por {creator?.display_name || 'Usuario'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-cyan-300/90 text-sm">
                        <CalendarDays className="w-4 h-4 flex-shrink-0" />
                        <span>{q.meetup_date} · {q.meetup_time.slice(0, 5)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-cyan-300/90 text-sm">
                        <MapPin className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{q.place}</span>
                      </div>
                      {/* Avatares pequeños de participantes */}
                      {listParticipants.length > 0 && (
                        <div className="flex flex-wrap items-center gap-0 pt-1">
                          {showParticipants.map((p, i) => (
                            <div
                              key={p.user_id}
                              className="h-6 w-6 rounded-full border-2 border-[#0a1628] bg-cyan-500/30 flex items-center justify-center overflow-hidden flex-shrink-0 -ml-2 first:ml-0"
                              style={{ zIndex: showParticipants.length - i }}
                              title={p.display_name || p.user_id}
                            >
                              {p.avatar_url ? (
                                <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <span className="text-cyan-200 text-[10px] font-medium">
                                  {(p.display_name || p.user_id).slice(0, 2).toUpperCase()}
                                </span>
                              )}
                            </div>
                          ))}
                          {restCount > 0 && (
                            <div
                              className="h-6 w-6 rounded-full border-2 border-[#0a1628] bg-cyan-600/50 flex items-center justify-center flex-shrink-0 -ml-2 text-cyan-200 text-[10px] font-medium"
                              style={{ zIndex: 0 }}
                              title={`+${restCount} más`}
                            >
                              +{restCount}
                            </div>
                          )}
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-cyan-300/70 text-xs">
                        <Users className="w-3 h-3" />
                        <span>
                          {q.participants_count ?? 0}
                          {q.max_participants != null ? ` / ${q.max_participants}` : ''} participantes
                        </span>
                        <span className="text-cyan-400/80">· {JOIN_MODE_LABELS[q.join_mode]}</span>
                      </div>
                    </button>
                  </motion.li>
                  );
                })}
              </ul>
            )}

            {/* HISTORIAL */}
            {tab === 'history' && (
              <>
                {historyQuedadas.length === 0 ? (
                  <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-amber-400/20 p-8 text-center">
                    <History className="w-12 h-12 text-amber-400 mx-auto mb-3 opacity-70" />
                    <p className="text-amber-200 mb-1">No hay quedadas en el historial</p>
                    <p className="text-amber-300/80 text-sm">Las quedadas pasadas aparecerán aquí.</p>
                  </div>
                ) : (
                  <ul className="space-y-4">
                    {historyQuedadas.map((q) => {
                      const tipo = (q as Quedada & { tipo?: EventoTipo }).tipo ?? 'salida';
                      const creator = (q as Quedada & { creator_profile?: { display_name: string | null; avatar_url: string | null } }).creator_profile;
                      const listParticipants = (q as Quedada & { list_participants?: Array<{ user_id: string; role: string; display_name: string | null; avatar_url: string | null }> }).list_participants ?? [];
                      const hasSummary = !!q.summary;
                      const isPublished = !!q.summary_published_at;
                      const canWriteSummary = q.is_admin && !hasSummary;
                      const canPublish = q.is_admin && hasSummary && !isPublished;

                      return (
                        <motion.li
                          key={q.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="backdrop-blur-xl bg-white/5 rounded-2xl border border-amber-400/20 overflow-hidden"
                        >
                          <div className="p-4">
                            {/* Cabecera */}
                            <div className="flex items-start gap-3 mb-3">
                              <div className="h-10 w-10 flex-shrink-0 rounded-full bg-amber-500/30 flex items-center justify-center overflow-hidden border border-amber-400/30">
                                {creator?.avatar_url ? (
                                  <img src={creator.avatar_url} alt="" className="h-full w-full object-cover" />
                                ) : (
                                  <span className="text-amber-200 text-sm font-medium">
                                    {(creator?.display_name || '?').slice(0, 2).toUpperCase()}
                                  </span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <span className="text-white font-medium truncate">{q.title || TIPO_LABEL[tipo]}</span>
                                  <div className="flex items-center gap-1.5 flex-shrink-0">
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-200">
                                      {TIPO_LABEL[tipo]}
                                    </span>
                                    {isPublished && (
                                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/30 text-green-200">Publicado</span>
                                    )}
                                  </div>
                                </div>
                                <p className="text-amber-300/70 text-xs mt-0.5">
                                  {new Date(q.meetup_date + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </p>
                              </div>
                            </div>

                            {/* Lugar */}
                            <div className="flex items-center gap-2 text-amber-300/90 text-sm mb-2">
                              <MapPin className="w-4 h-4 flex-shrink-0" />
                              <span className="truncate">{q.place}</span>
                            </div>

                            {/* Participantes etiquetados */}
                            {listParticipants.length > 0 && (
                              <div className="mb-3">
                                <p className="text-amber-200/60 text-xs mb-2">Participantes:</p>
                                <div className="flex flex-wrap gap-2">
                                  {listParticipants.map((p) => (
                                    <div
                                      key={p.user_id}
                                      className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-500/20 border border-amber-400/30"
                                    >
                                      <div className="h-5 w-5 rounded-full bg-amber-500/30 flex items-center justify-center overflow-hidden">
                                        {p.avatar_url ? (
                                          <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
                                        ) : (
                                          <span className="text-amber-200 text-[10px]">
                                            {(p.display_name || '?').slice(0, 2).toUpperCase()}
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-amber-200 text-xs">{p.display_name || 'Usuario'}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Resumen si existe */}
                            {hasSummary && (
                              <div className="bg-amber-500/10 border border-amber-400/20 rounded-xl p-3 mb-3">
                                <div className="flex items-center gap-2 text-amber-300 text-xs mb-1.5">
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  <span>Cómo fue:</span>
                                </div>
                                <p className="text-amber-100/90 text-sm">{q.summary}</p>
                                {q.summary_images && q.summary_images.length > 0 && (
                                  <div className="flex gap-2 mt-2 overflow-x-auto">
                                    {q.summary_images.map((img, i) => (
                                      <img
                                        key={i}
                                        src={img}
                                        alt=""
                                        className="h-20 w-20 rounded-lg object-cover flex-shrink-0"
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Acciones del admin */}
                            {q.is_admin && (
                              <div className="flex gap-2 mt-3">
                                {canWriteSummary && (
                                  <motion.button
                                    onClick={() => setSummaryModal(q)}
                                    whileTap={{ scale: 0.98 }}
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-medium"
                                  >
                                    <Pencil className="w-4 h-4" />
                                    Cuéntanos cómo fue
                                  </motion.button>
                                )}
                                {canPublish && (
                                  <motion.button
                                    onClick={async () => {
                                      try {
                                        await publishSummary(q.id, userId!);
                                        loadQuedadas();
                                      } catch (e) {
                                        setError(e instanceof Error ? e.message : 'Error al publicar');
                                      }
                                    }}
                                    whileTap={{ scale: 0.98 }}
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-500/30 border border-green-400/40 text-green-200 text-sm font-medium"
                                  >
                                    <Send className="w-4 h-4" />
                                    Publicar en novedades
                                  </motion.button>
                                )}
                                {hasSummary && !isPublished && (
                                  <motion.button
                                    onClick={() => setSummaryModal(q)}
                                    whileTap={{ scale: 0.98 }}
                                    className="py-2.5 px-4 rounded-xl bg-white/10 text-amber-200 text-sm"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </motion.button>
                                )}
                              </div>
                            )}
                          </div>
                        </motion.li>
                      );
                    })}
                  </ul>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Modal escribir resumen */}
      {summaryModal && (
        <SummaryModal
          quedada={summaryModal}
          userId={userId!}
          onClose={() => setSummaryModal(null)}
          onSaved={() => {
            setSummaryModal(null);
            loadQuedadas();
          }}
        />
      )}
    </div>
  );
}

// =============================================================================
// MODAL PARA ESCRIBIR RESUMEN
// =============================================================================

function SummaryModal({
  quedada,
  userId,
  onClose,
  onSaved,
}: {
  quedada: Quedada;
  userId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [summary, setSummary] = useState(quedada.summary ?? '');
  const [images, setImages] = useState<string[]>(quedada.summary_images ?? []);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listParticipants = (quedada as Quedada & { list_participants?: Array<{ user_id: string; display_name: string | null; avatar_url: string | null }> }).list_participants ?? [];

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    setError(null);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
      const fileName = `${quedada.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('quedada-summaries')
        .upload(fileName, file, { upsert: true });
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('quedada-summaries')
        .getPublicUrl(fileName);
      
      setImages(prev => [...prev, publicUrl]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir imagen');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!summary.trim()) {
      setError('Escribe un resumen de cómo fue la quedada');
      return;
    }
    
    setSaving(true);
    setError(null);
    try {
      await saveSummary(quedada.id, userId, summary.trim(), images.length > 0 ? images : undefined);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        className="relative w-full max-w-lg bg-gradient-to-b from-[#0c1f3a] to-[#0a1628] rounded-t-3xl border-t border-amber-400/30 max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-amber-400/20 flex items-center justify-between">
          <h2 className="text-white font-medium">Cuéntanos cómo fue</h2>
          <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-white/10">
            <X className="w-5 h-5 text-amber-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Info de la quedada */}
          <div className="bg-amber-500/10 rounded-xl p-3">
            <p className="text-white font-medium">{quedada.title || 'Quedada'}</p>
            <p className="text-amber-300/80 text-sm">
              {new Date(quedada.meetup_date + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
              {' · '}{quedada.place}
            </p>
          </div>

          {/* Participantes etiquetados */}
          {listParticipants.length > 0 && (
            <div>
              <p className="text-amber-200/70 text-xs mb-2">Participantes que aparecerán etiquetados:</p>
              <div className="flex flex-wrap gap-2">
                {listParticipants.map((p) => (
                  <div
                    key={p.user_id}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/30"
                  >
                    <div className="h-5 w-5 rounded-full bg-cyan-500/30 flex items-center justify-center overflow-hidden">
                      {p.avatar_url ? (
                        <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-cyan-200 text-[10px]">
                          {(p.display_name || '?').slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <span className="text-cyan-200 text-xs">{p.display_name || 'Usuario'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Textarea resumen */}
          <div>
            <label className="text-amber-200/70 text-sm mb-1.5 block">¿Cómo fue la experiencia?</label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Cuéntanos qué tal fue la quedada, capturas, anécdotas..."
              rows={4}
              className="w-full bg-white/5 border border-amber-400/30 rounded-xl px-3 py-2.5 text-white placeholder:text-amber-300/40 focus:outline-none focus:ring-2 focus:ring-amber-400/50 resize-none"
            />
          </div>

          {/* Imágenes */}
          <div>
            <label className="text-amber-200/70 text-sm mb-1.5 block">Fotos (opcional)</label>
            <div className="flex flex-wrap gap-2">
              {images.map((img, i) => (
                <div key={i} className="relative">
                  <img src={img} alt="" className="h-20 w-20 rounded-lg object-cover" />
                  <button
                    type="button"
                    onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
                    className="absolute -top-1 -right-1 p-1 rounded-full bg-red-500 text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <label className="h-20 w-20 rounded-lg border-2 border-dashed border-amber-400/40 flex items-center justify-center cursor-pointer hover:bg-amber-500/10 transition-colors">
                {uploading ? (
                  <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
                ) : (
                  <ImagePlus className="w-6 h-6 text-amber-400" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-400/40 rounded-lg px-3 py-2 text-red-200 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-amber-400/20">
          <motion.button
            onClick={handleSave}
            disabled={saving || !summary.trim()}
            whileTap={{ scale: 0.98 }}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Check className="w-5 h-5" />
                Guardar resumen
              </>
            )}
          </motion.button>
          <p className="text-amber-200/50 text-xs text-center mt-2">
            Después podrás publicarlo en novedades para compartirlo con la comunidad
          </p>
        </div>
      </motion.div>
    </div>
  );
}

// =============================================================================
// FORMULARIO CREAR EVENTO
// =============================================================================

function CreateEventoForm({
  tipo,
  userId,
  onSuccess,
  onCancel,
}: {
  tipo: EventoTipo;
  userId: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const isQuedada = tipo === 'quedada';
  const [title, setTitle] = useState('');
  const [meetupDate, setMeetupDate] = useState('');
  const [meetupTime, setMeetupTime] = useState('09:00');
  const [place, setPlace] = useState('');
  const [placeLat, setPlaceLat] = useState<number | null>(null);
  const [placeLng, setPlaceLng] = useState<number | null>(null);
  const [lugarPesca, setLugarPesca] = useState('');
  const [diveSpotId, setDiveSpotId] = useState<string | null>(null);
  const [diveSpots, setDiveSpots] = useState<DiveSpotWithCreator[]>([]);
  const [maxParticipantsQuedadaEnabled, setMaxParticipantsQuedadaEnabled] = useState(false);
  const [maxParticipantsQuedadaStr, setMaxParticipantsQuedadaStr] = useState('');
  const [joinMode, setJoinMode] = useState<JoinMode>('open');
  const [publishedInNovedades, setPublishedInNovedades] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    getDiveSpots().then(setDiveSpots).catch(() => setDiveSpots([]));
  }, []);

  const handleMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setErr('Tu dispositivo no soporta geolocalización.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPlaceLat(pos.coords.latitude);
        setPlaceLng(pos.coords.longitude);
        setErr(null);
      },
      () => setErr('No se pudo obtener tu ubicación.')
    );
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!place.trim()) {
      setErr(isQuedada ? 'Indica el lugar de la quedada (nombre o dirección).' : 'Indica el lugar de salida.');
      return;
    }
    if (!meetupDate) {
      setErr('Indica la fecha.');
      return;
    }
    if (placeLat == null || placeLng == null) {
      setErr('Señala el punto de encuentro en el mapa o pulsa Ubicarme (GPS).');
      return;
    }
    setSubmitting(true);
    try {
      await createQuedada(userId, {
        tipo,
        title: title.trim() || undefined,
        meetup_date: meetupDate,
        meetup_time: meetupTime,
        place: place.trim(),
        place_lat: placeLat ?? undefined,
        place_lng: placeLng ?? undefined,
        lugar_pesca: lugarPesca.trim() || undefined,
        dive_spot_id: diveSpotId ?? undefined,
        max_participants: isQuedada
          ? (maxParticipantsQuedadaEnabled && maxParticipantsQuedadaStr.trim() !== ''
            ? (() => {
                const n = parseInt(maxParticipantsQuedadaStr.replace(/\D/g, ''), 10);
                return Number.isNaN(n) ? null : Math.max(2, Math.min(200, n));
              })()
            : null)
          : undefined,
        join_mode: joinMode,
        published_in_novedades: publishedInNovedades,
      });
      onSuccess();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error al crear');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4 max-w-lg mx-auto">
      {err && (
        <div className="rounded-xl bg-red-500/20 border border-red-400/40 text-red-200 px-4 py-2 text-sm">
          {err}
        </div>
      )}
      <div>
        <label className="block text-cyan-200 text-sm mb-1">Título (opcional)</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={isQuedada ? 'Ej. Quedada zona norte' : 'Ej. Salida Cabo de Gata'}
          className="w-full rounded-xl bg-white/10 border border-cyan-400/30 px-4 py-2.5 text-white placeholder-cyan-300/50 focus:ring-2 focus:ring-cyan-400/50"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-cyan-200 text-sm mb-1">Fecha *</label>
          <input
            type="date"
            value={meetupDate}
            onChange={(e) => setMeetupDate(e.target.value)}
            required
            className="w-full rounded-xl bg-white/10 border border-cyan-400/30 px-4 py-2.5 text-white"
          />
        </div>
        <div>
          <label className="block text-cyan-200 text-sm mb-1">Hora</label>
          <input
            type="time"
            value={meetupTime}
            onChange={(e) => setMeetupTime(e.target.value)}
            className="w-full rounded-xl bg-white/10 border border-cyan-400/30 px-4 py-2.5 text-white"
          />
        </div>
      </div>
      <div>
        <label className="block text-cyan-200 text-sm mb-1">
          {isQuedada ? 'Lugar de la quedada (nombre o dirección) *' : 'Lugar de salida *'}
        </label>
        <input
          type="text"
          value={place}
          onChange={(e) => setPlace(e.target.value)}
          placeholder={isQuedada ? 'Ej. Puerto de Valencia, parking playa' : 'Punto de encuentro o zona'}
          required
          className="w-full rounded-xl bg-white/10 border border-cyan-400/30 px-4 py-2.5 text-white placeholder-cyan-300/50 focus:ring-2 focus:ring-cyan-400/50"
        />
      </div>

      {/* Mapa y lugar de pesca: mismo formato para quedada y salida */}
      <div>
        <label className="block text-cyan-200 text-sm mb-1">Señala el punto de encuentro en el mapa *</label>
        <MapPlacePicker
          position={placeLat != null && placeLng != null ? [placeLat, placeLng] : null}
          onSelect={(lat, lng) => {
            setPlaceLat(lat);
            setPlaceLng(lng);
          }}
          onMyLocation={handleMyLocation}
        />
      </div>
      <div>
        <label className="block text-cyan-200 text-sm mb-1">Lugar de pesca</label>
        <input
          type="text"
          value={lugarPesca}
          onChange={(e) => {
            setLugarPesca(e.target.value);
            setDiveSpotId(null);
          }}
          placeholder="Escribe el lugar o elige un escenario abajo"
          className="w-full rounded-xl bg-white/10 border border-cyan-400/30 px-4 py-2.5 text-white placeholder-cyan-300/50 focus:ring-2 focus:ring-cyan-400/50"
        />
        <p className="text-cyan-300/60 text-xs mt-1 mb-2">Puedes editarlo o elegir un escenario de pesca compartido (por ciudad)</p>
        <select
          value={diveSpotId ?? ''}
          onChange={(e) => {
            const id = e.target.value || null;
            setDiveSpotId(id);
            if (id) {
              const spot = diveSpots.find((s) => s.id === id);
              if (spot) setLugarPesca(spot.name);
            }
          }}
          className="w-full rounded-xl bg-white/10 border border-cyan-400/30 px-4 py-2.5 text-white text-sm"
        >
          <option value="">— Elegir escenario de pesca —</option>
          {(() => {
            const byCity = new Map<string, DiveSpotWithCreator[]>();
            for (const s of diveSpots) {
              const city = (s as DiveSpotWithCreator & { city?: string | null }).city?.trim() || 'Otras';
              if (!byCity.has(city)) byCity.set(city, []);
              byCity.get(city)!.push(s);
            }
            const cities = Array.from(byCity.keys()).sort((a, b) => a.localeCompare(b));
            return cities.map((city) => (
              <optgroup key={city} label={city}>
                {[...byCity.get(city)!].sort((a, b) => a.name.localeCompare(b.name)).map((spot) => (
                  <option key={spot.id} value={spot.id}>{spot.name}</option>
                ))}
              </optgroup>
            ));
          })()}
        </select>
      </div>

      {isQuedada ? (
        <>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="maxQuedada"
              checked={maxParticipantsQuedadaEnabled}
              onChange={(e) => {
                setMaxParticipantsQuedadaEnabled(e.target.checked);
                if (!e.target.checked) setMaxParticipantsQuedadaStr('');
                else if (!maxParticipantsQuedadaStr.trim()) setMaxParticipantsQuedadaStr('10');
              }}
              className="rounded border-cyan-400/50 bg-white/10 text-cyan-500"
            />
            <label htmlFor="maxQuedada" className="text-cyan-200 text-sm">Establecer número máximo de personas (incluido tú)</label>
          </div>
          {maxParticipantsQuedadaEnabled && (
            <div>
              <label className="block text-cyan-200 text-sm mb-1">Máximo de personas (2-200)</label>
              <input
                type="text"
                inputMode="numeric"
                value={maxParticipantsQuedadaStr}
                onChange={(e) => setMaxParticipantsQuedadaStr(e.target.value.replace(/\D/g, '').slice(0, 3))}
                placeholder="Ej. 10"
                className="w-full rounded-xl bg-white/10 border border-cyan-400/30 px-4 py-2.5 text-white placeholder-cyan-300/50"
              />
            </div>
          )}
          <div>
            <label className="block text-cyan-200 text-sm mb-2">Tipo de quedada</label>
            <select
              value={joinMode}
              onChange={(e) => setJoinMode(e.target.value as JoinMode)}
              className="w-full rounded-xl bg-white/10 border border-cyan-400/30 px-4 py-2.5 text-white"
            >
              <option value="open">Abierta — Cualquier usuario puede unirse</option>
              <option value="request">Privada — Mediante solicitud (tú aceptas o no)</option>
            </select>
          </div>
        </>
      ) : (
        <>
          <p className="text-cyan-300/80 text-sm">
            Máximo de personas: <span className="text-cyan-200 font-medium">{MAX_PARTICIPANTS_SALIDA}</span> (incluido tú como admin).
          </p>
          <div>
            <label className="block text-cyan-200 text-sm mb-2">Tipo de salida</label>
            <select
              value={joinMode}
              onChange={(e) => setJoinMode(e.target.value as JoinMode)}
              className="w-full rounded-xl bg-white/10 border border-cyan-400/30 px-4 py-2.5 text-white"
            >
              <option value="open">Abierta — Se añaden usuarios hasta completar el cupo</option>
              <option value="request">Privada — Los usuarios hacen solicitud y tú aceptas o no</option>
            </select>
          </div>
        </>
      )}

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="novedades"
          checked={publishedInNovedades}
          onChange={(e) => setPublishedInNovedades(e.target.checked)}
          className="rounded border-cyan-400/50 bg-white/10 text-cyan-500"
        />
        <label htmlFor="novedades" className="text-cyan-200 text-sm flex items-center gap-1">
          <Megaphone className="w-4 h-4" />
          Colgar en novedades
        </label>
      </div>
      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl border border-cyan-400/40 text-cyan-300"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 py-2.5 rounded-xl bg-cyan-500 text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {isQuedada ? 'Crear quedada' : 'Crear salida'}
        </button>
      </div>
    </form>
  );
}

function EditQuedadaForm({
  quedada,
  userId,
  diveSpots: initialDiveSpots,
  onSave,
  onCancel,
  loadDiveSpots,
}: {
  quedada: Quedada;
  userId: string;
  diveSpots: DiveSpotWithCreator[];
  onSave: (updates: Parameters<typeof updateQuedada>[2]) => Promise<void>;
  onCancel: () => void;
  loadDiveSpots: () => Promise<DiveSpotWithCreator[]>;
}) {
  const tipo = (quedada as Quedada & { tipo?: EventoTipo }).tipo ?? 'quedada';
  const isQuedada = tipo === 'quedada';
  const [diveSpots, setDiveSpots] = useState<DiveSpotWithCreator[]>(initialDiveSpots);
  const [title, setTitle] = useState(quedada.title ?? '');
  const [meetupDate, setMeetupDate] = useState(quedada.meetup_date ?? '');
  const [meetupTime, setMeetupTime] = useState((quedada.meetup_time ?? '09:00').slice(0, 5));
  const [place, setPlace] = useState(quedada.place ?? '');
  const [placeLat, setPlaceLat] = useState<number | null>(quedada.place_lat ?? null);
  const [placeLng, setPlaceLng] = useState<number | null>(quedada.place_lng ?? null);
  const [lugarPesca, setLugarPesca] = useState(quedada.lugar_pesca ?? '');
  const [diveSpotId, setDiveSpotId] = useState<string | null>(quedada.dive_spot_id ?? null);
  const [maxParticipantsQuedadaEnabled, setMaxParticipantsQuedadaEnabled] = useState(quedada.max_participants != null);
  const [maxParticipantsQuedadaStr, setMaxParticipantsQuedadaStr] = useState(quedada.max_participants != null ? String(quedada.max_participants) : '10');
  const [joinMode, setJoinMode] = useState<JoinMode>(quedada.join_mode ?? 'open');
  const [publishedInNovedades, setPublishedInNovedades] = useState(quedada.published_in_novedades ?? false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    loadDiveSpots().then(setDiveSpots).catch(() => setDiveSpots([]));
  }, [loadDiveSpots]);

  const handleMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setErr('Tu dispositivo no soporta geolocalización.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPlaceLat(pos.coords.latitude);
        setPlaceLng(pos.coords.longitude);
        setErr(null);
      },
      () => setErr('No se pudo obtener tu ubicación.')
    );
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!place.trim()) {
      setErr(isQuedada ? 'Indica el lugar de la quedada.' : 'Indica el lugar de salida.');
      return;
    }
    if (!meetupDate) {
      setErr('Indica la fecha.');
      return;
    }
    if (placeLat == null || placeLng == null) {
      setErr('Señala el punto de encuentro en el mapa o pulsa Ubicarme (GPS).');
      return;
    }
    setSubmitting(true);
    try {
      await onSave({
        title: title.trim() || null,
        meetup_date: meetupDate,
        meetup_time: meetupTime,
        place: place.trim(),
        place_lat: placeLat,
        place_lng: placeLng,
        lugar_pesca: lugarPesca.trim() || null,
        dive_spot_id: diveSpotId ?? null,
        max_participants: isQuedada
          ? (maxParticipantsQuedadaEnabled && maxParticipantsQuedadaStr.trim() !== ''
            ? (() => {
                const n = parseInt(maxParticipantsQuedadaStr.replace(/\D/g, ''), 10);
                return Number.isNaN(n) ? null : Math.max(2, Math.min(200, n));
              })()
            : null)
          : undefined,
        join_mode: joinMode,
        published_in_novedades: publishedInNovedades,
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4 max-w-lg mx-auto">
      {err && (
        <div className="rounded-xl bg-red-500/20 border border-red-400/40 text-red-200 px-4 py-2 text-sm">
          {err}
        </div>
      )}
      <div>
        <label className="block text-cyan-200 text-sm mb-1">Título (opcional)</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={isQuedada ? 'Ej. Quedada zona norte' : 'Ej. Salida Cabo de Gata'}
          className="w-full rounded-xl bg-white/10 border border-cyan-400/30 px-4 py-2.5 text-white placeholder-cyan-300/50"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-cyan-200 text-sm mb-1">Fecha *</label>
          <input
            type="date"
            value={meetupDate}
            onChange={(e) => setMeetupDate(e.target.value)}
            required
            className="w-full rounded-xl bg-white/10 border border-cyan-400/30 px-4 py-2.5 text-white"
          />
        </div>
        <div>
          <label className="block text-cyan-200 text-sm mb-1">Hora</label>
          <input
            type="time"
            value={meetupTime}
            onChange={(e) => setMeetupTime(e.target.value)}
            className="w-full rounded-xl bg-white/10 border border-cyan-400/30 px-4 py-2.5 text-white"
          />
        </div>
      </div>
      <div>
        <label className="block text-cyan-200 text-sm mb-1">
          {isQuedada ? 'Lugar de la quedada (nombre o dirección) *' : 'Lugar de salida *'}
        </label>
        <input
          type="text"
          value={place}
          onChange={(e) => setPlace(e.target.value)}
          placeholder={isQuedada ? 'Ej. Puerto de Valencia' : 'Punto de encuentro'}
          required
          className="w-full rounded-xl bg-white/10 border border-cyan-400/30 px-4 py-2.5 text-white placeholder-cyan-300/50"
        />
      </div>
      <div>
        <label className="block text-cyan-200 text-sm mb-1">Punto de encuentro en el mapa *</label>
        <MapPlacePicker
          position={placeLat != null && placeLng != null ? [placeLat, placeLng] : null}
          onSelect={(lat, lng) => { setPlaceLat(lat); setPlaceLng(lng); }}
          onMyLocation={handleMyLocation}
        />
      </div>
      <div>
        <label className="block text-cyan-200 text-sm mb-1">Lugar de pesca</label>
        <input
          type="text"
          value={lugarPesca}
          onChange={(e) => { setLugarPesca(e.target.value); setDiveSpotId(null); }}
          placeholder="Escribe o elige un escenario"
          className="w-full rounded-xl bg-white/10 border border-cyan-400/30 px-4 py-2.5 text-white placeholder-cyan-300/50"
        />
        <select
          value={diveSpotId ?? ''}
          onChange={(e) => {
            const id = e.target.value || null;
            setDiveSpotId(id);
            if (id) {
              const spot = diveSpots.find((s) => s.id === id);
              if (spot) setLugarPesca(spot.name);
            }
          }}
          className="w-full mt-2 rounded-xl bg-white/10 border border-cyan-400/30 px-4 py-2.5 text-white text-sm"
        >
          <option value="">— Elegir escenario —</option>
          {(() => {
            const byCity = new Map<string, DiveSpotWithCreator[]>();
            for (const s of diveSpots) {
              const city = (s as DiveSpotWithCreator & { city?: string | null }).city?.trim() || 'Otras';
              if (!byCity.has(city)) byCity.set(city, []);
              byCity.get(city)!.push(s);
            }
            const cities = Array.from(byCity.keys()).sort((a, b) => a.localeCompare(b));
            return cities.map((city) => (
              <optgroup key={city} label={city}>
                {[...(byCity.get(city) ?? [])].sort((a, b) => a.name.localeCompare(b.name)).map((spot) => (
                  <option key={spot.id} value={spot.id}>{spot.name}</option>
                ))}
              </optgroup>
            ));
          })()}
        </select>
      </div>
      {isQuedada ? (
        <>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="edit-maxQuedada"
              checked={maxParticipantsQuedadaEnabled}
              onChange={(e) => {
                setMaxParticipantsQuedadaEnabled(e.target.checked);
                if (!e.target.checked) setMaxParticipantsQuedadaStr('');
                else if (!maxParticipantsQuedadaStr.trim()) setMaxParticipantsQuedadaStr('10');
              }}
              className="rounded border-cyan-400/50 bg-white/10 text-cyan-500"
            />
            <label htmlFor="edit-maxQuedada" className="text-cyan-200 text-sm">Número máximo de personas</label>
          </div>
          {maxParticipantsQuedadaEnabled && (
            <div>
              <label className="block text-cyan-200 text-sm mb-1">Máximo (2-200)</label>
              <input
                type="text"
                inputMode="numeric"
                value={maxParticipantsQuedadaStr}
                onChange={(e) => setMaxParticipantsQuedadaStr(e.target.value.replace(/\D/g, '').slice(0, 3))}
                placeholder="Ej. 10"
                className="w-full rounded-xl bg-white/10 border border-cyan-400/30 px-4 py-2.5 text-white placeholder-cyan-300/50"
              />
            </div>
          )}
          <div>
            <label className="block text-cyan-200 text-sm mb-2">Tipo de quedada</label>
            <select
              value={joinMode}
              onChange={(e) => setJoinMode(e.target.value as JoinMode)}
              className="w-full rounded-xl bg-white/10 border border-cyan-400/30 px-4 py-2.5 text-white"
            >
              <option value="open">Abierta</option>
              <option value="request">Privada (solicitud)</option>
            </select>
          </div>
        </>
      ) : (
        <div>
          <label className="block text-cyan-200 text-sm mb-2">Tipo de salida</label>
          <select
            value={joinMode}
            onChange={(e) => setJoinMode(e.target.value as JoinMode)}
            className="w-full rounded-xl bg-white/10 border border-cyan-400/30 px-4 py-2.5 text-white"
          >
            <option value="open">Abierta</option>
            <option value="request">Privada (solicitud)</option>
          </select>
        </div>
      )}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="edit-novedades"
          checked={publishedInNovedades}
          onChange={(e) => setPublishedInNovedades(e.target.checked)}
          className="rounded border-cyan-400/50 bg-white/10 text-cyan-500"
        />
        <label htmlFor="edit-novedades" className="text-cyan-200 text-sm flex items-center gap-1">
          <Megaphone className="w-4 h-4" />
          Colgar en novedades
        </label>
      </div>
      <div className="flex gap-3 pt-4">
        <button type="button" onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-cyan-400/40 text-cyan-300">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 py-2.5 rounded-xl bg-cyan-500 text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Guardar
        </button>
      </div>
    </form>
  );
}

function QuedadaDetail({
  quedada,
  userId,
  onUpdate,
  onLeave,
}: {
  quedada: Quedada;
  userId: string | null;
  onUpdate: (q: Quedada) => void;
  onLeave: () => void;
}) {
  const [creatorProfile, setCreatorProfile] = useState<{ display_name: string | null; avatar_url: string | null } | null>(null);
  const [participants, setParticipants] = useState<Array<{ user_id: string; role: string; profiles: { display_name: string | null; avatar_url: string | null } | null }>>([]);
  const [requests, setRequests] = useState<Array<{ user_id: string; profiles: { display_name: string | null; avatar_url: string | null } | null }>>([]);
  const [inviteQuery, setInviteQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ id: string; display_name: string | null; avatar_url: string | null }>>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [editingQuedada, setEditingQuedada] = useState(false);

  useEffect(() => {
    const adminId = (quedada as { admin_id?: string }).admin_id;
    if (adminId) getProfile(adminId).then((p) => setCreatorProfile(p ? { display_name: p.display_name, avatar_url: p.avatar_url } : null)).catch(() => setCreatorProfile(null));
  }, [quedada]);

  const loadDetail = useCallback(async () => {
    if (!quedada?.id) return;
    setLoading(true);
    try {
      const [parts, reqs] = await Promise.all([
        getParticipants(quedada.id),
        quedada.is_admin ? getJoinRequests(quedada.id) : Promise.resolve([]),
      ]);
      setParticipants(parts as typeof participants);
      setRequests(reqs as typeof requests);
    } finally {
      setLoading(false);
    }
  }, [quedada?.id, quedada?.is_admin]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const doSearch = async () => {
    if (!inviteQuery.trim()) return;
    try {
      const users = await searchUsersForInvite(inviteQuery.trim(), 15);
      setSearchResults(users);
    } catch {
      setSearchResults([]);
    }
  };

  const handleInvite = async (targetUserId: string) => {
    if (!userId || !quedada.is_admin) return;
    setActionLoading(targetUserId);
    setMessage(null);
    try {
      await inviteUser(quedada.id, userId, targetUserId);
      setMessage('Invitación enviada');
      setInviteQuery('');
      setSearchResults([]);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Error al invitar');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAcceptRequest = async (targetUserId: string) => {
    if (!userId || !quedada.is_admin) return;
    setActionLoading(targetUserId);
    setMessage(null);
    try {
      await acceptJoinRequest(quedada.id, userId, targetUserId);
      loadDetail();
      setMessage('Solicitud aceptada');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDenyRequest = async (targetUserId: string) => {
    if (!userId || !quedada.is_admin) return;
    setActionLoading(targetUserId);
    setMessage(null);
    try {
      await denyJoinRequest(quedada.id, userId, targetUserId);
      loadDetail();
      setMessage('Solicitud denegada');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleJoinOpen = async () => {
    if (!userId) return;
    setActionLoading('join');
    setMessage(null);
    try {
      await joinOpen(quedada.id, userId);
      const updated = await getQuedadaById(quedada.id, userId);
      if (updated) onUpdate(updated);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Error al unirse');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRequestToJoin = async () => {
    if (!userId) return;
    setActionLoading('request');
    setMessage(null);
    try {
      await requestToJoin(quedada.id, userId);
      const updated = await getQuedadaById(quedada.id, userId);
      if (updated) onUpdate(updated);
      setMessage('Solicitud enviada. El administrador la revisará.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAcceptInvitation = async () => {
    if (!userId) return;
    setActionLoading('accept-inv');
    setMessage(null);
    try {
      await acceptInvitation(quedada.id, userId);
      const updated = await getQuedadaById(quedada.id, userId);
      if (updated) onUpdate(updated);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleLeave = async () => {
    if (!userId) return;
    if (!confirm('¿Abandonar esta quedada?')) return;
    setActionLoading('leave');
    try {
      await leaveQuedada(quedada.id, userId);
      onLeave();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Error');
      setActionLoading(null);
    }
  };

  const handleUpdateJoinMode = async (mode: JoinMode) => {
    if (!userId || !quedada.is_admin) return;
    setActionLoading('mode');
    setMessage(null);
    try {
      await updateQuedada(quedada.id, userId, { join_mode: mode });
      const updated = await getQuedadaById(quedada.id, userId);
      if (updated) onUpdate(updated);
      setMessage('Tipo de acceso actualizado');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleNovedades = async () => {
    if (!userId || !quedada.is_admin) return;
    setActionLoading('novedades');
    setMessage(null);
    try {
      await updateQuedada(quedada.id, userId, { published_in_novedades: !quedada.published_in_novedades });
      const updated = await getQuedadaById(quedada.id, userId);
      if (updated) onUpdate(updated);
      setMessage(quedada.published_in_novedades ? 'Quitado de novedades' : 'Publicado en novedades');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Error');
    } finally {
      setActionLoading(null);
    }
  };

  const canJoinOpen = quedada.join_mode === 'open' && !quedada.is_participant && userId;
  const canRequest = quedada.join_mode === 'request' && !quedada.is_participant && quedada.my_request !== 'accepted' && quedada.my_request !== 'pending' && userId;
  const hasPendingRequest = quedada.join_mode === 'request' && quedada.my_request === 'pending';
  const canAcceptInvitation = quedada.my_invitation === 'pending' && userId;

  const adminId = (quedada as { admin_id?: string }).admin_id;

  return (
    <div className="p-6 space-y-6">
      {/* Creador: foto y nombre arriba */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 flex-shrink-0 rounded-full bg-cyan-500/30 flex items-center justify-center overflow-hidden border border-cyan-400/30">
          {creatorProfile?.avatar_url ? (
            <img src={creatorProfile.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-cyan-200 text-sm font-medium">
              {(creatorProfile?.display_name || adminId?.slice(0, 2) || '?').slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>
        <div>
          <p className="text-cyan-300/70 text-xs">Creado por</p>
          <p className="text-white font-medium">{creatorProfile?.display_name || 'Usuario'}</p>
        </div>
      </div>

      {message && (
        <div className="rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 px-4 py-2 text-sm">
          {message}
        </div>
      )}

      {editingQuedada ? (
        <EditQuedadaForm
          quedada={quedada}
          userId={userId!}
          diveSpots={[]}
          onSave={async (updates) => {
            await updateQuedada(quedada.id, userId!, updates);
            const updated = await getQuedadaById(quedada.id, userId ?? undefined);
            if (updated) onUpdate(updated);
            setEditingQuedada(false);
            setMessage('Guardado');
          }}
          onCancel={() => setEditingQuedada(false)}
          loadDiveSpots={() => getDiveSpots()}
        />
      ) : (
        <>
      <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-cyan-400/20 p-5 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-white text-lg font-medium">{quedada.title || (quedada as { tipo?: string }).tipo === 'salida' ? 'Salida' : 'Quedada'}</h2>
          <div className="flex items-center gap-2">
            {quedada.is_admin && (
              <>
                <motion.button
                  type="button"
                  onClick={() => setEditingQuedada(true)}
                  whileTap={{ scale: 0.95 }}
                  className="text-xs px-2 py-1 rounded-lg bg-white/10 text-cyan-200 flex items-center gap-1"
                >
                  <Pencil className="w-3 h-3" />
                  Editar
                </motion.button>
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/30 text-cyan-200">Admin</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 text-cyan-300 text-sm">
          <CalendarDays className="w-4 h-4" />
          <span>{quedada.meetup_date} · {quedada.meetup_time?.slice(0, 5)}</span>
        </div>
        <div className="flex items-center gap-2 text-cyan-300 text-sm">
          <MapPin className="w-4 h-4" />
          <span>{quedada.place}</span>
        </div>
        {'place_lat' in quedada && quedada.place_lat != null && quedada.place_lng != null && (
          <div className="rounded-xl overflow-hidden border border-cyan-400/20 h-40">
            <MapContainer
              center={[Number(quedada.place_lat), Number(quedada.place_lng)]}
              zoom={14}
              className="h-full w-full"
              scrollWheelZoom={false}
            >
              <TileLayer attribution="" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker position={[Number(quedada.place_lat), Number(quedada.place_lng)]} icon={defaultMarkerIcon} />
            </MapContainer>
          </div>
        )}
        {'lugar_pesca' in quedada && quedada.lugar_pesca && (
          <p className="text-cyan-300/90 text-sm">
            <span className="text-cyan-400/90 font-medium">Lugar de pesca:</span> {quedada.lugar_pesca}
          </p>
        )}
        <div className="text-cyan-300/80 text-sm">
          <Users className="w-4 h-4 inline mr-1" />
          {quedada.participants_count ?? 0}
          {quedada.max_participants != null ? ` / ${quedada.max_participants}` : ''} participantes
          <span className="ml-2 text-cyan-400/80">· {JOIN_MODE_LABELS[quedada.join_mode]}</span>
        </div>
        {quedada.published_in_novedades && (
          <p className="text-cyan-300/70 text-xs flex items-center gap-1">
            <Megaphone className="w-3 h-3" />
            Visible en novedades
          </p>
        )}
      </div>

      {/* Acciones: unirse / solicitar / aceptar invitación */}
      {canAcceptInvitation && (
        <button
          onClick={handleAcceptInvitation}
          disabled={actionLoading === 'accept-inv'}
          className="w-full py-3 rounded-xl bg-cyan-500 text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {actionLoading === 'accept-inv' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Aceptar invitación
        </button>
      )}
      {canJoinOpen && (
        <button
          onClick={handleJoinOpen}
          disabled={actionLoading === 'join'}
          className="w-full py-3 rounded-xl bg-cyan-500 text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {actionLoading === 'join' ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
          Unirse a la quedada
        </button>
      )}
      {canRequest && !hasPendingRequest && (
        <button
          onClick={handleRequestToJoin}
          disabled={actionLoading === 'request'}
          className="w-full py-3 rounded-xl bg-cyan-500 text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {actionLoading === 'request' ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
          Solicitar unirse
        </button>
      )}
      {hasPendingRequest && (
        <p className="text-cyan-300/80 text-sm text-center py-2">Solicitud enviada. Esperando respuesta del administrador.</p>
      )}
      {quedada.is_participant && !quedada.is_admin && (
        <button
          onClick={handleLeave}
          disabled={actionLoading === 'leave'}
          className="w-full py-2 rounded-xl border border-red-400/50 text-red-300 text-sm"
        >
          {actionLoading === 'leave' ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Abandonar quedada'}
        </button>
      )}

      {/* Admin: tipo de acceso y novedades */}
      {quedada.is_admin && (
        <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-cyan-400/20 p-5 space-y-4">
          <h3 className="text-cyan-200 font-medium">Opciones de administrador</h3>
          <div>
            <label className="block text-cyan-300/90 text-sm mb-1">
              {('tipo' in quedada && quedada.tipo === 'quedada') ? 'Tipo de quedada' : 'Tipo de salida'}
            </label>
            <select
              value={quedada.join_mode}
              onChange={(e) => handleUpdateJoinMode(e.target.value as JoinMode)}
              disabled={actionLoading === 'mode'}
              className="w-full rounded-xl bg-white/10 border border-cyan-400/30 px-4 py-2 text-white text-sm"
            >
              <option value="open">Abierta</option>
              <option value="request">Privada (solicitud)</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-cyan-300 text-sm">Colgar en novedades</span>
            <button
              type="button"
              onClick={handleToggleNovedades}
              disabled={actionLoading === 'novedades'}
              className={`rounded-lg px-3 py-1 text-sm ${quedada.published_in_novedades ? 'bg-cyan-500/30 text-cyan-200' : 'bg-white/10 text-cyan-300'}`}
            >
              {actionLoading === 'novedades' ? <Loader2 className="w-4 h-4 animate-spin" /> : quedada.published_in_novedades ? 'Sí' : 'No'}
            </button>
          </div>
        </div>
      )}

      {/* Invitar usuarios (admin) */}
      {quedada.is_admin && (
        <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-cyan-400/20 p-5">
          <h3 className="text-cyan-200 font-medium mb-3 flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            Invitar a usuarios
          </h3>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={inviteQuery}
              onChange={(e) => setInviteQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), doSearch())}
              placeholder="Nombre o ubicación..."
              className="flex-1 rounded-xl bg-white/10 border border-cyan-400/30 px-4 py-2 text-white placeholder-cyan-300/50 text-sm"
            />
            <button
              type="button"
              onClick={doSearch}
              className="p-2 rounded-xl bg-cyan-500/30 text-cyan-200"
            >
              <Search className="w-5 h-5" />
            </button>
          </div>
          {searchResults.length > 0 && (
            <ul className="space-y-2">
              {searchResults.map((u) => (
                <li key={u.id} className="flex items-center justify-between gap-2 py-1">
                  <span className="text-cyan-200 text-sm">{u.display_name || u.id.slice(0, 8)}</span>
                  <button
                    type="button"
                    onClick={() => handleInvite(u.id)}
                    disabled={actionLoading === u.id}
                    className="text-xs px-2 py-1 rounded-lg bg-cyan-500/30 text-cyan-200"
                  >
                    {actionLoading === u.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Invitar'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Solicitudes pendientes (admin) */}
      {quedada.is_admin && requests.length > 0 && (
        <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-cyan-400/20 p-5">
          <h3 className="text-cyan-200 font-medium mb-3">Solicitudes pendientes</h3>
          <ul className="space-y-2">
            {requests.map((r: { user_id: string; profiles: { display_name: string | null } | null }) => (
              <li key={r.user_id} className="flex items-center justify-between gap-2 py-1">
                <span className="text-cyan-200 text-sm">{(r.profiles as { display_name: string | null })?.display_name || r.user_id.slice(0, 8)}</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => handleAcceptRequest(r.user_id)}
                    disabled={actionLoading === r.user_id}
                    className="p-1.5 rounded-lg bg-green-500/30 text-green-200"
                  >
                    {actionLoading === r.user_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDenyRequest(r.user_id)}
                    disabled={actionLoading === r.user_id}
                    className="p-1.5 rounded-lg bg-red-500/30 text-red-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Participantes: avatares apilados +N */}
      <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-cyan-400/20 p-5">
        <h3 className="text-cyan-200 font-medium mb-3">Participantes</h3>
        {loading ? (
          <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
        ) : participants.length === 0 ? (
          <p className="text-cyan-300/70 text-sm">Aún no hay participantes.</p>
        ) : (
          <div className="flex flex-wrap items-center gap-0">
            {(() => {
              const maxVisible = 5;
              const show = participants.slice(0, maxVisible);
              const rest = participants.length - maxVisible;
              return (
                <>
                  {show.map((p, i) => (
                    <div
                      key={p.user_id}
                      className="h-8 w-8 rounded-full border-2 border-cyan-900/80 bg-cyan-500/30 flex items-center justify-center overflow-hidden flex-shrink-0 -ml-2 first:ml-0"
                      style={{ zIndex: show.length - i }}
                      title={(p.profiles as { display_name: string | null })?.display_name || p.user_id}
                    >
                      {(p.profiles as { avatar_url?: string | null })?.avatar_url ? (
                        <img src={(p.profiles as { avatar_url: string }).avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-cyan-200 text-xs font-medium">
                          {((p.profiles as { display_name?: string | null })?.display_name || p.user_id).slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                  ))}
                  {rest > 0 && (
                    <div
                      className="h-8 w-8 rounded-full border-2 border-cyan-900/80 bg-cyan-600/50 flex items-center justify-center flex-shrink-0 -ml-2 text-cyan-200 text-xs font-medium"
                      style={{ zIndex: 0 }}
                      title={`+${rest} más`}
                    >
                      +{rest}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </div>
        </>
      )}
    </div>
  );
}
