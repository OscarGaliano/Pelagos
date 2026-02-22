/**
 * Condiciones y Mareas.
 *
 * Flujo: se cargan las zonas desde Postgres; el usuario elige una zona.
 * Luego se llama a las Edge Functions getZonaConditions y getZonaTides (todo pasa por Supabase;
 * el frontend no llama a APIs externas). Los datos se muestran en cards.
 */

import { MoonPhaseIcon } from '@/app/components/MoonPhaseIcon';
import { Input } from '@/app/components/ui/input';
import {
    addFavoriteZone,
    FRANJAS,
    getFavoriteZones,
    getForecastAt,
    getZonaConditions,
    getZonaForecast,
    getZonas,
    getZonaTides,
    removeFavoriteZone,
    setLastZonaId,
    weatherCodeLabel,
    windDirectionLabel,
    type MarineData,
    type TidesData,
    type WeatherData,
    type Zona,
} from '@/lib/api/conditions';
import { formatPeriodRange, getMoonPhase, getMoonPhaseLabel, getSolunarPeriods, type SolunarPeriod } from '@/lib/solunar';
import {
    ChevronDown,
    ChevronLeft,
    Cloud,
    Droplets,
    Loader2,
    Plus,
    Search,
    Star,
    TrendingDown,
    TrendingUp,
    Waves,
    Wind,
    X,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

interface WeatherScreenProps {
  onNavigate: (screen: string) => void;
}

/** Formato de hora para mareas: HH:mm (24h) en hora local. Nunca muestra "Invalid Date". */
function formatTideTime(iso: string | null | undefined): string {
  if (iso == null || String(iso).trim() === '') return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      const s = String(iso);
      const match = s.match(/T(\d{1,2})[.:]?\d*:(\d{2})/) || s.match(/(\d{1,2}):(\d{2})/);
      return match ? `${String(parseInt(match[1], 10)).padStart(2, '0')}:${match[2]}` : '—';
    }
    return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return '—';
  }
}

/** Alias por compatibilidad (misma función que formatTideTime) */
const formatTime = formatTideTime;

const DAY_LABELS = ['Hoy', 'Mañana', '+2', '+3', '+4', '+5', '+6'] as const;

/** Hora ISO a HH:mm para tablas por horas */
function formatHourLabel(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      const m = String(iso).match(/T(\d{1,2})[.:]?\d*:(\d{2})/);
      return m ? `${String(parseInt(m[1], 10)).padStart(2, '0')}:${m[2]}` : '—';
    }
    return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return '—';
  }
}

