import { AdminScreen } from '@/app/components/AdminScreen';
import { AppHeader, type Screen } from '@/app/components/AppHeader';
import { CommunityScreen } from '@/app/components/CommunityScreen';
import { DiveLogScreen } from '@/app/components/DiveLogScreen';
import { GalleryScreen } from '@/app/components/GalleryScreen';
import { HomeBackgroundCarousel } from '@/app/components/HomeBackgroundCarousel';
import { HomeScreen } from '@/app/components/HomeScreen';
import { MapScreen } from '@/app/components/MapScreen';
import { MarketplaceScreen } from '@/app/components/MarketplaceScreen';
import { MessagesScreen } from '@/app/components/MessagesScreen';
import { OnboardingScreen } from '@/app/components/OnboardingScreen';
import { ProfileScreen } from '@/app/components/ProfileScreen';
import { QuickLogScreen } from '@/app/components/QuickLogScreen';
import { RegisterScreen } from '@/app/components/RegisterScreen';
import { WeatherScreen } from '@/app/components/WeatherScreen';
import { WebcamScreen } from '@/app/components/WebcamScreen';
import { clearAuthMode, exchangeCodeForSession, getAuthMode } from '@/lib/auth';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { useCallback, useEffect, useRef, useState } from 'react';

const SCREEN_STORAGE_KEY = 'pelagos_current_screen';
const AUTH_ERROR_KEY = 'pelagos_auth_error';
const VALID_SCREENS: Screen[] = ['home', 'log', 'gallery', 'map', 'profile', 'quicklog', 'weather', 'webcam', 'community', 'marketplace', 'messages', 'admin'];

function getStoredScreen(): Screen | null {
  try {
    const stored = localStorage.getItem(SCREEN_STORAGE_KEY);
    if (stored && VALID_SCREENS.includes(stored as Screen)) return stored as Screen;
  } catch {
    /* ignore */
  }
  return null;
}

function setStoredScreen(screen: Screen) {
  try {
    if (VALID_SCREENS.includes(screen)) {
      localStorage.setItem(SCREEN_STORAGE_KEY, screen);
    }
  } catch {
    /* ignore */
  }
}

function setAuthError(error: string | null) {
  if (error) {
    sessionStorage.setItem(AUTH_ERROR_KEY, error);
  } else {
    sessionStorage.removeItem(AUTH_ERROR_KEY);
  }
}

export function getAuthError(): string | null {
  const error = sessionStorage.getItem(AUTH_ERROR_KEY);
  sessionStorage.removeItem(AUTH_ERROR_KEY);
  return error;
}

/** Tiempo sin uso (ms) tras el cual se cierra sesión. 8 horas. */
const INACTIVITY_LOGOUT_MS = 8 * 60 * 60 * 1000;
const INACTIVITY_CHECK_MS = 60 * 1000;

const bgBase = 'bg-[#0a1628]';
const bgGradient = 'bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/20 via-transparent to-transparent';

/**
 * Componente interno que usa el contexto de autenticación
 */
