import { getHomeSections, getNews, type HomeSection, type News } from '@/lib/api/adminPanel';
import { getNovedadesQuedadas } from '@/lib/api/quedadas';
import { getAllSharedDives, toggleLike, type SharedDive } from '@/lib/api/sharedDives';
import { supabase } from '@/lib/supabase';
import type { Quedada } from '@/lib/types';
import { Activity, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, ExternalLink, Eye, EyeOff, Heart, MapPin, MessageCircle, Newspaper, Shield, Users } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useState } from 'react';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick-theme.css';
import 'slick-carousel/slick/slick.css';

interface HomeScreenProps {
  onNavigate: (screen: string) => void;
}

const images = [
  'https://images.unsplash.com/photo-1717935492829-fce9ce727a7a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmcmVlZGl2aW5nJTIwc3BlYXJmaXNoaW5nJTIwYXBuZWF8ZW58MXx8fHwxNzcwMTk3OTMzfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
  'https://images.unsplash.com/photo-1462947760324-15811216b688?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx1bmRlcndhdGVyJTIwZnJlZWRpdmVyJTIwc3BlYXJ8ZW58MXx8fHwxNzcwMTk3OTM0fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
  'https://images.unsplash.com/photo-1621451611787-fe22bb474d48?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmcmVlZGl2aW5nJTIwdW5kZXJ3YXRlciUyMGJsdWUlMjBvY2VhbnxlbnwxfHx8fDE3NzAxOTc5MzZ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
];

const TIPO_LABEL: Record<string, string> = { quedada: 'Quedada', salida: 'Salida' };

const STORAGE_KEY_HIDDEN = 'pelagos_home_hidden_sections';
const STORAGE_KEY_HIDDEN_CUSTOM = 'pelagos_home_hidden_custom_sections';
const STORAGE_KEY_SEEN_DIVES = 'pelagos_seen_dive_ids';

type SectionId = 'comunidad' | 'novedades' | 'noticias';

interface AdminProfile {
  avatar_url: string | null;
  display_name: string | null;
}