export function WeatherScreen({ onNavigate }: WeatherScreenProps) {
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [zonaId, setZonaId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [conditions, setConditions] = useState<{
    weather: WeatherData;
    marine: MarineData;
    forecast?: import('@/lib/api/conditions').ForecastData;
  } | null>(null);
  const [tides, setTides] = useState<TidesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dayIndex, setDayIndex] = useState(0);
  const [franjaId, setFranjaId] = useState<string>(FRANJAS[1].id);
  const [favoriteZones, setFavoriteZones] = useState<Array<{ id: string; nombre: string }>>(() => getFavoriteZones());
  const [solunarPeriods, setSolunarPeriods] = useState<SolunarPeriod[]>([]);

  const currentZona = zonas.find((z) => z.id === zonaId);
  const selectedDate = new Date();
  selectedDate.setDate(selectedDate.getDate() + dayIndex);
  const selectedDateStr = selectedDate.toISOString().slice(0, 10);
  const isFavorite = currentZona && favoriteZones.some((f) => f.id === currentZona.id);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const queryLower = searchQuery.trim().toLowerCase();
  const suggestions = queryLower.length >= 1
    ? zonas.filter((z) => z.nombre.toLowerCase().includes(queryLower)).slice(0, 12)
    : [];
  const franja = FRANJAS.find((f) => f.id === franjaId) ?? FRANJAS[1];
  const displayData = conditions?.forecast
    ? getForecastAt(conditions.forecast, dayIndex, franja.hourCenter)
    : null;
  const weather = displayData?.weather ?? conditions?.weather;
  const marine = displayData?.marine ?? conditions?.marine;

  // Cargar zonas al montar
  useEffect(() => {
    getZonas()
      .then((list) => {
        setZonas(list);
        if (list.length > 0) {
          const firstId = list[0].id != null ? String(list[0].id).trim() : '';
          if (!zonaId) {
            if (firstId) {
              setZonaId(firstId);
              setSearchQuery(list[0].nombre ?? '');
            }
          } else {
            const z = list.find((x) => x.id === zonaId);
            if (z) setSearchQuery(z.nombre ?? '');
          }
        }
      })
      .catch((e) => setError(e?.message ?? 'Error al cargar zonas'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!currentZona) {
      setSolunarPeriods([]);
      return;
    }
    try {
      setSolunarPeriods(getSolunarPeriods(selectedDateStr, currentZona.lat, currentZona.lon));
    } catch {
      setSolunarPeriods([]);
    }
  }, [selectedDateStr, currentZona?.id, currentZona?.lat, currentZona?.lon]);

  // Cuando cambia la zona: condiciones, mareas y forecast (por separado para que día/franja funcionen)
  useEffect(() => {
    const id = (zonaId ?? '').trim();
    if (!id) return;
    setError(null);
    setLoading(true);
    Promise.all([
      getZonaConditions(id),
      getZonaTides(id),
      getZonaForecast(id).catch(() => ({ forecast: undefined })),
    ])
      .then(([cond, tidesRes, forecastRes]) => {
        setConditions({
          weather: cond.weather,
          marine: cond.marine,
          forecast: forecastRes.forecast ?? cond.forecast,
        });
        setTides(tidesRes.tides);
      })
      .catch((e) => setError(e?.message ?? 'Error al cargar condiciones'))
      .finally(() => setLoading(false));
  }, [zonaId]);

  const onSelectZona = (z: Zona) => {
    setZonaId(z.id);
    setSearchQuery(z.nombre);
    setShowSuggestions(false);
    setLastZonaId(z.id);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setShowSuggestions(true);
    searchInputRef.current?.focus();
  };

  const toggleFavorite = () => {
    if (!currentZona) return;
    if (isFavorite) {
      setFavoriteZones(removeFavoriteZone(currentZona.id));
    } else {
      setFavoriteZones(addFavoriteZone(currentZona));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a1628] via-[#0c1f3a] to-[#0a1628]">
      <div className="sticky top-0 z-30 backdrop-blur-xl bg-[#0a1628]/80 border-b border-cyan-400/20">
        <div className="px-6 py-4 flex items-center gap-4">
          <motion.button
            onClick={() => onNavigate('home')}
            whileTap={{ scale: 0.9 }}
            className="p-2 rounded-full hover:bg-white/10 active:bg-white/15"
          >
            <ChevronLeft className="w-6 h-6 text-cyan-400" />
          </motion.button>
          <div className="flex-1 min-w-0">
            <h1 className="text-white text-2xl">Condiciones y Mareas</h1>
            <p className="text-cyan-300 text-sm truncate">{currentZona?.nombre ?? 'Selecciona zona'}</p>
          </div>
        </div>
      </div>

      <div className="px-6 pt-4 pb-8 space-y-6">
        {/* Zonas frecuentes */}
        {favoriteZones.length > 0 && (
          <div>
            <label className="text-cyan-200/80 text-sm block mb-2">Zonas frecuentes</label>
            <div className="flex flex-wrap gap-2">
              {favoriteZones.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    const z = zonas.find((zona) => zona.id === f.id) ?? { id: f.id, nombre: f.nombre, lat: 0, lon: 0 };
                    onSelectZona(z);
                  }}
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                    zonaId === f.id
                      ? 'bg-cyan-500/30 text-white border border-cyan-400'
                      : 'bg-white/10 text-cyan-200 border border-cyan-400/20 hover:bg-white/15'
                  }`}
                >
                  {f.nombre.length > 20 ? f.nombre.slice(0, 18) + '…' : f.nombre}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Buscador de zona con coincidencias */}
        <div className="relative">
          <label className="text-cyan-200/80 text-sm block mb-2">Zona</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400/70 pointer-events-none" />
            <Input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 180)}
              placeholder="Buscar zona (ej. Cabo, Mallorca, Canarias...)"
              className="pl-9 pr-10 bg-white/10 border-cyan-400/30 text-white placeholder:text-cyan-300/50 rounded-xl"
            />
            {searchQuery.length > 0 && (
              <button
                type="button"
                onClick={clearSearch}
                onMouseDown={(e) => e.preventDefault()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-white/20 text-cyan-300"
                aria-label="Borrar búsqueda"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            {showSuggestions && suggestions.length > 0 && (
              <ul className="absolute z-50 top-full left-0 right-0 mt-1 max-h-56 overflow-auto rounded-xl border border-cyan-400/30 bg-[#0c1f3a] shadow-xl">
                {suggestions.map((z) => (
                  <li key={z.id}>
                    <button
                      type="button"
                      onMouseDown={() => onSelectZona(z)}
                      className="w-full px-4 py-3 text-left text-white hover:bg-cyan-500/20 flex items-center justify-between"
                    >
                      <span>{z.nombre}</span>
                      {z.id === zonaId && <ChevronDown className="w-4 h-4 text-cyan-400 rotate-180" />}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {showSuggestions && queryLower.length >= 1 && suggestions.length === 0 && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 px-4 py-3 rounded-xl border border-cyan-400/30 bg-[#0c1f3a] text-cyan-300/70 text-sm">
                No hay coincidencias para &quot;{searchQuery}&quot;
              </div>
            )}
          </div>
          {currentZona && (
            <button
              type="button"
              onClick={toggleFavorite}
              className="mt-2 flex items-center gap-2 text-sm text-cyan-300 hover:text-cyan-200"
            >
              {isFavorite ? (
                <>
                  <Star className="w-4 h-4 fill-cyan-400 text-cyan-400" />
                  Quitar de frecuentes
                </>
              ) : (
                <>
                  <Star className="w-4 h-4" />
                  Guardar como zona frecuente
                </>
              )}
            </button>
          )}
        </div>

        {/* Día (próximos 7 días) */}
        <div>
          <label className="text-cyan-200/80 text-sm block mb-2">Día</label>
          <div className="flex flex-wrap gap-2">
            {DAY_LABELS.map((label, i) => (
              <button
                key={label}
                type="button"
                onClick={() => setDayIndex(i)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  dayIndex === i
                    ? 'bg-cyan-500/30 text-white border border-cyan-400'
                    : 'bg-white/10 text-cyan-200 border border-cyan-400/20 hover:bg-white/15'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Franja horaria */}
        <div>
          <label className="text-cyan-200/80 text-sm block mb-2">Franja horaria</label>
          <div className="flex flex-wrap gap-2">
            {FRANJAS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFranjaId(f.id)}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                  franjaId === f.id
                    ? 'bg-cyan-500/30 text-white border border-cyan-400'
                    : 'bg-white/10 text-cyan-200 border border-cyan-400/20 hover:bg-white/15'
                }`}
              >
                {f.label} ({f.start}-{f.end}h)
              </button>
            ))}
          </div>
        </div>

        {conditions && (
          <p className="text-cyan-300/80 text-sm">
            {conditions.forecast && displayData
              ? `Mostrando: ${DAY_LABELS[dayIndex]}, ${franja.label} (${franja.start}-${franja.end}h)`
              : 'Mostrando: condiciones actuales'}
          </p>
        )}

        {error && (
          <div className="backdrop-blur-xl bg-amber-500/10 border border-amber-400/30 rounded-2xl p-4">
            <p className="text-amber-200 text-sm">{error}</p>
          </div>
        )}

        {loading && !conditions ? (
          <div className="flex flex-col items-center justify-center py-12 text-cyan-300/80">
            <Loader2 className="w-10 h-10 animate-spin mb-3" />
            <p className="text-sm">Cargando condiciones...</p>
          </div>
        ) : conditions ? (
          <>
            {/* Tiempo general */}
            <div className="backdrop-blur-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 rounded-3xl p-6 border border-cyan-400/30">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-cyan-300 text-sm mb-1">Temperatura</p>
                  <h2 className="text-white text-4xl font-light">
                    {weather?.temperature_2m != null ? `${Math.round(weather.temperature_2m)}°C` : '—'}
                  </h2>
                  <p className="text-cyan-300/70 text-sm mt-1">
                    {weatherCodeLabel(weather?.weather_code)}
                  </p>
                </div>
                <Cloud className="w-10 h-10 text-cyan-400/80" />
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-cyan-400" />
                  <span className="text-cyan-300/70">Humedad</span>
                  <span className="text-white">{weather?.relative_humidity_2m != null ? `${weather.relative_humidity_2m}%` : '—'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-cyan-400" />
                  <span className="text-cyan-300/70">Nubosidad</span>
                  <span className="text-white">{weather?.cloud_cover != null ? `${weather.cloud_cover}%` : '—'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-cyan-400" />
                  <span className="text-cyan-300/70">Precipitación</span>
                  <span className="text-white">{weather?.precipitation != null ? `${weather.precipitation} mm` : '—'}</span>
                </div>
              </div>
            </div>

            {/* Viento */}
            <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-5 border border-cyan-400/20">
              <h3 className="text-white text-lg mb-3 flex items-center gap-2">
                <Wind className="w-5 h-5 text-cyan-400" />
                Viento
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-cyan-300/70 text-xs">Velocidad</p>
                  <p className="text-white font-medium">
                    {weather?.wind_speed_10m != null ? `${weather.wind_speed_10m} km/h` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-cyan-300/70 text-xs">Dirección</p>
                  <p className="text-white font-medium">
                    {windDirectionLabel(weather?.wind_direction_10m)}
                  </p>
                </div>
              </div>
            </div>

            {/* Condiciones del mar */}
            <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-5 border border-cyan-400/20">
              <h3 className="text-white text-lg mb-3 flex items-center gap-2">
                <Waves className="w-5 h-5 text-cyan-400" />
                Condiciones del mar
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-cyan-300/70 text-xs">Altura de ola</p>
                  <p className="text-white font-medium">
                    {marine?.wave_height != null ? `${marine.wave_height.toFixed(1)} m` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-cyan-300/70 text-xs">Dirección de ola</p>
                  <p className="text-white font-medium">
                    {marine?.wave_direction != null ? `${Math.round(marine.wave_direction)}°` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-cyan-300/70 text-xs">Período</p>
                  <p className="text-white font-medium">
                    {marine?.wave_period != null ? `${marine.wave_period} s` : '—'}
                  </p>
                </div>
              </div>
            </div>

            {/* Evolución del viento por horas (día seleccionado) */}
            {conditions?.forecast?.weather?.hourly && (() => {
              const h = conditions.forecast.weather.hourly;
              const start = dayIndex * 24;
              const hours = Array.from({ length: 24 }, (_, i) => start + i).filter((i) => i < (h.time?.length ?? 0));
              if (hours.length === 0) return null;
              return (
                <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-5 border border-cyan-400/20">
                  <h3 className="text-white text-lg mb-3 flex items-center gap-2">
                    <Wind className="w-5 h-5 text-cyan-400" />
                    Evolución del viento por horas — {DAY_LABELS[dayIndex]}
                  </h3>
                  <div className="overflow-x-auto -mx-1 max-h-64 overflow-y-auto">
                    <table className="w-full text-sm min-w-[200px]">
                      <thead className="sticky top-0 bg-[#0c1f3a]/95 z-10">
                        <tr className="text-cyan-300/80 border-b border-cyan-400/30">
                          <th className="text-left py-2 pr-3 font-medium">Hora</th>
                          <th className="text-right py-2 pr-3 font-medium">km/h</th>
                          <th className="text-left py-2 font-medium">Dirección</th>
                        </tr>
                      </thead>
                      <tbody>
                        {hours.map((idx) => (
                          <tr key={idx} className="border-b border-cyan-400/10 last:border-0">
                            <td className="py-2 pr-3 text-cyan-200 tabular-nums">{formatHourLabel(h.time[idx])}</td>
                            <td className="py-2 pr-3 text-right text-white tabular-nums">
                              {h.wind_speed_10m?.[idx] != null ? Math.round(h.wind_speed_10m[idx]) : '—'}
                            </td>
                            <td className="py-2 text-cyan-300">{windDirectionLabel(h.wind_direction_10m?.[idx])}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            {/* Evolución del mar por horas (día seleccionado) */}
            {conditions?.forecast?.marine?.hourly && (() => {
              const m = conditions.forecast.marine.hourly;
              const start = dayIndex * 24;
              const hours = Array.from({ length: 24 }, (_, i) => start + i).filter((i) => i < (m.time?.length ?? 0));
              if (hours.length === 0) return null;
              return (
                <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-5 border border-cyan-400/20">
                  <h3 className="text-white text-lg mb-3 flex items-center gap-2">
                    <Waves className="w-5 h-5 text-cyan-400" />
                    Evolución del mar por horas — {DAY_LABELS[dayIndex]}
                  </h3>
                  <div className="overflow-x-auto -mx-1 max-h-64 overflow-y-auto">
                    <table className="w-full text-sm min-w-[240px]">
                      <thead className="sticky top-0 bg-[#0c1f3a]/95 z-10">
                        <tr className="text-cyan-300/80 border-b border-cyan-400/30">
                          <th className="text-left py-2 pr-3 font-medium">Hora</th>
                          <th className="text-right py-2 pr-3 font-medium">Ola (m)</th>
                          <th className="text-left py-2 pr-3 font-medium">Dir.</th>
                          <th className="text-right py-2 font-medium">Per. (s)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {hours.map((idx) => (
                          <tr key={idx} className="border-b border-cyan-400/10 last:border-0">
                            <td className="py-2 pr-3 text-cyan-200 tabular-nums">{formatHourLabel(m.time[idx])}</td>
                            <td className="py-2 pr-3 text-right text-white tabular-nums">
                              {m.wave_height?.[idx] != null ? m.wave_height[idx].toFixed(1) : '—'}
                            </td>
                            <td className="py-2 pr-3 text-cyan-300 tabular-nums">
                              {m.wave_direction?.[idx] != null ? `${Math.round(m.wave_direction[idx])}°` : '—'}
                            </td>
                            <td className="py-2 text-right text-cyan-300 tabular-nums">
                              {m.wave_period?.[idx] != null ? m.wave_period[idx].toFixed(0) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            {/* Mareas */}
            {tides && (
              <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-5 border border-cyan-400/20">
                <h3 className="text-white text-lg mb-3">Tabla de Mareas</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-cyan-300/80 border-b border-cyan-400/30">
                        <th className="text-left py-2 pr-4 font-medium">Tipo</th>
                        <th className="text-left py-2 pr-4 font-medium">Hora</th>
                        <th className="text-right py-2 font-medium">Altura</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tides.events?.map((ev, i) => (
                        <tr key={i} className="border-b border-cyan-400/10 last:border-0">
                          <td className="py-3 pr-4 flex items-center gap-2">
                            {ev.type === 'high' ? (
                              <TrendingUp className="w-4 h-4 text-cyan-400 shrink-0" />
                            ) : (
                              <TrendingDown className="w-4 h-4 text-blue-400 shrink-0" />
                            )}
                            <span className="text-white">{ev.type === 'high' ? 'Pleamar' : 'Bajamar'}</span>
                          </td>
                          <td className="py-3 pr-4 text-cyan-200 font-medium tabular-nums">
                            {formatTideTime(ev.time)}
                          </td>
                          <td className="py-3 text-right text-cyan-300 font-medium">
                            {ev.height_m.toFixed(1)} m
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {tides.coefficient != null && (
                  <p className="text-cyan-300/70 text-xs text-center mt-4 pt-4 border-t border-cyan-400/20">
                    Coeficiente de marea (orientativo): {tides.coefficient}
                  </p>
                )}
                <p className="text-amber-200/80 text-xs text-center mt-3 pt-3 border-t border-cyan-400/20">
                  Datos orientativos. Coeficientes y horas oficiales:{' '}
                  <a
                    href="https://www.tablademareas.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-400 underline hover:text-cyan-300"
                  >
                    tablademareas.com
                  </a>
                  . Puertos del Estado para navegación.
                </p>
              </div>
            )}

            {/* Tabla solunar */}
            {solunarPeriods.length > 0 && (
              <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-5 border border-cyan-400/20">
                <h3 className="text-white text-lg mb-3">Tabla solunar</h3>
                <div className="flex items-center gap-4 mb-3">
                  <div className="shrink-0 rounded-full bg-[#0c1f3a]/80 p-1 border border-cyan-400/20">
                    <MoonPhaseIcon phase={getMoonPhase(selectedDateStr)} size={64} className="block" />
                  </div>
                  <div>
                    <p className="text-cyan-200 font-medium">{getMoonPhaseLabel(selectedDateStr)}</p>
                    <p className="text-cyan-300/70 text-xs">Periodos de mayor actividad — {selectedDateStr}</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-cyan-300/80 border-b border-cyan-400/30">
                        <th className="text-left py-2 pr-4 font-medium">Tipo</th>
                        <th className="text-left py-2 font-medium">Franja</th>
                      </tr>
                    </thead>
                    <tbody>
                      {solunarPeriods.map((p, i) => (
                        <tr key={i} className="border-b border-cyan-400/10 last:border-0">
                          <td className="py-3 pr-4 text-white">{p.label}</td>
                          <td className="py-3 text-cyan-200 font-medium tabular-nums">{formatPeriodRange(p.start, p.end)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        ) : null}

        <motion.button
          onClick={() => onNavigate('quicklog')}
          whileTap={{ scale: 0.98 }}
          className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white py-5 rounded-2xl shadow-lg shadow-cyan-500/50 flex items-center justify-center gap-2 text-lg"
        >
          <Plus className="w-6 h-6" />
          Registrar Jornada
        </motion.button>
      </div>
    </div>
  );
}
