import { markStoriesAsSeen, type StoriesByUser } from '@/lib/api/sharedDives';
import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useState } from 'react';

interface StoryViewerProps {
  storiesByUser: StoriesByUser[];
  initialUserIndex?: number;
  onClose: () => void;
  onNavigate?: (screen: string, params?: Record<string, string>) => void;
}

export function StoryViewer({ storiesByUser, initialUserIndex = 0, onClose, onNavigate }: StoryViewerProps) {
  const [userIndex, setUserIndex] = useState(initialUserIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [marked, setMarked] = useState(false);

  const group = storiesByUser[userIndex];
  const stories = group?.stories ?? [];
  const current = stories[storyIndex];

  const markCurrentAsSeen = useCallback(() => {
    if (!current || marked) return;
    markStoriesAsSeen([current.id]);
    setMarked(true);
  }, [current?.id, marked]);

  const goNext = useCallback(() => {
    if (storyIndex < stories.length - 1) {
      setStoryIndex((i) => i + 1);
      setMarked(false);
    } else if (userIndex < storiesByUser.length - 1) {
      setUserIndex((i) => i + 1);
      setStoryIndex(0);
      setMarked(false);
    } else {
      onClose();
    }
  }, [storyIndex, stories.length, userIndex, storiesByUser.length, onClose]);

  const goPrev = useCallback(() => {
    if (storyIndex > 0) {
      setStoryIndex((i) => i - 1);
      setMarked(false);
    } else if (userIndex > 0) {
      const prevGroup = storiesByUser[userIndex - 1];
      setUserIndex((i) => i - 1);
      setStoryIndex(prevGroup?.stories?.length ? prevGroup.stories.length - 1 : 0);
      setMarked(false);
    } else {
      onClose();
    }
  }, [storyIndex, userIndex, storiesByUser]);

  useEffect(() => {
    if (current) markCurrentAsSeen();
  }, [current?.id, markCurrentAsSeen]);

  // Auto-avanzar después de 5 segundos (solo para imágenes)
  useEffect(() => {
    if (current && !current.video_url) {
      const t = setTimeout(goNext, 5000);
      return () => clearTimeout(t);
    }
  }, [current?.id, goNext]);

  const handleTap = (e: React.MouseEvent) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x > rect.width / 2) goNext();
    else goPrev();
  };

  if (!group || !current) {
    onClose();
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black flex flex-col"
    >
      {/* Barra de progreso */}
      <div className="absolute top-0 left-0 right-0 z-20 flex gap-0.5 px-2 pt-3">
        {stories.map((_, i) => (
          <div key={i} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-white"
              initial={{ width: i < storyIndex ? '100%' : '0%' }}
              animate={{ width: i < storyIndex ? '100%' : i === storyIndex ? '100%' : '0%' }}
              transition={{ duration: i === storyIndex ? 5 : 0, ease: 'linear' }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-3 pt-10 bg-gradient-to-b from-black/60 to-transparent">
        <button onClick={onClose} className="p-2 rounded-full hover:bg-white/20 text-white">
          <X className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white">
            {group.user_profile?.avatar_url ? (
              <img src={group.user_profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-cyan-500/50 flex items-center justify-center text-white text-xs font-bold">
                {(group.user_profile?.display_name || 'U').slice(0, 1)}
              </div>
            )}
          </div>
          <span className="text-white font-medium text-sm">{group.user_profile?.display_name || 'Usuario'}</span>
        </div>
        <div className="w-10" />
      </div>

      {/* Contenido */}
      <div
        className="flex-1 flex items-center justify-center cursor-pointer min-h-0"
        onClick={handleTap}
      >
        <AnimatePresence mode="wait">
          {current.video_url ? (
            <motion.video
              key={current.id}
              src={current.video_url}
              autoPlay
              playsInline
              muted
              loop={false}
              onEnded={goNext}
              className="max-h-full max-w-full object-contain"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
          ) : current.photo_urls?.length > 0 ? (
            <motion.img
              key={current.id}
              src={current.photo_urls[0]}
              alt=""
              className="max-h-full max-w-full object-contain"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
          ) : (
            <motion.div
              key={current.id}
              className="px-6 py-4 text-white text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <p className="text-lg">{current.description || 'Sin contenido'}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Descripción abajo */}
      {current.description && (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
          <p className="text-white text-sm">{current.description}</p>
        </div>
      )}

      {/* Botón ver perfil */}
      <div className="absolute bottom-6 left-4 right-4 flex justify-center">
        <button
          onClick={() => {
            onClose();
            onNavigate?.('community');
            try {
              sessionStorage.setItem('pelagos_view_profile_user_id', group.user_id);
              sessionStorage.setItem('community_open_pescasub', '1');
            } catch { /* ignore */ }
          }}
          className="px-4 py-2 rounded-full bg-white/20 text-white text-sm font-medium"
        >
          Ver perfil
        </button>
      </div>
    </motion.div>
  );
}
