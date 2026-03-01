/**
 * Sección de Coincidencias entre Capturas
 * 
 * Muestra predicciones basadas en la similitud entre las condiciones
 * actuales y jornadas históricas donde se realizaron capturas.
 */

import { useCatchMatches, type TodayConditions } from '@/lib/api/catches-matches';
import { getLastZonaId, getZonaConditions, getZonas, type Zona } from '@/lib/api/conditions';
import { supabase } from '@/lib/supabase';
import {
    BarChart2,
    ChevronDown,
    ChevronUp,
    Fish,
    Loader2,
    MapPin,
    RefreshCw,
    Search,
    Sparkles,
    Target,
    X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface CatchMatchesSectionProps {
  /** Si se proporciona, usa estas condiciones en lugar de cargarlas */
  conditions?: TodayConditions | null;
  /** Callback cuando se quiere ver detalle de una jornada */
  onViewDive?: (diveId: string) => void;
}

export function CatchMatchesSection({ conditions: propConditions, onViewDive }: CatchMatchesSectionProps) {
  const [expanded, setExpanded] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [selectedZonaId, setSelectedZonaId] = useState<string | null>(null);
  const [loadingConditions, setLoadingConditions] = useState(false);
  const [localConditions, setLocalConditions] = useState<TodayConditions | null>(null);
  
  // Buscador de zonas
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Usar condiciones de prop si están disponibles, sino las locales
  const conditions = propConditions ?? localConditions;
  
  // Filtrar zonas por búsqueda
  const filteredZonas = useMemo(() => {
    if (!searchQuery.trim()) return zonas;
    const q = searchQuery.toLowerCase();
    return zonas.filter(z => z.nombre.toLowerCase().includes(q));
  }, [zonas, searchQuery]);
  
  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Obtener usuario
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null);
    });
  }, []);

  // Cargar zonas disponibles
  useEffect(() => {
    getZonas().then(setZonas).catch(console.error);
    // Restaurar última zona usada
    const lastZona = getLastZonaId();
    if (lastZona) setSelectedZonaId(lastZona);
  }, []);

  // Cargar condiciones cuando cambia la zona (solo si no hay propConditions)
  const loadConditions = useCallback(async () => {
    if (!selectedZonaId || propConditions) return;
    
    setLoadingConditions(true);
    try {
      const data = await getZonaConditions(selectedZonaId);
      const zona = zonas.find(z => z.id === selectedZonaId);
      
      const today = new Date().toISOString().slice(0, 10);
      setLocalConditions({
        date: today,
        locationId: selectedZonaId,
        locationName: zona?.nombre ?? null,
        tideCoefficient: null, // Se obtendría de tides
        windSpeed: data.weather.wind_speed_10m ?? null,
        windDirection: data.weather.wind_direction_10m ?? null,
        waveHeight: data.marine.wave_height ?? null,
      });
    } catch (err) {
      console.error('[CatchMatches] Error cargando condiciones:', err);
    } finally {
      setLoadingConditions(false);
    }
  }, [selectedZonaId, zonas, propConditions]);

  useEffect(() => {
    if (selectedZonaId && !propConditions) {
      loadConditions();
    }
  }, [selectedZonaId, loadConditions, propConditions]);

  // Hook de coincidencias
  const { matches, loading, error, refresh } = useCatchMatches({
    userId,
    conditions,
    filterByLocation: false, // Comparar con todas las jornadas
    enabled: !!conditions && !!userId,
  });

  const hasMatches = matches.length > 0;
  const selectedZona = zonas.find(z => z.id === selectedZonaId);

  return (
    <div className="backdrop-blur-xl rounded-2xl border-2 border-amber-400/30 overflow-hidden bg-gradient-to-br from-amber-500/10 to-orange-500/10">
      {/* Cabecera colapsable */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <span className="text-white font-medium">Coincidencias entre capturas</span>
          {hasMatches && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-200 text-xs">
              {matches.length}
            </span>
          )}
        </div>
        <ChevronUp
          className={`w-5 h-5 text-amber-400 transition-transform shrink-0 ${expanded ? '' : 'rotate-180'}`}
        />
      </button>

      {/* Contenido expandido */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-amber-400/20 px-4 py-4 space-y-4">
              {/* Descripción */}
              <p className="text-amber-200/80 text-xs">
                Compara las condiciones de hoy con tus jornadas pasadas para predecir posibles capturas
              </p>

              {/* Buscador de zona (solo si no hay propConditions) */}
              {!propConditions && (
                <div className="space-y-2">
                  {/* Zona seleccionada */}
                  {selectedZona && (
                    <div className="flex items-center justify-between gap-2 bg-amber-500/20 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                        <span className="text-amber-200 text-sm truncate">{selectedZona.nombre}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={refresh}
                          disabled={loading || loadingConditions}
                          className="p-1.5 rounded-lg bg-amber-500/30 text-amber-400 hover:bg-amber-500/40 disabled:opacity-50"
                        >
                          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedZonaId(null);
                            setLocalConditions(null);
                            setSearchQuery('');
                          }}
                          className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Buscador */}
                  <div ref={searchRef} className="relative">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400/60" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setShowDropdown(true);
                        }}
                        onFocus={() => setShowDropdown(true)}
                        placeholder={selectedZona ? "Cambiar zona..." : "Buscar zona..."}
                        className="w-full bg-white/10 border border-amber-400/30 rounded-lg pl-9 pr-3 py-2 text-white text-sm placeholder:text-amber-300/40 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                      />
                    </div>
                    
                    {/* Dropdown de resultados */}
                    <AnimatePresence>
                      {showDropdown && (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="absolute z-20 left-0 right-0 mt-1 bg-[#0c1f3a] border border-amber-400/30 rounded-lg shadow-xl max-h-48 overflow-y-auto"
                        >
                          {filteredZonas.length === 0 ? (
                            <div className="px-3 py-2 text-amber-200/50 text-sm">
                              No se encontraron zonas
                            </div>
                          ) : (
                            filteredZonas.map(z => (
                              <button
                                key={z.id}
                                type="button"
                                onClick={() => {
                                  setSelectedZonaId(z.id);
                                  setSearchQuery('');
                                  setShowDropdown(false);
                                }}
                                className={`w-full text-left px-3 py-2 text-sm hover:bg-amber-500/20 transition-colors flex items-center gap-2 ${
                                  z.id === selectedZonaId ? 'bg-amber-500/30 text-amber-200' : 'text-white'
                                }`}
                              >
                                <MapPin className="w-3.5 h-3.5 text-amber-400/60 shrink-0" />
                                <span className="truncate">{z.nombre}</span>
                              </button>
                            ))
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              )}

              {/* Estado de carga */}
              {(loading || loadingConditions) && (
                <div className="flex items-center justify-center py-6 gap-2">
                  <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
                  <span className="text-amber-200/70 text-sm">Buscando coincidencias...</span>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="bg-red-500/20 border border-red-400/30 rounded-lg px-3 py-2 text-red-200 text-sm">
                  {error}
                </div>
              )}

              {/* Sin zona seleccionada */}
              {!conditions && !loading && !loadingConditions && (
                <div className="text-center py-6">
                  <BarChart2 className="w-10 h-10 text-amber-400/40 mx-auto mb-2" />
                  <p className="text-amber-200/60 text-sm">
                    Selecciona una zona para ver coincidencias
                  </p>
                </div>
              )}

              {/* Sin coincidencias */}
              {conditions && !loading && !loadingConditions && !hasMatches && (
                <div className="text-center py-6">
                  <Target className="w-10 h-10 text-amber-400/40 mx-auto mb-2" />
                  <p className="text-amber-200/60 text-sm">
                    No hay coincidencias con condiciones similares
                  </p>
                  <p className="text-amber-200/40 text-xs mt-1">
                    Registra más jornadas para mejorar las predicciones
                  </p>
                </div>
              )}

              {/* Lista de coincidencias */}
              {hasMatches && !loading && (
                <div className="space-y-3">
                  {matches.map((match, idx) => (
                    <motion.div
                      key={match.diveId}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="rounded-xl bg-gradient-to-r from-amber-500/15 to-orange-500/10 border border-amber-400/25 overflow-hidden"
                    >
                      {/* Cabecera con score */}
                      <div className="px-3 py-2 flex items-center justify-between gap-2 border-b border-amber-400/15">
                        <div className="flex items-center gap-2">
                          <div 
                            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                              match.similarityScore >= 90 
                                ? 'bg-green-500/30 text-green-300' 
                                : match.similarityScore >= 80 
                                  ? 'bg-amber-500/30 text-amber-300'
                                  : 'bg-orange-500/30 text-orange-300'
                            }`}
                          >
                            {Math.round(match.similarityScore)}%
                          </div>
                          <div>
                            <p className="text-white text-sm font-medium">
                              {new Date(match.date + 'T12:00:00').toLocaleDateString('es-ES', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </p>
                            {match.locationName && (
                              <p className="text-amber-300/70 text-xs">{match.locationName}</p>
                            )}
                          </div>
                        </div>
                        {onViewDive && (
                          <button
                            type="button"
                            onClick={() => onViewDive(match.diveId)}
                            className="text-amber-400 text-xs hover:underline"
                          >
                            Ver jornada
                          </button>
                        )}
                      </div>

                      {/* Resumen y especies */}
                      <div className="px-3 py-2.5">
                        <p className="text-amber-100/90 text-sm mb-2">{match.summary}</p>
                        
                        {match.species.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {match.species.map(sp => (
                              <span
                                key={sp}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-xs"
                              >
                                <Fish className="w-3 h-3" />
                                {sp}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Desglose de similitud (colapsable) */}
                      <BreakdownAccordion breakdown={match.breakdown} />
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Condiciones actuales (mini resumen) */}
              {conditions && selectedZona && (
                <div className="mt-3 pt-3 border-t border-amber-400/20">
                  <p className="text-amber-200/50 text-xs mb-1">Condiciones actuales en {selectedZona.nombre}:</p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {conditions.windSpeed != null && (
                      <span className="px-2 py-1 rounded bg-white/10 text-amber-200/80">
                        Viento: {conditions.windSpeed} km/h
                      </span>
                    )}
                    {conditions.waveHeight != null && (
                      <span className="px-2 py-1 rounded bg-white/10 text-amber-200/80">
                        Olas: {conditions.waveHeight}m
                      </span>
                    )}
                    {conditions.tideCoefficient != null && (
                      <span className="px-2 py-1 rounded bg-white/10 text-amber-200/80">
                        Coef: {conditions.tideCoefficient}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// =============================================================================
// Subcomponente: Acordeón de desglose
// =============================================================================

function BreakdownAccordion({ breakdown }: { breakdown: ReturnType<typeof import('@/lib/catches-similarity').calculateSimilarity>['breakdown'] }) {
  const [open, setOpen] = useState(false);

  const items = [
    { key: 'moonPhase', label: 'Fase lunar', ...breakdown.moonPhase },
    { key: 'tideCoefficient', label: 'Coef. marea', ...breakdown.tideCoefficient },
    { key: 'windSpeed', label: 'Vel. viento', ...breakdown.windSpeed },
    { key: 'windDirection', label: 'Dir. viento', ...breakdown.windDirection },
    { key: 'waveHeight', label: 'Oleaje', ...breakdown.waveHeight },
    { key: 'tideType', label: 'Tipo marea', ...breakdown.tideType },
  ].filter(item => item.weight > 0);

  return (
    <div className="border-t border-amber-400/15">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-3 py-1.5 flex items-center justify-between text-amber-300/60 text-xs hover:text-amber-300/80"
      >
        <span>Ver desglose de similitud</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-2.5 space-y-1.5">
              {items.map(item => (
                <div key={item.key} className="flex items-center gap-2">
                  <div className="w-20 text-amber-200/50 text-xs">{item.label}</div>
                  <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        item.score >= 0.8 ? 'bg-green-400' : item.score >= 0.5 ? 'bg-amber-400' : 'bg-orange-400'
                      }`}
                      style={{ width: `${item.score * 100}%` }}
                    />
                  </div>
                  <div className="w-16 text-right text-amber-200/50 text-xs truncate" title={item.detail}>
                    {item.detail}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default CatchMatchesSection;
