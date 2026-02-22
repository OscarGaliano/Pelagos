import { formatFishingModalities, getProfilesForPescasub } from '@/lib/api/profiles';
import { getUserSharedDives, type SharedDive } from '@/lib/api/sharedDives';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Calendar, ChevronLeft, Heart, Loader2, MapPin, MessageCircle, User } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useState } from 'react';

const EXPERIENCE_LABELS: Record<string, string> = {
  principiante: 'Principiante',
  intermedio: 'Intermedio',
  avanzado: 'Avanzado',
  profesional: 'Profesional',
};

const MESSAGES_TARGET_USER_KEY = 'pelagos_messages_target_user_id';
const COMMUNITY_OPEN_PESCASUB_KEY = 'community_open_pescasub';

type ProfileRow = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  experience_level: string;
  location: string | null;
  member_since: string | null;
  fishing_infantry: boolean;
  fishing_boat: boolean;
};

interface PescasubViewProps {
  onBack: () => void;
  /** Para navegar a Mensajes al pulsar Enviar mensaje */
  onNavigate?: (screen: string) => void;
}

export function PescasubView({ onBack, onNavigate }: PescasubViewProps) {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterCity, setFilterCity] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<ProfileRow | null>(null);
  const [selectedDives, setSelectedDives] = useState<SharedDive[]>([]);
  const [loadingDives, setLoadingDives] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id ?? null);
    
    setLoading(true);
    setError(null);
    try {
      const data = await getProfilesForPescasub();
      setProfiles(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openProfile = useCallback(async (profile: ProfileRow) => {
    setSelectedProfile(profile);
    setLoadingDives(true);
    try {
      const dives = await getUserSharedDives(profile.id, currentUserId ?? undefined);
      setSelectedDives(dives);
    } catch {
      setSelectedDives([]);
    } finally {
      setLoadingDives(false);
    }
  }, [currentUserId]);

  const closeProfile = () => {
    setSelectedProfile(null);
    setSelectedDives([]);
  };

  const cities = useMemo(() => {
    const locs = [...new Set(profiles.map((p) => p.location).filter((x): x is string => !!x?.trim()))];
    return locs.sort((a, b) => a.localeCompare(b));
  }, [profiles]);

  const filtered = useMemo(() => {
    if (!filterCity) return profiles;
    return profiles.filter((p) => (p.location ?? '').trim() === filterCity);
  }, [profiles, filterCity]);

  const handleSendMessage = (userId: string) => {
    try {
      sessionStorage.setItem(MESSAGES_TARGET_USER_KEY, userId);
      sessionStorage.setItem(COMMUNITY_OPEN_PESCASUB_KEY, '1');
    } catch {
      /* ignore */
    }
    onNavigate?.('messages');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a1628] via-[#0c1f3a] to-[#0a1628]">
      <div className="sticky top-0 z-30 backdrop-blur-xl bg-[#0a1628]/90 border-b border-cyan-400/20">
        <div className="px-4 py-3 flex items-center gap-3">
          <motion.button
            onClick={onBack}
            whileTap={{ scale: 0.9 }}
            className="p-2 -ml-1 rounded-full hover:bg-white/10 flex items-center gap-1"
          >
            <ChevronLeft className="w-6 h-6 text-cyan-400" />
            <span className="text-cyan-400 text-sm font-medium">Volver</span>
          </motion.button>
          <h1 className="text-white text-xl font-medium">Pescasub</h1>
        </div>
      </div>

      <div className="px-4 pt-4 pb-8">
        {error && (
          <div className="mb-4 rounded-xl bg-red-500/20 border border-red-400/40 text-red-200 px-4 py-2 text-sm">
            {error}
          </div>
        )}

        {/* Filtro: Volver a todos (cuando hay ciudad seleccionada) + Todos / por ciudad */}
        {!loading && profiles.length > 0 && (
          <div className="mb-4">
            {filterCity && (
              <motion.button
                type="button"
                onClick={() => setFilterCity(null)}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg text-sm font-medium text-cyan-300 hover:bg-white/10 border border-cyan-400/20"
              >
                <ChevronLeft className="w-4 h-4" />
                Volver a la lista completa
              </motion.button>
            )}
            <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFilterCity(null)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filterCity === null
                  ? 'bg-cyan-500/40 text-cyan-100 border border-cyan-400/50'
                  : 'bg-white/10 text-cyan-200 border border-cyan-400/20 hover:bg-white/15'
              }`}
            >
              Todos
            </button>
            {cities.map((city) => (
              <button
                key={city}
                type="button"
                onClick={() => setFilterCity(city)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filterCity === city
                    ? 'bg-cyan-500/40 text-cyan-100 border border-cyan-400/50'
                    : 'bg-white/10 text-cyan-200 border border-cyan-400/20 hover:bg-white/15'
                }`}
              >
                {city}
              </button>
            ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-cyan-400/20 p-8 text-center">
            <User className="w-12 h-12 text-cyan-400 mx-auto mb-3 opacity-70" />
            <p className="text-cyan-200">
              {profiles.length === 0 ? 'Aún no hay usuarios' : 'Nadie en esta ciudad'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pb-2">
            {filtered.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.02 }}
                className="backdrop-blur-xl bg-white/5 rounded-2xl border border-cyan-400/20 flex flex-col h-[228px] cursor-pointer hover:bg-white/10 transition-colors"
                onClick={() => openProfile(p)}
              >
                {/* Contenido: avatar, nombre, nivel, zona */}
                <div className="p-2 flex flex-col items-center flex-1 min-h-0 overflow-hidden">
                  <div className="h-9 w-9 rounded-full bg-cyan-500/30 flex items-center justify-center overflow-hidden border border-cyan-400/30 flex-shrink-0">
                    {p.avatar_url ? (
                      <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-cyan-200 text-[10px] font-medium">
                        {(p.display_name || p.id.slice(0, 2)).slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <p className="text-white font-medium text-[11px] truncate w-full text-center mt-1">
                    {p.display_name || 'Usuario'}
                  </p>
                  <p className="text-cyan-300 text-[10px] flex-shrink-0">
                    {EXPERIENCE_LABELS[p.experience_level] ?? p.experience_level}
                  </p>
                  <div className="flex items-center justify-center gap-0.5 text-cyan-300/80 text-[10px] mt-0.5 w-full px-0.5 flex-shrink-0 min-h-[1rem]">
                    <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                    <span className="truncate text-center">{p.location?.trim() || '—'}</span>
                  </div>
                  {p.member_since && (
                    <div className="flex items-center justify-center gap-0.5 text-cyan-300/70 text-[9px] mt-0.5 flex-shrink-0">
                      <Calendar className="w-2 h-2" />
                      <span>
                        {new Date(p.member_since).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  )}
                  <p className="text-cyan-300/70 text-[9px] mt-0.5 flex-shrink-0 truncate w-full text-center px-0.5">
                    {formatFishingModalities(p)}
                  </p>
                </div>
                {/* Botón fijo abajo */}
                <div className="flex-shrink-0 px-1.5 pt-1.5 pb-2 border-t border-cyan-400/10">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.97 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSendMessage(p.id);
                    }}
                    className="w-full py-1.5 rounded-lg bg-cyan-500/30 hover:bg-cyan-500/40 text-cyan-100 text-[11px] font-medium flex items-center justify-center gap-1"
                  >
                    <MessageCircle className="w-3 h-3" />
                    Enviar mensaje
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de perfil detallado */}
      <AnimatePresence>
        {selectedProfile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={closeProfile}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-0 left-0 right-0 max-h-[90vh] bg-gradient-to-b from-[#0c1f3a] to-[#0a1628] rounded-t-3xl overflow-hidden flex flex-col"
            >
              {/* Header del perfil */}
              <div className="sticky top-0 z-10 backdrop-blur-xl bg-[#0c1f3a]/90 border-b border-cyan-400/20 px-4 py-3 flex items-center gap-3">
                <motion.button
                  onClick={closeProfile}
                  whileTap={{ scale: 0.9 }}
                  className="p-2 -ml-1 rounded-full hover:bg-white/10"
                >
                  <ArrowLeft className="w-5 h-5 text-cyan-400" />
                </motion.button>
                <h2 className="text-white text-lg font-medium flex-1">Perfil</h2>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
                {/* Info del usuario */}
                <div className="flex flex-col items-center text-center">
                  <div className="h-20 w-20 rounded-full bg-cyan-500/30 flex items-center justify-center overflow-hidden border-2 border-cyan-400/40 mb-3">
                    {selectedProfile.avatar_url ? (
                      <img src={selectedProfile.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-cyan-200 text-2xl font-medium">
                        {(selectedProfile.display_name || selectedProfile.id.slice(0, 2)).slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <h3 className="text-white text-xl font-medium">
                    {selectedProfile.display_name || 'Usuario'}
                  </h3>
                  <p className="text-cyan-300 text-sm">
                    {EXPERIENCE_LABELS[selectedProfile.experience_level] ?? selectedProfile.experience_level}
                  </p>
                  
                  <div className="flex flex-wrap justify-center gap-3 mt-3">
                    {selectedProfile.location && (
                      <span className="flex items-center gap-1 px-3 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 text-xs">
                        <MapPin className="w-3 h-3" />
                        {selectedProfile.location}
                      </span>
                    )}
                    {selectedProfile.member_since && (
                      <span className="flex items-center gap-1 px-3 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 text-xs">
                        <Calendar className="w-3 h-3" />
                        Desde {new Date(selectedProfile.member_since).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}
                      </span>
                    )}
                  </div>
                  
                  <p className="text-cyan-300/70 text-sm mt-2">
                    {formatFishingModalities(selectedProfile)}
                  </p>

                  {/* Botón enviar mensaje */}
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      closeProfile();
                      handleSendMessage(selectedProfile.id);
                    }}
                    className="mt-4 px-6 py-2.5 rounded-xl bg-cyan-500/40 hover:bg-cyan-500/50 text-cyan-100 text-sm font-medium flex items-center gap-2 border border-cyan-400/30"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Enviar mensaje
                  </motion.button>
                </div>

                {/* Jornadas compartidas */}
                <div>
                  <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                    <Heart className="w-4 h-4 text-cyan-400" />
                    Jornadas compartidas
                  </h4>

                  {loadingDives ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
                    </div>
                  ) : selectedDives.length === 0 ? (
                    <div className="backdrop-blur-xl bg-white/5 rounded-xl border border-cyan-400/20 p-6 text-center">
                      <p className="text-cyan-300/70 text-sm">
                        Este usuario aún no ha compartido jornadas
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedDives.map((dive) => (
                        <div
                          key={dive.id}
                          className="backdrop-blur-xl bg-white/5 rounded-xl border border-cyan-400/20 overflow-hidden"
                        >
                          {/* Imagen */}
                          {dive.photo_urls.length > 0 && (
                            <div className="relative h-40">
                              <img
                                src={dive.photo_urls[0]}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                              {dive.photo_urls.length > 1 && (
                                <span className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded">
                                  +{dive.photo_urls.length - 1}
                                </span>
                              )}
                            </div>
                          )}
                          {!dive.photo_urls.length && dive.video_url && (
                            <video
                              src={dive.video_url}
                              controls
                              className="w-full h-40 object-cover bg-black"
                              preload="metadata"
                            />
                          )}

                          {/* Info */}
                          <div className="p-3">
                            {dive.description && (
                              <p className="text-cyan-100 text-sm mb-2 line-clamp-3">
                                {dive.description}
                              </p>
                            )}

                            <div className="flex flex-wrap gap-2 mb-2">
                              {(dive.depth_min != null || dive.depth_max != null) && (
                                <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-xs">
                                  {dive.depth_min ?? '?'} - {dive.depth_max ?? '?'} m
                                </span>
                              )}
                              {dive.current_type && (
                                <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-xs">
                                  {dive.current_type}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-3 text-xs text-cyan-300/70">
                              <span className="flex items-center gap-1">
                                <Heart className={`w-3.5 h-3.5 ${dive.user_liked ? 'fill-red-400 text-red-400' : ''}`} />
                                {dive.likes_count}
                              </span>
                              <span className="flex items-center gap-1">
                                <MessageCircle className="w-3.5 h-3.5" />
                                {dive.comments_count}
                              </span>
                              <span className="ml-auto">
                                {new Date(dive.created_at).toLocaleDateString('es-ES', {
                                  day: 'numeric',
                                  month: 'short',
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
