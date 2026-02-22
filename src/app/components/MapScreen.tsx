import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
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
import { getCatchesByDiveSpotId, type CatchAtSpot } from '@/lib/api/dives';
import { createDiveSpot, deleteDiveSpot, getDiveSpots, updateDiveSpot, uploadDiveSpotImage, type DiveSpotWithCreator } from '@/lib/api/diveSpots';
import { supabase } from '@/lib/supabase';
import type { DiveSpot } from '@/lib/types';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Anchor, ChevronLeft, Fish, Loader2, MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useCallback, useEffect, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';

// Icono por defecto para marcadores (Leaflet requiere ruta explícita en producción)
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

interface MapScreenProps {
  onNavigate: (screen: string) => void;
}

export function MapScreen({ onNavigate }: MapScreenProps) {
  const [spots, setSpots] = useState<DiveSpotWithCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editSpot, setEditSpot] = useState<DiveSpot | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [spotCatches, setSpotCatches] = useState<Record<string, CatchAtSpot[]>>({});

  useEffect(() => {
    if (!selectedSpotId) return;
    getCatchesByDiveSpotId(selectedSpotId)
      .then((list) => setSpotCatches((prev) => ({ ...prev, [selectedSpotId]: list })))
      .catch(() => setSpotCatches((prev) => ({ ...prev, [selectedSpotId]: [] })));
  }, [selectedSpotId]);

  const loadSpots = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([getDiveSpots(), supabase.auth.getUser()])
      .then(([spotsData, { data: { user } }]) => {
        setSpots(spotsData);
        setCurrentUserId(user?.id ?? null);
      })
      .catch((e) => setError(e?.message ?? 'Error al cargar puntos'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadSpots();
  }, [loadSpots]);

  const selectedSpot = spots.find((s) => s.id === selectedSpotId);

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
            <h1 className="text-white text-2xl">Escenarios de pesca</h1>
            <p className="text-cyan-300 text-sm">{spots.length} puntos compartidos</p>
          </div>
        </div>
      </div>

      {/* Mapa real */}
      <div className="mx-4 mt-4 mb-4 rounded-2xl overflow-hidden border border-cyan-400/30 shadow-2xl h-64 z-0">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center bg-[#0c1f3a]">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          </div>
        ) : (
          <MapContainer
            center={[40.4, -3.7]}
            zoom={6}
            className="h-full w-full"
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {spots.map((spot) => (
              <Marker
                key={spot.id}
                position={[Number(spot.lat), Number(spot.lng)]}
                icon={defaultIcon}
                eventHandlers={{
                  click: () => setSelectedSpotId((prev) => (prev === spot.id ? null : spot.id)),
                }}
              >
                <Popup>
                  <span className="font-medium">{spot.name}</span>
                  {spot.depth_range && (
                    <p className="text-sm text-gray-600">Profundidad: {spot.depth_range}</p>
                  )}
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        )}
      </div>

      {/* Lista de puntos */}
      <div className="px-4 pb-8 space-y-4">
        {error && (
          <p className="text-amber-200/90 text-center py-4">{error}</p>
        )}
        {!loading && spots.length === 0 && !error && (
          <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-6 border border-cyan-400/20 text-center">
            <MapPin className="w-12 h-12 text-cyan-400/50 mx-auto mb-2" />
            <p className="text-cyan-300/80">No hay puntos de pesca</p>
            <p className="text-cyan-300/60 text-sm mt-1">Añade el primero desde el botón +</p>
          </div>
        )}
        {spots.map((spot, index) => (
          <motion.div
            key={spot.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSelectedSpotId((prev) => (prev === spot.id ? null : spot.id))}
            className={`backdrop-blur-xl rounded-2xl p-5 border shadow-xl cursor-pointer transition-all ${
              selectedSpotId === spot.id
                ? 'bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border-cyan-400/40'
                : 'bg-white/5 border-cyan-400/20'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-cyan-500/20 rounded-xl">
                  <Anchor className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-white text-lg">{spot.name}</h3>
                  <p className="text-cyan-300 text-sm">
                    {Number(spot.lat).toFixed(4)}°, {Number(spot.lng).toFixed(4)}°
                  </p>
                  {spot.creator != null && (
                    <div className="flex items-center gap-2 mt-1">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={spot.creator.avatar_url ?? undefined} alt="" />
                        <AvatarFallback className="bg-cyan-500/30 text-cyan-300 text-[10px]">
                          {(spot.creator.display_name || '?').slice(0, 1)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-cyan-400/80 text-xs">Compartido por {spot.creator.display_name || 'Usuario'}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                {Array.from({ length: spot.rating ?? 5 }).map((_, i) => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-cyan-300/70 mb-1">Profundidad</p>
                <p className="text-white text-sm">{spot.depth_range ?? '—'}</p>
                <div className="mt-2">
                  <p className="text-xs text-cyan-300/70 mb-1">Corrientes</p>
                  <p className="text-white text-sm">{spot.conditions ?? '—'}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-cyan-300/70 mb-1">Jornadas</p>
                <p className="text-white text-sm">{spot.dive_count ?? spot.total_dives ?? 0}</p>
                <div className="mt-2">
                  <p className="text-xs text-cyan-300/70 mb-1">Capturas</p>
                  <p className="text-white text-sm">{spot.catch_count ?? 0}</p>
                </div>
              </div>
              {spot.species && (
                <div className="col-span-2">
                  <p className="text-xs text-cyan-300/70 mb-1">Especies</p>
                  <p className="text-white text-sm">{spot.species}</p>
                </div>
              )}
              {spot.description && (
                <div className="col-span-2">
                  <p className="text-xs text-cyan-300/70 mb-1">Descripción</p>
                  <p className="text-white text-sm line-clamp-2">{spot.description}</p>
                </div>
              )}
            </div>
            {selectedSpotId === spot.id && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-4 pt-4 border-t border-cyan-400/20 space-y-2"
              >
                {spot.image_url && (
                  <div className="mb-3 rounded-xl overflow-hidden border border-cyan-400/20">
                    <img src={spot.image_url} alt={spot.name} className="w-full aspect-video object-cover" />
                  </div>
                )}
                <div className="mb-3">
                  <p className="text-cyan-300/80 text-xs mb-2 flex items-center gap-1">
                    <Fish className="w-3.5 h-3.5" />
                    Capturas en este escenario
                  </p>
                  {(spotCatches[spot.id]?.length ?? 0) > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {spotCatches[spot.id].slice(0, 12).map((c) => (
                        <span
                          key={c.id}
                          className="px-2 py-1 rounded-lg bg-cyan-500/20 text-cyan-200 text-xs"
                        >
                          {c.species}
                        </span>
                      ))}
                      {spotCatches[spot.id].length > 12 && (
                        <span className="text-cyan-300/70 text-xs">+{spotCatches[spot.id].length - 12}</span>
                      )}
                    </div>
                  ) : (
                    <p className="text-cyan-300/60 text-xs">Ninguna captura registrada aún</p>
                  )}
                </div>
                <a
                  href={`https://www.google.com/maps?q=${spot.lat},${spot.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white py-2.5 rounded-xl text-sm text-center"
                >
                  Cómo llegar
                </a>
                {currentUserId != null && spot.user_id != null && String(spot.user_id) === String(currentUserId) && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setEditSpot(spot); }}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm bg-white/10 text-cyan-200 border border-cyan-400/30"
                    >
                      <Pencil className="w-4 h-4" />
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('¿Eliminar este punto de pesca?')) {
                          deleteDiveSpot(spot.id).then(loadSpots).catch((err) => setError(err?.message ?? 'Error al eliminar'));
                          setSelectedSpotId(null);
                        }
                      }}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm bg-red-500/20 text-red-200 border border-red-400/30"
                    >
                      <Trash2 className="w-4 h-4" />
                      Eliminar
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Botón añadir punto */}
      <div className="fixed bottom-6 right-6 z-20">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setAddOpen(true)}
          className="w-14 h-14 rounded-full bg-cyan-500 text-cyan-100 border-2 border-cyan-400/50 shadow-lg flex items-center justify-center"
        >
          <Plus className="w-6 h-6" />
        </motion.button>
      </div>

      {addOpen && (
        <AddSpotDialog
          onClose={() => setAddOpen(false)}
          onSaved={() => {
            setAddOpen(false);
            loadSpots();
          }}
        />
      )}
      {editSpot && (
        <EditSpotDialog
          spot={editSpot}
          onClose={() => setEditSpot(null)}
          onSaved={() => {
            setEditSpot(null);
            setSelectedSpotId(null);
            loadSpots();
          }}
        />
      )}
    </div>
  );
}