function AppContent() {
  const { session, user, isAuthenticated, isLoading, signOut } = useAuth();
  
  const [currentScreen, setCurrentScreen] = useState<Screen>(() => {
    // Intentar restaurar la última pantalla
    return getStoredScreen() ?? 'home';
  });
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  const lastActivityRef = useRef<number>(Date.now());
  const inactivityIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const profileCheckedRef = useRef<string | null>(null);

  const setScreenAndPersist = useCallback((screen: Screen) => {
    setCurrentScreen(screen);
    setStoredScreen(screen);
  }, []);

  /**
   * Verifica si el usuario tiene nombre en su perfil
   */
  const checkProfileHasName = useCallback(async (userId: string): Promise<boolean> => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', userId)
        .maybeSingle();

      if (!profile) return false;
      return !!(profile.display_name && profile.display_name.trim().length > 0);
    } catch {
      return false;
    }
  }, []);

  /**
   * Efecto para verificar perfil cuando hay sesión
   */
  useEffect(() => {
    if (!isAuthenticated || !user) {
      setNeedsOnboarding(false);
      profileCheckedRef.current = null;
      return;
    }

    // Solo verificar si no lo hemos hecho para este usuario
    if (profileCheckedRef.current === user.id) return;

    const checkProfile = async () => {
      setCheckingProfile(true);
      try {
        const hasName = await checkProfileHasName(user.id);
        profileCheckedRef.current = user.id;
        setNeedsOnboarding(!hasName);
        if (hasName) {
          // Restaurar pantalla guardada o ir a home
          setCurrentScreen(getStoredScreen() ?? 'home');
        }
      } catch {
        // Si falla, asumir que tiene nombre para no bloquear
        setNeedsOnboarding(false);
      } finally {
        setCheckingProfile(false);
      }
    };

    checkProfile();
  }, [isAuthenticated, user, checkProfileHasName]);

  /**
   * Efecto para manejar código OAuth en URL
   */
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.slice(1));
      const code = params.get('code') || hashParams.get('code');

      if (!code) return;

      try {
        const authMode = getAuthMode();
        clearAuthMode();
        
        const success = await exchangeCodeForSession();
        if (!success) return;

        window.history.replaceState({}, '', '/');
        
        const { data: { session: newSession } } = await supabase.auth.getSession();
        if (newSession) {
          const hasName = await checkProfileHasName(newSession.user.id);
          if (authMode === 'login' && !hasName) {
            await supabase.auth.signOut();
            setAuthError('Esta cuenta no está registrada. Por favor, crea una cuenta primero.');
          }
        }
      } catch (err) {
        console.error('[Auth] Error en callback OAuth:', err);
      }
    };

    handleOAuthCallback();
  }, [checkProfileHasName]);

  /**
   * Efecto para cerrar sesión por inactividad
   */
  useEffect(() => {
    if (!isAuthenticated) {
      if (inactivityIntervalRef.current) {
        clearInterval(inactivityIntervalRef.current);
        inactivityIntervalRef.current = null;
      }
      return;
    }

    lastActivityRef.current = Date.now();
    
    const onActivity = () => {
      lastActivityRef.current = Date.now();
    };

    window.addEventListener('click', onActivity);
    window.addEventListener('keydown', onActivity);
    window.addEventListener('mousemove', onActivity);
    window.addEventListener('scroll', onActivity);
    window.addEventListener('touchstart', onActivity);

    inactivityIntervalRef.current = setInterval(() => {
      if (Date.now() - lastActivityRef.current >= INACTIVITY_LOGOUT_MS) {
        if (inactivityIntervalRef.current) {
          clearInterval(inactivityIntervalRef.current);
          inactivityIntervalRef.current = null;
        }
        signOut();
      }
    }, INACTIVITY_CHECK_MS);

    return () => {
      window.removeEventListener('click', onActivity);
      window.removeEventListener('keydown', onActivity);
      window.removeEventListener('mousemove', onActivity);
      window.removeEventListener('scroll', onActivity);
      window.removeEventListener('touchstart', onActivity);
      if (inactivityIntervalRef.current) {
        clearInterval(inactivityIntervalRef.current);
        inactivityIntervalRef.current = null;
      }
    };
  }, [isAuthenticated, signOut]);

  const handleLogout = useCallback(async () => {
    await signOut();
    localStorage.removeItem(SCREEN_STORAGE_KEY);
  }, [signOut]);

  const retryConnection = useCallback(() => {
    setConnectionError(null);
    window.location.reload();
  }, []);

  // Estado: Cargando autenticación
  if (isLoading) {
    return (
      <div className="max-w-md mx-auto relative overflow-hidden min-h-screen">
        <div className={`fixed inset-0 ${bgBase}`} />
        <div className={`fixed inset-0 ${bgGradient}`} />
        <div className="relative z-10 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 rounded-full animate-spin mx-auto mb-4 border-cyan-400/30 border-t-cyan-400" />
            <p className="text-cyan-300/80">Cargando...</p>
          </div>
        </div>
      </div>
    );
  }

  // Estado: Sin sesión - mostrar login
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto relative overflow-hidden min-h-screen">
        <div className={`fixed inset-0 ${bgBase}`} />
        <div className={`fixed inset-0 ${bgGradient}`} />
        <div className="relative z-10 min-h-screen">
          <RegisterScreen
            onNavigate={setCurrentScreen}
            connectionError={connectionError}
            onRetryConnection={retryConnection}
          />
        </div>
      </div>
    );
  }

  // Estado: Verificando perfil
  if (checkingProfile) {
    return (
      <div className="max-w-md mx-auto relative overflow-hidden min-h-screen">
        <div className={`fixed inset-0 ${bgBase}`} />
        <div className={`fixed inset-0 ${bgGradient}`} />
        <div className="relative z-10 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 rounded-full animate-spin mx-auto mb-4 border-cyan-400/30 border-t-cyan-400" />
            <p className="text-cyan-300/80">Verificando perfil...</p>
          </div>
        </div>
      </div>
    );
  }

  // Estado: Con sesión pero perfil incompleto - mostrar onboarding
  if (needsOnboarding && session) {
    return (
      <div className="max-w-md mx-auto relative overflow-hidden min-h-screen">
        <OnboardingScreen
          userId={session.user.id}
          userEmail={session.user.email ?? ''}
          onComplete={() => {
            setNeedsOnboarding(false);
            profileCheckedRef.current = session.user.id;
            setScreenAndPersist('home');
          }}
        />
      </div>
    );
  }

  // Estado: Autenticado con perfil completo - mostrar app
  return (
    <div className="w-full max-w-md mx-auto relative overflow-x-hidden min-h-screen min-h-[100dvh]">
      <div className={`fixed inset-0 ${bgBase}`} />
      {currentScreen !== 'home' && <div className={`fixed inset-0 ${bgGradient}`} />}
      {currentScreen === 'home' && <HomeBackgroundCarousel />}

      <AppHeader
        currentScreen={currentScreen}
        onNavigate={setScreenAndPersist}
        onLogout={handleLogout}
        onSharePost={() => {
          try {
            sessionStorage.setItem('pelagos_open_share_dive', '1');
          } catch {
            /* ignore */
          }
          setScreenAndPersist('community');
        }}
      />

      <div className="relative z-10 pt-[calc(72px+env(safe-area-inset-top,0px))] pb-[env(safe-area-inset-bottom)] min-h-[calc(100dvh-72px)]">
        {currentScreen === 'home' && <HomeScreen onNavigate={setScreenAndPersist} />}
        {currentScreen === 'log' && <DiveLogScreen onNavigate={setScreenAndPersist} />}
        {currentScreen === 'gallery' && <GalleryScreen onNavigate={setScreenAndPersist} />}
        {currentScreen === 'map' && <MapScreen onNavigate={setScreenAndPersist} />}
        {currentScreen === 'profile' && <ProfileScreen onNavigate={setScreenAndPersist} />}
        {currentScreen === 'quicklog' && <QuickLogScreen onNavigate={setScreenAndPersist} />}
        {currentScreen === 'weather' && <WeatherScreen onNavigate={setScreenAndPersist} />}
        {currentScreen === 'webcam' && <WebcamScreen onNavigate={setScreenAndPersist} />}
        {currentScreen === 'community' && <CommunityScreen onNavigate={setScreenAndPersist} />}
        {currentScreen === 'marketplace' && <MarketplaceScreen onNavigate={setScreenAndPersist} />}
        {currentScreen === 'messages' && <MessagesScreen onNavigate={setScreenAndPersist} />}
        {currentScreen === 'register' && <RegisterScreen onNavigate={setScreenAndPersist} />}
        {currentScreen === 'admin' && <AdminScreen onNavigate={setScreenAndPersist} />}
      </div>
    </div>
  );
}

/**
 * Componente raíz con AuthProvider
 */
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
