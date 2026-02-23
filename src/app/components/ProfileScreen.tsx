import { Button } from '@/app/components/ui/button';
import { Checkbox } from '@/app/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/app/components/ui/select';
import { Switch } from '@/app/components/ui/switch';
import { getDives } from '@/lib/api/dives';
import { deleteAccount, ensureProfile, formatFishingModalities, getProfile, updateProfile, uploadAvatar } from '@/lib/api/profiles';
import { supabase } from '@/lib/supabase';
import type { Dive, Profile } from '@/lib/types';
import type { User } from '@supabase/supabase-js';
import { Award, Calendar, Camera, ChevronLeft, Fish, MapPin, Pencil, Phone, Shield, Trash2, User as UserIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

const EXPERIENCE_LEVELS = [
  { value: 'principiante', label: 'Principiante' },
  { value: 'intermedio', label: 'Intermedio' },
  { value: 'avanzado', label: 'Avanzado' },
  { value: 'profesional', label: 'Profesional' },
] as const;

interface ProfileScreenProps {
  onNavigate: (screen: string) => void;
}

export function ProfileScreen({ onNavigate }: ProfileScreenProps) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [recentDives, setRecentDives] = useState<Dive[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Formulario de edición (valores actuales)
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editEmergencyContact, setEditEmergencyContact] = useState('');
  const [editDepthLimit, setEditDepthLimit] = useState('');
  const [editShareLocation, setEditShareLocation] = useState(true);
  const [editExperienceLevel, setEditExperienceLevel] = useState('principiante');
  const [editPhone, setEditPhone] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editFishingInfantry, setEditFishingInfantry] = useState(true);
  const [editFishingBoat, setEditFishingBoat] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const loadUserAndProfile = async () => {
    const { data: { user: u } } = await supabase.auth.getUser();
    setUser(u ?? null);
    if (u?.id) {
      try {
        const [p, dives] = await Promise.all([getProfile(u.id), getDives(u.id)]);
        setProfile(p ?? null);
        setRecentDives(dives.slice(0, 5));
      } catch {
        setProfile(null);
        setRecentDives([]);
      }
    } else {
      setProfile(null);
      setRecentDives([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadUserAndProfile();
  }, []);

  const displayName =
    profile?.display_name
    || user?.user_metadata?.full_name
    || user?.user_metadata?.username
    || user?.email
    || null;

  const openEdit = () => {
    if (!user) return;
    setEditDisplayName(profile?.display_name ?? user.user_metadata?.full_name ?? user.email ?? '');
    setEditEmergencyContact(profile?.emergency_contact ?? '');
    setEditDepthLimit(profile?.depth_limit_m != null ? String(profile.depth_limit_m) : '25');
    setEditShareLocation(profile?.share_location ?? true);
    setEditExperienceLevel(profile?.experience_level ?? 'principiante');
    setEditPhone(profile?.phone ?? '');
    setEditLocation(profile?.location ?? '');
    setEditFishingInfantry(profile?.fishing_infantry ?? true);
    setEditFishingBoat(profile?.fishing_boat ?? false);
    setEditing(true);
  };

  const saveProfile = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      await ensureProfile(user.id);
      await updateProfile(user.id, {
        display_name: editDisplayName.trim() || null,
        emergency_contact: editEmergencyContact.trim() || null,
        depth_limit_m: editDepthLimit.trim() ? Number(editDepthLimit) : 25,
        share_location: editShareLocation,
        experience_level: editExperienceLevel,
        phone: editPhone.trim() || null,
        location: editLocation.trim() || null,
        fishing_infantry: editFishingInfantry,
        fishing_boat: editFishingBoat,
      });
      await loadUserAndProfile();
      setEditing(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const memberSinceFormatted = profile?.member_since
    ? new Date(profile.member_since).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
    : null;
  const experienceLabel = EXPERIENCE_LEVELS.find((l) => l.value === (profile?.experience_level ?? 'principiante'))?.label ?? 'Principiante';

  // Calcular porcentaje de perfil completado
  const calculateProfileCompletion = (): { percent: number; missing: string[] } => {
    if (!profile) return { percent: 0, missing: ['Todos los datos'] };
    
    const fields = [
      { name: 'Nombre', value: profile.display_name },
      { name: 'Tipo de pesca', value: profile.fishing_infantry || profile.fishing_boat },
      { name: 'Ubicación', value: profile.location },
      { name: 'Teléfono', value: profile.phone },
      { name: 'Foto de perfil', value: profile.avatar_url },
      { name: 'Contacto de emergencia', value: profile.emergency_contact },
    ];
    
    const completed = fields.filter(f => f.value).length;
    const missing = fields.filter(f => !f.value).map(f => f.name);
    const percent = Math.round((completed / fields.length) * 100);
    
    return { percent, missing };
  };

  const { percent: profileCompletion, missing: missingFields } = calculateProfileCompletion();

  const onAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    if (!file.type.startsWith('image/')) return;
    e.target.value = '';
    setAvatarUploading(true);
    try {
      const url = await uploadAvatar(user.id, file);
      setProfile((p) => (p ? { ...p, avatar_url: url } : null));
    } catch (err) {
      console.error(err);
    } finally {
      setAvatarUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a1628] via-[#0c1f3a] to-[#0a1628]">
      {/* Header */}
      <div className="sticky top-0 z-30 backdrop-blur-xl border-b bg-[#0a1628]/80 border-cyan-400/20">
        <div className="px-6 py-4 flex items-center gap-4">
          <motion.button
            onClick={() => onNavigate('home')}
            whileTap={{ scale: 0.9 }}
            className="p-2 rounded-full hover:bg-white/10 active:bg-white/15"
          >
            <ChevronLeft className="w-6 h-6 text-cyan-400" />
          </motion.button>
          <div>
            <h1 className="text-2xl text-white">Mi Perfil</h1>
          </div>
        </div>
      </div>

      {/* Profile Header: avatar + nombre + botón editar */}
      <div className="px-6 pt-6 pb-4">
        <div className="backdrop-blur-xl rounded-3xl p-6 border bg-gradient-to-br from-cyan-500/15 to-blue-600/15 border-cyan-400/25">
          <div className="flex items-start gap-4">
            {/* Avatar: foto o inicial, clicable para subir */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => user && fileInputRef.current?.click()}
                disabled={!user || avatarUploading}
                className="w-20 h-20 rounded-full overflow-hidden border-2 flex items-center justify-center focus:outline-none focus:ring-2 disabled:opacity-60 bg-white/10 border-cyan-400/30 focus:ring-cyan-400/50"
              >
                {avatarUploading ? (
                  <span className="text-sm text-cyan-300">...</span>
                ) : profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : displayName ? (
                  <span className="text-2xl font-bold text-cyan-300">
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                ) : (
                  <span className="text-2xl font-bold text-cyan-300/70">?</span>
                )}
              </button>
              {user && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={onAvatarFileChange}
                  />
                  <span className="absolute bottom-0 right-0 w-7 h-7 rounded-full flex items-center justify-center border bg-cyan-500/90 border-cyan-400/50">
                    <Camera className="w-3.5 h-3.5 text-white" />
                  </span>
                </>
              )}
            </div>
            <div className="flex-1 min-w-0">
              {loading ? (
                <p className="text-sm text-cyan-300/70">Cargando...</p>
              ) : user ? (
                <>
                  <h2 className="text-xl mb-1 text-white">{displayName || 'Usuario'}</h2>
                  {user.email && (
                    <p className="text-cyan-300/70 text-sm truncate">{user.email}</p>
                  )}
                  <p className="text-cyan-400/80 text-xs mt-1">
                    Toca la foto para cambiarla
                  </p>
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={openEdit}
                    className="mt-3 flex items-center gap-2 px-4 py-2 bg-cyan-500/30 text-cyan-200 rounded-xl text-sm border border-cyan-400/30 hover:bg-cyan-500/40"
                  >
                    <Pencil className="w-4 h-4" />
                    Editar datos
                  </motion.button>
                </>
              ) : (
                <>
                  <h2 className="text-white text-xl mb-1">Sin sesión</h2>
                  <p className="text-cyan-300/70 text-sm mb-2">Inicia sesión o regístrate para ver tu perfil</p>
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onNavigate('register')}
                    className="px-4 py-2 bg-cyan-500/30 text-cyan-200 rounded-xl text-sm border border-cyan-400/30"
                  >
                    Iniciar sesión / Registrarse
                  </motion.button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Profile Completion Indicator */}
      {user && profileCompletion < 100 && (
        <div className="px-6 pb-4">
          <div className="backdrop-blur-xl bg-gradient-to-r from-amber-500/15 to-orange-500/15 rounded-2xl p-4 border border-amber-400/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-amber-200 text-sm font-medium">Perfil completado</span>
              <span className="text-amber-300 font-bold">{profileCompletion}%</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${profileCompletion}%` }}
                transition={{ duration: 0.5 }}
                className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full"
              />
            </div>
            {missingFields.length > 0 && (
              <p className="text-amber-300/70 text-xs">
                Falta: {missingFields.slice(0, 3).join(', ')}{missingFields.length > 3 ? '...' : ''}
              </p>
            )}
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={openEdit}
              className="mt-3 w-full py-2 bg-amber-500/30 text-amber-200 rounded-xl text-sm border border-amber-400/30 hover:bg-amber-500/40"
            >
              Completar perfil
            </motion.button>
          </div>
        </div>
      )}

      {/* Stats Overview */}
      <div className="px-6 pb-6">
        <div className="grid grid-cols-3 gap-3">
          <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-4 border border-cyan-400/20">
            <Calendar className="w-5 h-5 text-cyan-400 mb-2" />
            <p className="text-white text-xl font-bold">0</p>
            <p className="text-cyan-300/70 text-xs">Jornadas</p>
          </div>
          <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-4 border border-cyan-400/20">
            <Fish className="w-5 h-5 text-cyan-400 mb-2" />
            <p className="text-white text-xl font-bold">0</p>
            <p className="text-cyan-300/70 text-xs">Capturas</p>
          </div>
          <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-4 border border-cyan-400/20">
            <Award className="w-5 h-5 text-cyan-400 mb-2" />
            <p className="text-white text-xl font-bold">0</p>
            <p className="text-cyan-300/70 text-xs">Logros</p>
          </div>
        </div>
      </div>

      {/* Datos personales (solo si hay usuario y perfil) */}
      {user && (
        <div className="px-6 pb-6">
          <h3 className="text-white text-lg mb-3 flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-cyan-400" />
            Datos personales
          </h3>
          <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-5 border border-cyan-400/20 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-cyan-300/70">Nivel</span>
              <span className="text-white">{experienceLabel}</span>
            </div>
            {memberSinceFormatted && (
              <div className="flex justify-between text-sm">
                <span className="text-cyan-300/70">Miembro desde</span>
                <span className="text-white capitalize">{memberSinceFormatted}</span>
              </div>
            )}
            {profile?.phone && (
              <div className="flex justify-between text-sm items-center gap-2">
                <span className="text-cyan-300/70 flex items-center gap-1"><Phone className="w-4 h-4" /> Teléfono</span>
                <span className="text-white">{profile.phone}</span>
              </div>
            )}
            {profile?.location && (
              <div className="flex justify-between text-sm items-center gap-2">
                <span className="text-cyan-300/70 flex items-center gap-1"><MapPin className="w-4 h-4" /> Zona</span>
                <span className="text-white">{profile.location}</span>
              </div>
            )}
            {profile?.emergency_contact && (
              <div className="flex justify-between text-sm">
                <span className="text-cyan-300/70">Contacto emergencia</span>
                <span className="text-white text-right max-w-[60%]">{profile.emergency_contact}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-cyan-300/70">Límite profundidad</span>
              <span className="text-white">{profile?.depth_limit_m ?? 25} m</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-cyan-300/70">Compartir ubicación</span>
              <span className="text-white">{profile?.share_location ? 'Sí' : 'No'}</span>
            </div>
            <div className="flex justify-between text-sm items-center gap-2">
              <span className="text-cyan-300/70">Tipo de pesca</span>
              <span className="text-white text-right">{formatFishingModalities(profile)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Nivel de experiencia */}
      <div className="px-6 pb-6">
        <h3 className="text-white text-lg mb-3">Nivel de Experiencia</h3>
        <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-5 border border-cyan-400/20">
          <p className="text-cyan-300/70 text-sm">
            {user ? `${experienceLabel}. Registra jornadas para subir de nivel.` : 'Registra jornadas para subir de nivel'}
          </p>
        </div>
      </div>

      {/* Historial */}
      <div className="px-6 pb-6">
        <h3 className="text-white text-lg mb-3">Historial Reciente</h3>
        <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-cyan-400/15 overflow-hidden">
          {recentDives.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-cyan-300/70 text-sm">No hay jornadas registradas</p>
              <p className="text-cyan-300/50 text-xs mt-1">Registra una desde &quot;Registrar Jornada&quot; o &quot;Ver Historial&quot;</p>
            </div>
          ) : (
            <ul className="divide-y divide-cyan-400/10">
              {recentDives.map((dive) => (
                <li key={dive.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-cyan-500/20">
                    <Calendar className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{dive.location_name || 'Sin ubicación'}</p>
                    <p className="text-cyan-300/70 text-xs">
                      {new Date(dive.dive_date + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })} · {dive.duration_minutes} min
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('log')}
                    className="text-cyan-400 text-xs shrink-0"
                  >
                    Ver todo
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Logros */}
      <div className="px-6 pb-6">
        <h3 className="text-white text-lg mb-3">Logros y Retos</h3>
        <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-6 border border-cyan-400/15 text-center">
          <p className="text-cyan-300/70 text-sm">Desbloquea logros al usar la app</p>
        </div>
      </div>

      {/* Seguridad */}
      <div className="px-6 pb-6">
        <h3 className="text-white text-lg mb-3 flex items-center gap-2">
          <Shield className="w-5 h-5 text-cyan-400" />
          Configuración de Seguridad
        </h3>
        <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-5 border border-cyan-400/20">
          <p className="text-cyan-300/70 text-sm mb-4">
            {user ? 'Contacto de emergencia y preferencias se editan en "Editar datos".' : 'Inicia sesión para configurar contacto de emergencia y preferencias.'}
          </p>
          {user && (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 text-red-400 hover:text-red-300 text-sm"
            >
              <Trash2 className="w-4 h-4" />
              Eliminar cuenta
            </button>
          )}
        </div>
      </div>

      {/* Modal eliminar cuenta */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="bg-[#0c1f3a] border-cyan-400/20 text-white max-w-[calc(100%-2rem)]">
          <DialogHeader>
            <DialogTitle className="text-white">Eliminar cuenta</DialogTitle>
          </DialogHeader>
          <p className="text-cyan-200/90 text-sm py-2">
            Esta acción es irreversible. Se eliminarán todos tus datos (perfil, jornadas, publicaciones, etc.). Escribe <strong>ELIMINAR</strong> para confirmar.
          </p>
          <Input
            className="bg-white/10 border-cyan-400/30 text-white placeholder:text-white/50"
            placeholder="Escribe ELIMINAR"
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
          />
          <DialogFooter>
            <Button
              variant="outline"
              className="bg-white/10 border-cyan-400/30 text-white hover:bg-white/20"
              onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteConfirmText !== 'ELIMINAR' || deleting}
              onClick={async () => {
                if (deleteConfirmText !== 'ELIMINAR') return;
                setDeleting(true);
                try {
                  await deleteAccount();
                  await supabase.auth.signOut();
                  setShowDeleteConfirm(false);
                  setDeleteConfirmText('');
                  loadUserAndProfile();
                } catch (e) {
                  alert((e as Error).message ?? 'Error al eliminar la cuenta');
                } finally {
                  setDeleting(false);
                }
              }}
            >
              {deleting ? 'Eliminando…' : 'Eliminar cuenta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Editar datos */}
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="bg-[#0c1f3a] border-cyan-400/20 text-white max-w-[calc(100%-2rem)]">
          <DialogHeader>
            <DialogTitle className="text-white">Editar datos</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2 max-h-[60vh] overflow-y-auto">
            <div className="grid gap-2">
              <Label className="text-cyan-100">Nombre para mostrar</Label>
              <Input
                className="bg-white/10 border-cyan-400/30 text-white placeholder:text-white/50"
                value={editDisplayName}
                onChange={(e) => setEditDisplayName(e.target.value)}
                placeholder="Tu nombre"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-cyan-100">Teléfono</Label>
              <Input
                type="tel"
                className="bg-white/10 border-cyan-400/30 text-white placeholder:text-white/50"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="612 345 678"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-cyan-100">Zona o ciudad</Label>
              <Input
                className="bg-white/10 border-cyan-400/30 text-white placeholder:text-white/50"
                value={editLocation}
                onChange={(e) => setEditLocation(e.target.value)}
                placeholder="Ej. Costa Brava, Barcelona"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-cyan-100">Nivel de experiencia</Label>
              <Select value={editExperienceLevel} onValueChange={setEditExperienceLevel}>
                <SelectTrigger className="bg-white/10 border-cyan-400/30 text-white">
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent className="bg-[#0c1f3a] border-cyan-400/20">
                  {EXPERIENCE_LEVELS.map(({ value, label }) => (
                    <SelectItem key={value} value={value} className="text-white focus:bg-cyan-500/20">
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label className="text-cyan-100">Contacto de emergencia</Label>
              <Input
                className="bg-white/10 border-cyan-400/30 text-white placeholder:text-white/50"
                value={editEmergencyContact}
                onChange={(e) => setEditEmergencyContact(e.target.value)}
                placeholder="Nombre y teléfono"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-cyan-100">Límite de profundidad (m)</Label>
              <Input
                type="number"
                step="any"
                className="bg-white/10 border-cyan-400/30 text-white placeholder:text-white/50"
                value={editDepthLimit}
                onChange={(e) => setEditDepthLimit(e.target.value)}
                placeholder="25"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-cyan-100">Compartir ubicación</Label>
              <Switch
                checked={editShareLocation}
                onCheckedChange={setEditShareLocation}
                className="data-[state=checked]:bg-cyan-500"
              />
            </div>
            <div className="space-y-3">
              <Label className="text-cyan-100">Tipo de pesca</Label>
              <p className="text-cyan-200/80 text-xs">Puedes marcar uno o los dos</p>
              <label className="flex items-center gap-3 text-white cursor-pointer">
                <Checkbox
                  checked={editFishingInfantry}
                  onCheckedChange={(c) => setEditFishingInfantry(!!c)}
                  className="border-cyan-400/50 data-[state=checked]:bg-cyan-500"
                />
                <span>Infantería</span>
              </label>
              <label className="flex items-center gap-3 text-white cursor-pointer">
                <Checkbox
                  checked={editFishingBoat}
                  onCheckedChange={(c) => setEditFishingBoat(!!c)}
                  className="border-cyan-400/50 data-[state=checked]:bg-cyan-500"
                />
                <span>Desde embarcación</span>
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="bg-white/10 border-cyan-400/30 text-white hover:bg-white/20"
              onClick={() => setEditing(false)}
            >
              Cancelar
            </Button>
            <Button
              className="bg-cyan-500 text-white hover:bg-cyan-600"
              onClick={saveProfile}
              disabled={saving}
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
