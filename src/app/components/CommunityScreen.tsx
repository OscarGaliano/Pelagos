import { supabase } from '@/lib/supabase';
import {
    CalendarDays,
    ChevronLeft,
    Fish,
    MapPin,
    Share2,
    Trophy,
    Users,
} from 'lucide-react';
import { motion } from 'motion/react';
import { Component, type ReactNode, useEffect, useState } from 'react';
import { CampeonatosView } from './CampeonatosView';
import { PescasubView } from './PescasubView';
import { QuedadasView } from './QuedadasView';
import SharedDivesView from './SharedDivesView';

class CampeonatosViewErrorBoundary extends Component<
  { children: ReactNode; onBack: () => void },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError = () => ({ hasError: true });

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-b from-[#0a1628] via-[#0c1f3a] to-[#0a1628]">
          <div className="sticky top-0 z-30 backdrop-blur-xl bg-[#0a1628]/90 border-b border-cyan-400/20">
            <div className="px-4 py-3 flex items-center gap-3">
              <button
                type="button"
                onClick={() => { this.setState({ hasError: false }); this.props.onBack(); }}
                className="p-2 rounded-full hover:bg-white/10 flex items-center gap-1"
              >
                <ChevronLeft className="w-6 h-6 text-cyan-400" />
                <span className="text-cyan-400 text-sm font-medium">Volver</span>
              </button>
              <h1 className="text-white text-xl font-medium">Campeonatos y ligas</h1>
            </div>
          </div>
          <div className="p-6">
            <p className="text-cyan-200 mb-4">No se pudo cargar esta sección. Asegúrate de haber aplicado las migraciones de Supabase (tabla <code className="text-cyan-400">leagues</code> y, si usas ligas completas, <code className="text-cyan-400">league_participants</code>).</p>
            <button
              type="button"
              onClick={() => { this.setState({ hasError: false }); this.props.onBack(); }}
              className="px-4 py-2 rounded-xl bg-cyan-500/40 text-cyan-100 font-medium"
            >
              Volver a comunidad
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

type CommunityMenu = 'grupos' | 'compartir' | 'quedadas' | 'pescasub' | 'campeonatos';

const OPEN_QUEDADA_KEY = 'open_quedada_id';
const COMMUNITY_OPEN_QUEDADAS_KEY = 'community_open_quedadas';
const COMMUNITY_OPEN_PESCASUB_KEY = 'community_open_pescasub';

interface CommunityScreenProps {
  onNavigate: (screen: string) => void;
}

const MENUS: Array<{
  id: CommunityMenu;
  label: string;
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  Icon2?: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}> = [
  { id: 'grupos', label: 'Grupos de pescadores', Icon: Users },
  { id: 'compartir', label: 'Compartir jornada', Icon: Share2 },
  { id: 'quedadas', label: 'Quedadas y salidas', Icon: CalendarDays, Icon2: MapPin },
  { id: 'pescasub', label: 'Pescasub', Icon: Fish },
  { id: 'campeonatos', label: 'Campeonatos y ligas', Icon: Trophy },
];

export function CommunityScreen({ onNavigate }: CommunityScreenProps) {
  const [menuActivo, setMenuActivo] = useState<CommunityMenu | null>(null);
  const [initialQuedadaId, setInitialQuedadaId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(COMMUNITY_OPEN_QUEDADAS_KEY) && sessionStorage.getItem(OPEN_QUEDADA_KEY)) {
        const id = sessionStorage.getItem(OPEN_QUEDADA_KEY);
        sessionStorage.removeItem(COMMUNITY_OPEN_QUEDADAS_KEY);
        sessionStorage.removeItem(OPEN_QUEDADA_KEY);
        if (id) {
          setMenuActivo('quedadas');
          setInitialQuedadaId(id);
        }
      } else if (sessionStorage.getItem(COMMUNITY_OPEN_PESCASUB_KEY)) {
        sessionStorage.removeItem(COMMUNITY_OPEN_PESCASUB_KEY);
        setMenuActivo('pescasub');
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Quedadas y salidas: vista completa con crear, listar, detalle e invitaciones
  if (menuActivo === 'quedadas') {
    return (
      <QuedadasView
        onBack={() => { setMenuActivo(null); setInitialQuedadaId(null); }}
        initialQuedadaId={initialQuedadaId}
      />
    );
  }

  // Pescasub: lista de usuarios con avatar, nivel y zona
  if (menuActivo === 'pescasub') {
    return <PescasubView onBack={() => setMenuActivo(null)} onNavigate={onNavigate} />;
  }

  // Campeonatos y ligas: crear (el creador es admin), listar y detalle
  if (menuActivo === 'campeonatos') {
    return (
      <CampeonatosViewErrorBoundary onBack={() => setMenuActivo(null)}>
        <CampeonatosView onBack={() => setMenuActivo(null)} />
      </CampeonatosViewErrorBoundary>
    );
  }

  // Compartir jornada: red social
  if (menuActivo === 'compartir') {
    return <SharedDivesView userId={userId} onBack={() => setMenuActivo(null)} />;
  }

  // Otras subvistas (grupos): placeholder
  if (menuActivo) {
    const menu = MENUS.find((m) => m.id === menuActivo)!;
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a1628] via-[#0c1f3a] to-[#0a1628]">
        <div className="sticky top-0 z-30 backdrop-blur-xl bg-[#0a1628]/90 border-b border-cyan-400/20">
          <div className="px-4 py-3 flex items-center gap-3">
            <motion.button
              onClick={() => setMenuActivo(null)}
              whileTap={{ scale: 0.9 }}
              className="p-2 rounded-full hover:bg-white/10"
            >
              <ChevronLeft className="w-6 h-6 text-cyan-400" />
            </motion.button>
            <h1 className="text-white text-xl font-medium">{menu.label}</h1>
          </div>
        </div>
        <div className="p-6">
          <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-cyan-400/20 p-8 text-center">
            <menu.Icon className="w-14 h-14 text-cyan-400 mx-auto mb-4" />
            <p className="text-cyan-200 text-lg mb-2">{menu.label}</p>
            <p className="text-cyan-300/80 text-sm">
              {menuActivo === 'grupos' && 'Explora y únete a grupos de pescadores submarinos.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Pantalla principal: fondo degradado + iconos como menús
  return (
    <div className="min-h-screen relative flex flex-col items-center justify-start overflow-hidden bg-gradient-to-b from-[#0e5a7a] via-[#0a3d5c] to-[#062535]">
      <div className="relative z-10 flex flex-1 w-full max-w-[1080px] flex-col items-center px-6 pt-[10%] pb-8">
        <h1 className="text-center font-semibold text-white text-3xl leading-tight tracking-tight sm:text-4xl [text-shadow:0_2px_20px_rgba(0,0,0,0.4)]">
          Bienvenido a la comunidad Pelagos
        </h1>
        <p className="mt-4 max-w-lg text-center text-base text-cyan-100/95 sm:text-lg [text-shadow:0_1px_10px_rgba(0,0,0,0.3)]">
          Comparte tus jornadas, únete a grupos, participa en quedadas y campeonatos
        </p>
        <div className="mt-10 grid w-full max-w-2xl grid-cols-2 gap-6 sm:grid-cols-4">
          {MENUS.map(({ id, label, Icon, Icon2 }, i) => (
            <motion.button
              key={id}
              type="button"
              onClick={() => setMenuActivo(id)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
              whileTap={{ scale: 0.95 }}
              className="flex flex-col items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent rounded-2xl"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/30 bg-white/10 shadow-lg backdrop-blur-sm sm:h-20 sm:w-20">
                <div className="relative flex items-center justify-center">
                  <Icon className="h-7 w-7 text-white sm:h-8 sm:w-8" strokeWidth={1.8} />
                  {Icon2 && (
                    <Icon2
                      className="absolute -bottom-0.5 -right-0.5 h-4 w-4 text-cyan-200 sm:h-5 sm:w-5"
                      strokeWidth={2}
                    />
                  )}
                </div>
              </div>
              <span className="mt-3 text-center text-sm font-medium text-white [text-shadow:0_1px_8px_rgba(0,0,0,0.35)]">
                {label}
              </span>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
