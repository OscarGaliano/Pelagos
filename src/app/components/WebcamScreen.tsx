import { ChevronLeft, ChevronRight, ExternalLink, MapPin, Video } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useState } from 'react';
import type { WebcamItem, WebcamProvider } from '../../data';
import { WEBCAM_PROVIDERS } from '../../data';

const ALL_CITIES = '';

interface WebcamScreenProps {
  onNavigate: (screen: string) => void;
}

export function WebcamScreen({ onNavigate }: WebcamScreenProps) {
  const [providerId, setProviderId] = useState<WebcamProvider['id']>('hispacams');
  const [selectedCity, setSelectedCity] = useState<string>(ALL_CITIES);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const provider = WEBCAM_PROVIDERS.find((p) => p.id === providerId) ?? WEBCAM_PROVIDERS[0];
  const items = provider.items;

  const cities = useMemo(() => {
    const set = new Set(items.map((i) => i.city));
    return [ALL_CITIES, ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [items]);

  const filteredItems = useMemo(() => {
    if (!selectedCity) return items;
    return items.filter((i) => i.city === selectedCity);
  }, [items, selectedCity]);

  const selected = selectedIndex !== null ? filteredItems[selectedIndex] : null;
  const total = filteredItems.length;

  const goPrev = () => {
    if (selectedIndex === null) return;
    setSelectedIndex(selectedIndex <= 0 ? total - 1 : selectedIndex - 1);
  };

  const goNext = () => {
    if (selectedIndex === null) return;
    setSelectedIndex(selectedIndex >= total - 1 ? 0 : selectedIndex + 1);
  };

  const openExternal = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const openProvider = providerId === 'hispacams' ? 'Hispacams' : providerId === 'skylinewebcams' ? 'Skylinewebcams' : 'LiveCamworld';

  const onProviderChange = (id: WebcamProvider['id']) => {
    setProviderId(id);
    setSelectedCity(ALL_CITIES);
    setSelectedIndex(null);
  };

  const onCityChange = (city: string) => {
    setSelectedCity(city);
    setSelectedIndex(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a1628] via-[#0c1f3a] to-[#0a1628]">
      {/* Header */}
      <div className="sticky top-0 z-30 backdrop-blur-xl bg-[#0a1628]/80 border-b border-cyan-400/20">
        <div className="px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <motion.button
              onClick={() => (selected !== null ? setSelectedIndex(null) : onNavigate('home'))}
              whileTap={{ scale: 0.9 }}
              className="p-2 rounded-full hover:bg-white/10 active:bg-white/15 flex-shrink-0"
            >
              <ChevronLeft className="w-6 h-6 text-cyan-400" />
            </motion.button>
            <div className="min-w-0">
              <h1 className="text-white text-xl sm:text-2xl truncate">Webcams</h1>
              <p className="text-cyan-300 text-xs sm:text-sm">
                {selected ? selected.title : `${total} playas · ${provider.name}`}
              </p>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {selected === null ? (
          /* Listado: selector de proveedor + grid de playas */
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-4 sm:px-6 py-4 pb-8"
          >
            {/* Tabs proveedor */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
              {WEBCAM_PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onProviderChange(p.id)}
                  className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    providerId === p.id
                      ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-400/40'
                      : 'bg-white/5 text-cyan-300/70 border border-cyan-400/20 hover:bg-white/10'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>

            {/* Selector por ciudad */}
            <div className="mb-4">
              <label htmlFor="webcam-city" className="block text-cyan-300/80 text-xs font-medium mb-2">
                Ciudad
              </label>
              <select
                id="webcam-city"
                value={selectedCity}
                onChange={(e) => onCityChange(e.target.value)}
                className="w-full sm:w-auto min-w-[180px] px-4 py-2.5 rounded-xl bg-white/5 border border-cyan-400/25 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/40"
              >
                <option value={ALL_CITIES}>Todas las ciudades</option>
                {cities.filter((c) => c !== ALL_CITIES).map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4 backdrop-blur-xl bg-gradient-to-br from-cyan-500/15 to-blue-600/15 rounded-2xl p-4 border border-cyan-400/25">
              <div className="flex items-start gap-3">
                <Video className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-white text-sm font-medium mb-1">En directo desde {provider.name}</p>
                  <p className="text-cyan-300/70 text-xs">
                    {provider.description}. Solo se emite desde la web oficial.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map((item, index) => (
                <BeachCard
                  key={`${provider.id}-${item.id}`}
                  item={item}
                  providerName={provider.name}
                  onSelect={() => setSelectedIndex(index)}
                  onOpenExternal={() => openExternal(item.url)}
                />
              ))}
            </div>
          </motion.div>
        ) : (
          /* Vista cámara: iframe + navegación */
          <motion.div
            key="player"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col h-[calc(100vh-4.5rem)] px-4 sm:px-6 py-4"
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="min-w-0 flex-1">
                <h2 className="text-white font-medium truncate">{selected.title}</h2>
                <div className="flex items-center gap-1.5 text-cyan-300/80 text-sm">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{selected.location}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <motion.button
                  onClick={goPrev}
                  whileTap={{ scale: 0.95 }}
                  className="p-2 rounded-full bg-white/10 text-cyan-400 hover:bg-cyan-500/20"
                  aria-label="Playa anterior"
                >
                  <ChevronLeft className="w-5 h-5" />
                </motion.button>
                <span className="text-cyan-300/80 text-sm tabular-nums min-w-[3ch] text-center">
                  {selectedIndex! + 1}/{total}
                </span>
                <motion.button
                  onClick={goNext}
                  whileTap={{ scale: 0.95 }}
                  className="p-2 rounded-full bg-white/10 text-cyan-400 hover:bg-cyan-500/20"
                  aria-label="Siguiente playa"
                >
                  <ChevronRight className="w-5 h-5" />
                </motion.button>
              </div>
            </div>

            <div className="flex-1 min-h-0 rounded-2xl overflow-hidden border border-cyan-400/20 bg-black/40">
              <iframe
                title={`Webcam ${selected.title} - ${openProvider}`}
                src={selected.url}
                className="w-full h-full min-h-[240px]"
                allow="fullscreen"
                referrerPolicy="no-referrer"
                sandbox="allow-scripts allow-same-origin allow-popups"
              />
            </div>

            <div className="flex gap-2 mt-3">
              <motion.button
                onClick={() => setSelectedIndex(null)}
                whileTap={{ scale: 0.98 }}
                className="flex-1 py-3 rounded-xl border border-cyan-400/30 bg-cyan-500/10 text-cyan-300 font-medium text-sm"
              >
                Volver al listado
              </motion.button>
              <motion.button
                onClick={() => openExternal(selected.url)}
                whileTap={{ scale: 0.98 }}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-cyan-400/30 bg-cyan-500/20 text-cyan-300 font-medium text-sm"
              >
                <ExternalLink className="w-4 h-4" />
                <span className="hidden sm:inline">Abrir en {openProvider}</span>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function BeachCard({
  item,
  providerName,
  onSelect,
  onOpenExternal,
}: {
  item: WebcamItem;
  providerName: string;
  onSelect: () => void;
  onOpenExternal: (e: React.MouseEvent) => void;
}) {
  const [imgError, setImgError] = useState(false);
  const showThumb = item.thumbnailUrl && !imgError;

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.98 }}
      className="backdrop-blur-xl bg-white/5 rounded-2xl overflow-hidden border border-cyan-400/20"
    >
      <button type="button" onClick={onSelect} className="w-full text-left block">
        <div className="relative h-36 sm:h-40 bg-gradient-to-br from-cyan-900/40 to-blue-900/40">
          {showThumb ? (
            <img
              src={item.thumbnailUrl}
              alt=""
              className="w-full h-full object-cover opacity-80"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Video className="w-12 h-12 text-cyan-400/50" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          <div className="absolute bottom-2 left-2 right-2">
            <h3 className="text-white font-medium text-sm sm:text-base line-clamp-2 drop-shadow-lg">
              {item.title}
            </h3>
          </div>
        </div>
        <div className="p-3 sm:p-4">
          <div className="flex items-center gap-2 text-cyan-300/80 text-xs sm:text-sm">
            <MapPin className="w-4 h-4 flex-shrink-0" />
            <span className="line-clamp-1">{item.location}</span>
          </div>
          <p className="mt-2 text-cyan-400 text-xs">Ver cámara en directo</p>
        </div>
      </button>
      <div className="px-3 sm:px-4 pb-3 sm:pb-4">
        <motion.button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenExternal(e);
          }}
          whileTap={{ scale: 0.95 }}
          className="w-full py-2 rounded-xl border border-cyan-400/25 text-cyan-400/90 text-xs font-medium flex items-center justify-center gap-2"
        >
          <ExternalLink className="w-4 h-4" />
          Abrir en {providerName}
        </motion.button>
      </div>
    </motion.article>
  );
}
