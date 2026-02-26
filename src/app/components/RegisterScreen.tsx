import { getAuthError } from '@/app/App';
import { Button } from '@/app/components/ui/button';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/app/components/ui/radio-group';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/app/components/ui/select';
import { SPANISH_CITIES } from '@/data/spanishCities';
import { signInWithGoogle } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, ChevronRight, Mail } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import Slider from 'react-slick';

const HERO_IMAGES = [
  'https://images.unsplash.com/photo-1717935492829-fce9ce727a7a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmcmVlZGl2aW5nJTIwc3BlYXJmaXNoaW5nJTIwYXBuZWF8ZW58MXx8fHwxNzcwMTk3OTMzfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
  'https://images.unsplash.com/photo-1462947760324-15811216b688?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx1bmRlcndhdGVyJTIwZnJlZWRpdmVyJTIwc3BlYXJ8ZW58MXx8fHwxNzcwMTk3OTM0fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
  'https://images.unsplash.com/photo-1621451611787-fe22bb474d48?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmcmVlZGl2aW5nJTIwdW5kZXJ3YXRlciUyMGJsdWUlMjBvY2VhbnxlbnwxfHx8fDE3NzAxOTc5MzZ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
];

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

const FISHING_LEVELS = [
  { value: 'principiante', label: 'Principiante' },
  { value: 'intermedio', label: 'Intermedio' },
  { value: 'avanzado', label: 'Avanzado' },
  { value: 'profesional', label: 'Profesional' },
];

const APNEA_LEVELS = [
  { value: 'basico', label: 'Básico' },
  { value: 'medio', label: 'Medio' },
  { value: 'avanzado', label: 'Avanzado' },
];

interface RegisterScreenProps {
  onNavigate?: (screen: string) => void;
  onBack?: () => void;
  /** Mensaje cuando falla la conexión con el servidor (ej. ERR_CONNECTION_CLOSED). */
  connectionError?: string | null;
  /** Llamar para reintentar conectar (getSession). */
  onRetryConnection?: () => void;
}

