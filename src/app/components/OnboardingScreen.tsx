import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { Check, Loader2, User } from 'lucide-react';
import { useState } from 'react';

interface OnboardingScreenProps {
  userId: string;
  userEmail: string;
  onComplete: () => void;
}

export function OnboardingScreen({ userId, userEmail, onComplete }: OnboardingScreenProps) {
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const saveProfile = async () => {
    if (!displayName.trim()) {
      setError('Por favor, introduce tu nombre');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          display_name: displayName.trim(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });

      if (upsertError) throw upsertError;

      setSaved(true);
      setTimeout(() => {
        onComplete();
      }, 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar el perfil');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-cyan-950 to-slate-900 flex flex-col items-center justify-center px-6 py-8">
      {saved ? (
        <motion.div
          key="complete"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
            className="w-24 h-24 rounded-full bg-green-500/20 border border-green-400/30 flex items-center justify-center mx-auto mb-6"
          >
            <Check className="w-12 h-12 text-green-400" />
          </motion.div>
          <h1 className="text-2xl font-bold text-white mb-2">¡Bienvenido!</h1>
          <p className="text-cyan-300/80 mb-4">
            Hola {displayName}, preparando tu experiencia...
          </p>
        </motion.div>
      ) : (
        <motion.div
          key="name"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-full bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center mx-auto mb-4">
              <User className="w-10 h-10 text-cyan-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">¡Bienvenido a Pelagos!</h1>
            <p className="text-cyan-300/80">¿Cómo te llamas?</p>
          </div>

          <div className="space-y-4">
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveProfile()}
              placeholder="Tu nombre o apodo"
              autoFocus
              className="w-full rounded-2xl bg-white/10 border border-cyan-400/30 px-5 py-4 text-white text-lg placeholder-cyan-400/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
            />

            <p className="text-cyan-400/60 text-xs text-center">
              Conectado como {userEmail}
            </p>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-400 text-sm bg-red-500/10 rounded-xl px-4 py-2 text-center"
              >
                {error}
              </motion.p>
            )}

            <button
              type="button"
              onClick={saveProfile}
              disabled={loading}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-cyan-400 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Continuar'
              )}
            </button>

            <p className="text-cyan-400/50 text-xs text-center">
              Podrás completar el resto de tu perfil después
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