export function HomeScreen({ onNavigate }: HomeScreenProps) {
  const isDark = true;
  const [novedades, setNovedades] = useState<Quedada[]>([]);
  const [novedadesLoading, setNovedadesLoading] = useState(true);
  const [feedDives, setFeedDives] = useState<SharedDive[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [news, setNews] = useState<News[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [customSections, setCustomSections] = useState<HomeSection[]>([]);
  const [selectedNews, setSelectedNews] = useState<News | null>(null);
  const [selectedSection, setSelectedSection] = useState<HomeSection | null>(null);
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  
  // Secciones ocultas manualmente por el usuario
  const [hiddenSections, setHiddenSections] = useState<Set<SectionId>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_HIDDEN);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Secciones personalizadas ocultas
  const [hiddenCustomSections, setHiddenCustomSections] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_HIDDEN_CUSTOM);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  // IDs de jornadas ya vistas
  const [seenDiveIds, setSeenDiveIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SEEN_DIVES);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Guardar secciones ocultas
  const saveHiddenSections = (sections: Set<SectionId>) => {
    try {
      localStorage.setItem(STORAGE_KEY_HIDDEN, JSON.stringify([...sections]));
    } catch { /* ignore */ }
  };

  // Guardar jornadas vistas
  const saveSeenDives = (ids: Set<string>) => {
    try {
      localStorage.setItem(STORAGE_KEY_SEEN_DIVES, JSON.stringify([...ids]));
    } catch { /* ignore */ }
  };

  const toggleSection = (section: SectionId) => {
    setHiddenSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      saveHiddenSections(newSet);
      return newSet;
    });
  };

  const toggleCustomSection = (sectionId: string) => {
    setHiddenCustomSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      try {
        localStorage.setItem(STORAGE_KEY_HIDDEN_CUSTOM, JSON.stringify([...newSet]));
      } catch { /* ignore */ }
      return newSet;
    });
  };

  // Marcar jornadas como vistas
  const markDivesAsSeen = useCallback(() => {
    if (feedDives.length > 0) {
      const newSeenIds = new Set(seenDiveIds);
      feedDives.forEach(d => newSeenIds.add(d.id));
      setSeenDiveIds(newSeenIds);
      saveSeenDives(newSeenIds);
    }
  }, [feedDives, seenDiveIds]);

  // Verificar si hay jornadas nuevas (no vistas)
  const hasUnseenDives = feedDives.some(d => !seenDiveIds.has(d.id));

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id ?? null);

    // Cargar novedades
    setNovedadesLoading(true);
    try {
      const data = await getNovedadesQuedadas(user?.id ?? undefined);
      setNovedades(data);
    } catch {
      setNovedades([]);
    } finally {
      setNovedadesLoading(false);
    }

    // Cargar feed social (últimas 10 jornadas)
    setFeedLoading(true);
    try {
      const dives = await getAllSharedDives(user?.id ?? undefined, 10);
      setFeedDives(dives);
    } catch {
      setFeedDives([]);
    } finally {
      setFeedLoading(false);
    }

    // Cargar noticias
    setNewsLoading(true);
    try {
      const newsData = await getNews(false);
      setNews(newsData);
    } catch {
      setNews([]);
    } finally {
      setNewsLoading(false);
    }

    // Cargar secciones personalizadas
    try {
      const sectionsData = await getHomeSections(false);
      setCustomSections(sectionsData);
      
      // Cargar perfil del admin (el primero que tenga is_app_admin)
      const { data: adminData } = await supabase
        .from('profiles')
        .select('avatar_url, display_name')
        .eq('is_app_admin', true)
        .limit(1)
        .maybeSingle();
      if (adminData) {
        setAdminProfile(adminData);
      }
    } catch {
      setCustomSections([]);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleLikeDive = async (dive: SharedDive) => {
    if (!currentUserId) return;
    const liked = await toggleLike(dive.id, currentUserId);
    setFeedDives((prev) =>
      prev.map((d) =>
        d.id === dive.id
          ? { ...d, user_liked: liked, likes_count: d.likes_count + (liked ? 1 : -1) }
          : d
      )
    );
  };

  const openNovedad = (q: Quedada) => {
    try {
      sessionStorage.setItem('open_quedada_id', q.id);
      sessionStorage.setItem('community_open_quedadas', '1');
    } catch {
      /* ignore */
    }
    onNavigate('community');
  };

  const bgSettings = {
    dots: true,
    infinite: true,
    speed: 800,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 5000,
    fade: true,
    arrows: false,
  };

  const carouselSettings = {
    dots: true,
    infinite: false,
    speed: 300,
    slidesToShow: 1.2,
    slidesToScroll: 1,
    arrows: false,
    responsive: [
      { breakpoint: 640, settings: { slidesToShow: 1.15 } },
    ],
  };

  // Determinar si mostrar comunidad: 
  // - No oculta manualmente Y (hay jornadas sin ver O el usuario la mostró manualmente)
  const showComunidad = !hiddenSections.has('comunidad') && (hasUnseenDives || feedDives.length === 0);
  const showNovedades = !hiddenSections.has('novedades');
  const showNoticias = !hiddenSections.has('noticias');

  // Header de sección con botón de ocultar
  const SectionHeader = ({ 
    id, 
    icon: Icon, 
    title, 
    subtitle, 
    isHidden,
    badge,
  }: { 
    id: SectionId; 
    icon: React.ElementType; 
    title: string; 
    subtitle: string;
    isHidden: boolean;
    badge?: number;
  }) => (
    <div className="flex items-center justify-between px-4 pt-4 pb-2">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-xl relative ${isDark ? 'bg-cyan-500/25' : 'bg-blue-100'}`}>
          <Icon className={`w-6 h-6 ${isDark ? 'text-cyan-400' : 'text-blue-700'}`} />
          {badge && badge > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
              {badge > 9 ? '9+' : badge}
            </span>
          )}
        </div>
        <div>
          <p className={`font-medium text-base ${isDark ? 'text-cyan-200' : 'text-slate-900'}`}>{title}</p>
          <p className={`text-xs ${isDark ? 'text-cyan-300/70' : 'text-slate-600'}`}>{subtitle}</p>
        </div>
      </div>
      <button
        onClick={() => toggleSection(id)}
        className={`p-2 rounded-lg ${isDark ? 'bg-white/5 hover:bg-white/10 text-cyan-300/70' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
        title={isHidden ? 'Mostrar' : 'Ocultar'}
      >
        {isHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
      </button>
    </div>
  );

  // Sección colapsada (cuando está oculta)
  const CollapsedSection = ({ 
    id, 
    icon: Icon, 
    title 
  }: { 
    id: SectionId; 
    icon: React.ElementType; 
    title: string;
  }) => (
    <motion.button
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      onClick={() => toggleSection(id)}
      className={`w-full backdrop-blur-xl rounded-2xl border p-3 flex items-center justify-between transition-colors ${
        isDark 
          ? 'bg-white/5 border-cyan-400/20 hover:bg-white/10' 
          : 'bg-white/95 border-slate-400/60 hover:bg-white shadow-md'
      }`}
    >
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${isDark ? 'text-cyan-400' : 'text-blue-700'}`} />
        <span className={`text-sm ${isDark ? 'text-cyan-300' : 'text-slate-800'}`}>{title}</span>
        <span className={`text-xs ${isDark ? 'text-cyan-400/50' : 'text-slate-500'}`}>(oculto)</span>
      </div>
      <ChevronDown className={`w-4 h-4 ${isDark ? 'text-cyan-400' : 'text-slate-600'}`} />
    </motion.button>
  );

  // Contar jornadas no vistas
  const unseenCount = feedDives.filter(d => !seenDiveIds.has(d.id)).length;

  return (
    <div className={`relative min-h-screen ${isDark ? 'bg-[#0a1628]' : 'bg-gradient-to-b from-slate-200 to-slate-300'}`}>
      <div className="absolute inset-0 h-screen -mt-[72px] pt-[72px] overflow-hidden">
        <Slider {...bgSettings} className="h-full">
          {images.map((img, index) => (
            <div key={index} className="relative h-screen">
              <div
                className="h-full w-full bg-cover bg-center"
                style={{ backgroundImage: `url(${img})` }}
              />
              <div className={`absolute inset-0 bg-gradient-to-b from-transparent via-transparent ${isDark ? 'to-[#0a1628]/90' : 'to-slate-200/95'}`} />
            </div>
          ))}
        </Slider>
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-20 px-4 pb-6 pt-2 max-h-[70vh] overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="space-y-3"
        >
          {/* 1. COMUNIDAD - Jornadas compartidas (estilo Instagram) */}
          <AnimatePresence mode="wait">
            {showComunidad ? (
              <motion.div
                key="comunidad-expanded"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={`backdrop-blur-xl rounded-2xl border shadow-xl overflow-hidden ${
                  isDark 
                    ? 'bg-gradient-to-br from-cyan-500/10 to-teal-600/10 border-cyan-400/20' 
                    : 'bg-white/95 border-slate-400/50 shadow-lg'
                }`}
              >
                <SectionHeader 
                  id="comunidad" 
                  icon={Users} 
                  title="Comunidad" 
                  subtitle="Jornadas de pescasubs"
                  isHidden={false}
                  badge={unseenCount}
                />
                
                {feedLoading ? (
                  <div className={`h-24 flex items-center justify-center text-sm ${isDark ? 'text-cyan-400/80' : 'text-blue-600/80'}`}>Cargando…</div>
                ) : feedDives.length === 0 ? (
                  <div className="px-4 pb-4">
                    <div className={`py-6 flex flex-col items-center justify-center text-sm ${isDark ? 'text-cyan-300/80' : 'text-blue-800/80'}`}>
                      <p className="mb-2">Aún no hay jornadas compartidas</p>
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onNavigate('community')}
                        className={`text-xs underline ${isDark ? 'text-cyan-400' : 'text-blue-600'}`}
                      >
                        Sé el primero en compartir
                      </motion.button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Feed vertical tipo Instagram */}
                    <div className="px-3 pb-2 space-y-3 max-h-[45vh] overflow-y-auto">
                      {feedDives.slice(0, 5).map((dive, index) => {
                        // Marcar como visto cuando aparece
                        if (!seenDiveIds.has(dive.id)) {
                          setTimeout(() => markDivesAsSeen(), 1000);
                        }
                        
                        return (
                          <motion.div 
                            key={dive.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={`rounded-xl border overflow-hidden shadow-sm ${
                              isDark
                                ? `bg-[#0a1628]/60 ${seenDiveIds.has(dive.id) ? 'border-cyan-400/10' : 'border-cyan-400/30'}`
                                : `bg-slate-50 ${seenDiveIds.has(dive.id) ? 'border-slate-300' : 'border-blue-500/50'}`
                            }`}
                          >
                            {/* Header del post */}
                            <div className="flex items-center gap-2 p-2.5">
                              <div className={`h-8 w-8 rounded-full flex items-center justify-center overflow-hidden border flex-shrink-0 ${
                                isDark ? 'bg-cyan-500/30 border-cyan-400/30' : 'bg-blue-600/20 border-blue-600/30'
                              }`}>
                                {dive.user_profile?.avatar_url ? (
                                  <img src={dive.user_profile.avatar_url} alt="" className="h-full w-full object-cover" />
                                ) : (
                                  <span className={`text-[10px] font-medium ${isDark ? 'text-cyan-200' : 'text-blue-800'}`}>
                                    {(dive.user_profile?.display_name || 'U').slice(0, 2).toUpperCase()}
                                  </span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className={`text-sm font-medium truncate block ${isDark ? 'text-white' : 'text-blue-900'}`}>
                                  {dive.user_profile?.display_name || 'Usuario'}
                                </span>
                              </div>
                              {!seenDiveIds.has(dive.id) && (
                                <span className={`text-white text-[9px] px-1.5 py-0.5 rounded font-medium ${isDark ? 'bg-cyan-500' : 'bg-blue-600'}`}>
                                  Nuevo
                                </span>
                              )}
                            </div>

                            {/* Imagen/Video */}
                            {dive.photo_urls.length > 0 ? (
                              <div className="relative">
                                <img 
                                  src={dive.photo_urls[0]} 
                                  alt="" 
                                  className="w-full aspect-square object-cover"
                                />
                                {dive.photo_urls.length > 1 && (
                                  <span className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
                                    1/{dive.photo_urls.length}
                                  </span>
                                )}
                              </div>
                            ) : dive.video_url ? (
                              <video
                                src={dive.video_url}
                                controls
                                className="w-full aspect-video bg-black"
                                preload="metadata"
                              />
                            ) : null}

                            {/* Acciones y descripción */}
                            <div className="p-2.5">
                              <div className="flex items-center gap-4 mb-2">
                                <button
                                  onClick={() => handleLikeDive(dive)}
                                  className={`flex items-center gap-1.5 ${
                                    dive.user_liked ? 'text-red-400' : 'text-cyan-300/80'
                                  }`}
                                >
                                  <Heart className={`w-5 h-5 ${dive.user_liked ? 'fill-current' : ''}`} />
                                </button>
                                <span className="flex items-center gap-1.5 text-cyan-300/80">
                                  <MessageCircle className="w-5 h-5" />
                                </span>
                              </div>
                              
                              {(dive.likes_count > 0 || dive.comments_count > 0) && (
                                <p className="text-white text-xs font-medium mb-1">
                                  {dive.likes_count > 0 && `${dive.likes_count} me gusta`}
                                  {dive.likes_count > 0 && dive.comments_count > 0 && ' · '}
                                  {dive.comments_count > 0 && `${dive.comments_count} comentarios`}
                                </p>
                              )}

                              {dive.description && (
                                <p className="text-cyan-100/90 text-xs line-clamp-2">
                                  <span className="font-medium text-white">{dive.user_profile?.display_name || 'Usuario'}</span>{' '}
                                  {dive.description}
                                </p>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>

                    {/* Botón ver más - más pequeño */}
                    <div className="px-3 pb-3 pt-1">
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onNavigate('community')}
                        className="w-full py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-400 text-xs border border-cyan-400/20"
                      >
                        Ver más en comunidad
                      </motion.button>
                    </div>
                  </>
                )}
              </motion.div>
            ) : (
              <CollapsedSection key="comunidad-collapsed" id="comunidad" icon={Users} title="Comunidad" />
            )}
          </AnimatePresence>

          {/* 2. NOVEDADES - Quedadas y salidas */}
          <AnimatePresence mode="wait">
            {showNovedades ? (
              <motion.div
                key="novedades-expanded"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={`backdrop-blur-xl rounded-2xl border shadow-xl overflow-hidden ${
                  isDark 
                    ? 'bg-gradient-to-br from-teal-500/20 to-cyan-600/20 border-teal-400/30' 
                    : 'bg-white/95 border-slate-400/50'
                }`}
              >
                <SectionHeader 
                  id="novedades" 
                  icon={Activity} 
                  title="Novedades" 
                  subtitle="Quedadas y salidas"
                  isHidden={false}
                />
                <div className="px-2 pb-4 pt-1">
                  {novedadesLoading ? (
                    <div className={`h-40 flex items-center justify-center text-sm ${isDark ? 'text-teal-400/80' : 'text-slate-600'}`}>Cargando…</div>
                  ) : novedades.length === 0 ? (
                    <div className={`h-32 flex flex-col items-center justify-center text-sm px-4 ${isDark ? 'text-teal-300/80' : 'text-slate-600'}`}>
                      <p className="mb-2">Aún no hay novedades</p>
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onNavigate('community')}
                        className={`text-sm underline ${isDark ? 'text-teal-400' : 'text-blue-600'}`}
                      >
                        Ir a comunidad
                      </motion.button>
                    </div>
                  ) : (
                    <Slider {...carouselSettings} className="novedades-carousel">
                      {novedades.map((q) => {
                        const tipo = (q as Quedada & { tipo?: string }).tipo ?? 'salida';
                        const creator = (q as Quedada & { creator_profile?: { display_name: string | null; avatar_url: string | null } }).creator_profile;
                        const adminId = (q as Quedada & { admin_id?: string }).admin_id;
                        return (
                          <div key={q.id} className="px-2 outline-none">
                            <motion.button
                              type="button"
                              whileTap={{ scale: 0.98 }}
                              onClick={() => openNovedad(q)}
                              className={`w-full text-left rounded-xl border p-5 h-full min-h-[140px] flex flex-col gap-2.5 ${
                                isDark 
                                  ? 'bg-[#0a1628]/80 border-teal-400/25' 
                                  : 'bg-slate-50 border-slate-300 shadow-sm'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <div className={`h-9 w-9 rounded-full flex items-center justify-center overflow-hidden border flex-shrink-0 ${
                                  isDark ? 'bg-teal-500/30 border-teal-400/30' : 'bg-blue-100 border-blue-300'
                                }`}>
                                  {creator?.avatar_url ? (
                                    <img src={creator.avatar_url} alt="" className="h-full w-full object-cover" />
                                  ) : (
                                    <span className={`text-xs font-medium ${isDark ? 'text-teal-200' : 'text-blue-700'}`}>
                                      {(creator?.display_name || adminId?.slice(0, 2) || '?').slice(0, 2).toUpperCase()}
                                    </span>
                                  )}
                                </div>
                                <span className={`font-medium truncate text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{q.title || TIPO_LABEL[tipo]}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${isDark ? 'bg-teal-500/20 text-teal-200' : 'bg-blue-100 text-blue-700'}`}>{TIPO_LABEL[tipo]}</span>
                              </div>
                              <div className={`flex items-center gap-2 text-sm ${isDark ? 'text-teal-300/90' : 'text-slate-700'}`}>
                                <CalendarDays className="w-4 h-4 flex-shrink-0" />
                                <span>{q.meetup_date} · {q.meetup_time?.slice(0, 5)}</span>
                              </div>
                              <div className={`flex items-center gap-2 text-sm truncate ${isDark ? 'text-teal-300/80' : 'text-slate-600'}`}>
                                <MapPin className="w-4 h-4 flex-shrink-0" />
                                <span>{q.place}</span>
                              </div>
                            </motion.button>
                          </div>
                        );
                      })}
                    </Slider>
                  )}
                </div>
              </motion.div>
            ) : (
              <CollapsedSection key="novedades-collapsed" id="novedades" icon={Activity} title="Novedades" />
            )}
          </AnimatePresence>

          {/* 3. NOTICIAS PESCASUB */}
          <AnimatePresence mode="wait">
            {showNoticias ? (
              <motion.div
                key="noticias-expanded"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={`backdrop-blur-xl rounded-2xl border shadow-xl overflow-hidden ${
                  isDark 
                    ? 'bg-gradient-to-br from-blue-500/20 to-indigo-600/20 border-blue-400/30' 
                    : 'bg-white/95 border-slate-400/50'
                }`}
              >
                <div className="flex items-center justify-between px-4 pt-4 pb-2">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${isDark ? 'bg-blue-500/25' : 'bg-blue-100'}`}>
                      <Newspaper className={`w-6 h-6 ${isDark ? 'text-blue-400' : 'text-blue-700'}`} />
                    </div>
                    <div>
                      <p className={`font-medium text-base ${isDark ? 'text-blue-200' : 'text-slate-900'}`}>Noticias Pescasub</p>
                      <p className={`text-xs ${isDark ? 'text-blue-300/70' : 'text-slate-600'}`}>Actualidad del pescasub</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleSection('noticias')}
                    className={`p-2 rounded-lg ${isDark ? 'bg-white/5 hover:bg-white/10 text-blue-300/70' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
                    title="Ocultar"
                  >
                    <EyeOff className="w-4 h-4" />
                  </button>
                </div>
                <div className="px-4 pb-4">
                  {newsLoading ? (
                    <div className={`h-24 flex items-center justify-center text-sm ${isDark ? 'text-blue-400/80' : 'text-slate-600'}`}>Cargando…</div>
                  ) : news.length === 0 ? (
                    <div className={`h-20 flex items-center justify-center text-sm ${isDark ? 'text-blue-300/70' : 'text-slate-500'}`}>
                      No hay noticias disponibles
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {news.slice(0, 5).map((n) => (
                        <NewsCard key={n.id} news={n} onClick={() => setSelectedNews(n)} isDark={isDark} />
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <CollapsedSection key="noticias-collapsed" id="noticias" icon={Newspaper} title="Noticias Pescasub" />
            )}
          </AnimatePresence>

          {/* 4. SECCIONES PERSONALIZADAS */}
          {customSections.map((section) => (
            <AnimatePresence key={section.id} mode="wait">
              {!hiddenCustomSections.has(section.id) ? (
                <CustomSectionCard
                  key={`visible-${section.id}`}
                  section={section}
                  onClick={() => setSelectedSection(section)}
                  onHide={() => toggleCustomSection(section.id)}
                  adminAvatar={adminProfile?.avatar_url || null}
                  adminName={adminProfile?.display_name || 'Admin'}
                  isDark={isDark}
                />
              ) : (
                <CollapsedCustomSection
                  key={`collapsed-${section.id}`}
                  section={section}
                  onShow={() => toggleCustomSection(section.id)}
                  adminAvatar={adminProfile?.avatar_url || null}
                  isDark={isDark}
                />
              )}
            </AnimatePresence>
          ))}
        </motion.div>
      </div>

      {/* Modal de detalle de noticia */}
      <AnimatePresence>
        {selectedNews && (
          <NewsDetailModal news={selectedNews} onClose={() => setSelectedNews(null)} isDark={isDark} />
        )}
      </AnimatePresence>

      {/* Modal de detalle de sección */}
      <AnimatePresence>
        {selectedSection && (
          <SectionDetailModal section={selectedSection} onClose={() => setSelectedSection(null)} isDark={isDark} />
        )}
      </AnimatePresence>
    </div>
  );
}

// Componente para mostrar una noticia (clickeable)
function NewsCard({ news, onClick, isDark }: { news: News; onClick: () => void; isDark: boolean }) {
  const images = news.images && news.images.length > 0 ? news.images : (news.image_url ? [news.image_url] : []);

  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.98 }}
      className={`w-full text-left rounded-xl border overflow-hidden transition-colors ${
        isDark 
          ? 'bg-[#0a1628]/60 border-cyan-400/20 hover:border-cyan-400/40' 
          : 'bg-slate-50 border-slate-300 hover:border-blue-500 shadow-sm'
      }`}
    >
      {images.length > 0 && (
        <div className="relative h-32 overflow-hidden">
          <img src={images[0]} alt="" className="w-full h-full object-cover" />
          {images.length > 1 && (
            <span className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
              +{images.length - 1} fotos
            </span>
          )}
        </div>
      )}
      <div className="p-3">
        <h4 className={`font-medium text-sm mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>{news.title}</h4>
        {news.content && <p className={`text-xs line-clamp-2 ${isDark ? 'text-cyan-300/80' : 'text-slate-600'}`}>{news.content}</p>}
        <p className={`text-xs mt-2 ${isDark ? 'text-cyan-400' : 'text-blue-600'}`}>Toca para ver más →</p>
      </div>
    </motion.button>
  );
}

// Modal de detalle de noticia
function NewsDetailModal({ news, onClose, isDark }: { news: News; onClose: () => void; isDark: boolean }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const images = news.images && news.images.length > 0 ? news.images : (news.image_url ? [news.image_url] : []);

  const goToImage = (idx: number) => setCurrentImageIndex(idx);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border ${
          isDark 
            ? 'bg-gradient-to-b from-[#0c1f3a] to-[#0a1628] border-cyan-400/30' 
            : 'bg-white border-slate-300 shadow-2xl'
        }`}
      >
        {images.length > 0 && (
          <div className="relative h-56 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.img
                key={currentImageIndex}
                src={images[currentImageIndex]}
                alt=""
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full h-full object-cover"
              />
            </AnimatePresence>
            {images.length > 1 && (
              <>
                <button onClick={() => goToImage((currentImageIndex - 1 + images.length) % images.length)} className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button onClick={() => goToImage((currentImageIndex + 1) % images.length)} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white">
                  <ChevronRight className="w-5 h-5" />
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {images.map((_, idx) => (
                    <button key={idx} onClick={() => goToImage(idx)} className={`w-2.5 h-2.5 rounded-full transition-colors ${idx === currentImageIndex ? 'bg-white' : 'bg-white/40'}`} />
                  ))}
                </div>
              </>
            )}
            <button onClick={onClose} className="absolute top-3 right-3 p-2 rounded-full bg-black/50 text-white">
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>
        )}
        <div className="p-5">
          <h2 className={`font-semibold text-xl mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>{news.title}</h2>
          {news.content && <p className={`text-sm whitespace-pre-wrap mb-4 ${isDark ? 'text-cyan-200/90' : 'text-slate-700'}`}>{news.content}</p>}
          {news.link_url && (
            <a href={news.link_url} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm border ${
              isDark 
                ? 'bg-cyan-500/20 text-cyan-400 border-cyan-400/30 hover:bg-cyan-500/30' 
                : 'bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200'
            }`}>
              <ExternalLink className="w-4 h-4" /> Abrir enlace
            </a>
          )}
          <p className={`text-xs mt-4 ${isDark ? 'text-cyan-400/50' : 'text-slate-500'}`}>
            {new Date(news.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Componente para sección colapsada personalizada
function CollapsedCustomSection({ section, onShow, adminAvatar, isDark }: { section: HomeSection; onShow: () => void; adminAvatar: string | null; isDark: boolean }) {
  return (
    <motion.button
      type="button"
      onClick={onShow}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`w-full backdrop-blur-xl rounded-xl border p-3 flex items-center gap-3 ${
        isDark 
          ? 'bg-cyan-500/10 border-cyan-400/20' 
          : 'bg-white/95 border-slate-400/60 shadow-md'
      }`}
    >
      {adminAvatar ? (
        <img src={adminAvatar} alt="" className={`w-8 h-8 rounded-full object-cover border ${isDark ? 'border-cyan-400/30' : 'border-slate-400'}`} />
      ) : (
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isDark ? 'bg-cyan-500/25' : 'bg-blue-100'}`}>
          <Shield className={`w-4 h-4 ${isDark ? 'text-cyan-400' : 'text-blue-700'}`} />
        </div>
      )}
      <span className={`text-sm flex-1 text-left ${isDark ? 'text-cyan-300/80' : 'text-slate-700'}`}>{section.title}</span>
      <Eye className={`w-4 h-4 ${isDark ? 'text-cyan-400/60' : 'text-slate-500'}`} />
    </motion.button>
  );
}

// Componente para secciones personalizadas (clickeable)
function CustomSectionCard({ section, onClick, onHide, adminAvatar, adminName, isDark }: { 
  section: HomeSection; 
  onClick: () => void; 
  onHide: () => void;
  adminAvatar: string | null;
  adminName: string;
  isDark: boolean;
}) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const images = section.images || [];
  const links = section.links || [];
  const htmlContent = (section.content as { html?: string })?.html;

  const goToImage = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex(idx);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      className={`backdrop-blur-xl rounded-2xl border shadow-xl overflow-hidden ${
        isDark 
          ? 'bg-gradient-to-br from-cyan-500/20 to-teal-600/20 border-cyan-400/30' 
          : 'bg-white/95 border-slate-400/50'
      }`}
    >
      {/* Cabecera con avatar del admin */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        {adminAvatar ? (
          <img src={adminAvatar} alt={adminName} className={`w-10 h-10 rounded-full object-cover border-2 ${isDark ? 'border-cyan-400/40' : 'border-slate-400'}`} />
        ) : (
          <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${isDark ? 'bg-cyan-500/25 border-cyan-400/40' : 'bg-blue-100 border-blue-300'}`}>
            <Shield className={`w-5 h-5 ${isDark ? 'text-cyan-400' : 'text-blue-700'}`} />
          </div>
        )}
        <div className="flex-1">
          <p className={`font-medium text-base ${isDark ? 'text-cyan-200' : 'text-slate-900'}`}>{section.title}</p>
          {section.subtitle && <p className={`text-xs ${isDark ? 'text-cyan-300/70' : 'text-slate-600'}`}>{section.subtitle}</p>}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onHide(); }}
          className={`p-2 rounded-lg ${isDark ? 'bg-white/5 hover:bg-white/10 text-cyan-300/70' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
          title="Ocultar"
        >
          <EyeOff className="w-4 h-4" />
        </button>
      </div>

      {/* Carrusel de imágenes completo */}
      {images.length > 0 && (
        <div className={`relative mx-4 my-2 rounded-xl overflow-hidden ${isDark ? 'bg-black/20' : 'bg-slate-200'}`}>
          <AnimatePresence mode="wait">
            <motion.img
              key={currentImageIndex}
              src={images[currentImageIndex]}
              alt=""
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full h-auto max-h-64 object-contain"
            />
          </AnimatePresence>
          {images.length > 1 && (
            <>
              <button onClick={(e) => goToImage((currentImageIndex - 1 + images.length) % images.length, e)} className="absolute left-1 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/50 text-white">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={(e) => goToImage((currentImageIndex + 1) % images.length, e)} className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/50 text-white">
                <ChevronRight className="w-4 h-4" />
              </button>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                {images.map((_, idx) => (
                  <button key={idx} onClick={(e) => goToImage(idx, e)} className={`w-2 h-2 rounded-full transition-colors ${idx === currentImageIndex ? 'bg-white' : 'bg-white/40'}`} />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Contenido HTML */}
      {htmlContent && (
        <div className={`px-4 pb-2 text-sm ${isDark ? 'text-cyan-200/90' : 'text-slate-700'}`} dangerouslySetInnerHTML={{ __html: htmlContent }} />
      )}

      {/* Enlaces */}
      {links.length > 0 && (
        <div className="px-4 pb-3 flex flex-wrap gap-2">
          {links.map((link, idx) => (
            <a
              key={idx}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border ${
                isDark 
                  ? 'bg-cyan-500/20 text-cyan-400 border-cyan-400/30 hover:bg-cyan-500/30' 
                  : 'bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200'
              }`}
            >
              <ExternalLink className="w-3 h-3" /> {link.label || 'Ver enlace'}
            </a>
          ))}
        </div>
      )}

      {/* Botón para ver detalle completo */}
      <button
        type="button"
        onClick={onClick}
        className={`w-full py-3 text-center text-sm border-t transition-colors ${
          isDark 
            ? 'text-cyan-400 border-cyan-400/20 hover:bg-cyan-500/10' 
            : 'text-blue-600 border-slate-300 hover:bg-slate-100'
        }`}
      >
        Ver información completa →
      </button>
    </motion.div>
  );
}

