import { getProfilesForPescasub } from '@/lib/api/profiles';
import {
  addComment,
  createSharedDive,
  deleteComment,
  deleteSharedDive,
  getComments,
  getLikers,
  getMySharedDives,
  toggleLike,
  uploadSharedDivePhoto,
  uploadSharedDiveVideo,
  type CreateSharedDivePayload,
  type SharedDive,
  type SharedDiveComment,
} from '@/lib/api/sharedDives';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronLeft,
  Heart,
  ImagePlus,
  Loader2,
  MessageCircle,
  MoreVertical,
  Plus,
  Send,
  Share2,
  Trash2,
  Video,
  X
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

const CURRENT_OPTIONS = [
  'Sin corriente',
  'Corriente media',
  'Corriente alta',
];

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

function formatApneaTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  if (secs === 0) return `${mins}min`;
  return `${mins}min ${secs}s`;
}

export default function SharedDivesView({
  userId,
  onBack,
  initialOpenCreate = false,
  onCreateFormClosed,
}: {
  userId: string | null;
  onBack: () => void;
  /** Abrir directamente el modal de crear publicación (ej. desde el + del home). */
  initialOpenCreate?: boolean;
  onCreateFormClosed?: () => void;
}) {
  const [dives, setDives] = useState<SharedDive[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(initialOpenCreate);
  const [selectedDive, setSelectedDive] = useState<SharedDive | null>(null);
  const [likersModal, setLikersModal] = useState<{ diveId: string; loading: boolean; likers: Array<{ id: string; display_name: string | null; avatar_url: string | null }> } | null>(null);

  useEffect(() => {
    if (initialOpenCreate) setShowCreateForm(true);
  }, [initialOpenCreate]);

  const loadDives = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Solo cargar MIS jornadas compartidas
      const list = await getMySharedDives(userId);
      setDives(list);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadDives();
  }, [loadDives]);

  const handleLike = async (dive: SharedDive) => {
    if (!userId) return;
    const liked = await toggleLike(dive.id, userId);
    setDives((prev) =>
      prev.map((d) =>
        d.id === dive.id
          ? { ...d, user_liked: liked, likes_count: d.likes_count + (liked ? 1 : -1) }
          : d
      )
    );
    if (selectedDive?.id === dive.id) {
      setSelectedDive((prev) =>
        prev ? { ...prev, user_liked: liked, likes_count: prev.likes_count + (liked ? 1 : -1) } : prev
      );
    }
  };

  const handleDelete = async (diveId: string) => {
    if (!userId) return;
    if (!confirm('¿Eliminar esta publicación?')) return;
    await deleteSharedDive(diveId, userId);
    setDives((prev) => prev.filter((d) => d.id !== diveId));
    if (selectedDive?.id === diveId) setSelectedDive(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-cyan-950 to-slate-900 text-white">
      <div className="max-w-lg mx-auto px-4 py-6 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20"
          >
            <ChevronLeft className="w-5 h-5 text-cyan-200" />
          </button>
          <h1 className="text-xl font-bold text-white flex-1">Jornadas Compartidas</h1>
          {userId && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowCreateForm(true)}
              className="p-2 rounded-xl bg-amber-500/80 hover:bg-amber-500"
            >
              <Plus className="w-5 h-5 text-white" />
            </motion.button>
          )}
        </div>

        {/* Feed */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          </div>
        ) : dives.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-cyan-300/70">No hay jornadas compartidas aún.</p>
            {userId && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="mt-4 px-4 py-2 rounded-xl bg-amber-500/80 text-white font-medium"
              >
                Comparte tu primera jornada
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {dives.map((dive) => (
              <DiveCard
                key={dive.id}
                dive={dive}
                userId={userId}
                onLike={() => handleLike(dive)}
                onComment={() => setSelectedDive(dive)}
                onDelete={() => handleDelete(dive.id)}
                onViewLikers={async () => {
                  if (dive.likes_count === 0) return;
                  setLikersModal({ diveId: dive.id, loading: true, likers: [] });
                  try {
                    const likersList = await getLikers(dive.id);
                    setLikersModal({ diveId: dive.id, loading: false, likers: likersList });
                  } catch {
                    setLikersModal(null);
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal crear jornada */}
      <AnimatePresence>
        {showCreateForm && userId && (
          <CreateDiveModal
            userId={userId}
            onClose={() => {
              setShowCreateForm(false);
              onCreateFormClosed?.();
            }}
            onCreated={(newDive) => {
              setDives((prev) => [newDive, ...prev]);
              setShowCreateForm(false);
              onCreateFormClosed?.();
            }}
          />
        )}
      </AnimatePresence>

      {/* Modal detalle/comentarios */}
      <AnimatePresence>
        {selectedDive && (
          <DiveDetailModal
            dive={selectedDive}
            userId={userId}
            onClose={() => setSelectedDive(null)}
            onLike={() => handleLike(selectedDive)}
            onCommentsUpdated={(count) =>
              setDives((prev) =>
                prev.map((d) => (d.id === selectedDive.id ? { ...d, comments_count: count } : d))
              )
            }
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

function DiveCard({
  dive,
  userId,
  onLike,
  onComment,
  onDelete,
  onViewLikers,
}: {
  dive: SharedDive;
  userId: string | null;
  onLike: () => void;
  onComment: () => void;
  onDelete: () => void;
  onViewLikers: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const isOwner = userId === dive.user_id;

  const shareText = dive.description
    ? `🎣 ${dive.description.slice(0, 100)}${dive.description.length > 100 ? '...' : ''}`
    : '🎣 ¡Mira mi jornada de pesca submarina en Pelagos!';

  const shareUrl = window.location.origin;

  const handleShareFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank', 'width=600,height=400');
    setShowShareMenu(false);
  };

  const handleShareInstagram = async () => {
    // Instagram no tiene API web de compartir directa, pero podemos copiar al portapapeles
    // y abrir Instagram, o usar la Web Share API si está disponible
    if (navigator.share && dive.photo_urls.length > 0) {
      try {
        // Intentar compartir con Web Share API (funciona en móvil)
        await navigator.share({
          title: 'Mi jornada de pesca - Pelagos',
          text: shareText,
          url: shareUrl,
        });
      } catch {
        // Si falla, copiar al portapapeles
        copyToClipboard();
      }
    } else {
      copyToClipboard();
    }
    setShowShareMenu(false);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
      alert('Texto copiado. ¡Pégalo en Instagram!');
    } catch {
      alert('No se pudo copiar. Copia manualmente el texto.');
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Mi jornada de pesca - Pelagos',
          text: shareText,
          url: shareUrl,
        });
      } catch {
        // Usuario canceló
      }
    }
    setShowShareMenu(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="backdrop-blur-xl bg-white/5 rounded-2xl border border-cyan-400/20 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4">
        <div className="h-10 w-10 rounded-full bg-cyan-500/30 border border-cyan-400/30 flex items-center justify-center overflow-hidden">
          {dive.user_profile?.avatar_url ? (
            <img src={dive.user_profile.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-cyan-200 text-sm font-medium">
              {(dive.user_profile?.display_name || 'U').slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium text-sm">
            {dive.user_profile?.display_name || 'Usuario'}
          </p>
          {dive.tagged_profiles?.length ? (
            <p className="text-cyan-400/80 text-xs truncate">con {dive.tagged_profiles.map((t) => t.display_name || '').filter(Boolean).join(', ')}</p>
          ) : null}
          <p className="text-cyan-400/70 text-xs">{formatTimeAgo(dive.created_at)}</p>
        </div>
        {isOwner && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 rounded-lg hover:bg-white/10"
            >
              <MoreVertical className="w-4 h-4 text-cyan-300" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-8 z-10 bg-slate-800 rounded-xl border border-cyan-400/30 shadow-lg overflow-hidden">
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onDelete();
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-red-400 hover:bg-white/10 w-full"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="text-sm">Eliminar</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Media */}
      {(dive.photo_urls.length > 0 || dive.video_url) && (
        <div className="relative">
          {dive.photo_urls.length > 0 && (
            <div className={`grid ${dive.photo_urls.length === 2 ? 'grid-cols-2' : 'grid-cols-1'} gap-0.5`}>
              {dive.photo_urls.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt=""
                  className="w-full aspect-square object-cover"
                />
              ))}
            </div>
          )}
          {dive.video_url && (
            <div className="relative">
              <video
                src={dive.video_url}
                controls
                className="w-full max-h-96 bg-black"
                preload="metadata"
              />
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="p-4 space-y-3">
        {dive.description && (
          <p className="text-cyan-100 text-sm whitespace-pre-wrap">{dive.description}</p>
        )}

        {/* Detalles técnicos */}
        <div className="flex flex-wrap gap-2">
          {(dive.depth_min != null || dive.depth_max != null) && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 text-xs">
              Profundidad: {dive.depth_min ?? '?'} - {dive.depth_max ?? '?'} m
            </span>
          )}
          {dive.apnea_time_seconds != null && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-500/20 text-blue-300 text-xs">
              Apnea: {formatApneaTime(dive.apnea_time_seconds)}
            </span>
          )}
          {dive.current_type && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-500/20 text-purple-300 text-xs">
              {dive.current_type}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4 pt-2 border-t border-cyan-400/10">
          <div className="flex items-center gap-1.5 text-sm">
            <button
              onClick={onLike}
              className={dive.user_liked ? 'text-red-400' : 'text-cyan-300/70 hover:text-red-400'}
            >
              <Heart className={`w-5 h-5 ${dive.user_liked ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={onViewLikers}
              className={`${dive.likes_count > 0 ? 'hover:underline cursor-pointer' : ''} ${dive.user_liked ? 'text-red-400' : 'text-cyan-300/70'}`}
            >
              {dive.likes_count}
            </button>
          </div>
          <button
            onClick={onComment}
            className="flex items-center gap-1.5 text-sm text-cyan-300/70 hover:text-cyan-200"
          >
            <MessageCircle className="w-5 h-5" />
            <span>{dive.comments_count}</span>
          </button>
          
          {/* Botón compartir */}
          <div className="relative ml-auto">
            <button
              onClick={() => setShowShareMenu(!showShareMenu)}
              className="flex items-center gap-1.5 text-sm text-cyan-300/70 hover:text-cyan-200"
            >
              <Share2 className="w-5 h-5" />
              <span>Compartir</span>
            </button>
            
            {showShareMenu && (
              <>
                {/* Overlay para cerrar */}
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowShareMenu(false)} 
                />
                
                {/* Menú de compartir */}
                <div className="absolute right-0 bottom-8 z-20 bg-slate-800 rounded-xl border border-cyan-400/30 shadow-xl overflow-hidden min-w-[180px]">
                  <div className="px-3 py-2 border-b border-cyan-400/20">
                    <p className="text-cyan-300 text-xs font-medium">Compartir en</p>
                  </div>
                  
                  <button
                    onClick={handleShareFacebook}
                    className="flex items-center gap-3 px-4 py-3 text-white hover:bg-white/10 w-full"
                  >
                    <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    <span className="text-sm">Facebook</span>
                  </button>
                  
                  <button
                    onClick={handleShareInstagram}
                    className="flex items-center gap-3 px-4 py-3 text-white hover:bg-white/10 w-full"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                      <defs>
                        <linearGradient id="instagram-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#FFDC80"/>
                          <stop offset="25%" stopColor="#FCAF45"/>
                          <stop offset="50%" stopColor="#F77737"/>
                          <stop offset="75%" stopColor="#E1306C"/>
                          <stop offset="100%" stopColor="#833AB4"/>
                        </linearGradient>
                      </defs>
                      <rect x="2" y="2" width="20" height="20" rx="5" stroke="url(#instagram-gradient)" strokeWidth="2"/>
                      <circle cx="12" cy="12" r="4" stroke="url(#instagram-gradient)" strokeWidth="2"/>
                      <circle cx="18" cy="6" r="1.5" fill="url(#instagram-gradient)"/>
                    </svg>
                    <span className="text-sm">Instagram</span>
                  </button>
                  
                  {typeof navigator !== 'undefined' && navigator.share && (
                    <button
                      onClick={handleNativeShare}
                      className="flex items-center gap-3 px-4 py-3 text-white hover:bg-white/10 w-full border-t border-cyan-400/20"
                    >
                      <Share2 className="w-5 h-5 text-cyan-400" />
                      <span className="text-sm">Más opciones...</span>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function CreateDiveModal({
  userId,
  onClose,
  onCreated,
}: {
  userId: string;
  onClose: () => void;
  onCreated: (dive: SharedDive) => void;
}) {
  const [description, setDescription] = useState('');
  const [depthMin, setDepthMin] = useState('');
  const [depthMax, setDepthMax] = useState('');
  const [apneaMins, setApneaMins] = useState('');
  const [apneaSecs, setApneaSecs] = useState('');
  const [currentType, setCurrentType] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [video, setVideo] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState('');
  const [taggedUserIds, setTaggedUserIds] = useState<string[]>([]);
  const [profileList, setProfileList] = useState<Array<{ id: string; display_name: string | null }>>([]);
  const [tagSearch, setTagSearch] = useState('');

  useEffect(() => {
    getProfilesForPescasub()
      .then((list) => setProfileList(list))
      .catch(() => setProfileList([]));
  }, []);

  const filteredProfiles = profileList.filter((p) => {
    if (p.id === userId) return false;
    const name = (p.display_name || '').toLowerCase();
    const q = tagSearch.trim().toLowerCase();
    return !q || name.includes(q);
  });

  const toggleTagged = (id: string) => {
    setTaggedUserIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const remaining = 2 - photos.length;
    const toAdd = files.slice(0, remaining);
    setPhotos((prev) => [...prev, ...toAdd]);
    setPhotoPreviews((prev) => [...prev, ...toAdd.map((f) => URL.createObjectURL(f))]);
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => {
      const newPreviews = prev.filter((_, i) => i !== index);
      URL.revokeObjectURL(prev[index]);
      return newPreviews;
    });
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const videoEl = document.createElement('video');
    videoEl.preload = 'metadata';
    videoEl.onloadedmetadata = () => {
      URL.revokeObjectURL(videoEl.src);
      if (videoEl.duration > 180) {
        setError('El video no puede durar más de 3 minutos');
        return;
      }
      setVideo(file);
      setVideoPreview(URL.createObjectURL(file));
      setError(null);
    };
    videoEl.src = URL.createObjectURL(file);
  };

  const removeVideo = () => {
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideo(null);
    setVideoPreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() && photos.length === 0 && !video) {
      setError('Añade al menos una descripción, foto o video');
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const apneaTotal =
        (apneaMins ? parseInt(apneaMins, 10) * 60 : 0) + (apneaSecs ? parseInt(apneaSecs, 10) : 0);

      const payload: CreateSharedDivePayload = {
        description: description.trim() || null,
        depth_min: depthMin ? parseFloat(depthMin) : null,
        depth_max: depthMax ? parseFloat(depthMax) : null,
        apnea_time_seconds: apneaTotal > 0 ? apneaTotal : null,
        current_type: currentType || null,
        tagged_user_ids: taggedUserIds.length > 0 ? taggedUserIds : null,
      };

      setUploadProgress('Creando publicación...');
      const created = await createSharedDive(userId, payload);

      if (photos.length > 0) {
        for (let i = 0; i < photos.length; i++) {
          setUploadProgress(`Subiendo foto ${i + 1}/${photos.length}...`);
          const url = await uploadSharedDivePhoto(created.id, userId, photos[i], i);
          created.photo_urls = [...created.photo_urls, url];
        }
      }

      if (video) {
        setUploadProgress('Subiendo video...');
        const url = await uploadSharedDiveVideo(created.id, userId, video);
        created.video_url = url;
      }

      onCreated(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al publicar');
    } finally {
      setSubmitting(false);
      setUploadProgress('');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-gradient-to-b from-slate-800 to-slate-900 rounded-t-3xl sm:rounded-3xl"
      >
        <div className="sticky top-0 bg-slate-800/95 backdrop-blur px-4 py-4 border-b border-cyan-400/20 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Compartir jornada</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10">
            <X className="w-5 h-5 text-cyan-300" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Etiquetar a: buscador con coincidencias */}
          <div>
            <label className="block text-cyan-200 text-sm font-medium mb-2">
              Etiquetar a (opcional)
            </label>
            <p className="text-cyan-400/60 text-xs mb-2">Estos usuarios aparecerán en la publicación</p>
            <input
              type="search"
              value={tagSearch}
              onChange={(e) => setTagSearch(e.target.value)}
              placeholder="Buscar por nombre..."
              className="w-full rounded-xl bg-white/10 border border-cyan-400/30 px-4 py-2.5 text-white placeholder-cyan-400/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 text-sm mb-2"
            />
            <div className="max-h-36 overflow-y-auto rounded-xl bg-white/5 border border-cyan-400/20 p-2 space-y-1">
              {filteredProfiles.length === 0 ? (
                <p className="text-cyan-400/60 text-sm py-2 text-center">
                  {tagSearch.trim() ? 'Sin coincidencias' : 'Escribe para buscar usuarios'}
                </p>
              ) : (
                filteredProfiles.slice(0, 50).map((p) => (
                  <label key={p.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-white/5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={taggedUserIds.includes(p.id)}
                      onChange={() => toggleTagged(p.id)}
                      className="rounded border-cyan-400/40"
                    />
                    <span className="text-white text-sm truncate">{p.display_name || 'Usuario'}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-cyan-200 text-sm font-medium mb-2">
              Cuéntanos el lance
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe tu jornada, la captura, las condiciones..."
              rows={4}
              className="w-full rounded-xl bg-white/10 border border-cyan-400/30 px-4 py-3 text-white placeholder-cyan-400/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 resize-none"
            />
          </div>

          {/* Fotos */}
          <div>
            <label className="block text-cyan-200 text-sm font-medium mb-2">
              Fotos (máx. 2)
            </label>
            <div className="flex gap-2 flex-wrap">
              {photoPreviews.map((preview, i) => (
                <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden">
                  <img src={preview} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {photos.length < 2 && (
                <label className="w-24 h-24 rounded-xl border-2 border-dashed border-cyan-400/40 flex items-center justify-center cursor-pointer hover:bg-white/5">
                  <ImagePlus className="w-6 h-6 text-cyan-400/60" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoSelect}
                  />
                </label>
              )}
            </div>
          </div>

          {/* Video */}
          <div>
            <label className="block text-cyan-200 text-sm font-medium mb-2">
              Video (máx. 3 min)
            </label>
            {videoPreview ? (
              <div className="relative rounded-xl overflow-hidden">
                <video src={videoPreview} controls className="w-full max-h-48" />
                <button
                  type="button"
                  onClick={removeVideo}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 py-6 rounded-xl border-2 border-dashed border-cyan-400/40 cursor-pointer hover:bg-white/5">
                <Video className="w-5 h-5 text-cyan-400/60" />
                <span className="text-cyan-400/70 text-sm">Añadir video</span>
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={handleVideoSelect}
                />
              </label>
            )}
          </div>

          {/* Profundidad */}
          <div>
            <label className="block text-cyan-200 text-sm font-medium mb-2">
              Profundidad (metros)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="any"
                value={depthMin}
                onChange={(e) => setDepthMin(e.target.value)}
                placeholder="Mín"
                className="flex-1 rounded-xl bg-white/10 border border-cyan-400/30 px-4 py-2.5 text-white placeholder-cyan-400/50 text-sm"
              />
              <span className="text-cyan-400">—</span>
              <input
                type="number"
                step="any"
                value={depthMax}
                onChange={(e) => setDepthMax(e.target.value)}
                placeholder="Máx"
                className="flex-1 rounded-xl bg-white/10 border border-cyan-400/30 px-4 py-2.5 text-white placeholder-cyan-400/50 text-sm"
              />
            </div>
          </div>

          {/* Tiempo de apnea */}
          <div>
            <label className="block text-cyan-200 text-sm font-medium mb-2">
              Tiempo de apnea (opcional)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="any"
                value={apneaMins}
                onChange={(e) => setApneaMins(e.target.value)}
                placeholder="Min"
                className="w-20 rounded-xl bg-white/10 border border-cyan-400/30 px-3 py-2.5 text-white placeholder-cyan-400/50 text-sm text-center"
              />
              <span className="text-cyan-300 text-sm">min</span>
              <input
                type="number"
                step="any"
                value={apneaSecs}
                onChange={(e) => setApneaSecs(e.target.value)}
                placeholder="Seg"
                className="w-20 rounded-xl bg-white/10 border border-cyan-400/30 px-3 py-2.5 text-white placeholder-cyan-400/50 text-sm text-center"
              />
              <span className="text-cyan-300 text-sm">seg</span>
            </div>
          </div>

          {/* Corriente */}
          <div>
            <label className="block text-cyan-200 text-sm font-medium mb-2">
              Corriente (opcional)
            </label>
            <div className="flex flex-wrap gap-2">
              {CURRENT_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setCurrentType(currentType === opt ? '' : opt)}
                  className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                    currentType === opt
                      ? 'bg-cyan-500/40 text-white border border-cyan-400'
                      : 'bg-white/10 text-cyan-200 border border-cyan-400/25 hover:bg-white/15'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 rounded-xl px-4 py-2">{error}</p>
          )}

          {uploadProgress && (
            <p className="text-cyan-300 text-sm flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              {uploadProgress}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-amber-500/80 hover:bg-amber-500 text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Publicar'}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

function DiveDetailModal({
  dive,
  userId,
  onClose,
  onLike,
  onCommentsUpdated,
}: {
  dive: SharedDive;
  userId: string | null;
  onClose: () => void;
  onLike: () => void;
  onCommentsUpdated: (count: number) => void;
}) {
  const [comments, setComments] = useState<SharedDiveComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getComments(dive.id)
      .then(setComments)
      .finally(() => setLoadingComments(false));
  }, [dive.id]);

  const handleAddComment = async () => {
    if (!userId || !newComment.trim()) return;
    setSubmitting(true);
    try {
      const comment = await addComment(dive.id, userId, newComment.trim());
      setComments((prev) => [...prev, comment]);
      setNewComment('');
      onCommentsUpdated(comments.length + 1);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
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
      className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg max-h-[90vh] overflow-hidden bg-gradient-to-b from-slate-800 to-slate-900 rounded-t-3xl sm:rounded-3xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-cyan-400/20">
          <div className="h-10 w-10 rounded-full bg-cyan-500/30 flex items-center justify-center overflow-hidden">
            {dive.user_profile?.avatar_url ? (
              <img src={dive.user_profile.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-cyan-200 text-sm font-medium">
                {(dive.user_profile?.display_name || 'U').slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1">
            <p className="text-white font-medium text-sm">{dive.user_profile?.display_name || 'Usuario'}</p>
            <p className="text-cyan-400/70 text-xs">{formatTimeAgo(dive.created_at)}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10">
            <X className="w-5 h-5 text-cyan-300" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Media */}
          {(dive.photo_urls.length > 0 || dive.video_url) && (
            <div>
              {dive.photo_urls.length > 0 && (
                <div className={`grid ${dive.photo_urls.length === 2 ? 'grid-cols-2' : 'grid-cols-1'} gap-0.5`}>
                  {dive.photo_urls.map((url, i) => (
                    <img key={i} src={url} alt="" className="w-full aspect-square object-cover" />
                  ))}
                </div>
              )}
              {dive.video_url && (
                <video src={dive.video_url} controls className="w-full max-h-64 bg-black" />
              )}
            </div>
          )}

          {/* Details */}
          <div className="p-4 space-y-3">
            {dive.description && (
              <p className="text-cyan-100 text-sm whitespace-pre-wrap">{dive.description}</p>
            )}
            <div className="flex flex-wrap gap-2">
              {(dive.depth_min != null || dive.depth_max != null) && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 text-xs">
                  Profundidad: {dive.depth_min ?? '?'} - {dive.depth_max ?? '?'} m
                </span>
              )}
              {dive.apnea_time_seconds != null && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-500/20 text-blue-300 text-xs">
                  Apnea: {formatApneaTime(dive.apnea_time_seconds)}
                </span>
              )}
              {dive.current_type && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-500/20 text-purple-300 text-xs">
                  {dive.current_type}
                </span>
              )}
            </div>

            {/* Likes */}
            <div className="flex items-center gap-4 pt-2 border-t border-cyan-400/10">
              <button
                onClick={onLike}
                className={`flex items-center gap-1.5 text-sm ${
                  dive.user_liked ? 'text-red-400' : 'text-cyan-300/70 hover:text-red-400'
                }`}
              >
                <Heart className={`w-5 h-5 ${dive.user_liked ? 'fill-current' : ''}`} />
                <span>{dive.likes_count} me gusta</span>
              </button>
            </div>
          </div>

          {/* Comments */}
          <div className="px-4 pb-4">
            <p className="text-cyan-200 text-sm font-medium mb-3">
              Comentarios ({comments.length})
            </p>
            {loadingComments ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
              </div>
            ) : comments.length === 0 ? (
              <p className="text-cyan-400/60 text-sm">Sin comentarios aún.</p>
            ) : (
              <div className="space-y-3">
                {comments.map((c) => (
                  <div key={c.id} className="flex gap-2">
                    <div className="h-8 w-8 rounded-full bg-cyan-500/30 flex-shrink-0 flex items-center justify-center overflow-hidden">
                      {c.user_profile?.avatar_url ? (
                        <img src={c.user_profile.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-cyan-200 text-xs font-medium">
                          {(c.user_profile?.display_name || 'U').slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 bg-white/5 rounded-xl px-3 py-2">
                      <div className="flex items-center justify-between">
                        <p className="text-white text-xs font-medium">
                          {c.user_profile?.display_name || 'Usuario'}
                        </p>
                        {userId === c.user_id && (
                          <button
                            onClick={() => handleDeleteComment(c.id)}
                            className="text-red-400/70 hover:text-red-400"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <p className="text-cyan-100 text-sm">{c.content}</p>
                      <p className="text-cyan-400/50 text-xs mt-1">{formatTimeAgo(c.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Comment input */}
        {userId && (
          <div className="p-4 border-t border-cyan-400/20 flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
              placeholder="Escribe un comentario..."
              className="flex-1 rounded-xl bg-white/10 border border-cyan-400/30 px-4 py-2.5 text-white placeholder-cyan-400/50 text-sm"
            />
            <button
              onClick={handleAddComment}
              disabled={submitting || !newComment.trim()}
              className="p-2.5 rounded-xl bg-amber-500/80 hover:bg-amber-500 disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              ) : (
                <Send className="w-5 h-5 text-white" />
              )}
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
