import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { getUnreadCount } from '@/lib/api/messages';
import { getUnreadNotificationsCount } from '@/lib/api/notifications';
import { supabase } from '@/lib/supabase';
import { Anchor, Bell, Cloud, History, Home, Image, LogOut, Menu, MessageCircle, PlusCircle, Shield, ShoppingBag, User, Users, Video } from 'lucide-react';
import { useEffect, useState } from 'react';

export type Screen =
  | 'home'
  | 'log'
  | 'gallery'
  | 'map'
  | 'profile'
  | 'quicklog'
  | 'weather'
  | 'webcam'
  | 'community'
  | 'marketplace'
  | 'messages'
  | 'register'
  | 'admin';

const MENU_ITEMS: { id: Screen; label: string; icon: React.ElementType }[] = [
  { id: 'home', label: 'Inicio', icon: Home },
  { id: 'profile', label: 'Mi Perfil', icon: User },
  { id: 'messages', label: 'Mensajes', icon: MessageCircle },
  { id: 'weather', label: 'Condiciones y Mareas', icon: Cloud },
  { id: 'quicklog', label: 'Registrar Jornada', icon: PlusCircle },
  { id: 'log', label: 'Ver Historial', icon: History },
  { id: 'gallery', label: 'Galería de Capturas', icon: Image },
  { id: 'webcam', label: 'Webcams en Directo', icon: Video },
  { id: 'map', label: 'Escenarios de pesca', icon: Anchor },
  { id: 'community', label: 'Comunidad', icon: Users },
  { id: 'marketplace', label: 'Mercadillo', icon: ShoppingBag },
];

interface AppHeaderProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
  onLogout?: () => void;
}

export function AppHeader({ currentScreen, onNavigate, onLogout }: AppHeaderProps) {
  const isDark = true;
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [msgCount, notifCount] = await Promise.all([
          getUnreadCount(),
          getUnreadNotificationsCount(),
        ]);
        setUnreadMessages(msgCount);
        setUnreadNotifications(notifCount);

        // Verificar si es admin
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('is_app_admin')
            .eq('id', user.id)
            .maybeSingle();
          setIsAdmin(profile?.is_app_admin || false);
        }
      } catch {
        // Ignorar errores
      }
    };

    loadData();

    // Recargar cada 30 segundos
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [currentScreen]);

  const totalUnread = unreadMessages + unreadNotifications;

  const isTransparent = currentScreen === 'home' || currentScreen === 'register';
  
  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 ${
        isTransparent
          ? 'bg-transparent border-none'
          : isDark 
            ? 'backdrop-blur-xl bg-[#0a1628]/90 border-b border-cyan-400/20'
            : 'backdrop-blur-xl bg-slate-100 border-b border-slate-400/50'
      }`}
    >
      <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
        {/* Botón de notificaciones */}
        <button
          type="button"
          onClick={() => onNavigate('messages')}
          className={`relative p-2.5 rounded-xl backdrop-blur-md border focus:outline-none focus:ring-2 ${
            isTransparent
              ? 'bg-black/30 border-white/20 text-white hover:bg-black/40 focus:ring-cyan-400/50'
              : isDark
                ? 'bg-cyan-500/10 border-cyan-400/20 text-white hover:bg-cyan-500/20 focus:ring-cyan-400/50'
                : 'bg-blue-600/10 border-blue-900/10 text-blue-900 hover:bg-blue-600/20 focus:ring-blue-600/50'
          }`}
          aria-label="Notificaciones"
        >
          <Bell className="w-5 h-5" />
          {totalUnread > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
              {totalUnread > 9 ? '9+' : totalUnread}
            </span>
          )}
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={`p-2.5 rounded-xl backdrop-blur-md border focus:outline-none focus:ring-2 ${
                isTransparent
                  ? 'bg-black/30 border-white/20 text-white hover:bg-black/40 focus:ring-cyan-400/50'
                  : isDark
                    ? 'bg-cyan-500/10 border-cyan-400/20 text-white hover:bg-cyan-500/20 focus:ring-cyan-400/50'
                    : 'bg-blue-600/10 border-blue-900/10 text-blue-900 hover:bg-blue-600/20 focus:ring-blue-600/50'
              }`}
              aria-label="Abrir menú"
            >
              <Menu className="w-6 h-6" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            side="bottom"
            sideOffset={8}
            className={`min-w-[240px] shadow-xl ${
              isDark 
                ? 'bg-[#0c1f3a] border-cyan-400/20 text-white' 
                : 'bg-white border-slate-300 text-slate-900 shadow-lg'
            }`}
          >
            {MENU_ITEMS.map(({ id, label, icon: Icon }) => (
              <DropdownMenuItem
                key={id}
                onClick={() => onNavigate(id)}
                className={`flex items-center gap-3 py-2.5 px-3 cursor-pointer ${
                  isDark
                    ? `focus:bg-cyan-500/20 focus:text-cyan-100 ${currentScreen === id ? 'bg-cyan-500/15 text-cyan-300' : ''}`
                    : `focus:bg-blue-600/10 focus:text-blue-900 ${currentScreen === id ? 'bg-blue-600/10 text-blue-700' : ''}`
                }`}
              >
                <div className="relative">
                  <Icon className={`w-4 h-4 shrink-0 ${isDark ? 'text-cyan-400' : 'text-blue-600'}`} />
                  {id === 'messages' && unreadMessages > 0 && (
                    <span className={`absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-white text-[10px] font-bold flex items-center justify-center ${isDark ? 'bg-cyan-500' : 'bg-blue-600'}`}>
                      {unreadMessages > 9 ? '9+' : unreadMessages}
                    </span>
                  )}
                </div>
                <span className="flex-1">{label}</span>
                {id === 'messages' && unreadMessages > 0 && (
                  <span className={`w-5 h-5 rounded-full text-white text-xs font-bold flex items-center justify-center ${isDark ? 'bg-cyan-500' : 'bg-blue-600'}`}>
                    {unreadMessages > 9 ? '9+' : unreadMessages}
                  </span>
                )}
              </DropdownMenuItem>
            ))}
            {isAdmin && (
              <>
                <DropdownMenuSeparator className="bg-amber-400/20" />
                <DropdownMenuItem
                  onClick={() => onNavigate('admin')}
                  className={`flex items-center gap-3 py-2.5 px-3 cursor-pointer focus:bg-amber-500/20 focus:text-amber-100 ${
                    currentScreen === 'admin' ? 'bg-amber-500/15 text-amber-300' : ''
                  }`}
                >
                  <Shield className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-amber-200">Panel Admin</span>
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator className={isDark ? 'bg-white/10' : 'bg-slate-300'} />
            <DropdownMenuItem
              onClick={() => (onLogout ? onLogout() : onNavigate('home'))}
              className={`flex items-center gap-3 py-2.5 px-3 cursor-pointer ${isDark ? 'focus:bg-cyan-500/20 focus:text-cyan-100' : 'focus:bg-blue-600/10'}`}
            >
              <LogOut className={`w-4 h-4 shrink-0 ${isDark ? 'text-cyan-400' : 'text-blue-600'}`} />
              <span>Cerrar sesión</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="flex-1 min-w-0">
          <h1 className={`font-semibold truncate drop-shadow-md ${isTransparent ? 'text-white' : isDark ? 'text-white' : 'text-blue-900'}`}>Pelagos</h1>
          <p className={`text-xs truncate drop-shadow-md ${isTransparent ? 'text-white/90' : isDark ? 'text-white/90' : 'text-blue-800/80'}`}>Pesca submarina</p>
        </div>
      </div>
    </header>
  );
}