/** En el diálogo: al hacer clic en el mapa se actualiza la posición. */
function MapClickPicker({
  onPositionSelect,
  position,
}: {
  onPositionSelect: (lat: number, lng: number) => void;
  position: [number, number] | null;
}) {
  const map = useMap();
  useMapEvents({
    click: (e) => {
      onPositionSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  // Centrar y hacer zoom al elegir posición
  useEffect(() => {
    if (position) {
      map.setView(position, 14);
    }
  }, [position, map]);
  return position ? <Marker position={position} icon={defaultIcon} /> : null;
}

interface AddSpotDialogProps {
  onClose: () => void;
  onSaved: () => void;
}

const DEFAULT_CENTER: [number, number] = [40.4, -3.7];

function AddSpotDialog({ onClose, onSaved }: AddSpotDialogProps) {
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [pickPosition, setPickPosition] = useState<[number, number] | null>(null);
  const [depthRange, setDepthRange] = useState('');
  const [conditions, setConditions] = useState('');
  const [species, setSpecies] = useState('');
  const [description, setDescription] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f?.type.startsWith('image/')) return;
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(f);
    setPhotoPreview(URL.createObjectURL(f));
    e.target.value = '';
  };

  const handleMapPick = (latVal: number, lngVal: number) => {
    setPickPosition([latVal, lngVal]);
    setLat(latVal.toFixed(6));
    setLng(lngVal.toFixed(6));
  };

  const handleSave = async () => {
    setError(null);
    const latN = pickPosition ? pickPosition[0] : parseFloat(lat.replace(',', '.'));
    const lngN = pickPosition ? pickPosition[1] : parseFloat(lng.replace(',', '.'));
    if (!name.trim()) {
      setError('Nombre obligatorio');
      return;
    }
    if (Number.isNaN(latN) || Number.isNaN(lngN)) {
      setError('Haz clic en el mapa o indica latitud y longitud');
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('Debes iniciar sesión');
      return;
    }
    setSaving(true);
    try {
      const created = await createDiveSpot({
        user_id: user.id,
        name: name.trim(),
        city: city.trim() || null,
        lat: latN,
        lng: lngN,
        depth_range: depthRange.trim() || null,
        conditions: conditions.trim() || null,
        species: species.trim() || null,
        description: description.trim() || null,
      });
      const spotId = (created as { id: string }).id;
      if (photoFile) {
        await uploadDiveSpotImage(spotId, photoFile);
      }
      onSaved();
    } catch (e) {
      setError((e as Error)?.message ?? 'Error al crear el punto');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-[#0c1f3a] border-cyan-400/20 text-white max-w-[calc(100%-2rem)]">
        <DialogHeader>
          <DialogTitle className="text-white">Nuevo punto de pesca</DialogTitle>
          <DialogDescription className="text-cyan-300/70 text-sm">
            Los puntos son visibles para todos los usuarios.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div>
            <Label className="text-cyan-200">Nombre</Label>
            <Input
              className="bg-white/10 border-cyan-400/30 text-white mt-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Bajo de la Virgen"
            />
          </div>
          <div>
            <Label className="text-cyan-200">Ciudad o zona (para clasificar)</Label>
            <Input
              className="bg-white/10 border-cyan-400/30 text-white mt-1"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Ej. Valencia, Cabo de Gata"
            />
          </div>
          <div>
            <Label className="text-cyan-200">Posición</Label>
            <p className="text-cyan-300/70 text-xs mt-0.5 mb-2">Haz clic en el mapa para elegir el punto</p>
            <div className="rounded-xl overflow-hidden border border-cyan-400/30 h-44">
              <MapContainer
                center={pickPosition ?? DEFAULT_CENTER}
                zoom={pickPosition ? 14 : 6}
                className="h-full w-full"
                scrollWheelZoom={true}
              >
                <TileLayer
                  attribution='&copy; OpenStreetMap'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapClickPicker onPositionSelect={handleMapPick} position={pickPosition} />
              </MapContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <Label className="text-cyan-200 text-xs">Latitud</Label>
                <Input
                  className="bg-white/10 border-cyan-400/30 text-white mt-1 text-sm"
                  type="text"
                  inputMode="decimal"
                  value={lat}
                  onChange={(e) => { setLat(e.target.value); setPickPosition(null); }}
                  placeholder="40.4125"
                />
              </div>
              <div>
                <Label className="text-cyan-200 text-xs">Longitud</Label>
                <Input
                  className="bg-white/10 border-cyan-400/30 text-white mt-1 text-sm"
                  type="text"
                  inputMode="decimal"
                  value={lng}
                  onChange={(e) => { setLng(e.target.value); setPickPosition(null); }}
                  placeholder="-3.6921"
                />
              </div>
            </div>
          </div>
          <div>
            <Label className="text-cyan-200">Especies (opcional)</Label>
            <Input
              className="bg-white/10 border-cyan-400/30 text-white mt-1"
              value={species}
              onChange={(e) => setSpecies(e.target.value)}
              placeholder="Ej. Dorada, Lubina, Sargo"
            />
          </div>
          <div>
            <Label className="text-cyan-200">Descripción del sitio (opcional)</Label>
            <textarea
              className="w-full mt-1 rounded-xl bg-white/10 border border-cyan-400/30 px-3 py-2 text-white text-sm min-h-[80px] resize-y placeholder:text-cyan-300/50"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej. Bajo rocoso, entrada por playa, suele haber corriente..."
            />
          </div>
          <div>
            <Label className="text-cyan-200">Foto del sitio (opcional)</Label>
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="hidden"
              id="add-spot-photo"
            />
            <label
              htmlFor="add-spot-photo"
              className="mt-1 flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-cyan-400/30 bg-white/5 p-4 cursor-pointer hover:bg-white/10 text-cyan-300/80 text-sm"
            >
              {photoPreview ? (
                <>
                  <img src={photoPreview} alt="" className="h-12 w-12 rounded object-cover" />
                  <span>Cambiar foto</span>
                </>
              ) : (
                <span>Elegir foto del sitio</span>
              )}
            </label>
          </div>
          <div>
            <Label className="text-cyan-200">Profundidad (opcional)</Label>
            <Input
              className="bg-white/10 border-cyan-400/30 text-white mt-1"
              value={depthRange}
              onChange={(e) => setDepthRange(e.target.value)}
              placeholder="Ej. 15-35m"
            />
          </div>
          <div>
            <Label className="text-cyan-200">Corrientes (opcional)</Label>
            <Input
              className="bg-white/10 border-cyan-400/30 text-white mt-1"
              value={conditions}
              onChange={(e) => setConditions(e.target.value)}
              placeholder="Ej. Corriente, rocoso"
            />
          </div>
          {error && <p className="text-red-300 text-sm">{error}</p>}
        </div>
        <DialogFooter>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/10 text-cyan-200 border border-cyan-400/30"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-cyan-600 text-white disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {saving ? 'Guardando...' : 'Crear punto'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface EditSpotDialogProps {
  spot: DiveSpot;
  onClose: () => void;
  onSaved: () => void;
}

function EditSpotDialog({ spot, onClose, onSaved }: EditSpotDialogProps) {
  const [name, setName] = useState(spot.name);
  const [city, setCity] = useState((spot as { city?: string | null }).city ?? '');
  const [lat, setLat] = useState(String(spot.lat));
  const [lng, setLng] = useState(String(spot.lng));
  const [pickPosition, setPickPosition] = useState<[number, number] | null>([Number(spot.lat), Number(spot.lng)]);
  const [depthRange, setDepthRange] = useState(spot.depth_range ?? '');
  const [conditions, setConditions] = useState(spot.conditions ?? '');
  const [species, setSpecies] = useState(spot.species ?? '');
  const [description, setDescription] = useState(spot.description ?? '');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentImage = photoPreview ?? (spot as { image_url?: string | null }).image_url ?? null;

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f?.type.startsWith('image/')) return;
    setPhotoFile(f);
    setPhotoPreview(URL.createObjectURL(f));
    e.target.value = '';
  };

  const handleMapPick = (latVal: number, lngVal: number) => {
    setPickPosition([latVal, lngVal]);
    setLat(latVal.toFixed(6));
    setLng(lngVal.toFixed(6));
  };

  const handleSave = async () => {
    setError(null);
    const latN = pickPosition ? pickPosition[0] : parseFloat(lat.replace(',', '.'));
    const lngN = pickPosition ? pickPosition[1] : parseFloat(lng.replace(',', '.'));
    if (!name.trim()) {
      setError('Nombre obligatorio');
      return;
    }
    if (Number.isNaN(latN) || Number.isNaN(lngN)) {
      setError('Haz clic en el mapa o indica latitud y longitud');
      return;
    }
    setSaving(true);
    try {
      await updateDiveSpot(spot.id, {
        name: name.trim(),
        city: city.trim() || null,
        lat: latN,
        lng: lngN,
        depth_range: depthRange.trim() || null,
        conditions: conditions.trim() || null,
        species: species.trim() || null,
        description: description.trim() || null,
      });
      if (photoFile) {
        await uploadDiveSpotImage(spot.id, photoFile);
      }
      onSaved();
    } catch (e) {
      setError((e as Error)?.message ?? 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-[#0c1f3a] border-cyan-400/20 text-white max-w-[calc(100%-2rem)]">
        <DialogHeader>
          <DialogTitle className="text-white">Editar punto de pesca</DialogTitle>
          <DialogDescription className="text-cyan-300/70 text-sm">
            Solo tú puedes editar este punto porque lo creaste.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div>
            <Label className="text-cyan-200">Nombre</Label>
            <Input
              className="bg-white/10 border-cyan-400/30 text-white mt-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Bajo de la Virgen"
            />
          </div>
          <div>
            <Label className="text-cyan-200">Ciudad o zona (para clasificar)</Label>
            <Input
              className="bg-white/10 border-cyan-400/30 text-white mt-1"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Ej. Valencia, Cabo de Gata"
            />
          </div>
          <div>
            <Label className="text-cyan-200">Posición</Label>
            <p className="text-cyan-300/70 text-xs mt-0.5 mb-2">Haz clic en el mapa para cambiar el punto</p>
            <div className="rounded-xl overflow-hidden border border-cyan-400/30 h-44">
              <MapContainer
                center={pickPosition ?? DEFAULT_CENTER}
                zoom={pickPosition ? 14 : 6}
                className="h-full w-full"
                scrollWheelZoom={true}
              >
                <TileLayer
                  attribution='&copy; OpenStreetMap'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapClickPicker onPositionSelect={handleMapPick} position={pickPosition} />
              </MapContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <Label className="text-cyan-200 text-xs">Latitud</Label>
                <Input
                  className="bg-white/10 border-cyan-400/30 text-white mt-1 text-sm"
                  type="text"
                  inputMode="decimal"
                  value={lat}
                  onChange={(e) => { setLat(e.target.value); setPickPosition(null); }}
                  placeholder="40.4125"
                />
              </div>
              <div>
                <Label className="text-cyan-200 text-xs">Longitud</Label>
                <Input
                  className="bg-white/10 border-cyan-400/30 text-white mt-1 text-sm"
                  type="text"
                  inputMode="decimal"
                  value={lng}
                  onChange={(e) => { setLng(e.target.value); setPickPosition(null); }}
                  placeholder="-3.6921"
                />
              </div>
            </div>
          </div>
          <div>
            <Label className="text-cyan-200">Especies (opcional)</Label>
            <Input
              className="bg-white/10 border-cyan-400/30 text-white mt-1"
              value={species}
              onChange={(e) => setSpecies(e.target.value)}
              placeholder="Ej. Dorada, Lubina, Sargo"
            />
          </div>
          <div>
            <Label className="text-cyan-200">Descripción del sitio (opcional)</Label>
            <textarea
              className="w-full mt-1 rounded-xl bg-white/10 border border-cyan-400/30 px-3 py-2 text-white text-sm min-h-[80px] resize-y placeholder:text-cyan-300/50"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej. Bajo rocoso, entrada por playa..."
            />
          </div>
          <div>
            <Label className="text-cyan-200">Foto del sitio (opcional)</Label>
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="hidden"
              id="edit-spot-photo"
            />
            <label
              htmlFor="edit-spot-photo"
              className="mt-1 flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-cyan-400/30 bg-white/5 p-4 cursor-pointer hover:bg-white/10 text-cyan-300/80 text-sm"
            >
              {currentImage ? (
                <>
                  <img src={currentImage} alt="" className="h-12 w-12 rounded object-cover" />
                  <span>Cambiar foto</span>
                </>
              ) : (
                <span>Elegir foto del sitio</span>
              )}
            </label>
          </div>
          <div>
            <Label className="text-cyan-200">Profundidad (opcional)</Label>
            <Input
              className="bg-white/10 border-cyan-400/30 text-white mt-1"
              value={depthRange}
              onChange={(e) => setDepthRange(e.target.value)}
              placeholder="Ej. 15-35m"
            />
          </div>
          <div>
            <Label className="text-cyan-200">Corrientes (opcional)</Label>
            <Input
              className="bg-white/10 border-cyan-400/30 text-white mt-1"
              value={conditions}
              onChange={(e) => setConditions(e.target.value)}
              placeholder="Ej. Corriente, rocoso"
            />
          </div>
          {error && <p className="text-red-300 text-sm">{error}</p>}
        </div>
        <DialogFooter>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/10 text-cyan-200 border border-cyan-400/30"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-cyan-600 text-white disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