export function RegisterScreen({ onNavigate, onBack, connectionError, onRetryConnection }: RegisterScreenProps) {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    surname: '',
    birthDate: '',
    country: '',
    fishingLevel: '',
    modalityInfantry: true,
    modalityBoat: false,
    region: '',
    province: '',
    usualZone: '',
    city: '',
    postalCode: '',
    aloneOrAccompanied: '',
    emergencyName: '',
    emergencyPhone: '',
    apneaLevel: '',
    language: 'es',
    units: 'metric',
    notifySeaAlerts: true,
    notifyWeather: true,
    notifyDangerZones: true,
  });

  const sliderSettings = {
    dots: true,
    infinite: true,
    speed: 800,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 5000,
    fade: true,
    arrows: false,
  };

  const update = (key: string, value: string | boolean) =>
    setForm((f) => ({ ...f, [key]: value }));

  const totalSteps = 5;
  const isSocialStep = step === 0;

  const [loginError, setLoginError] = useState<string | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registerSuccess, setRegisterSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [welcomeName, setWelcomeName] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMessage, setForgotMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Verificar si hay error de autenticación al cargar
  const [authErrorChecked, setAuthErrorChecked] = useState(false);
  if (!authErrorChecked) {
    const authError = getAuthError();
    if (authError) {
      setLoginError(authError);
    }
    setAuthErrorChecked(true);
  }

  const handleGoogleSignIn = async (mode: 'login' | 'register') => {
    setLoginError(null);
    setRegisterError(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle(mode);
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Error al conectar con Gmail';
      if (mode === 'login') {
        setLoginError(errorMsg);
      } else {
        setRegisterError(errorMsg);
      }
      setGoogleLoading(false);
    }
  };

  const handleLogin = async () => {
    setLoginError(null);
    if (!loginEmail.trim() || !loginPassword) {
      setLoginError('Introduce email y contraseña.');
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail.trim(),
      password: loginPassword,
    });
    if (error) {
      const m = (error.message || '').toLowerCase();
      let msg: string;
      if (m.includes('invalid login credentials') || m.includes('invalid_credentials')) {
        msg = 'Email o contraseña incorrectos. Comprueba los datos o crea una cuenta si aún no te has registrado.';
      } else if (m.includes('email not confirmed') || m.includes('email_not_confirmed')) {
        msg = 'Revisa tu correo y haz clic en el enlace para confirmar la cuenta antes de iniciar sesión.';
      } else {
        msg = error.message || 'No se pudo iniciar sesión. Comprueba email y contraseña.';
      }
      setLoginError(msg);
      return;
    }
    onNavigate?.('home');
  };

  const handleFinishRegister = async () => {
    setRegisterError(null);
    setRegisterSuccess(null);
    if (!form.email.trim()) {
      setRegisterError('El email es obligatorio.');
      return;
    }
    if (!form.password) {
      setRegisterError('La contraseña es obligatoria.');
      return;
    }
    if (form.password.length < 6) {
      setRegisterError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setRegisterError('La contraseña y la confirmación no coinciden.');
      return;
    }
    setIsSubmitting(true);
    const redirectUrl = `${window.location.origin}/auth/callback`;
    const { data, error } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: [form.name, form.surname].filter(Boolean).join(' ').trim() || undefined,
          username: form.username || undefined,
          fishing_level: form.fishingLevel || undefined,
          apnea_level: form.apneaLevel || undefined,
          country: form.country || undefined,
          language: form.language,
          units: form.units,
        },
      },
    });
    setIsSubmitting(false);
    if (error) {
      const msg = error.message || 'Error al crear la cuenta.';
      setRegisterError(
        error.message?.includes('already registered') || error.message?.includes('already exists')
          ? 'Este email ya está registrado. Usa "Iniciar sesión" o recupera la contraseña.'
          : msg
      );
      return;
    }
    if (data?.user && !data?.session) {
      setRegisterSuccess('Cuenta creada. Revisa tu correo para confirmar el email y luego inicia sesión.');
      return;
    }
    const name = data?.user?.user_metadata?.full_name || form.name?.trim() || form.username?.trim() || form.email?.trim() || 'usuario';
    setWelcomeName(name);
    setTimeout(() => {
      setWelcomeName(null);
      onNavigate?.('home');
    }, 2200);
  };

  const handleForgotPassword = async () => {
    setForgotMessage(null);
    if (!forgotEmail.trim()) {
      setForgotMessage({ type: 'error', text: 'Introduce tu email.' });
      return;
    }
    setIsSendingReset(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
      redirectTo: `${window.location.origin}/auth/callback`,
    });
    setIsSendingReset(false);
    if (error) {
      setForgotMessage({ type: 'error', text: error.message || 'No se pudo enviar el enlace.' });
      return;
    }
    setForgotMessage({ type: 'success', text: 'Revisa tu correo. Te hemos enviado un enlace para restablecer la contraseña.' });
  };

  return (
    <div className="relative min-h-screen bg-[#0a1628]">
      {/* Mensaje de bienvenida tras registro */}
      {welcomeName && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#0c1f3a] border border-cyan-400/30 rounded-2xl px-8 py-6 shadow-2xl text-center"
          >
            <p className="text-2xl font-semibold text-white">
              Bienvenido/a, {welcomeName}
            </p>
            <p className="text-cyan-200/80 text-sm mt-2">Redirigiendo...</p>
          </motion.div>
        </div>
      )}

      {/* Modal Olvidaste contraseña */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="backdrop-blur-xl bg-[#0c1f3a]/95 border border-cyan-400/20 rounded-2xl p-6 shadow-xl w-full max-w-sm"
          >
            <h3 className="text-white text-lg font-semibold mb-1">Restablecer contraseña</h3>
            <p className="text-cyan-200/80 text-sm mb-4">
              Introduce tu email y te enviaremos un enlace para crear una nueva contraseña.
            </p>
            {forgotMessage && (
              <p className={`text-sm mb-3 rounded-lg px-3 py-2 ${
                forgotMessage.type === 'success'
                  ? 'text-emerald-300/90 bg-emerald-500/10 border border-emerald-400/30'
                  : 'text-amber-300/90 bg-amber-500/10 border border-amber-400/30'
              }`}>
                {forgotMessage.text}
              </p>
            )}
            <div className="grid gap-2 mb-4">
              <Label className="text-cyan-100">Email</Label>
              <Input
                type="email"
                className="bg-white/10 border-cyan-400/30 text-white placeholder:text-white/50"
                placeholder="correo@ejemplo.com"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-11 bg-white/10 border-white/30 text-white hover:bg-white/20"
                onClick={() => { setShowForgotPassword(false); setForgotMessage(null); setForgotEmail(''); }}
              >
                Volver
              </Button>
              <Button
                type="button"
                className="flex-1 h-11 bg-cyan-500/90 text-white hover:bg-cyan-500 border-cyan-400/50 disabled:opacity-60"
                onClick={handleForgotPassword}
                disabled={isSendingReset}
              >
                {isSendingReset ? 'Enviando…' : 'Enviar enlace'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Fondo: mismas imágenes que Home */}
      <div className="absolute inset-0 h-screen -mt-[72px] pt-[72px] overflow-hidden">
        <Slider {...sliderSettings} className="h-full">
          {HERO_IMAGES.map((img, index) => (
            <div key={index} className="relative h-screen">
              <div
                className="h-full w-full bg-cover bg-center"
                style={{ backgroundImage: `url(${img})` }}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0a1628]/95" />
            </div>
          ))}
        </Slider>
      </div>

      {/* Contenido: panel desplazable sobre el fondo */}
      <div className="absolute inset-0 z-10 flex flex-col pt-[88px] pb-6 px-4">
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="max-w-md mx-auto">
            {/* Error de conexión (ERR_CONNECTION_CLOSED / Failed to fetch) */}
            {connectionError && onRetryConnection && (
              <div className="mb-4 rounded-xl bg-amber-500/20 border border-amber-400/40 px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <p className="text-amber-200 text-sm flex-1">{connectionError}</p>
                <Button
                  type="button"
                  onClick={onRetryConnection}
                  className="shrink-0 h-9 px-4 bg-amber-500/80 hover:bg-amber-500 text-white border-amber-400/50"
                >
                  Reintentar
                </Button>
              </div>
            )}
            {/* Tabs Iniciar sesión / Crear cuenta */}
            <div className="flex rounded-xl bg-white/10 p-1 mb-4 border border-cyan-400/20">
              <button
                type="button"
                onClick={() => { setIsLoginMode(true); setStep(0); }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isLoginMode ? 'bg-cyan-500/80 text-white' : 'text-cyan-200/80 hover:text-white'
                }`}
              >
                Iniciar sesión
              </button>
              <button
                type="button"
                onClick={() => { setIsLoginMode(false); setStep(0); }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  !isLoginMode ? 'bg-cyan-500/80 text-white' : 'text-cyan-200/80 hover:text-white'
                }`}
              >
                Crear cuenta
              </button>
            </div>

            {/* Indicador de paso (solo en modo Crear cuenta y con pasos) */}
            {!isLoginMode && (
              <div className="flex items-center justify-center gap-1 mb-4">
                {Array.from({ length: totalSteps }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 rounded-full transition-colors ${
                      i <= step ? 'bg-cyan-400' : 'bg-white/20'
                    }`}
                  />
                ))}
              </div>
            )}

            <AnimatePresence mode="wait">
              {step === 0 && isLoginMode && (
                <motion.div
                  key="login"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="backdrop-blur-xl bg-[#0c1f3a]/90 rounded-2xl border border-cyan-400/20 p-6 shadow-xl"
                >
                  <h2 className="text-white text-xl font-semibold mb-1">Iniciar sesión</h2>
                  <p className="text-cyan-200/80 text-sm mb-4">
                    Elige una opción para entrar.
                  </p>
                  {loginError && (
                    <p className="text-amber-300/90 text-sm mb-3 bg-amber-500/10 border border-amber-400/30 rounded-lg px-3 py-2">
                      {loginError}
                    </p>
                  )}
                  <div className="space-y-4">
                    <p className="text-cyan-100 text-xs font-medium">Entrar con Gmail</p>
                    <button
                      type="button"
                      onClick={() => handleGoogleSignIn('login')}
                      disabled={googleLoading}
                      className="w-full h-12 rounded-xl flex items-center justify-center gap-2 bg-white hover:bg-gray-100 text-gray-800 font-semibold border-2 border-gray-200 shadow-md disabled:opacity-60 text-base"
                    >
                      {googleLoading ? (
                        <span className="text-sm">Redirigiendo...</span>
                      ) : (
                        <>
                          <GoogleIcon className="w-6 h-6 flex-shrink-0" />
                          <span>Continuar con Gmail</span>
                        </>
                      )}
                    </button>
                    <div className="relative flex items-center gap-2">
                      <div className="flex-1 h-px bg-white/20" />
                      <span className="text-cyan-300/70 text-xs">o con email</span>
                      <div className="flex-1 h-px bg-white/20" />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-cyan-100">Email</Label>
                      <Input
                        type="email"
                        className="bg-white/10 border-cyan-400/30 text-white placeholder:text-white/50"
                        placeholder="correo@ejemplo.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-cyan-100">Contraseña</Label>
                      <Input
                        type="password"
                        className="bg-white/10 border-cyan-400/30 text-white placeholder:text-white/50"
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(true)}
                        className="text-right text-sm text-cyan-400 hover:text-cyan-300 underline underline-offset-2"
                      >
                        ¿Olvidaste tu contraseña?
                      </button>
                    </div>
                    <Button
                      type="button"
                      className="w-full h-11 bg-cyan-500/90 text-white hover:bg-cyan-500 border-cyan-400/50"
                      onClick={handleLogin}
                    >
                      Entrar
                    </Button>
                  </div>
                  <p className="text-center text-cyan-300/80 text-sm mt-4">
                    ¿No tienes cuenta?{' '}
                    <button
                      type="button"
                      onClick={() => setIsLoginMode(false)}
                      className="text-cyan-400 font-medium underline underline-offset-2"
                    >
                      Crear cuenta
                    </button>
                  </p>
                </motion.div>
              )}

              {step === 0 && !isLoginMode && (
                <motion.div
                  key="social"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="backdrop-blur-xl bg-[#0c1f3a]/90 rounded-2xl border border-cyan-400/20 p-6 shadow-xl"
                >
                  <h2 className="text-white text-xl font-semibold mb-1">Crear cuenta</h2>
                  <p className="text-cyan-200/80 text-sm mb-4">
                    Elige una opción para registrarte.
                  </p>
                  <div className="space-y-3">
                    <p className="text-cyan-100 text-xs font-medium">Crear cuenta con Gmail</p>
                    <button
                      type="button"
                      onClick={() => handleGoogleSignIn('register')}
                      disabled={googleLoading}
                      className="w-full h-12 rounded-xl flex items-center justify-center gap-2 bg-white hover:bg-gray-100 text-gray-800 font-semibold border-2 border-gray-200 shadow-md disabled:opacity-60 text-base"
                    >
                      {googleLoading ? (
                        <span className="text-sm">Redirigiendo...</span>
                      ) : (
                        <>
                          <GoogleIcon className="w-6 h-6 flex-shrink-0" />
                          <span>Crear cuenta con Gmail</span>
                        </>
                      )}
                    </button>
                    <div className="relative flex items-center gap-2">
                      <div className="flex-1 h-px bg-white/20" />
                      <span className="text-cyan-300/70 text-xs">o</span>
                      <div className="flex-1 h-px bg-white/20" />
                    </div>
                    <Button
                      type="button"
                      className="w-full h-11 bg-cyan-500/90 text-white hover:bg-cyan-500 border-cyan-400/50"
                      onClick={() => setStep(1)}
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Rellenar formulario de registro
                    </Button>
                  </div>
                  <p className="text-center text-cyan-300/80 text-sm mt-4">
                    ¿Ya tienes cuenta?{' '}
                    <button
                      type="button"
                      onClick={() => setIsLoginMode(true)}
                      className="text-cyan-400 font-medium underline underline-offset-2"
                    >
                      Iniciar sesión
                    </button>
                  </p>
                </motion.div>
              )}

              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="backdrop-blur-xl bg-[#0c1f3a]/90 rounded-2xl border border-cyan-400/20 p-6 shadow-xl space-y-6"
                >
                  <h2 className="text-white text-lg font-semibold">Paso 1: Cuenta</h2>
                  <div className="space-y-4">
                    <p className="text-cyan-300 text-sm font-medium">Datos de cuenta</p>
                    <div className="grid gap-2">
                      <Label className="text-cyan-100">Nombre de usuario</Label>
                      <Input
                        className="bg-white/10 border-cyan-400/30 text-white placeholder:text-white/50"
                        placeholder="Usuario"
                        value={form.username}
                        onChange={(e) => update('username', e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-cyan-100">Email</Label>
                      <Input
                        type="email"
                        className="bg-white/10 border-cyan-400/30 text-white placeholder:text-white/50"
                        placeholder="correo@ejemplo.com"
                        value={form.email}
                        onChange={(e) => update('email', e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-cyan-100">Contraseña</Label>
                      <Input
                        type="password"
                        className="bg-white/10 border-cyan-400/30 text-white placeholder:text-white/50"
                        placeholder="••••••••"
                        value={form.password}
                        onChange={(e) => update('password', e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-cyan-100">Confirmación de contraseña</Label>
                      <Input
                        type="password"
                        className="bg-white/10 border-cyan-400/30 text-white placeholder:text-white/50"
                        placeholder="••••••••"
                        value={form.confirmPassword}
                        onChange={(e) => update('confirmPassword', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <p className="text-cyan-300 text-sm font-medium">Datos personales</p>
                    <div className="grid gap-2">
                      <Label className="text-cyan-100">Nombre</Label>
                      <Input
                        className="bg-white/10 border-cyan-400/30 text-white placeholder:text-white/50"
                        placeholder="Nombre"
                        value={form.name}
                        onChange={(e) => update('name', e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-cyan-100">Apellidos (opcional)</Label>
                      <Input
                        className="bg-white/10 border-cyan-400/30 text-white placeholder:text-white/50"
                        placeholder="Apellidos"
                        value={form.surname}
                        onChange={(e) => update('surname', e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-cyan-100">Fecha de nacimiento (útil para estadísticas o legal)</Label>
                      <Input
                        type="date"
                        className="bg-white/10 border-cyan-400/30 text-white placeholder:text-white/50"
                        value={form.birthDate}
                        onChange={(e) => update('birthDate', e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-cyan-100">País</Label>
                      <Input
                        className="bg-white/10 border-cyan-400/30 text-white placeholder:text-white/50"
                        placeholder="País"
                        value={form.country}
                        onChange={(e) => update('country', e.target.value)}
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="backdrop-blur-xl bg-[#0c1f3a]/90 rounded-2xl border border-cyan-400/20 p-6 shadow-xl space-y-6"
                >
                  <h2 className="text-white text-lg font-semibold">Paso 2: Perfil de pesca</h2>
                  <div className="grid gap-2">
                    <Label className="text-cyan-100">Nivel de pesca</Label>
                    <Select value={form.fishingLevel} onValueChange={(v) => update('fishingLevel', v)}>
                      <SelectTrigger className="bg-white/10 border-cyan-400/30 text-white">
                        <SelectValue placeholder="Selecciona nivel" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0c1f3a] border-cyan-400/20">
                        {FISHING_LEVELS.map((l) => (
                          <SelectItem key={l.value} value={l.value} className="text-white focus:bg-cyan-500/20">
                            {l.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-cyan-100">Modalidad de pesca</Label>
                    <div className="flex flex-wrap gap-4">
                      <label className="flex items-center gap-2 text-cyan-100 cursor-pointer">
                        <Checkbox
                          checked={form.modalityInfantry}
                          onCheckedChange={(c) => update('modalityInfantry', !!c)}
                          className="border-cyan-400/50 data-[state=checked]:bg-cyan-500"
                        />
                        Infantería
                      </label>
                      <label className="flex items-center gap-2 text-cyan-100 cursor-pointer">
                        <Checkbox
                          checked={form.modalityBoat}
                          onCheckedChange={(c) => update('modalityBoat', !!c)}
                          className="border-cyan-400/50 data-[state=checked]:bg-cyan-500"
                        />
                        Embarcación
                      </label>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <p className="text-cyan-300 text-sm font-medium">Zona de pesca</p>
                    <div className="grid gap-2">
                      <Label className="text-cyan-100">Región / Comunidad</Label>
                      <Input
                        className="bg-white/10 border-cyan-400/30 text-white placeholder:text-white/50"
                        placeholder="Ej: Cataluña"
                        value={form.region}
                        onChange={(e) => update('region', e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-cyan-100">Provincia</Label>
                      <Input
                        className="bg-white/10 border-cyan-400/30 text-white placeholder:text-white/50"
                        placeholder="Provincia"
                        value={form.province}
                        onChange={(e) => update('province', e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-cyan-100">Zona habitual</Label>
                      <Input
                        className="bg-white/10 border-cyan-400/30 text-white placeholder:text-white/50"
                        placeholder="Ej: Costa Brava, Estrecho, Islas"
                        value={form.usualZone}
                        onChange={(e) => update('usualZone', e.target.value)}
                      />
                    </div>
                    <p className="text-cyan-300/80 text-xs">Dirección habitual (sin calle exacta → privacidad)</p>
                    <div className="grid gap-2">
                      <Label className="text-cyan-100">Ciudad</Label>
                      <Select
                        value={form.city || '__ninguna__'}
                        onValueChange={(v) => update('city', v === '__ninguna__' ? '' : v)}
                      >
                        <SelectTrigger className="bg-white/10 border-cyan-400/30 text-white">
                          <SelectValue placeholder="Elige una ciudad española" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0c1f3a] border-cyan-400/20 max-h-[240px]">
                          <SelectItem value="__ninguna__" className="text-cyan-300/70">
                            — Seleccionar —
                          </SelectItem>
                          {SPANISH_CITIES.map((c) => (
                            <SelectItem key={c} value={c} className="text-cyan-100 focus:bg-cyan-500/20">
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-cyan-300/60 text-xs">Solo ciudades españolas (información para PescaSub).</p>
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-cyan-100">Código postal</Label>
                      <Input
                        className="bg-white/10 border-cyan-400/30 text-white placeholder:text-white/50"
                        placeholder="CP"
                        value={form.postalCode}
                        onChange={(e) => update('postalCode', e.target.value)}
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="backdrop-blur-xl bg-[#0c1f3a]/90 rounded-2xl border border-cyan-400/20 p-6 shadow-xl space-y-6"
                >
                  <h2 className="text-white text-lg font-semibold">Paso 3: Zona y seguridad</h2>
                  <div className="space-y-4">
                    <p className="text-cyan-300 text-sm font-medium">Datos de seguridad</p>
                    <div className="grid gap-2">
                      <Label className="text-cyan-100">¿Pesca solo o acompañado?</Label>
                      <RadioGroup
                        value={form.aloneOrAccompanied}
                        onValueChange={(v) => update('aloneOrAccompanied', v)}
                        className="flex gap-4"
                      >
                        <label className="flex items-center gap-2 text-cyan-100 cursor-pointer">
                          <RadioGroupItem value="solo" className="border-cyan-400/50" />
                          Solo
                        </label>
                        <label className="flex items-center gap-2 text-cyan-100 cursor-pointer">
                          <RadioGroupItem value="acompanado" className="border-cyan-400/50" />
                          Acompañado
                        </label>
                      </RadioGroup>
                    </div>
                    <p className="text-cyan-300 text-sm font-medium">Contacto de emergencia</p>
                    <div className="grid gap-2">
                      <Label className="text-cyan-100">Nombre</Label>
                      <Input
                        className="bg-white/10 border-cyan-400/30 text-white placeholder:text-white/50"
                        placeholder="Nombre del contacto"
                        value={form.emergencyName}
                        onChange={(e) => update('emergencyName', e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-cyan-100">Teléfono</Label>
                      <Input
                        type="tel"
                        className="bg-white/10 border-cyan-400/30 text-white placeholder:text-white/50"
                        placeholder="+34 600 000 000"
                        value={form.emergencyPhone}
                        onChange={(e) => update('emergencyPhone', e.target.value)}
                      />
                    </div>
                    <p className="text-cyan-300/80 text-sm">Datos físicos (opcionales)</p>
                    <div className="grid gap-2">
                      <Label className="text-cyan-100">Nivel de apnea</Label>
                      <Select value={form.apneaLevel} onValueChange={(v) => update('apneaLevel', v)}>
                        <SelectTrigger className="bg-white/10 border-cyan-400/30 text-white">
                          <SelectValue placeholder="Selecciona nivel" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0c1f3a] border-cyan-400/20">
                          {APNEA_LEVELS.map((l) => (
                            <SelectItem key={l.value} value={l.value} className="text-white focus:bg-cyan-500/20">
                              {l.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="backdrop-blur-xl bg-[#0c1f3a]/90 rounded-2xl border border-cyan-400/20 p-6 shadow-xl space-y-6"
                >
                  <h2 className="text-white text-lg font-semibold">Paso 4: Extras (opcional)</h2>
                  <p className="text-cyan-200/80 text-sm">Para personalizar la experiencia</p>
                  <div className="grid gap-2">
                    <Label className="text-cyan-100">Idioma</Label>
                    <Select value={form.language} onValueChange={(v) => update('language', v)}>
                      <SelectTrigger className="bg-white/10 border-cyan-400/30 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0c1f3a] border-cyan-400/20">
                        <SelectItem value="es" className="text-white focus:bg-cyan-500/20">Español</SelectItem>
                        <SelectItem value="en" className="text-white focus:bg-cyan-500/20">English</SelectItem>
                        <SelectItem value="ca" className="text-white focus:bg-cyan-500/20">Català</SelectItem>
                        <SelectItem value="fr" className="text-white focus:bg-cyan-500/20">Français</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-cyan-100">Unidades</Label>
                    <Select value={form.units} onValueChange={(v) => update('units', v)}>
                      <SelectTrigger className="bg-white/10 border-cyan-400/30 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0c1f3a] border-cyan-400/20">
                        <SelectItem value="metric" className="text-white focus:bg-cyan-500/20">Metros</SelectItem>
                        <SelectItem value="imperial" className="text-white focus:bg-cyan-500/20">Pies</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-cyan-100">Notificaciones</Label>
                    <label className="flex items-center justify-between text-cyan-100 cursor-pointer">
                      <span className="text-sm">Alertas de mar</span>
                      <Checkbox
                        checked={form.notifySeaAlerts}
                        onCheckedChange={(c) => update('notifySeaAlerts', !!c)}
                        className="border-cyan-400/50 data-[state=checked]:bg-cyan-500"
                      />
                    </label>
                    <label className="flex items-center justify-between text-cyan-100 cursor-pointer">
                      <span className="text-sm">Partes meteorológicos</span>
                      <Checkbox
                        checked={form.notifyWeather}
                        onCheckedChange={(c) => update('notifyWeather', !!c)}
                        className="border-cyan-400/50 data-[state=checked]:bg-cyan-500"
                      />
                    </label>
                    <label className="flex items-center justify-between text-cyan-100 cursor-pointer">
                      <span className="text-sm">Zonas peligrosas</span>
                      <Checkbox
                        checked={form.notifyDangerZones}
                        onCheckedChange={(c) => update('notifyDangerZones', !!c)}
                        className="border-cyan-400/50 data-[state=checked]:bg-cyan-500"
                      />
                    </label>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Botones Siguiente / Atrás */}
        {!isSocialStep && (
          <div className="flex gap-3 mt-4 shrink-0 px-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-11 bg-white/10 border-cyan-400/30 text-white hover:bg-white/20"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Atrás
            </Button>
            {step < 4 ? (
              <Button
                type="button"
                className="flex-1 h-11 bg-cyan-500/90 text-white hover:bg-cyan-500 border-cyan-400/50"
                onClick={() => setStep((s) => s + 1)}
              >
                Siguiente
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <div className="flex-1 flex flex-col gap-2">
                {registerError && (
                  <p className="text-amber-300/90 text-sm bg-amber-500/10 border border-amber-400/30 rounded-lg px-3 py-2">
                    {registerError}
                  </p>
                )}
                {registerSuccess && (
                  <p className="text-emerald-300/90 text-sm bg-emerald-500/10 border border-emerald-400/30 rounded-lg px-3 py-2">
                    {registerSuccess}
                  </p>
                )}
                <Button
                  type="button"
                  className="h-11 w-full bg-cyan-500/90 text-white hover:bg-cyan-500 border-cyan-400/50 disabled:opacity-60"
                  onClick={handleFinishRegister}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creando cuenta…' : 'Finalizar registro'}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
