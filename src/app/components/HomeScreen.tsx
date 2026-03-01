import { getHomeSections, getNews, type HomeSection, type News } from '@/lib/api/adminPanel';
import { getNovedadesQuedadas, getPublishedSummaries } from '@/lib/api/quedadas';
import {
  addComment,
  deleteComment,
  filterAndSortFeedBySeen,
  getComments,
  getAllSharedDives,
  getFeedSeenTimestamps,
  getLikers,
  markFeedPublicationAsSeen,
  toggleLike,
  type SharedDive,
  type SharedDiveComment,
} from '@/lib/api/sharedDives';
import { supabase } from '@/lib/supabase';
import type { Quedada } from '@/lib/types';
import { ensureAbsoluteUrl, ensureAbsoluteUrls } from '@/lib/urlUtils';
import { Activity, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, ExternalLink, Eye, EyeOff, Heart, Loader2, MapPin, MessageCircle, Newspaper, Share2, Shield, Users, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Ahora';
  if (diffMins < 60) return `Hace ${diffMins} min`;
  if (diffHours < 24) return `Hace ${diffHours}h`;
  if (diffDays < 7) return `Hace ${diffDays}d`;
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

const STORAGE_KEY_HIDDEN = 'pelagos_home_hidden_sections';
const STORAGE_KEY_HIDDEN_CUSTOM = 'pelagos_home_hidden_custom_sections';

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
  const [selectedDiveForComments, setSelectedDiveForComments] = useState<SharedDive | null>(null);
  const [shareMenuDiveId, setShareMenuDiveId] = useState<string | null>(null);
  const [likingId, setLikingId] = useState<string | null>(null);
  const [feedSeenVersion, setFeedSeenVersion] = useState(0); // incrementar al marcar como vista → re-filtrar
  const feedContainerRef = useRef<HTMLDivElement>(null);
  const [news, setNews] = useState<News[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [customSections, setCustomSections] = useState<HomeSection[]>([]);
  const [selectedNews, setSelectedNews] = useState<News | null>(null);
  const [selectedSection, setSelectedSection] = useState<HomeSection | null>(null);
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [likersModal, setLikersModal] = useState<{ diveId: string; loading: boolean; likers: Array<{ id: string; display_name: string | null; avatar_url: string | null }> } | null>(null);
  
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

  // Guardar secciones ocultas
  const saveHiddenSections = (sections: Set<SectionId>) => {
    try {
      localStorage.setItem(STORAGE_KEY_HIDDEN, JSON.stringify([...sections]));
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

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id ?? null);

    // Cargar novedades: quedadas activas + resúmenes publicados
    setNovedadesLoading(true);
    try {
      const [activeQuedadas, publishedSummaries] = await Promise.all([
        getNovedadesQuedadas(user?.id ?? undefined),
        getPublishedSummaries(user?.id ?? undefined),
      ]);
      // Combinar: primero resúmenes (más recientes), luego quedadas activas
      const combined = [...publishedSummaries, ...activeQuedadas];
      setNovedades(combined);
    } catch {
      setNovedades([]);
    } finally {
      setNovedadesLoading(false);
    }

    // Cargar feed de publicaciones (estilo Instagram)
    setFeedLoading(true);
    try {
      const feed = await getAllSharedDives(user?.id ?? undefined, 40);
      setFeedDives(feed);
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

  const feedSeenTimestamps = useMemo(() => getFeedSeenTimestamps(), [feedSeenVersion]);
  const filteredFeed = useMemo(
    () => filterAndSortFeedBySeen(feedDives, feedSeenTimestamps),
    [feedDives, feedSeenTimestamps]
  );

  const markDiveAsSeenIfNeeded = useCallback((diveId: string) => {
    if (feedSeenTimestamps[diveId]) return;
    markFeedPublicationAsSeen(diveId);
    setFeedSeenVersion((v) => v + 1);
  }, [feedSeenTimestamps]);

  useEffect(() => {
    const container = feedContainerRef.current;
    if (!container) return;
    const cards = container.querySelectorAll('[data-feed-dive]');
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const id = (e.target as HTMLElement).dataset.feedDive;
            if (id) markDiveAsSeenIfNeeded(id);
          }
        }
      },
      { root: null, rootMargin: '0px', threshold: 0.3 }
    );
    cards.forEach((c) => observer.observe(c));
    return () => observer.disconnect();
  }, [filteredFeed, markDiveAsSeenIfNeeded]);

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
  // - No oculta manualmente Y (hay historias sin ver O no hay historias)
  // Jornadas compartidas = feed tipo publicaciones Instagram (no historias); siempre mostrar si la sección está visible
  const showComunidad = !hiddenSections.has('comunidad');
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

  return (
    <div className={`relative min-h-screen min-h-[100dvh] ${isDark ? 'bg-transparent' : 'bg-transparent'}`}>
      {/* El carrusel de fondo se renderiza en App (HomeBackgroundCarousel) para verse a pantalla completa. */}
      {/* Contenido principal: ocupa todo el espacio bajo el header, scroll completo */}
      <div className="relative z-10 w-full px-3 sm:px-4 pb-6 pt-2 min-h-full overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="space-y-3 pt-2"
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
                  subtitle="Publicaciones"
                  isHidden={false}
                />
                {/* Feed de publicaciones (estilo Instagram): me gusta y comentarios. El botón + del header lleva a Compartir jornada. */}
                {feedLoading ? (
                  <div className={`h-24 flex items-center justify-center text-sm ${isDark ? 'text-cyan-400/80' : 'text-slate-500'}`}>Cargando…</div>
                ) : filteredFeed.length === 0 ? (
                  <p className={`px-3 pb-4 text-sm ${isDark ? 'text-cyan-400/60' : 'text-slate-500'}`}>Aún no hay publicaciones. Comparte tu primera jornada.</p>
                ) : (
                  <div ref={feedContainerRef} className="px-3 pb-4 space-y-4">
                    {filteredFeed.map((dive) => (
                      <motion.div
                        key={dive.id}
                        data-feed-dive={dive.id}
                        layout
                        className={`rounded-xl border overflow-hidden ${
                          isDark ? 'border-cyan-400/20 bg-white/5' : 'border-slate-300 bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2 p-2">
                          <div className={`w-9 h-9 rounded-full overflow-hidden flex-shrink-0 ${isDark ? 'bg-cyan-500/30' : 'bg-cyan-100'}`}>
                            {dive.user_profile?.avatar_url ? (
                              <img src={ensureAbsoluteUrl(dive.user_profile.avatar_url)} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className={`w-full h-full flex items-center justify-center text-xs font-bold ${isDark ? 'text-cyan-200' : 'text-cyan-800'}`}>
                                {(dive.user_profile?.display_name || 'U').slice(0, 1)}
                              </span>
                            )}
                          </div>
                          <span className={`text-sm font-medium truncate flex-1 ${isDark ? 'text-white' : 'text-slate-800'}`}>{dive.user_profile?.display_name || 'Usuario'}</span>
                          {(dive as SharedDive & { tagged_profiles?: Array<{ display_name: string | null }> }).tagged_profiles?.length ? (
                            <span className={`text-xs truncate max-w-[120px] ${isDark ? 'text-cyan-400/80' : 'text-slate-500'}`}>
                              con {(dive as SharedDive & { tagged_profiles: Array<{ display_name: string | null }> }).tagged_profiles.map((t) => t.display_name || '').filter(Boolean).join(', ')}
                            </span>
                          ) : null}
                        </div>
                        {(dive.photo_urls?.length > 0 || dive.video_url) && (
                          <div className="aspect-square max-h-80 w-full bg-black/30">
                            {dive.photo_urls?.length > 0 ? (
                              <img src={ensureAbsoluteUrl(dive.photo_urls[0])} alt="" className="w-full h-full object-cover" />
                            ) : dive.video_url ? (
                              <video src={ensureAbsoluteUrl(dive.video_url)} className="w-full h-full object-cover" preload="metadata" muted playsInline />
                            ) : null}
                          </div>
                        )}
                        {dive.description && (
                          <p className={`px-2 py-1.5 text-sm line-clamp-2 ${isDark ? 'text-cyan-200/90' : 'text-slate-600'}`}>{dive.description}</p>
                        )}
                        <div className="flex items-center gap-4 px-2 py-2 border-t border-cyan-400/10">
                          <div className="flex items-center gap-1.5 text-sm">
                            <button
                              type="button"
                              disabled={!currentUserId || likingId === dive.id}
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (!currentUserId) return;
                                setLikingId(dive.id);
                                try {
                                  const liked = await toggleLike(dive.id, currentUserId);
                                  setFeedDives((prev) => prev.map((d) => (d.id === dive.id ? { ...d, user_liked: liked, likes_count: d.likes_count + (liked ? 1 : -1) } : d)));
                                } finally {
                                  setLikingId(null);
                                }
                              }}
                              className={`disabled:opacity-60 ${dive.user_liked ? 'text-red-400' : isDark ? 'text-cyan-300/80 hover:text-red-400' : 'text-slate-600 hover:text-red-500'}`}
                            >
                              {likingId === dive.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Heart className={`w-4 h-4 ${dive.user_liked ? 'fill-current' : ''}`} />}
                            </button>
                            <button
                              type="button"
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (dive.likes_count === 0) return;
                                setLikersModal({ diveId: dive.id, loading: true, likers: [] });
                                try {
                                  const likersList = await getLikers(dive.id);
                                  setLikersModal({ diveId: dive.id, loading: false, likers: likersList });
                                } catch {
                                  setLikersModal(null);
                                }
                              }}
                              className={`${dive.likes_count > 0 ? 'hover:underline cursor-pointer' : ''} ${dive.user_liked ? 'text-red-400' : isDark ? 'text-cyan-300/80' : 'text-slate-600'}`}
                            >
                              {dive.likes_count}
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); markDiveAsSeenIfNeeded(dive.id); setSelectedDiveForComments(dive); }}
                            className={`flex items-center gap-1.5 text-sm ${isDark ? 'text-cyan-300/80 hover:text-cyan-300' : 'text-slate-600 hover:text-slate-800'}`}
                          >
                            <MessageCircle className="w-4 h-4" />
                            <span>{dive.comments_count}</span>
                          </button>
                          <div className="relative ml-auto">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShareMenuDiveId(shareMenuDiveId === dive.id ? null : dive.id);
                              }}
                              className={`flex items-center gap-1.5 text-sm ${isDark ? 'text-cyan-300/80 hover:text-cyan-300' : 'text-slate-600 hover:text-slate-800'}`}
                            >
                              <Share2 className="w-4 h-4" />
                              <span>Compartir</span>
                            </button>
                            {shareMenuDiveId === dive.id && (
                              <>
                                <div
                                  className="fixed inset-0 z-10"
                                  aria-hidden
                                  onClick={(e) => { e.stopPropagation(); setShareMenuDiveId(null); }}
                                />
                                <div
                                  className={`absolute right-0 bottom-full mb-1 z-20 rounded-xl border shadow-xl overflow-hidden min-w-[180px] ${isDark ? 'bg-[#0c1f3a] border-cyan-400/20' : 'bg-white border-slate-200 shadow-lg'}`}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className={`px-3 py-2 border-b ${isDark ? 'border-cyan-400/20' : 'border-slate-200'}`}>
                                    <p className={`text-xs font-medium ${isDark ? 'text-cyan-300' : 'text-slate-600'}`}>Compartir en</p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const text = dive.description ? `🎣 ${dive.description.slice(0, 100)}${dive.description.length > 100 ? '...' : ''}` : '🎣 ¡Mira esta jornada de pesca submarina en Pelagos!';
                                      const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.origin)}&quote=${encodeURIComponent(text)}`;
                                      window.open(url, '_blank', 'width=600,height=400');
                                      setShareMenuDiveId(null);
                                    }}
                                    className={`flex items-center gap-3 px-4 py-3 w-full ${isDark ? 'text-white hover:bg-cyan-500/20' : 'text-slate-800 hover:bg-slate-100'}`}
                                  >
                                    <svg className="w-5 h-5 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                                    <span className="text-sm">Facebook</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      const text = dive.description ? `🎣 ${dive.description.slice(0, 100)}${dive.description.length > 100 ? '...' : ''}` : '🎣 ¡Mira esta jornada de pesca submarina en Pelagos!';
                                      const url = window.location.origin;
                                      if (navigator.share) {
                                        try {
                                          await navigator.share({ title: 'Pelagos', text, url });
                                        } catch {
                                          await navigator.clipboard.writeText(`${text}\n\n${url}`);
                                        }
                                      } else {
                                        await navigator.clipboard.writeText(`${text}\n\n${url}`);
                                      }
                                      setShareMenuDiveId(null);
                                    }}
                                    className={`flex items-center gap-3 px-4 py-3 w-full border-t ${isDark ? 'text-white hover:bg-cyan-500/20 border-cyan-400/20' : 'text-slate-800 hover:bg-slate-100 border-slate-200'}`}
                                  >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none"><defs><linearGradient id="ig" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stopColor="#FFDC80"/><stop offset="25%" stopColor="#FCAF45"/><stop offset="50%" stopColor="#F77737"/><stop offset="75%" stopColor="#E1306C"/><stop offset="100%" stopColor="#833AB4"/></linearGradient></defs><rect x="2" y="2" width="20" height="20" rx="5" stroke="url(#ig)" strokeWidth="2"/><circle cx="12" cy="12" r="4" stroke="url(#ig)" strokeWidth="2"/><circle cx="18" cy="6" r="1.5" fill="url(#ig)"/></svg>
                                    <span className="text-sm">Instagram (copiar enlace)</span>
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
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
                        const hasSummary = !!q.summary_published_at;
                        const listParticipants = (q as Quedada & { list_participants?: Array<{ user_id: string; display_name: string | null; avatar_url: string | null }> }).list_participants ?? [];
                        
                        // Si es un resumen publicado, mostrar de forma diferente
                        if (hasSummary) {
                          return (
                            <div key={q.id} className="px-2 outline-none">
                              <motion.button
                                type="button"
                                whileTap={{ scale: 0.98 }}
                                onClick={() => openNovedad(q)}
                                className={`w-full text-left rounded-xl border p-5 h-full min-h-[160px] flex flex-col gap-2.5 ${
                                  isDark 
                                    ? 'bg-gradient-to-br from-amber-500/15 to-orange-500/10 border-amber-400/30' 
                                    : 'bg-amber-50 border-amber-300 shadow-sm'
                                }`}
                              >
                                {/* Badge de resumen */}
                                <div className="flex items-center justify-between">
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-amber-500/30 text-amber-200' : 'bg-amber-100 text-amber-700'}`}>
                                    Cómo fue
                                  </span>
                                  <span className={`text-xs ${isDark ? 'text-amber-300/60' : 'text-amber-600'}`}>
                                    {new Date(q.meetup_date + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                                  </span>
                                </div>
                                
                                {/* Título */}
                                <span className={`font-medium text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{q.title || TIPO_LABEL[tipo]}</span>
                                
                                {/* Resumen (truncado) */}
                                <p className={`text-sm line-clamp-2 ${isDark ? 'text-amber-200/80' : 'text-amber-700'}`}>
                                  {q.summary}
                                </p>
                                
                                {/* Participantes etiquetados */}
                                {listParticipants.length > 0 && (
                                  <div className="flex items-center gap-1 mt-auto">
                                    <div className="flex -space-x-1.5">
                                      {listParticipants.slice(0, 4).map((p) => (
                                        <div
                                          key={p.user_id}
                                          className={`h-6 w-6 rounded-full border-2 flex items-center justify-center overflow-hidden ${isDark ? 'border-[#0a1628] bg-amber-500/30' : 'border-white bg-amber-100'}`}
                                        >
                                          {p.avatar_url ? (
                                            <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
                                          ) : (
                                            <span className={`text-[10px] ${isDark ? 'text-amber-200' : 'text-amber-700'}`}>
                                              {(p.display_name || '?').slice(0, 2).toUpperCase()}
                                            </span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                    {listParticipants.length > 4 && (
                                      <span className={`text-xs ${isDark ? 'text-amber-300/70' : 'text-amber-600'}`}>
                                        +{listParticipants.length - 4}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </motion.button>
                            </div>
                          );
                        }
                        
                        // Quedada activa (original)
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

      {/* Panel de comentarios (feed tipo Instagram) */}
      <AnimatePresence>
        {selectedDiveForComments && (
          <CommentsSheet
            dive={selectedDiveForComments}
            userId={currentUserId}
            onClose={() => setSelectedDiveForComments(null)}
            onCommentsUpdated={(count) => {
              setFeedDives((prev) => prev.map((d) => (d.id === selectedDiveForComments.id ? { ...d, comments_count: count } : d)));
            }}
          />
        )}
      </AnimatePresence>

      {/* Modal de likes (quiénes dieron like) */}
      <AnimatePresence>
        {likersModal && (
          <motion.div
            key="likers-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center"
            onClick={() => setLikersModal(null)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-md max-h-[60vh] overflow-hidden rounded-t-2xl sm:rounded-2xl bg-gradient-to-b from-[#0c1f3a] to-[#0a1628] border-t sm:border border-cyan-400/30"
            >
              <div className="flex items-center justify-between p-4 border-b border-cyan-400/20">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <Heart className="w-5 h-5 text-red-400 fill-current" /> Me gusta
                </h3>
                <button type="button" onClick={() => setLikersModal(null)} className="p-1.5 rounded-full hover:bg-white/10 text-cyan-300">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="overflow-y-auto max-h-[calc(60vh-60px)] p-2">
                {likersModal.loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                  </div>
                ) : likersModal.likers.length === 0 ? (
                  <p className="text-cyan-300/60 text-center py-8 text-sm">Nadie ha dado me gusta todavía</p>
                ) : (
                  <div className="space-y-1">
                    {likersModal.likers.map((liker) => (
                      <div key={liker.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors">
                        {liker.avatar_url ? (
                          <img src={liker.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-medium text-sm">
                            {(liker.display_name || 'U').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="text-white font-medium">{liker.display_name || 'Usuario'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Panel de comentarios para una publicación del feed */
function CommentsSheet({
  dive,
  userId,
  onClose,
  onCommentsUpdated,
}: {
  dive: SharedDive;
  userId: string | null;
  onClose: () => void;
  onCommentsUpdated: (count: number) => void;
}) {
  const [comments, setComments] = useState<SharedDiveComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getComments(dive.id)
      .then(setComments)
      .finally(() => setLoadingComments(false));
  }, [dive.id]);

  const handleAdd = async () => {
    if (!userId || !newComment.trim()) return;
    setSubmitting(true);
    try {
      const c = await addComment(dive.id, userId, newComment.trim());
      setComments((prev) => [...prev, c]);
      setNewComment('');
      onCommentsUpdated(comments.length + 1);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!userId) return;
    await deleteComment(commentId, userId);
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    onCommentsUpdated(comments.length - 1);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg max-h-[85vh] overflow-hidden bg-[#0c1f3a] border border-cyan-400/20 rounded-t-2xl sm:rounded-2xl flex flex-col"
      >
        <div className="flex items-center gap-3 p-3 border-b border-cyan-400/20">
          <div className="h-9 w-9 rounded-full bg-cyan-500/30 flex items-center justify-center overflow-hidden flex-shrink-0">
            {dive.user_profile?.avatar_url ? (
              <img src={ensureAbsoluteUrl(dive.user_profile.avatar_url)} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-cyan-200 text-xs font-medium">{(dive.user_profile?.display_name || 'U').slice(0, 1)}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium text-sm truncate">{dive.user_profile?.display_name || 'Usuario'}</p>
            <p className="text-cyan-400/70 text-xs">{formatTimeAgo(dive.created_at)}</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-cyan-300">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <p className="text-cyan-200 text-sm font-medium mb-2">Comentarios ({comments.length})</p>
          {loadingComments ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
            </div>
          ) : comments.length === 0 ? (
            <p className="text-cyan-400/60 text-sm">Sin comentarios aún.</p>
          ) : (
            <div className="space-y-3">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-2">
                  <div className="h-8 w-8 rounded-full bg-cyan-500/30 flex-shrink-0 flex items-center justify-center overflow-hidden">
                    {c.user_profile?.avatar_url ? (
                      <img src={ensureAbsoluteUrl(c.user_profile.avatar_url)} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-cyan-200 text-xs">{(c.user_profile?.display_name || 'U').slice(0, 1)}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 bg-white/5 rounded-xl px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-cyan-200 text-xs font-medium truncate">{c.user_profile?.display_name || 'Usuario'}</p>
                      {userId === c.user_id && (
                        <button type="button" onClick={() => handleDelete(c.id)} className="text-red-400/80 hover:text-red-400 text-xs">
                          Eliminar
                        </button>
                      )}
                    </div>
                    <p className="text-white text-sm mt-0.5 break-words">{c.content}</p>
                    <p className="text-cyan-400/50 text-xs mt-1">{formatTimeAgo(c.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {userId && (
          <div className="p-3 border-t border-cyan-400/20 flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="Añadir comentario..."
              className="flex-1 rounded-xl bg-white/10 border border-cyan-400/20 px-3 py-2 text-white placeholder-cyan-400/50 text-sm"
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={submitting || !newComment.trim()}
              className="px-4 py-2 rounded-xl bg-cyan-500/80 hover:bg-cyan-500 text-white text-sm font-medium disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enviar'}
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// Componente para mostrar una noticia (clickeable)
function NewsCard({ news, onClick, isDark }: { news: News; onClick: () => void; isDark: boolean }) {
  const rawImages = news.images && news.images.length > 0 ? news.images : (news.image_url ? [news.image_url] : []);
  const images = ensureAbsoluteUrls(rawImages);

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
  const rawImages = news.images && news.images.length > 0 ? news.images : (news.image_url ? [news.image_url] : []);
  const images = ensureAbsoluteUrls(rawImages);

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
            <a href={ensureAbsoluteUrl(news.link_url)} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm border ${
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
              href={ensureAbsoluteUrl(link.url)}
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
  const images = ensureAbsoluteUrls(section.images || []);
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
                    href={ensureAbsoluteUrl(link.url)}
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
