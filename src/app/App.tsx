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
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';
import { useEffect, useRef, useState } from 'react';

const SCREEN_STORAGE_KEY = 'pelagos_current_screen';
const AUTH_ERROR_KEY = 'pelagos_auth_error';
const VALID_SCREENS: Screen[] = ['home', 'log', 'gallery', 'map', 'profile', 'quicklog', 'weather', 'webcam', 'community', 'marketplace', 'messages', 'admin'];

function getStoredScreen(): Screen | null {
  try {
    const stored = sessionStorage.getItem(SCREEN_STORAGE_KEY);
    if (stored && VALID_SCREENS.includes(stored as Screen)) return stored as Screen;
  } catch {
    /* ignore */
  }
  return null;
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

const CONNECTION_ERROR_MSG = 'No se pudo conectar al servidor. Comprueba tu conexión a internet e inténtalo de nuevo.';

/** Tiempo sin uso (ms) tras el cual se cierra sesión. 30 minutos. */
const INACTIVITY_LOGOUT_MS = 30 * 60 * 1000;
const INACTIVITY_CHECK_MS = 60 * 1000; // comprobar cada minuto

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [currentScreen, setCurrentScreen] = useState<Screen>('register');
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const inactivityIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const bgBase = 'bg-[#0a1628]';
  const bgGradient = 'bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/20 via-transparent to-transparent';

  const setScreenAndPersist = (screen: Screen) => {
    setCurrentScreen(screen);
    try {
      if (VALID_SCREENS.includes(screen)) sessionStorage.setItem(SCREEN_STORAGE_KEY, screen);
    } catch {
      /* ignore */
    }
  };

  const checkProfileHasName = async (userId: string): Promise<boolean> => {
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
  };

  useEffect(() => {
    let mounted = true;
    let initialSessionHandled = false;

    const applySession = async (s: Session | null) => {
      if (!s) {
        setSession(null);
        setCurrentScreen('register');
        setNeedsOnboarding(false);
        try {
          sessionStorage.removeItem(SCREEN_STORAGE_KEY);
        } catch {
          /* ignore */
        }
        return;
      }
      const hasName = await checkProfileHasName(s.user.id);
      if (!mounted) return;
      setSession(s);
      setNeedsOnboarding(!hasName);
      if (hasName) {
        setCurrentScreen(getStoredScreen() ?? 'home');
      }
    };

    const finishInitialCheck = () => {
      if (!mounted || initialSessionHandled) return;
      initialSessionHandled = true;
      setCheckingProfile(false);
    };

    // En local getSession() a veces no responde (CORS/origen). Forzamos salir de carga tras 800 ms
    // sin depender de ninguna promesa, para que siempre se muestre login o home.
    const forceExitLoading = setTimeout(() => {
      if (!mounted || initialSessionHandled) return;
      initialSessionHandled = true;
      setCheckingProfile(false);
    }, 800);

    // En paralelo intentamos getSession (siempre aplicar resultado para restaurar sesión al refrescar)
    const tryGetSession = setTimeout(() => {
      if (!mounted) return;
      supabase.auth.getSession().then(({ data: { session: fallbackSession } }) => {
        if (!mounted) return;
        setConnectionError(null);
        // Siempre aplicar sesión cuando getSession responde (persistencia al refrescar)
        applySession(fallbackSession ?? null).finally(() => {
          if (mounted) {
            if (!initialSessionHandled) {
              initialSessionHandled = true;
            }
            setCheckingProfile(false);
          }
        });
      }).catch(() => {
        if (mounted && !initialSessionHandled) {
          initialSessionHandled = true;
          setConnectionError(CONNECTION_ERROR_MSG);
          setCheckingProfile(false);
        }
      });
    }, 200);

    // 1) Suscribirse a cambios de auth (INITIAL_SESSION = sesión restaurada de localStorage)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (!mounted) return;
      if (event === 'INITIAL_SESSION') {
        try {
          await applySession(s ?? null);
          if (mounted) setConnectionError(null);
        } catch (err) {
          if (mounted) {
            setSession(null);
            setConnectionError(CONNECTION_ERROR_MSG);
          }
        } finally {
          finishInitialCheck();
        }
        return;
      }
      if (event === 'SIGNED_OUT') {
        setSession(null);
        setCurrentScreen('register');
        setNeedsOnboarding(false);
        try {
          sessionStorage.removeItem(SCREEN_STORAGE_KEY);
        } catch {
          /* ignore */
        }
        return;
      }
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        setSession(s ?? null);
        if (s) {
          const hasName = await checkProfileHasName(s.user.id);
          if (!mounted) return;
          setNeedsOnboarding(!hasName);
          if (hasName) {
            setCurrentScreen(getStoredScreen() ?? 'home');
          }
        }
        if (!initialSessionHandled) finishInitialCheck();
      }
    });

    // 2) Si hay código OAuth en la URL, intercambiarlo (el listener recibirá SIGNED_IN después)
    const init = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.slice(1));
        const code = params.get('code') || hashParams.get('code');

        if (code) {
          const authMode = getAuthMode();
          clearAuthMode();
          await exchangeCodeForSession();
          window.history.replaceState({}, '', '/');
          const { data: { session: newSession } } = await supabase.auth.getSession();
          if (newSession && mounted) {
            const hasName = await checkProfileHasName(newSession.user.id);
            if (authMode === 'login' && !hasName) {
              await supabase.auth.signOut();
              setAuthError('Esta cuenta no está registrada. Por favor, crea una cuenta primero.');
              if (mounted) {
                setSession(null);
                setCurrentScreen('register');
              }
            } else {
              await applySession(newSession);
            }
          }
          if (mounted && !initialSessionHandled) finishInitialCheck();
        }
      } catch (err) {
        console.error('Error inicializando sesión:', err);
        if (mounted && !initialSessionHandled) finishInitialCheck();
      }
    };
    init();

    // 3) Al volver a la pestaña, re-sincronizar sesión con Supabase (evita tener que refrescar si se inició sesión en otra pestaña o el estado se desincronizó)
    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible' || !mounted) return;
      setConnectionError(null);
      supabase.auth.getSession().then(({ data: { session: s } }) => {
        if (!mounted) return;
        if (s) {
          applySession(s);
        } else {
          setSession(null);
          setCurrentScreen('register');
          setNeedsOnboarding(false);
          try {
            sessionStorage.removeItem(SCREEN_STORAGE_KEY);
          } catch {
            /* ignore */
          }
        }
      }).catch(() => {
        if (mounted) setConnectionError(CONNECTION_ERROR_MSG);
      });
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      mounted = false;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      clearTimeout(forceExitLoading);
      clearTimeout(tryGetSession);
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentScreen('register');
    try {
      sessionStorage.removeItem(SCREEN_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  };

  const retryConnection = () => {
    setConnectionError(null);
    setCheckingProfile(true);
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (s) {
        checkProfileHasName(s.user.id).then((hasName) => {
          setSession(s);
          setNeedsOnboarding(!hasName);
          setCurrentScreen(hasName ? (getStoredScreen() ?? 'home') : 'register');
          setCheckingProfile(false);
        });
      } else {
        setSession(null);
        setCheckingProfile(false);
      }
    }).catch(() => {
      setConnectionError(CONNECTION_ERROR_MSG);
      setCheckingProfile(false);
    });
  };

  // Cierre de sesión por inactividad (solo cuando hay sesión)
  useEffect(() => {
    if (!session) {
      if (inactivityIntervalRef.current) {
        clearInterval(inactivityIntervalRef.current);
        inactivityIntervalRef.current = null;
      }
      return;
    }
    lastActivityRef.current = Date.now();
    const onActivity = () => { lastActivityRef.current = Date.now(); };
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
        supabase.auth.signOut();
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
  }, [session]);

  // Cargando verificación de perfil
  if (checkingProfile) {
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

  // Sin sesión: solo pantalla de iniciar sesión / crear cuenta, sin menú
  if (!session) {
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

  // Con sesión pero perfil incompleto: mostrar onboarding
  if (needsOnboarding) {
    return (
      <div className="max-w-md mx-auto relative overflow-hidden min-h-screen">
        <OnboardingScreen
          userId={session.user.id}
          userEmail={session.user.email ?? ''}
          onComplete={() => {
            setNeedsOnboarding(false);
            setScreenAndPersist('home');
          }}
        />
      </div>
    );
  }

  // Con sesión: menú principal y resto de pantallas (responsive + safe-area móvil)
  return (
    <div className="w-full max-w-md mx-auto relative overflow-x-hidden min-h-screen min-h-[100dvh]">
      <div className={`fixed inset-0 ${bgBase}`} />
      {/* En home el carrusel de imágenes es el fondo; en el resto de pantallas el gradiente */}
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

export default App;