// Modal de detalle de sección
function SectionDetailModal({ section, onClose, isDark }: { section: HomeSection; onClose: () => void; isDark: boolean }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const images = section.images || [];
  const links = section.links || [];
  const htmlContent = (section.content as { html?: string })?.html;

  const goToImage = (idx: number) => setCurrentImageIndex(idx);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border relative ${
          isDark 
            ? 'bg-gradient-to-b from-[#0c1f3a] to-[#0a1628] border-cyan-400/30' 
            : 'bg-white border-slate-300 shadow-2xl'
        }`}
      >
        <button onClick={onClose} className="absolute top-3 right-3 p-2 rounded-full bg-black/50 text-white z-20">
          <ChevronDown className="w-5 h-5" />
        </button>

        {/* Cabecera con icono admin */}
        <div className={`flex items-center gap-3 p-4 border-b ${isDark ? 'border-cyan-400/20' : 'border-slate-200'}`}>
          <div className={`p-2.5 rounded-xl ${isDark ? 'bg-cyan-500/25' : 'bg-blue-100'}`}>
            <Shield className={`w-6 h-6 ${isDark ? 'text-cyan-400' : 'text-blue-700'}`} />
          </div>
          <div>
            <h2 className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>{section.title}</h2>
            {section.subtitle && <p className={`text-sm ${isDark ? 'text-cyan-300/70' : 'text-slate-600'}`}>{section.subtitle}</p>}
          </div>
        </div>

        {/* Carrusel de imágenes */}
        {images.length > 0 && (
          <div className={`relative overflow-hidden ${isDark ? 'bg-black/30' : 'bg-slate-200'}`}>
            <AnimatePresence mode="wait">
              <motion.img
                key={currentImageIndex}
                src={images[currentImageIndex]}
                alt=""
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full h-auto max-h-80 object-contain"
              />
            </AnimatePresence>
            {images.length > 1 && (
              <>
                <button onClick={() => goToImage((currentImageIndex - 1 + images.length) % images.length)} className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button onClick={() => goToImage((currentImageIndex + 1) % images.length)} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white">
                  <ChevronRight className="w-5 h-5" />
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {images.map((_, idx) => (
                    <button key={idx} onClick={() => goToImage(idx)} className={`w-2.5 h-2.5 rounded-full transition-colors ${idx === currentImageIndex ? 'bg-white' : 'bg-white/40'}`} />
                  ))}
                </div>
                <p className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                  {currentImageIndex + 1} / {images.length}
                </p>
              </>
            )}
          </div>
        )}

        {/* Contenido */}
        <div className="p-5 space-y-4">
          {/* HTML Content */}
          {htmlContent && (
            <div className={`text-sm leading-relaxed ${isDark ? 'text-cyan-200/90' : 'text-slate-700'}`} dangerouslySetInnerHTML={{ __html: htmlContent }} />
          )}

          {/* Enlaces */}
          {links.length > 0 && (
            <div className="space-y-2">
              <p className={`text-xs uppercase tracking-wider ${isDark ? 'text-cyan-300/50' : 'text-slate-500'}`}>Enlaces</p>
              <div className="flex flex-col gap-2">
                {links.map((link, idx) => (
                  <a
                    key={idx}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm border transition-colors ${
                      isDark 
                        ? 'bg-cyan-500/20 text-cyan-400 border-cyan-400/30 hover:bg-cyan-500/30' 
                        : 'bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200'
                    }`}
                  >
                    <ExternalLink className="w-4 h-4" /> {link.label || link.url}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
