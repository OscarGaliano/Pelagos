import { AdminScreen } from '@/app/components/AdminScreen';
import { AppHeader, type Screen } from '@/app/components/AppHeader';
import { CommunityScreen } from '@/app/components/CommunityScreen';
import { DiveLogScreen } from '@/app/components/DiveLogScreen';
import { GalleryScreen } from '@/app/components/GalleryScreen';
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
import { exchangeCodeForSession } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

const SCREEN_STORAGE_KEY = 'pelagos_current_screen';
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

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [currentScreen, setCurrentScreen] = useState<Screen>('register');
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(true);
  
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

    // Timeout de seguridad: si después de 5 segundos sigue cargando, forzar fin
    const timeout = setTimeout(() => {
      if (mounted && checkingProfile) {
        console.warn('Timeout de carga alcanzado');
        setCheckingProfile(false);
      }
    }, 5000);

    const init = async () => {
      try {
        // Primero verificar si hay sesión existente en localStorage
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        
        if (existingSession) {
          // Ya hay sesión, usarla directamente
          if (!mounted) return;
          setSession(existingSession);
          
          const hasName = await checkProfileHasName(existingSession.user.id);
          if (!mounted) return;
          setNeedsOnboarding(!hasName);
          if (hasName) {
            const stored = getStoredScreen();
            setCurrentScreen(stored ?? 'home');
          }
        } else {
          // No hay sesión, verificar si hay código OAuth en la URL
          const params = new URLSearchParams(window.location.search);
          const hashParams = new URLSearchParams(window.location.hash.slice(1));
          const code = params.get('code') || hashParams.get('code');

          if (code) {
            try {
              await exchangeCodeForSession();
              // Limpiar URL
              window.history.replaceState({}, '', '/');
              
              // Obtener la nueva sesión
              const { data: { session: newSession } } = await supabase.auth.getSession();
              if (newSession && mounted) {
                setSession(newSession);
                const hasName = await checkProfileHasName(newSession.user.id);
                if (!mounted) return;
                setNeedsOnboarding(!hasName);
                if (hasName) {
                  setCurrentScreen(getStoredScreen() ?? 'home');
                }
              }
            } catch {
              window.history.replaceState({}, '', '/');
            }
          }
        }
      } catch (err) {
        console.error('Error inicializando sesión:', err);
      }
      
      if (mounted) {
        setCheckingProfile(false);
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, s) => {
      if (!mounted) return;
      setSession(s);
      if (!s) {
        setCurrentScreen('register');
        setNeedsOnboarding(false);
        try {
          sessionStorage.removeItem(SCREEN_STORAGE_KEY);
        } catch {
          /* ignore */
        }
      } else {
        const hasName = await checkProfileHasName(s.user.id);
        if (!mounted) return;
        setNeedsOnboarding(!hasName);
        if (hasName) {
          setCurrentScreen(getStoredScreen() ?? 'home');
        }
      }
    });

    return () => {
      mounted = false;
      clearTimeout(timeout);
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
          <RegisterScreen onNavigate={setCurrentScreen} />
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

  // Con sesión: menú principal y resto de pantallas
  return (
    <div className="max-w-md mx-auto relative overflow-hidden min-h-screen">
      <div className={`fixed inset-0 ${bgBase}`} />
      <div className={`fixed inset-0 ${bgGradient}`} />

      <AppHeader
        currentScreen={currentScreen}
        onNavigate={setScreenAndPersist}
        onLogout={handleLogout}
      />

      <div className="relative z-10 pt-[72px]">
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