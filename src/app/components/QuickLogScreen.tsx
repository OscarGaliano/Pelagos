import { MoonPhaseIcon } from '@/app/components/MoonPhaseIcon';
import { Input } from '@/app/components/ui/input';
import {
    addFavoriteZone,
    getFavoriteZones,
    getForecastAt,
    getLastZonaId,
    getZonaForecast,
    getZonaHistoricalConditions,
    getZonas,
    getZonaTides,
    removeFavoriteZone,
    setLastZonaId,
    windDirectionLabel,
    type TideEvent,
    type Zona,
} from '@/lib/api/conditions';
import { addCatch, createDive } from '@/lib/api/dives';
import { getDiveSpots } from '@/lib/api/diveSpots';
import { formatPeriodRange, getMoonPhase, getMoonPhaseLabel, getSolunarPeriods, type SolunarPeriod } from '@/lib/solunar';
import { supabase } from '@/lib/supabase';
import type { DiveSpot } from '@/lib/types';
import { Calendar, ChevronDown, ChevronLeft, Clock, Fish, MapPin, Pencil, Plus, RotateCcw, Save, Search, Star, Trash2, Waves, Wind, X } from 'lucide-react';
import { motion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';

const ESPECIES_FIJAS = ['Dorada', 'Lubina', 'Sargo', 'Mero', 'Dentón', 'Limón'] as const;

interface OtraEspecie {
  especie: string;
  cantidad: number;
}

function parseTimeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

/** Devuelve texto tipo "A 1 h de la pleamar" o "Hace 30 min de la bajamar" según la hora central de la jornada. */
function getTidePeriodLabel(date: string, timeFrom: string, timeTo: string, events: TideEvent[]): string | null {
  if (!events?.length) return null;
  const fromM = parseTimeToMinutes(timeFrom);
  const toM = parseTimeToMinutes(timeTo);
  const midM = (fromM + toM) / 2;
  const h = Math.floor(midM / 60) % 24;
  const m = Math.round(midM % 60);
  const timeMidStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  const sessionMid = new Date(`${date}T${timeMidStr}:00`).getTime();
  if (Number.isNaN(sessionMid)) return null;
  let nearest: { event: TideEvent; diffMs: number } | null = null;
  for (const ev of events) {
    const evTime = new Date(ev.time).getTime();
    if (Number.isNaN(evTime)) continue;
    const diffMs = evTime - sessionMid;
    if (nearest == null || Math.abs(diffMs) < Math.abs(nearest.diffMs)) {
      nearest = { event: ev, diffMs };
    }
  }
  if (nearest == null) return null;
  const absMin = Math.round(Math.abs(nearest.diffMs) / (60 * 1000));
  const label = nearest.event.type === 'high' ? 'pleamar' : 'bajamar';
  const part = absMin < 60 ? `${absMin} min` : absMin % 60 === 0 ? `${Math.floor(absMin / 60)} h` : `${Math.floor(absMin / 60)} h ${absMin % 60} min`;
  if (nearest.diffMs > 0) return `A ${part} de la ${label}`;
  return `Hace ${part} de la ${label}`;
}

interface QuickLogScreenProps {
  onNavigate: (screen: string) => void;
}

export function QuickLogScreen({ onNavigate }: QuickLogScreenProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [timeFrom, setTimeFrom] = useState('08:00');
  const [timeTo, setTimeTo] = useState('12:00');
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [zonaId, setZonaId] = useState<string>('');
  const [diveSpots, setDiveSpots] = useState<DiveSpot[]>([]);
  const [diveSpotId, setDiveSpotId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [favoriteZones, setFavoriteZones] = useState<Array<{ id: string; nombre: string }>>(() => getFavoriteZones());
  const searchInputRef = useRef<HTMLInputElement>(null);
  const queryLower = searchQuery.trim().toLowerCase();
  const zoneSuggestions = queryLower.length >= 1
    ? zonas.filter((z) => z.nombre.toLowerCase().includes(queryLower)).slice(0, 12)
    : [];
  const currentZona = zonas.find((z) => z.id === zonaId);
  const selectedSpot = diveSpots.find((s) => s.id === diveSpotId);
  const isFavorite = currentZona && favoriteZones.some((f) => f.id === currentZona.id);
  const [tideCoeff, setTideCoeff] = useState<number | null>(null);
  const [tideCoeffOverride, setTideCoeffOverride] = useState<number | null>(null);
  const [editingCoeff, setEditingCoeff] = useState(false);
  const [tideEvents, setTideEvents] = useState<TideEvent[]>([]);
  const [solunarPeriods, setSolunarPeriods] = useState<SolunarPeriod[]>([]);
  const [windSpeed, setWindSpeed] = useState<number | null>(null);
  const [windDir, setWindDir] = useState<number | null>(null);
  const [waveHeight, setWaveHeight] = useState<number | null>(null);
  const [loadingConditions, setLoadingConditions] = useState(false);
  const [cantidades, setCantidades] = useState<Record<string, number>>(
    Object.fromEntries(ESPECIES_FIJAS.map((s) => [s, 0]))
  );
  const [otras, setOtras] = useState<OtraEspecie[]>([]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const fromM = parseTimeToMinutes(timeFrom);
  const toM = parseTimeToMinutes(timeTo);
  const durationMinutes = toM >= fromM ? toM - fromM : 24 * 60 - fromM + toM;
  const dayIndex = Math.floor((new Date(date).getTime() - new Date(today).getTime()) / (24 * 60 * 60 * 1000));
  const hourFrom = parseTimeToMinutes(timeFrom) / 60;
  const hourTo = parseTimeToMinutes(timeTo) / 60;
  const hourMid = Math.floor((hourFrom + hourTo) / 2);

  const loadZonas = useCallback(() => {
    setFavoriteZones(getFavoriteZones());
    getZonas().then((list) => {
      setZonas(list);
      const last = getLastZonaId();
      if (last && list.some((z) => z.id === last)) setZonaId(last);
      else if (list.length > 0) setZonaId((prev) => (prev && list.some((z) => z.id === prev) ? prev : list[0].id));
    });
    getDiveSpots().then(setDiveSpots);
  }, []);

  useEffect(() => {
    loadZonas();
  }, [loadZonas]);

  const onSelectZona = (z: Zona) => {
    setZonaId(z.id);
    setDiveSpotId('');
    setSearchQuery(z.nombre);
    setShowSuggestions(false);
    setLastZonaId(z.id);
  };

  const onSelectEscenario = (spot: DiveSpot) => {
    setDiveSpotId(spot.id);
    setZonaId('');
    setSearchQuery('');
    setShowSuggestions(false);
  };

  const toggleFavorite = () => {
    if (!currentZona) return;
    if (isFavorite) {
      setFavoriteZones(removeFavoriteZone(currentZona.id));
    } else {
      setFavoriteZones(addFavoriteZone(currentZona));
    }
  };

  useEffect(() => {
    if (!zonaId) return;
    setLoadingConditions(true);
    const isPast = dayIndex < 0;
    const hasForecast = dayIndex >= 0 && dayIndex <= 6;

    const tidesPromise = getZonaTides(zonaId, date).then((res) => {
      if (res.tides?.coefficient != null) setTideCoeff(res.tides.coefficient);
      setTideEvents(res.tides?.events ?? []);
    }).catch(() => {
      setTideCoeff(null);
      setTideEvents([]);
    });

    const conditionsPromise = hasForecast
      ? getZonaForecast(zonaId).then((forecastRes) => {
          const data = getForecastAt(forecastRes.forecast, dayIndex, hourMid);
          if (data?.weather?.wind_speed_10m != null) setWindSpeed(Math.round(data.weather.wind_speed_10m));
          if (data?.weather?.wind_direction_10m != null) setWindDir(data.weather.wind_direction_10m);
          if (data?.marine?.wave_height != null) setWaveHeight(data.marine.wave_height);
        }).catch(() => {
          setWindSpeed(null);
          setWindDir(null);
          setWaveHeight(null);
        })
      : isPast
        ? getZonaHistoricalConditions(zonaId, date, hourMid).then((res) => {
            if (res.weather.wind_speed_10m != null) setWindSpeed(Math.round(res.weather.wind_speed_10m));
            if (res.weather.wind_direction_10m != null) setWindDir(res.weather.wind_direction_10m);
            setWaveHeight(null);
          }).catch(() => {
            setWindSpeed(null);
            setWindDir(null);
            setWaveHeight(null);
          })
        : Promise.resolve().then(() => {
            setWindSpeed(null);
            setWindDir(null);
            setWaveHeight(null);
          });

    Promise.all([tidesPromise, conditionsPromise])
      .finally(() => setLoadingConditions(false));
  }, [zonaId, date, dayIndex, hourMid]);

  useEffect(() => {
    if (!currentZona) {
      setSolunarPeriods([]);
      return;
    }
    try {
      setSolunarPeriods(getSolunarPeriods(date, currentZona.lat, currentZona.lon));
    } catch {
      setSolunarPeriods([]);
    }
  }, [date, currentZona?.id, currentZona?.lat, currentZona?.lon]);

  const addOtra = () => setOtras((prev) => [...prev, { especie: '', cantidad: 1 }]);
  const updateOtra = (i: number, field: 'especie' | 'cantidad', value: string | number) => {
    setOtras((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
  };
  const removeOtra = (i: number) => setOtras((prev) => prev.filter((_, idx) => idx !== i));

  const setCantidad = (species: string, value: number) => {
    setCantidades((prev) => ({ ...prev, [species]: Math.max(0, value) }));
  };

  const handleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setSaving(true);
    try {
      const locationName = diveSpotId
        ? selectedSpot?.name
        : zonas.find((z) => z.id === zonaId)?.nombre;
      const dive = await createDive({
        user_id: user.id,
        dive_date: date,
        duration_minutes: durationMinutes,
        tide_coefficient: (tideCoeffOverride ?? tideCoeff) ?? undefined,
        wind_speed_kmh: windSpeed ?? undefined,
        wind_direction: windDir != null ? windDirectionLabel(windDir) : undefined,
        wave_height_m: waveHeight ?? undefined,
        location_name: locationName ?? undefined,
        dive_spot_id: diveSpotId || null,
        notes: notes.trim() || undefined,
      });
      const diveId = (dive as { id: string }).id;
      for (const sp of ESPECIES_FIJAS) {
        const q = cantidades[sp] ?? 0;
        for (let i = 0; i < q; i++) await addCatch({ dive_id: diveId, species: sp });
      }
      for (const o of otras) {
        if (!o.especie.trim()) continue;
        for (let i = 0; i < Math.max(0, o.cantidad); i++) {
          await addCatch({ dive_id: diveId, species: o.especie.trim() });
        }
      }
      onNavigate('log');
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a1628] via-[#0c1f3a] to-[#0a1628]">
      <div className="sticky top-0 z-30 backdrop-blur-xl bg-[#0a1628]/80 border-b border-cyan-400/20">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <motion.button
              onClick={() => onNavigate('home')}
              whileTap={{ scale: 0.9 }}
              className="p-2 rounded-full hover:bg-white/10 active:bg-white/15"
            >
              <ChevronLeft className="w-6 h-6 text-cyan-400" />
            </motion.button>
            <h1 className="text-white text-2xl">Registrar Jornada</h1>
          </div>
        </div>
      </div>

      <div className="px-6 pt-6 pb-24 space-y-6">
        {/* Fecha */}
        <div>
          <label className="text-cyan-300 text-sm mb-2 block flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Fecha
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full backdrop-blur-xl bg-white/10 rounded-2xl p-4 border border-cyan-400/25 text-white"
          />
        </div>

        {/* Hora desde – Hora hasta – Duración */}
        <div>
          <label className="text-cyan-300 text-sm mb-2 block flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Hora desde – Hasta (duración calculada)
          </label>
          <div className="grid grid-cols-3 gap-3">
            <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-4 border border-cyan-400/20">
              <p className="text-cyan-300/70 text-xs mb-1">Desde</p>
              <input
                type="time"
                value={timeFrom}
                onChange={(e) => setTimeFrom(e.target.value)}
                className="w-full bg-transparent text-white text-lg font-medium"
              />
            </div>
            <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-4 border border-cyan-400/20">
              <p className="text-cyan-300/70 text-xs mb-1">Hasta</p>
              <input
                type="time"
                value={timeTo}
                onChange={(e) => setTimeTo(e.target.value)}
                className="w-full bg-transparent text-white text-lg font-medium"
              />
            </div>
            <div className="backdrop-blur-xl bg-cyan-500/15 rounded-2xl p-4 border border-cyan-400/25 flex flex-col justify-center">
              <p className="text-cyan-300/70 text-xs mb-0.5">Duración</p>
              <p className="text-white font-semibold">{formatDuration(durationMinutes)}</p>
            </div>
          </div>
        </div>

        {/* Zona o escenario de pesca */}
        <div>
          <label className="text-cyan-300 text-sm mb-2 block">Zona o escenario de pesca</label>
          {favoriteZones.length > 0 && !diveSpotId && (
            <div className="flex flex-wrap gap-2 mb-3">
              <span className="text-cyan-300/80 text-xs self-center mr-1">Zonas frecuentes:</span>
              {favoriteZones.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => onSelectZona(zonas.find((z) => z.id === f.id) ?? { id: f.id, nombre: f.nombre, lat: 0, lon: 0 })}
                  className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                    zonaId === f.id
                      ? 'bg-cyan-500/40 text-white border border-cyan-400'
                      : 'bg-white/10 text-cyan-200 border border-cyan-400/25 hover:bg-white/15'
                  }`}
                >
                  {f.nombre.length > 18 ? f.nombre.slice(0, 16) + '…' : f.nombre}
                </button>
              ))}
            </div>
          )}
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400/70 pointer-events-none" />
            <Input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
                if (!e.target.value.trim()) setDiveSpotId('');
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 180)}
              placeholder="Buscar zona (ej. Cabo, Mallorca...) o elegir escenario abajo"
              className="pl-9 pr-10 bg-white/10 border-cyan-400/25 text-white placeholder:text-cyan-300/50 rounded-xl"
            />
            {searchQuery.length > 0 && (
              <button
                type="button"
                onClick={() => { setSearchQuery(''); setShowSuggestions(false); setDiveSpotId(''); }}
                onMouseDown={(e) => e.preventDefault()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-white/20 text-cyan-300"
                aria-label="Borrar"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            {showSuggestions && zoneSuggestions.length > 0 && (
              <ul className="absolute z-50 top-full left-0 right-0 mt-1 max-h-48 overflow-auto rounded-xl border border-cyan-400/30 bg-[#0c1f3a] shadow-xl">
                {zoneSuggestions.map((z) => (
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
          </div>
          {currentZona && !diveSpotId && (
            <button
              type="button"
              onClick={toggleFavorite}
              className="mb-3 flex items-center gap-2 text-sm text-cyan-300 hover:text-cyan-200"
            >
              {isFavorite ? (
                <>
                  <Star className="w-4 h-4 fill-cyan-400 text-cyan-400" />
                  Quitar de frecuentes
                </>
              ) : (
                <>
                  <Star className="w-4 h-4" />
                  Marcar como zona frecuente
                </>
              )}
            </button>
          )}
          <p className="text-cyan-300/70 text-xs mb-2">O elegir escenario de pesca:</p>
          <select
            value={diveSpotId}
            onChange={(e) => {
              const id = e.target.value;
              setDiveSpotId(id);
              if (id) setZonaId('');
            }}
            className="w-full backdrop-blur-xl bg-white/10 rounded-2xl p-4 border border-cyan-400/25 text-white"
          >
            <option value="">Ninguno (usar zona de arriba)</option>
            {diveSpots.map((s) => (
              <option key={s.id} value={s.id} className="bg-[#0c1f3a]">
                {s.name}
              </option>
            ))}
          </select>
          {selectedSpot && (
            <p className="text-cyan-400/80 text-xs mt-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {selectedSpot.name} — la jornada quedará enlazada a este escenario
            </p>
          )}
        </div>

        {/* Coeficiente, viento y oleaje (solo si hay zona; con escenario no hay condiciones) */}
        <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-5 border border-cyan-400/20">
          {diveSpotId && !zonaId ? (
            <p className="text-cyan-300/70 text-sm">
              Has elegido un escenario de pesca. Si quieres ver condiciones y mareas, selecciona además una zona arriba.
            </p>
          ) : (
            <>
          <p className="text-cyan-300/80 text-sm mb-3">
            Según fecha, hora y zona seleccionados:
          </p>
          {loadingConditions ? (
            <p className="text-cyan-300/70 text-sm">Cargando condiciones...</p>
          ) : (
            <>
              {dayIndex < 0 && (
                <p className="text-amber-200/90 text-xs mb-3">
                  Viento: datos históricos. Oleaje no disponible para fechas pasadas.
                </p>
              )}
              {dayIndex > 6 && (
                <p className="text-amber-200/90 text-xs mb-3">
                  Viento y oleaje: solo hay pronóstico para los próximos 7 días.
                </p>
              )}
              {(() => {
                const tidePeriod = getTidePeriodLabel(date, timeFrom, timeTo, tideEvents);
                return tidePeriod ? (
                  <p className="text-cyan-200/90 text-sm mb-3 flex items-center gap-2">
                    <Waves className="w-4 h-4 shrink-0" />
                    {tidePeriod}
                  </p>
                ) : null;
              })()}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-cyan-300/70 text-xs flex items-center gap-1">
                    <Waves className="w-3.5 h-3.5" /> Coef. marea ({date})
                  </p>
                  {editingCoeff ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="any"
                        value={tideCoeffOverride ?? tideCoeff ?? ''}
                        onChange={(e) => {
                          const v = e.target.value === '' ? null : parseFloat(e.target.value);
                          setTideCoeffOverride(v != null && !Number.isNaN(v) ? v : null);
                        }}
                        onBlur={() => setEditingCoeff(false)}
                        onKeyDown={(e) => e.key === 'Enter' && setEditingCoeff(false)}
                        className="w-20 rounded-lg bg-white/10 border border-cyan-400/30 px-2 py-1 text-white font-medium"
                        autoFocus
                      />
                    </div>
                  ) : (
                    <p
                      className="text-white font-medium flex items-center gap-1.5 cursor-pointer group"
                      onClick={() => setEditingCoeff(true)}
                      title="Pulsar para corregir si no coincide con tablademareas.com"
                    >
                      {(tideCoeffOverride ?? tideCoeff) != null ? (tideCoeffOverride ?? tideCoeff) : '—'}
                      <Pencil className="w-3.5 h-3.5 text-cyan-400/60 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </p>
                  )}
                  {tideCoeffOverride != null && (
                    <button
                      type="button"
                      onClick={() => { setTideCoeffOverride(null); setEditingCoeff(false); }}
                      className="text-cyan-400/80 text-[10px] mt-0.5 flex items-center gap-0.5 hover:text-cyan-300"
                    >
                      <RotateCcw className="w-3 h-3" /> Restablecer
                    </button>
                  )}
                  <p className="text-cyan-300/60 text-[10px] mt-0.5">
                    Orientativo.{' '}
                    <a
                      href="https://www.tablademareas.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400/90 underline"
                    >
                      tablademareas.com
                    </a>
                  </p>
                </div>
                <div>
                  <p className="text-cyan-300/70 text-xs flex items-center gap-1">
                    <Wind className="w-3.5 h-3.5" /> Viento
                  </p>
                  <p className="text-white font-medium">
                    {windSpeed != null ? `${windSpeed} km/h ${windDir != null ? windDirectionLabel(windDir) : ''}` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-cyan-300/70 text-xs flex items-center gap-1">
                    <Waves className="w-3.5 h-3.5" /> Oleaje
                  </p>
                  <p className="text-white font-medium">
                    {waveHeight != null ? `${waveHeight.toFixed(1)} m` : '—'}
                  </p>
                </div>
              </div>
              {solunarPeriods.length > 0 && (
                <div className="mt-4 pt-4 border-t border-cyan-400/20">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="shrink-0 rounded-full bg-[#0c1f3a]/80 p-0.5 border border-cyan-400/20">
                      <MoonPhaseIcon phase={getMoonPhase(date)} size={48} className="block" />
                    </div>
                    <div>
                      <p className="text-cyan-300/80 text-xs">Tabla solunar ({date})</p>
                      <p className="text-cyan-200/90 text-xs font-medium">{getMoonPhaseLabel(date)}</p>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-cyan-300/80 border-b border-cyan-400/20">
                          <th className="text-left py-2 pr-3 font-medium">Tipo</th>
                          <th className="text-left py-2 font-medium">Franja</th>
                        </tr>
                      </thead>
                      <tbody>
                        {solunarPeriods.map((p, i) => (
                          <tr key={i} className="border-b border-cyan-400/10 last:border-0">
                            <td className="py-2 pr-3 text-white">{p.label}</td>
                            <td className="py-2 text-cyan-200 tabular-nums">{formatPeriodRange(p.start, p.end)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
            </>
          )}
        </div>

        {/* Especies capturadas */}
        <div>
          <label className="text-cyan-300 text-sm mb-3 block flex items-center gap-2">
            <Fish className="w-4 h-4" />
            Especies capturadas (cantidad por especie)
          </label>
          <div className="space-y-2">
            {ESPECIES_FIJAS.map((species) => (
              <div
                key={species}
                className="flex items-center justify-between gap-3 backdrop-blur-xl bg-white/5 rounded-xl py-2 px-4 border border-cyan-400/20"
              >
                <span className="text-white">{species}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCantidad(species, (cantidades[species] ?? 0) - 1)}
                    className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-300 font-bold"
                  >
                    −
                  </button>
                  <span className="text-white font-medium w-8 text-center tabular-nums">
                    {cantidades[species] ?? 0}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCantidad(species, (cantidades[species] ?? 0) + 1)}
                    className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-300 font-bold"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>

          <p className="text-cyan-300/70 text-xs mt-3 mb-2">Otras (especie + cantidad)</p>
          {otras.map((o, i) => (
            <div
              key={i}
              className="flex items-center gap-2 mb-2"
            >
              <input
                type="text"
                placeholder="Especie"
                value={o.especie}
                onChange={(e) => updateOtra(i, 'especie', e.target.value)}
                className="flex-1 backdrop-blur-xl bg-white/10 rounded-xl py-2.5 px-3 border border-cyan-400/20 text-white placeholder-cyan-300/40 text-sm"
              />
              <input
                type="number"
                step="any"
                value={o.cantidad}
                onChange={(e) => updateOtra(i, 'cantidad', parseFloat(e.target.value) || 0)}
                className="w-20 backdrop-blur-xl bg-white/10 rounded-xl py-2.5 px-2 border border-cyan-400/20 text-white text-center text-sm"
              />
              <button
                type="button"
                onClick={() => removeOtra(i)}
                className="p-2 text-red-300 hover:bg-red-500/20 rounded-xl"
                aria-label="Quitar"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <motion.button
            type="button"
            onClick={addOtra}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 text-cyan-300 text-sm py-2"
          >
            <Plus className="w-4 h-4" />
            Añadir otra especie
          </motion.button>
        </div>

        {/* Notas */}
        <div>
          <label className="text-cyan-300 text-sm mb-2 block">Notas rápidas</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Condiciones, observaciones..."
            className="w-full backdrop-blur-xl bg-white/5 rounded-2xl p-4 border border-cyan-400/20 text-white placeholder-cyan-300/30 resize-none"
            rows={3}
          />
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#0a1628] via-[#0a1628] to-transparent">
        <div className="max-w-md mx-auto">
          <motion.button
            onClick={handleSave}
            disabled={saving || (!zonaId && !diveSpotId)}
            whileTap={{ scale: 0.98 }}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white py-5 rounded-2xl shadow-lg shadow-cyan-500/50 flex items-center justify-center gap-2 text-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-6 h-6" />
            {saving ? 'Guardando...' : 'Guardar Jornada'}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
