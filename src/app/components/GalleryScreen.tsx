import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import {
    addCatch,
    getCatchesWithImages,
    getDives,
    uploadCatchImage,
    type CatchWithDive,
} from '@/lib/api/dives';
import { supabase } from '@/lib/supabase';
import type { Dive } from '@/lib/types';
import { ChevronLeft, Fish, ImagePlus, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useCallback, useEffect, useState } from 'react';

interface GalleryScreenProps {
  onNavigate: (screen: string) => void;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function GalleryScreen({ onNavigate }: GalleryScreenProps) {
  const [captures, setCaptures] = useState<CatchWithDive[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const loadCaptures = useCallback(() => {
    setLoading(true);
    setError(null);
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        setCaptures([]);
        setLoading(false);
        return;
      }
      getCatchesWithImages(user.id)
        .then(setCaptures)
        .catch((e) => setError(e?.message ?? 'Error al cargar'))
        .finally(() => setLoading(false));
    });
  }, []);

  useEffect(() => {
    loadCaptures();
  }, [loadCaptures]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a1628] via-[#0c1f3a] to-[#0a1628]">
      <div className="sticky top-0 z-30 backdrop-blur-xl bg-[#0a1628]/80 border-b border-cyan-400/20">
        <div className="px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <motion.button
              onClick={() => onNavigate('home')}
              whileTap={{ scale: 0.9 }}
              className="p-2 rounded-full hover:bg-white/10 active:bg-white/15"
            >
              <ChevronLeft className="w-6 h-6 text-cyan-400" />
            </motion.button>
            <div>
              <h1 className="text-white text-2xl">Galería de capturas</h1>
              <p className="text-cyan-300 text-sm">{captures.length} foto{captures.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <motion.button
            onClick={() => setAddOpen(true)}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/30 text-cyan-200 border border-cyan-400/30"
          >
            <ImagePlus className="w-5 h-5" />
            Añadir foto
          </motion.button>
        </div>
      </div>

      <div className="p-4">
        {loading ? (
          <p className="text-cyan-300/70 text-center py-12">Cargando...</p>
        ) : error ? (
          <p className="text-amber-200/90 text-center py-12">{error}</p>
        ) : captures.length === 0 ? (
          <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-8 border border-cyan-400/20 text-center">
            <ImagePlus className="w-14 h-14 text-cyan-400/50 mx-auto mb-3" />
            <p className="text-cyan-300/80">No hay fotos de capturas</p>
            <p className="text-cyan-300/60 text-sm mt-1">Añade una foto y enlázala a una jornada del historial</p>
            <motion.button
              onClick={() => setAddOpen(true)}
              whileTap={{ scale: 0.98 }}
              className="mt-4 px-6 py-2 rounded-xl bg-cyan-500/30 text-cyan-200 border border-cyan-400/30"
            >
              Añadir foto
            </motion.button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {captures.map((c, index) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.25, delay: index * 0.03 }}
                className="relative aspect-square rounded-2xl overflow-hidden border border-cyan-400/20"
              >
                <img
                  src={c.image_url!}
                  alt={c.species}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Fish className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span className="text-white font-medium truncate">{c.species}</span>
                  </div>
                  {c.dive && (
                    <p className="text-cyan-300/90 text-xs truncate">
                      {c.dive.location_name || 'Sin zona'} · {formatDate(c.dive.dive_date)}
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {addOpen && (
        <AddCapturePhotoDialog
          onClose={() => setAddOpen(false)}
          onSaved={() => { setAddOpen(false); loadCaptures(); }}
        />
      )}
    </div>
  );
}

interface AddCapturePhotoDialogProps {
  onClose: () => void;
  onSaved: () => void;
}

type CatchItem = { id: string; species: string; image_url: string | null };

function AddCapturePhotoDialog({ onClose, onSaved }: AddCapturePhotoDialogProps) {
  const [dives, setDives] = useState<Dive[]>([]);
  const [diveId, setDiveId] = useState<string>('');
  const [filesByCatchId, setFilesByCatchId] = useState<Record<string, { file: File; preview: string }>>({});
  const [newCaptureSpecies, setNewCaptureSpecies] = useState('');
  const [newCaptureFile, setNewCaptureFile] = useState<{ file: File; preview: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      getDives(user.id).then(setDives);
    });
  }, []);

  useEffect(() => {
    if (!diveId) setFilesByCatchId({});
  }, [diveId]);

  const selectedDive = dives.find((d) => d.id === diveId);
  const catches: CatchItem[] = selectedDive?.catches ?? [];
  const catchesWithoutPhoto = catches.filter((c) => !c.image_url);
  const hasAnyPhotoToUpload = Object.keys(filesByCatchId).length > 0 || newCaptureFile !== null;

  const onFileForCatch = (catchId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || !f.type.startsWith('image/')) return;
    const prev = filesByCatchId[catchId]?.preview;
    if (prev) URL.revokeObjectURL(prev);
    setFilesByCatchId((prev) => ({
      ...prev,
      [catchId]: { file: f, preview: URL.createObjectURL(f) },
    }));
    e.target.value = '';
  };

  const removeFileForCatch = (catchId: string) => {
    const entry = filesByCatchId[catchId];
    if (entry?.preview) URL.revokeObjectURL(entry.preview);
    setFilesByCatchId((prev) => {
      const next = { ...prev };
      delete next[catchId];
      return next;
    });
  };

  const onNewCaptureFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || !f.type.startsWith('image/')) return;
    if (newCaptureFile?.preview) URL.revokeObjectURL(newCaptureFile.preview);
    setNewCaptureFile({ file: f, preview: URL.createObjectURL(f) });
    e.target.value = '';
  };

  const handleSave = async () => {
    setError(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('Debes iniciar sesión');
      return;
    }
    if (!diveId) {
      setError('Elige una jornada');
      return;
    }
    if (newCaptureFile && !newCaptureSpecies.trim()) {
      setError('Indica la especie de la nueva captura');
      return;
    }
    if (!hasAnyPhotoToUpload) {
      setError('Añade al menos una foto para alguna captura');
      return;
    }
    setSaving(true);
    try {
      for (const [catchId, { file }] of Object.entries(filesByCatchId)) {
        await uploadCatchImage(user.id, catchId, file);
      }
      if (newCaptureFile && newCaptureSpecies.trim()) {
        const newCatch = await addCatch({ dive_id: diveId, species: newCaptureSpecies.trim() });
        const catchId = (newCatch as { id: string }).id;
        await uploadCatchImage(user.id, catchId, newCaptureFile.file);
      }
      onSaved();
    } catch (e) {
      setError((e as Error)?.message ?? 'Error al subir');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-[#0c1f3a] border-cyan-400/20 text-white max-w-[calc(100%-2rem)] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">Fotos de capturas de la jornada</DialogTitle>
          <DialogDescription className="text-cyan-300/70 text-sm">Sube una foto por cada captura realizada en la jornada.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div>
            <Label className="text-cyan-200">Jornada</Label>
            <select
              value={diveId}
              onChange={(e) => setDiveId(e.target.value)}
              className="w-full mt-1 rounded-xl bg-white/10 border border-cyan-400/30 px-3 py-2 text-white"
            >
              <option value="">Selecciona una jornada</option>
              {dives.map((d) => (
                <option key={d.id} value={d.id} className="bg-[#0c1f3a]">
                  {formatDate(d.dive_date)} — {d.location_name || 'Sin zona'}
                </option>
              ))}
            </select>
          </div>
          {dives.length === 0 && (
            <p className="text-amber-200/80 text-sm">No tienes jornadas. Registra una en Historial primero.</p>
          )}
          {diveId && (
            <>
              <Label className="text-cyan-200">Capturas de esta jornada</Label>
              {catches.length === 0 ? (
                <p className="text-cyan-300/70 text-sm">No hay capturas en esta jornada. Añade una abajo (especie + foto).</p>
              ) : (
                <div className="space-y-3">
                  {catches.map((c) => (
                    <div
                      key={c.id}
                      className="rounded-xl border border-cyan-400/20 bg-white/5 p-3 flex flex-col sm:flex-row items-start sm:items-center gap-3"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Fish className="w-4 h-4 text-cyan-400 shrink-0" />
                        <span className="text-cyan-100 truncate">{c.species}</span>
                        {c.image_url && (
                          <span className="text-cyan-400/80 text-xs shrink-0">(ya tiene foto)</span>
                        )}
                      </div>
                      {c.image_url ? (
                        <img src={c.image_url} alt={c.species} className="h-14 w-14 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => onFileForCatch(c.id, e)}
                            className="hidden"
                            id={`file-${c.id}`}
                          />
                          <label
                            htmlFor={`file-${c.id}`}
                            className="rounded-xl border-2 border-dashed border-cyan-400/30 bg-white/5 p-3 cursor-pointer hover:bg-white/10 flex items-center gap-2 min-w-0 flex-1"
                          >
                            {filesByCatchId[c.id]?.preview ? (
                              <>
                                <img src={filesByCatchId[c.id].preview} alt="" className="h-12 w-12 rounded object-cover shrink-0" />
                                <span className="text-cyan-300/80 text-sm truncate">Cambiar foto</span>
                                <button
                                  type="button"
                                  onClick={(ev) => { ev.preventDefault(); ev.stopPropagation(); removeFileForCatch(c.id); }}
                                  className="ml-auto text-red-300 hover:text-red-200 text-xs"
                                >
                                  Quitar
                                </button>
                              </>
                            ) : (
                              <span className="text-cyan-300/70 text-sm">Elegir foto para esta captura</span>
                            )}
                          </label>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div className="border-t border-cyan-400/20 pt-4">
                <Label className="text-cyan-200">Añadir otra captura (opcional)</Label>
                <p className="text-cyan-300/60 text-xs mt-0.5">Especie + foto. Se creará en esta jornada.</p>
                <div className="mt-2 flex flex-col sm:flex-row gap-2">
                  <Input
                    className="bg-white/10 border-cyan-400/30 text-white flex-1"
                    value={newCaptureSpecies}
                    onChange={(e) => setNewCaptureSpecies(e.target.value)}
                    placeholder="Ej. Dorada, Lubina"
                  />
                  <div className="flex items-center gap-2 min-w-0">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={onNewCaptureFile}
                      className="hidden"
                      id="new-capture-file"
                    />
                    <label
                      htmlFor="new-capture-file"
                      className="rounded-xl border-2 border-dashed border-cyan-400/30 bg-white/5 px-4 py-2 cursor-pointer hover:bg-white/10 text-cyan-300/80 text-sm shrink-0 flex items-center gap-2"
                    >
                      {newCaptureFile ? (
                        <>
                          <img src={newCaptureFile.preview} alt="" className="h-8 w-8 rounded object-cover" />
                          <span>Cambiar</span>
                          <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setNewCaptureFile(null); }}
                            className="text-red-300 hover:text-red-200 text-xs"
                          >
                            Quitar
                          </button>
                        </>
                      ) : (
                        'Elegir foto'
                      )}
                    </label>
                  </div>
                </div>
              </div>
            </>
          )}
          {error && <p className="text-red-300 text-sm">{error}</p>}
        </div>
        <DialogFooter>
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl bg-white/10 text-cyan-200 border border-cyan-400/30">Cancelar</button>
          <button type="button" onClick={handleSave} disabled={saving || !hasAnyPhotoToUpload} className="px-4 py-2 rounded-xl bg-cyan-600 text-white disabled:opacity-50 flex items-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {saving ? 'Subiendo...' : 'Subir fotos'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
