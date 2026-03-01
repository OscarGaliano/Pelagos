import type { Session, User } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from './supabase';

interface AuthState {
  session: Session | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthContextType extends AuthState {
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const AUTH_STORAGE_KEY = 'pelagos-auth-state';

/**
 * Guarda el estado de autenticación en localStorage como backup.
 * Esto ayuda a recuperar la sesión si Supabase tarda en restaurar.
 */
function saveAuthState(hasSession: boolean) {
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ hasSession, timestamp: Date.now() }));
  } catch {
    // Ignorar errores de localStorage
  }
}

/**
 * Limpia todos los datos de autenticación de localStorage.
 * Útil cuando hay tokens inválidos o corruptos.
 */
function clearAuthStorage() {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    // Limpiar también los tokens de Supabase
    const supabaseKey = Object.keys(localStorage).find(key => 
      key.startsWith('sb-') && key.endsWith('-auth-token')
    );
    if (supabaseKey) {
      localStorage.removeItem(supabaseKey);
    }
  } catch {
    // Ignorar errores
  }
}

/**
 * Lee el estado de autenticación guardado.
 * Solo es válido si fue guardado en las últimas 24 horas.
 */
function getStoredAuthState(): { hasSession: boolean } | null {
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    const age = Date.now() - (parsed.timestamp || 0);
    // Solo confiar en estado guardado si tiene menos de 24 horas
    if (age > 24 * 60 * 60 * 1000) return null;
    return { hasSession: !!parsed.hasSession };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Estado inicial basado en localStorage como hint (evita flash de login)
  const storedState = getStoredAuthState();
  
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    isAuthenticated: false,
    isLoading: true, // Siempre empezar cargando
    error: null,
  });

  const mountedRef = useRef(true);
  const initCompleteRef = useRef(false);

  /**
   * Actualiza el estado de forma segura (solo si el componente está montado)
   */
  const safeSetState = useCallback((updates: Partial<AuthState>) => {
    if (!mountedRef.current) return;
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  /**
   * Procesa una sesión y actualiza el estado
   */
  const processSession = useCallback((session: Session | null) => {
    const isAuthenticated = !!session;
    saveAuthState(isAuthenticated);
    
    safeSetState({
      session,
      user: session?.user ?? null,
      isAuthenticated,
      isLoading: false,
      error: null,
    });
  }, [safeSetState]);

  /**
   * Cierra sesión
   */
  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      saveAuthState(false);
      safeSetState({
        session: null,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      console.error('[Auth] Error al cerrar sesión:', err);
    }
  }, [safeSetState]);

  /**
   * Refresca la sesión manualmente
   */
  const refreshSession = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      processSession(session);
    } catch (err) {
      console.error('[Auth] Error al refrescar sesión:', err);
    }
  }, [processSession]);

  /**
   * Limpia el error
   */
  const clearError = useCallback(() => {
    safeSetState({ error: null });
  }, [safeSetState]);

  /**
   * Efecto principal: suscripción a cambios de autenticación
   * Este es el ÚNICO lugar donde se maneja la inicialización
   */
  useEffect(() => {
    mountedRef.current = true;
    initCompleteRef.current = false;

    // Log para debugging
    if (import.meta.env.DEV) {
      console.log('[Auth] Iniciando AuthProvider...');
    }

    // Suscribirse a cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mountedRef.current) return;

      if (import.meta.env.DEV) {
        console.log('[Auth] Evento:', event, session ? '(con sesión)' : '(sin sesión)');
      }

      switch (event) {
        case 'INITIAL_SESSION':
          // Primera carga: Supabase restauró (o no) la sesión desde localStorage
          processSession(session);
          initCompleteRef.current = true;
          break;

        case 'SIGNED_IN':
          // Usuario acaba de iniciar sesión
          processSession(session);
          break;

        case 'SIGNED_OUT':
          // Usuario cerró sesión (puede ser por logout o por token inválido)
          // Limpiar todo el storage para evitar tokens corruptos
          clearAuthStorage();
          safeSetState({
            session: null,
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
          initCompleteRef.current = true;
          break;

        case 'TOKEN_REFRESHED':
          // Token renovado automáticamente
          if (session) {
            processSession(session);
          }
          break;

        case 'USER_UPDATED':
          // Datos del usuario actualizados
          if (session) {
            processSession(session);
          }
          break;
      }
    });

    // Timeout de seguridad: si después de 5 segundos no hay respuesta, 
    // marcar como no cargando para evitar pantalla de carga infinita
    const safetyTimeout = setTimeout(() => {
      if (!initCompleteRef.current && mountedRef.current) {
        console.warn('[Auth] Timeout de seguridad: forzando fin de carga');
        safeSetState({ isLoading: false });
        initCompleteRef.current = true;
      }
    }, 5000);

    // Cleanup
    return () => {
      mountedRef.current = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, [processSession, safeSetState]);

  /**
   * Efecto para manejar cambios de visibilidad (cambio de pestaña)
   * Solo refresca si ya estamos autenticados
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      if (!state.isAuthenticated) return;

      // Solo verificar que la sesión sigue válida, sin modificar estado si falla
      supabase.auth.getSession().then(({ data: { session }, error }) => {
        if (!mountedRef.current) return;
        
        if (error) {
          // Si hay error de refresh token, el evento SIGNED_OUT se disparará automáticamente
          // No hacer nada aquí, dejar que el listener lo maneje
          if (import.meta.env.DEV) {
            console.log('[Auth] Error al verificar sesión (se manejará automáticamente):', error.message);
          }
          return;
        }
        
        if (session) {
          // Solo actualizar si hay sesión válida
          safeSetState({ session, user: session.user });
        }
        // Si no hay sesión pero tampoco error, no hacer nada
        // Podría ser un problema temporal de red
      }).catch(() => {
        // Ignorar errores de red silenciosamente
      });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [state.isAuthenticated, safeSetState]);

  const value = useMemo<AuthContextType>(() => ({
    ...state,
    signOut,
    refreshSession,
    clearError,
  }), [state, signOut, refreshSession, clearError]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook para acceder al contexto de autenticación
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
}

/**
 * Hook simplificado para obtener el usuario actual
 */
export function useUser(): User | null {
  const { user } = useAuth();
  return user;
}

/**
 * Hook simplificado para verificar si está autenticado
 */
export function useIsAuthenticated(): boolean {
  const { isAuthenticated, isLoading } = useAuth();
  return !isLoading && isAuthenticated;
}
