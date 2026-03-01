import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/app/components/ui/alert-dialog';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import type { Zona } from '@/lib/api/conditions';
import { getFavoriteZones, getZonas } from '@/lib/api/conditions';
import { getDiveSpots } from '@/lib/api/diveSpots';
import {
    deleteDive,
    getDives,
    replaceCatches,
    updateDive,
} from '@/lib/api/dives';
import { supabase } from '@/lib/supabase';
import type { DiveWithSpot } from '@/lib/api/dives';
import type { Dive } from '@/lib/types';
import { formatPeriodRange, getMoonPhase, getMoonPhaseLabel, getSolunarPeriods } from '@/lib/solunar';
import { ensureAbsoluteUrl } from '@/lib/urlUtils';
import { MoonPhaseIcon } from '@/app/components/MoonPhaseIcon';
import { Calendar, ChevronLeft, ChevronRight, ChevronUp, Fish, MapPin, Pencil, Trash2, Waves, Wind } from 'lucide-react';
import { CatchMatchesSection } from './CatchMatchesSection';
import { motion } from 'motion/react';
import { useCallback, useEffect, useState } from 'react';

const ESPECIES_FIJAS = ['Dorada', 'Lubina', 'Sargo', 'Mero', 'Dentón', 'Limón'] as const;

interface DiveLogScreenProps {
  onNavigate: (screen: string) => void;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  d.setHours(0, 0, 0, 0);
  if (d.getTime() === today.getTime()) return 'Hoy';
  if (d.getTime() === yesterday.getTime()) return 'Ayer';
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
}

function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

function formatCatches(dive: Dive): string {
  if (!dive.catches?.length) return '—';
  const bySpecies: Record<string, number> = {};
  for (const c of dive.catches) {
    bySpecies[c.species] = (bySpecies[c.species] ?? 0) + 1;
  }
  return Object.entries(bySpecies)
    .map(([s, n]) => (n > 1 ? `${s} (${n})` : s))
    .join(', ');
}

function catchesToCounts(catches: Dive['catches']): Record<string, number> {
  const out: Record<string, number> = Object.fromEntries(ESPECIES_FIJAS.map((s) => [s, 0]));
  if (!catches?.length) return out;
  for (const c of catches) {
    if (ESPECIES_FIJAS.includes(c.species as typeof ESPECIES_FIJAS[number])) {
      out[c.species]++;
    }
  }
  return out;
}

function countsAndOtrasToSpeciesList(
  counts: Record<string, number>,
  otras: { especie: string; cantidad: number }[]
): string[] {
  const list: string[] = [];
  for (const s of ESPECIES_FIJAS) {
    for (let i = 0; i < (counts[s] ?? 0); i++) list.push(s);
  }
  for (const o of otras) {
    for (let i = 0; i < Math.max(0, o.cantidad); i++) {
      if (o.especie.trim()) list.push(o.especie.trim());
    }
  }
  return list;
}

interface DiveDetailWindowProps {
  dive: DiveWithSpot;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onImageView: (url: string) => void;
}

function DiveDetailWindow({ dive, onClose, onEdit, onDelete, onImageView }: DiveDetailWindowProps) {
  const d = dive as DiveWithSpot;
  const spot = d.dive_spot ?? d.dive_spots;
  const city = spot?.city ?? null;
  const locality = dive.location_name ?? null;
  const lat = spot?.lat ?? 39.5;
  const lon = spot?.lng ?? 2.5;
  const solunarPeriods = getSolunarPeriods(dive.dive_date, lat, lon);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-[#0c1f3a] border-cyan-400/20 text-white max-w-2xl w-[calc(100%-2rem)] max-h-[90vh] overflow-hidden p-0 flex flex-col">
        <DialogTitle className="sr-only">Detalle de jornada</DialogTitle>
        <div className="sticky top-0 z-10 backdrop-blur-xl bg-[#0c1f3a]/95 border-b border-cyan-400/20 px-4 py-3 pr-14 flex items-center justify-between">
          <h2 className="text-white font-semibold text-lg">Detalle de jornada</h2>
        </div>
        <div className="px-4 py-4 space-y-4 overflow-y-auto flex-1 min-h-0">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-cyan-400 shrink-0" />
            <div>
              <p className="text-cyan-300/70 text-xs">Fecha</p>
              <p className="text-white font-medium">{new Date(dive.dive_date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
          </div>
          {(city || locality) && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-cyan-400 shrink-0" />
              <div>
                <p className="text-cyan-300/70 text-xs">Ubicación</p>
                <p className="text-white font-medium">{[city, locality].filter(Boolean).join(' · ')}</p>
              </div>
            </div>
          )}
          {spot?.name && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-cyan-400 shrink-0" />
              <div>
                <p className="text-cyan-300/70 text-xs">Escenario de pesca</p>
                <p className="text-white font-medium">{spot.name}</p>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-cyan-300/70 text-xs">Duración</p>
              <p className="text-white font-medium">{formatDuration(dive.duration_minutes)}</p>
            </div>
            {((dive as { min_depth_m?: number | null }).min_depth_m != null || dive.max_depth_m != null) && (
              <div>
                <p className="text-cyan-300/70 text-xs">Profundidad</p>
                <p className="text-white font-medium">
                  {(dive as { min_depth_m?: number | null }).min_depth_m != null && dive.max_depth_m != null
                    ? `${(dive as { min_depth_m?: number }).min_depth_m}–${dive.max_depth_m} m`
                    : (dive as { min_depth_m?: number | null }).min_depth_m != null
                      ? `${(dive as { min_depth_m: number }).min_depth_m} m (desde)`
                      : `${dive.max_depth_m} m (hasta)`}
                </p>
              </div>
            )}
            {dive.temperature_c != null && (
              <div>
                <p className="text-cyan-300/70 text-xs">Temperatura</p>
                <p className="text-white font-medium">{dive.temperature_c} °C</p>
              </div>
            )}
            {dive.gps_lat != null && dive.gps_lng != null && (
              <div className="col-span-2">
                <p className="text-cyan-300/70 text-xs">Coordenadas GPS</p>
                <p className="text-white text-sm">{dive.gps_lat.toFixed(5)}, {dive.gps_lng.toFixed(5)}</p>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {(dive as { current_type?: string | null }).current_type && (
              <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-white/5">
                <Waves className="w-4 h-4 text-cyan-400" />
                <span className="text-cyan-200 text-sm capitalize">{(dive as { current_type: string }).current_type}</span>
              </div>
            )}
            {dive.wind_speed_kmh != null && (
              <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-white/5">
                <Wind className="w-4 h-4 text-cyan-400" />
                <span className="text-cyan-200 text-sm">{dive.wind_speed_kmh} km/h{dive.wind_direction ? ` ${dive.wind_direction}` : ''}</span>
              </div>
            )}
            {dive.tide_coefficient != null && (
              <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-white/5">
                <Waves className="w-4 h-4 text-cyan-400" />
                <span className="text-cyan-200 text-sm">Coef. marea {dive.tide_coefficient}</span>
              </div>
            )}
            {dive.wave_height_m != null && (
              <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-white/5">
                <Waves className="w-4 h-4 text-cyan-400" />
                <span className="text-cyan-200 text-sm">{dive.wave_height_m.toFixed(1)} m oleaje</span>
              </div>
            )}
          </div>
          {dive.notes?.trim() && (
            <div>
              <p className="text-cyan-300/70 text-xs mb-1">Notas</p>
              <p className="text-cyan-200 text-sm">{dive.notes}</p>
            </div>
          )}
          {dive.catches && dive.catches.length > 0 && (
            <div>
              <p className="text-cyan-300/70 text-xs mb-2 flex items-center gap-1">
                <Fish className="w-3.5 h-3.5" /> Capturas
              </p>
              <div className="space-y-3">
                {dive.catches.map((c) => (
                  <div key={c.id} className="flex gap-3 p-3 rounded-xl bg-white/5 border border-cyan-400/10">
                    {c.image_url ? (
                      <button
                        type="button"
                        onClick={() => onImageView(ensureAbsoluteUrl(c.image_url!))}
                        className="shrink-0 rounded-lg border border-cyan-400/20 overflow-hidden focus:ring-2 focus:ring-cyan-400/50"
                      >
                        <img
                          src={ensureAbsoluteUrl(c.image_url)}
                          alt={c.species}
                          className="w-16 h-16 object-cover block cursor-pointer hover:opacity-90 transition-opacity"
                        />
                      </button>
                    ) : (
                      <div className="w-16 h-16 rounded-lg border border-cyan-400/20 bg-white/5 flex items-center justify-center shrink-0">
                        <Fish className="w-6 h-6 text-cyan-400/50" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-white font-medium">{c.species}</p>
                      <div className="flex flex-wrap gap-2 mt-1 text-cyan-300/80 text-xs">
                        {c.weight_kg != null && <span>{c.weight_kg} kg</span>}
                        {c.length_cm != null && <span>{c.length_cm} cm</span>}
                        {!c.weight_kg && !c.length_cm && <span className="text-cyan-400/60">—</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {solunarPeriods.length > 0 && (
            <div className="pt-4 border-t border-cyan-400/20">
              <div className="flex items-center gap-3 mb-2">
                <div className="shrink-0 rounded-full bg-white/5 p-0.5 border border-cyan-400/20">
                  <MoonPhaseIcon phase={getMoonPhase(dive.dive_date)} size={48} className="block" />
                </div>
                <div>
                  <p className="text-cyan-300/80 text-xs">Tabla solunar ({dive.dive_date})</p>
                  <p className="text-cyan-200/90 text-xs font-medium">{getMoonPhaseLabel(dive.dive_date)}</p>
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
          <div className="flex gap-2 pt-2">
            <motion.button
              onClick={onEdit}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/30 text-cyan-200 border border-cyan-400/30 text-sm"
            >
              <Pencil className="w-4 h-4" /> Editar
            </motion.button>
            <motion.button
              onClick={onDelete}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/30 text-red-200 border border-red-400/30 text-sm"
            >
              <Trash2 className="w-4 h-4" /> Eliminar
            </motion.button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function DiveLogScreen({ onNavigate }: DiveLogScreenProps) {
  const [dives, setDives] = useState<DiveWithSpot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [imageViewerUrl, setImageViewerUrl] = useState<string | null>(null);
  const [detailDive, setDetailDive] = useState<DiveWithSpot | null>(null);
  const [editingDive, setEditingDive] = useState<DiveWithSpot | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadDives = useCallback(() => {
    setLoading(true);
    setError(null);
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        setDives([]);
        setLoading(false);
        return;
      }
      getDives(user.id)
        .then(setDives)
        .catch((e) => setError(e?.message ?? 'Error al cargar'))
        .finally(() => setLoading(false));
    });
  }, []);

  useEffect(() => {
    loadDives();
  }, [loadDives]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === dives.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(dives.map((d) => d.id)));
  };

  const handleEdit = () => {
    const one = [...selectedIds][0];
    const dive = dives.find((d) => d.id === one);
    if (dive) setEditingDive(dive);
  };

  const handleDeleteClick = () => setDeleteConfirm(true);

  const handleDeleteConfirm = async () => {
    if (selectedIds.size === 0) return;
    setDeleting(true);
    try {
      for (const id of selectedIds) {
        await deleteDive(id);
      }
      setSelectedIds(new Set());
      setDeleteConfirm(false);
      loadDives();
    } catch (e) {
      setError((e as Error)?.message ?? 'Error al eliminar');
    } finally {
      setDeleting(false);
    }
  };

  const selectedCount = selectedIds.size;
  const oneSelected = selectedCount === 1;

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
          <div className="flex-1">
            <h1 className="text-white text-2xl">Historial</h1>
            <p className="text-cyan-300 text-sm">Registros de jornada</p>
          </div>
        </div>
        {selectedCount > 0 && (
          <div className="px-6 pb-3 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={selectAll}
              className="text-cyan-400 text-sm"
            >
              {selectedCount === dives.length ? 'Quitar selección' : 'Seleccionar todos'}
            </button>
            <div className="flex gap-2">
              {oneSelected && (
                <motion.button
                  onClick={handleEdit}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500/30 text-cyan-200 border border-cyan-400/30"
                >
                  <Pencil className="w-4 h-4" /> Editar
                </motion.button>
              )}
              <motion.button
                onClick={handleDeleteClick}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-500/30 text-red-200 border border-red-400/30"
              >
                <Trash2 className="w-4 h-4" /> Eliminar
              </motion.button>
            </div>
          </div>
        )}
      </div>

      <div className="px-6 py-8">
        {loading ? (
          <p className="text-cyan-300/70 text-center py-8">Cargando...</p>
        ) : error ? (
          <p className="text-amber-200/90 text-center py-8">{error}</p>
        ) : dives.length === 0 ? (
          <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-8 border border-cyan-400/20 text-center">
            <Waves className="w-12 h-12 text-cyan-400/50 mx-auto mb-3" />
            <p className="text-cyan-300/80">No hay jornadas registradas</p>
            <p className="text-cyan-300/60 text-sm mt-1">Registra una jornada desde Registrar Jornada</p>
            <motion.button
              onClick={() => onNavigate('quicklog')}
              whileTap={{ scale: 0.98 }}
              className="mt-4 px-6 py-2 rounded-xl bg-cyan-500/30 text-cyan-200 border border-cyan-400/30"
            >
              Registrar Jornada
            </motion.button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Coincidencias entre capturas — predicciones basadas en condiciones similares */}
            <CatchMatchesSection
              onViewDive={(diveId) => {
                const dive = dives.find(d => d.id === diveId);
                if (dive) setDetailDive(dive);
              }}
            />

            {/* Registros de jornada — sección separada */}
            <div>
              <h2 className="text-white font-semibold text-lg mb-3 px-1">Registros de jornada</h2>
              <div className="space-y-3">
            {dives.map((dive, index) => {
              const d = dive as DiveWithSpot;
              const spot = d.dive_spot ?? d.dive_spots;
              const city = spot?.city ?? null;
              const locality = dive.location_name ?? null;
              const catchesCount = dive.catches?.length ?? 0;

              return (
                <motion.div
                  key={dive.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: index * 0.03 }}
                  className={`backdrop-blur-xl rounded-2xl border overflow-hidden transition-colors ${
                    selectedIds.has(dive.id)
                      ? 'bg-cyan-500/20 border-cyan-400/50'
                      : 'bg-gradient-to-br from-cyan-500/10 to-blue-600/10 border-cyan-400/20'
                  }`}
                >
                  {/* Pestaña: ciudad, localidad, fecha, capturas — clic abre detalle */}
                  <button
                    type="button"
                    className="w-full px-4 py-4 flex items-center justify-between gap-3 text-left"
                    onClick={() => setDetailDive(dive)}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className="shrink-0 w-6 h-6 rounded border-2 border-cyan-400 flex items-center justify-center cursor-pointer"
                        onClick={(e) => { e.stopPropagation(); toggleSelect(dive.id); }}
                      >
                        {selectedIds.has(dive.id) && <div className="w-3 h-3 rounded-sm bg-cyan-400" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                          {city && <span className="text-white font-medium">{city}</span>}
                          {locality && (
                            <span className="text-cyan-300/90 text-sm">
                              {city && locality ? ` · ${locality}` : locality}
                            </span>
                          )}
                          {!city && !locality && (
                            <span className="text-cyan-300/80 text-sm">Sin ubicación</span>
                          )}
                        </div>
                        <p className="text-cyan-300/70 text-xs mt-0.5">{formatDate(dive.dive_date)}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-cyan-400 text-sm flex items-center gap-1">
                          <Fish className="w-4 h-4" />
                          {catchesCount}
                        </span>
                        <ChevronRight className="w-5 h-5 text-cyan-400" />
                      </div>
                    </div>
                  </button>
                </motion.div>
              );
            })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Ventana detalle: todos los datos + tabla solunar */}
      {detailDive && (
        <DiveDetailWindow
          dive={detailDive}
          onClose={() => setDetailDive(null)}
          onEdit={() => { setDetailDive(null); setEditingDive(detailDive); }}
          onDelete={() => { setDetailDive(null); setSelectedIds(new Set([detailDive.id])); setDeleteConfirm(true); }}
          onImageView={(url) => setImageViewerUrl(url)}
        />
      )}

      <Dialog open={!!imageViewerUrl} onOpenChange={(open) => !open && setImageViewerUrl(null)}>
        <DialogContent className="bg-transparent border-0 shadow-none max-w-[95vw] max-h-[95vh] p-0">
          <DialogTitle className="sr-only">Ver imagen</DialogTitle>
          {imageViewerUrl && (
            <img
              src={imageViewerUrl}
              alt="Captura"
              className="w-full h-auto max-h-[90vh] object-contain rounded-lg"
              onClick={() => setImageViewerUrl(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <AlertDialogContent className="bg-[#0c1f3a] border-cyan-400/20 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar jornadas</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Eliminar {selectedCount} jornada{selectedCount !== 1 ? 's' : ''}? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/10 text-cyan-200 border-cyan-400/30">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async (e) => {
                e.preventDefault();
                await handleDeleteConfirm();
              }}
              disabled={deleting}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {editingDive && (
        <EditDiveDialog
          dive={editingDive}
          onClose={() => { setEditingDive(null); setSelectedIds(new Set()); }}
          onSaved={() => { setEditingDive(null); setSelectedIds(new Set()); loadDives(); }}
        />
      )}
    </div>
  );
}

interface EditDiveDialogProps {
  dive: Dive;
  onClose: () => void;
  onSaved: () => void;
}

function EditDiveDialog({ dive, onClose, onSaved }: EditDiveDialogProps) {
  const [dive_date, setDive_date] = useState(dive.dive_date);
  const [duration_minutes, setDuration_minutes] = useState(String(dive.duration_minutes));
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [zonaId, setZonaId] = useState<string>('');
  const [diveSpots, setDiveSpots] = useState<Array<{ id: string; name: string }>>([]);
  const [diveSpotId, setDiveSpotId] = useState<string>('');
  const [favoriteZones, setFavoriteZones] = useState<Array<{ id: string; nombre: string }>>([]);
  const [tide_coefficient, setTide_coefficient] = useState(dive.tide_coefficient != null ? String(dive.tide_coefficient) : '');
  const [min_depth_m, setMin_depth_m] = useState((dive as { min_depth_m?: number | null }).min_depth_m != null ? String((dive as { min_depth_m?: number | null }).min_depth_m) : '');
  const [max_depth_m, setMax_depth_m] = useState(dive.max_depth_m != null ? String(dive.max_depth_m) : '');
  const [current_type, setCurrent_type] = useState<string>((dive as { current_type?: string | null }).current_type ?? '');
  const [wind_speed_kmh, setWind_speed_kmh] = useState(dive.wind_speed_kmh != null ? String(dive.wind_speed_kmh) : '');
  const [wind_direction, setWind_direction] = useState(dive.wind_direction ?? '');
  const [wave_height_m, setWave_height_m] = useState(dive.wave_height_m != null ? String(dive.wave_height_m) : '');
  const [notes, setNotes] = useState(dive.notes ?? '');
  const [cantidades, setCantidades] = useState<Record<string, number>>(() => catchesToCounts(dive.catches));
  const [otras, setOtras] = useState<{ especie: string; cantidad: number }[]>(() => {
    const fixed = new Set(ESPECIES_FIJAS);
    const bySpecies: Record<string, number> = {};
    for (const c of dive.catches ?? []) {
      if (!fixed.has(c.species as typeof ESPECIES_FIJAS[number])) {
        bySpecies[c.species] = (bySpecies[c.species] ?? 0) + 1;
      }
    }
    return Object.entries(bySpecies).map(([especie, cantidad]) => ({ especie, cantidad }));
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFavoriteZones(getFavoriteZones());
    getZonas().then((list) => {
      setZonas(list);
      const match = list.find((z) => z.nombre === (dive.location_name ?? ''));
      if (match) setZonaId(match.id);
      else if (list.length > 0) setZonaId((prev) => (prev && list.some((z) => z.id === prev) ? prev : list[0].id));
    });
    getDiveSpots().then((list) => {
      setDiveSpots(list.map((s) => ({ id: s.id, name: s.name })));
      const spotId = (dive as { dive_spot_id?: string | null }).dive_spot_id;
      if (spotId && list.some((s) => s.id === spotId)) setDiveSpotId(spotId);
    });
  }, [dive.location_name, dive]);

  const setCantidad = (species: string, value: number) => {
    setCantidades((prev) => ({ ...prev, [species]: Math.max(0, value) }));
  };

  const addOtra = () => setOtras((p) => [...p, { especie: '', cantidad: 1 }]);
  const updateOtra = (i: number, field: 'especie' | 'cantidad', value: string | number) => {
    setOtras((p) => {
      const next = [...p];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
  };
  const removeOtra = (i: number) => setOtras((p) => p.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    setError(null);
    const dur = parseInt(duration_minutes, 10);
    if (Number.isNaN(dur) || dur < 1) {
      setError('Duración inválida');
      return;
    }
    setSaving(true);
    try {
      const selectedSpot = diveSpots.find((s) => s.id === diveSpotId);
      const locationName = diveSpotId && selectedSpot
        ? selectedSpot.name
        : (zonaId ? zonas.find((z) => z.id === zonaId)?.nombre ?? null : null);
      await updateDive(dive.id, {
        dive_date: dive_date || undefined,
        duration_minutes: dur,
        location_name: locationName ?? undefined,
        dive_spot_id: diveSpotId || null,
        min_depth_m: min_depth_m === '' ? null : parseFloat(min_depth_m) || null,
        max_depth_m: max_depth_m === '' ? null : parseFloat(max_depth_m) || null,
        current_type: current_type.trim() || null,
        tide_coefficient: tide_coefficient === '' ? null : parseInt(tide_coefficient, 10) || null,
        wind_speed_kmh: wind_speed_kmh === '' ? null : parseInt(wind_speed_kmh, 10) || null,
        wind_direction: wind_direction.trim() || null,
        wave_height_m: wave_height_m === '' ? null : parseFloat(wave_height_m) || null,
        notes: notes.trim() || null,
      });
      const speciesList = countsAndOtrasToSpeciesList(cantidades, otras);
      await replaceCatches(dive.id, speciesList);
      onSaved();
    } catch (e) {
      setError((e as Error)?.message ?? 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-[#0c1f3a] border-cyan-400/20 text-white max-w-[calc(100%-2rem)] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">Editar jornada</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-cyan-200">Fecha</Label>
              <Input
                type="date"
                className="bg-white/10 border-cyan-400/30 text-white mt-1"
                value={dive_date}
                onChange={(e) => setDive_date(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-cyan-200">Duración (min)</Label>
              <Input
                type="number"
                step="any"
                className="bg-white/10 border-cyan-400/30 text-white mt-1"
                value={duration_minutes}
                onChange={(e) => setDuration_minutes(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label className="text-cyan-200">Zona (condiciones y mareas)</Label>
            {favoriteZones.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2 mb-2">
                <span className="text-cyan-300/80 text-xs self-center mr-1">Zonas guardadas:</span>
                {favoriteZones.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setZonaId(f.id)}
                    className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                      zonaId === f.id
                        ? 'bg-cyan-500/40 text-white border border-cyan-400'
                        : 'bg-white/10 text-cyan-200 border border-cyan-400/25 hover:bg-white/15'
                    }`}
                  >
                    {f.nombre}
                  </button>
                ))}
              </div>
            )}
            <select
              value={zonaId}
              onChange={(e) => { setZonaId(e.target.value); if (e.target.value) setDiveSpotId(''); }}
              className="w-full rounded-xl bg-white/10 border border-cyan-400/30 px-3 py-2 text-white mt-1"
            >
              <option value="">Selecciona zona</option>
              {zonas.map((z) => (
                <option key={z.id} value={z.id} className="bg-[#0c1f3a]">
                  {z.nombre}
                </option>
              ))}
            </select>
            <Label className="text-cyan-200 text-sm mt-3 block">O escenario de pesca</Label>
            <select
              value={diveSpotId}
              onChange={(e) => { setDiveSpotId(e.target.value); if (e.target.value) setZonaId(''); }}
              className="w-full rounded-xl bg-white/10 border border-cyan-400/30 px-3 py-2 text-white mt-1"
            >
              <option value="">Ninguno</option>
              {diveSpots.map((s) => (
                <option key={s.id} value={s.id} className="bg-[#0c1f3a]">
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <Label className="text-cyan-200 text-xs">Prof. desde (m)</Label>
              <Input
                type="number"
                step="0.1"
                className="bg-white/10 border-cyan-400/30 text-white mt-1"
                value={min_depth_m}
                onChange={(e) => setMin_depth_m(e.target.value)}
                placeholder="—"
              />
            </div>
            <div>
              <Label className="text-cyan-200 text-xs">Prof. hasta (m)</Label>
              <Input
                type="number"
                step="0.1"
                className="bg-white/10 border-cyan-400/30 text-white mt-1"
                value={max_depth_m}
                onChange={(e) => setMax_depth_m(e.target.value)}
                placeholder="—"
              />
            </div>
            <div>
              <Label className="text-cyan-200 text-xs">Corriente</Label>
              <select
                value={current_type}
                onChange={(e) => setCurrent_type(e.target.value)}
                className="w-full rounded-lg bg-white/10 border border-cyan-400/30 px-3 py-2 text-white mt-1"
              >
                <option value="" className="bg-[#0c1f3a]">—</option>
                <option value="sin corriente" className="bg-[#0c1f3a]">Sin corriente</option>
                <option value="media" className="bg-[#0c1f3a]">Media</option>
                <option value="alta" className="bg-[#0c1f3a]">Alta</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-cyan-200 text-xs">Coef. marea</Label>
              <Input
                type="number"
                step="any"
                className="bg-white/10 border-cyan-400/30 text-white mt-1"
                value={tide_coefficient}
                onChange={(e) => setTide_coefficient(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-cyan-200 text-xs">Viento (km/h)</Label>
              <Input
                type="number"
                step="any"
                className="bg-white/10 border-cyan-400/30 text-white mt-1"
                value={wind_speed_kmh}
                onChange={(e) => setWind_speed_kmh(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-cyan-200 text-xs">Dirección viento</Label>
              <Input
                className="bg-white/10 border-cyan-400/30 text-white mt-1"
                value={wind_direction}
                onChange={(e) => setWind_direction(e.target.value)}
                placeholder="N, S, etc."
              />
            </div>
          </div>
          <div>
            <Label className="text-cyan-200 text-xs">Oleaje (m)</Label>
            <Input
              type="number"
              step="any"
              className="bg-white/10 border-cyan-400/30 text-white mt-1 w-24"
              value={wave_height_m}
              onChange={(e) => setWave_height_m(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-cyan-200">Capturas por especie</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {ESPECIES_FIJAS.map((s) => (
                <div key={s} className="flex items-center gap-1 bg-white/5 rounded-lg px-2 py-1">
                  <span className="text-cyan-200 text-sm w-16 truncate">{s}</span>
                  <button type="button" onClick={() => setCantidad(s, (cantidades[s] ?? 0) - 1)} className="text-cyan-400 w-6 h-6 rounded">−</button>
                  <span className="text-white w-6 text-center">{cantidades[s] ?? 0}</span>
                  <button type="button" onClick={() => setCantidad(s, (cantidades[s] ?? 0) + 1)} className="text-cyan-400 w-6 h-6 rounded">+</button>
                </div>
              ))}
            </div>
            {otras.map((o, i) => (
              <div key={i} className="flex items-center gap-2 mt-2">
                <Input
                  className="bg-white/10 border-cyan-400/30 text-white flex-1 max-w-[120px]"
                  value={o.especie}
                  onChange={(e) => updateOtra(i, 'especie', e.target.value)}
                  placeholder="Otra especie"
                />
                <button type="button" onClick={() => updateOtra(i, 'cantidad', Math.max(0, o.cantidad - 1))} className="text-cyan-400 w-6 h-6 rounded">−</button>
                <span className="text-white w-6 text-center">{o.cantidad}</span>
                <button type="button" onClick={() => updateOtra(i, 'cantidad', o.cantidad + 1)} className="text-cyan-400 w-6 h-6 rounded">+</button>
                <button type="button" onClick={() => removeOtra(i)} className="text-red-400 text-sm">Quitar</button>
              </div>
            ))}
            <button type="button" onClick={addOtra} className="mt-2 text-cyan-400 text-sm">+ Añadir otra especie</button>
          </div>
          <div>
            <Label className="text-cyan-200">Notas</Label>
            <Input
              className="bg-white/10 border-cyan-400/30 text-white mt-1"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Opcional"
            />
          </div>
          {error && <p className="text-red-300 text-sm">{error}</p>}
        </div>
        <DialogFooter>
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl bg-white/10 text-cyan-200 border border-cyan-400/30">Cancelar</button>
          <button type="button" onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-xl bg-cyan-600 text-white disabled:opacity-50">
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
