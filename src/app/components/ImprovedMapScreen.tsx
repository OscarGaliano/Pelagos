import { motion } from 'motion/react';
import { ChevronLeft, MapPin, Navigation, Filter, Lock, Users, Anchor } from 'lucide-react';
import { useState } from 'react';

interface ImprovedMapScreenProps {
  onNavigate: (screen: string) => void;
}

export function ImprovedMapScreen({ onNavigate }: ImprovedMapScreenProps) {
  const [filter, setFilter] = useState<'all' | 'private' | 'shared'>('all');
  const [bottomType, setBottomType] = useState<'all' | 'rocky' | 'sandy' | 'reef'>('all');

  const privateSpots = [
    { id: 1, name: 'Mi Punto Secreto', type: 'private', bottom: 'rocky', depth: '15-25m', dives: 23 },
    { id: 2, name: 'Cueva Norte', type: 'private', bottom: 'reef', depth: '12-20m', dives: 18 },
    { id: 3, name: 'Bajo del Mero', type: 'private', bottom: 'rocky', depth: '18-30m', dives: 31 },
  ];

  const sharedSpots = [
    { id: 4, name: 'Zona Este (Aprox.)', type: 'shared', bottom: 'sandy', depth: '10-18m', users: 45 },
    { id: 5, name: 'Arrecife Sur (Zona)', type: 'shared', bottom: 'reef', depth: '8-22m', users: 82 },
  ];

  const allSpots = [...privateSpots, ...sharedSpots];
  const filteredByType = filter === 'all' ? allSpots : 
    filter === 'private' ? privateSpots : sharedSpots;
  const filteredSpots = bottomType === 'all' ? filteredByType :
    filteredByType.filter(spot => spot.bottom === bottomType);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a1628] via-[#0c1f3a] to-[#0a1628]">
      {/* Header */}
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
            <h1 className="text-white text-2xl">Mapa de Puntos</h1>
            <p className="text-cyan-300 text-sm">{filteredSpots.length} ubicaciones</p>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            className="p-2 rounded-full bg-cyan-500/20 text-cyan-400"
          >
            <Filter className="w-5 h-5" />
          </motion.button>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 pt-4 pb-4 space-y-3">
        {/* Type Filter */}
        <div className="flex gap-2">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filter === 'all'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white'
                : 'bg-white/5 text-cyan-300 border border-cyan-400/20'
            }`}
          >
            Todos
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setFilter('private')}
            className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all ${
              filter === 'private'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white'
                : 'bg-white/5 text-cyan-300 border border-cyan-400/20'
            }`}
          >
            <Lock className="w-4 h-4" />
            Privados
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setFilter('shared')}
            className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all ${
              filter === 'shared'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white'
                : 'bg-white/5 text-cyan-300 border border-cyan-400/20'
            }`}
          >
            <Users className="w-4 h-4" />
            Compartidos
          </motion.button>
        </div>

        {/* Bottom Type Filter */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            { value: 'all', label: 'Todos' },
            { value: 'rocky', label: '🪨 Rocoso' },
            { value: 'sandy', label: '🏖️ Arenoso' },
            { value: 'reef', label: '🪸 Arrecife' },
          ].map((type) => (
            <motion.button
              key={type.value}
              whileTap={{ scale: 0.95 }}
              onClick={() => setBottomType(type.value as any)}
              className={`px-4 py-2 rounded-xl text-sm whitespace-nowrap ${
                bottomType === type.value
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30'
                  : 'bg-white/5 text-cyan-300/70 border border-cyan-400/15'
              }`}
            >
              {type.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Map Area */}
      <div className="px-6 pb-4">
        <div className="relative h-56 rounded-3xl overflow-hidden border border-cyan-400/30 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/40 to-blue-900/40 backdrop-blur-xl">
            {/* Map background pattern */}
            <div className="absolute inset-0 opacity-20">
              <svg width="100%" height="100%">
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-cyan-400"/>
                </pattern>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
            </div>

            {/* Markers */}
            {filteredSpots.map((spot, index) => (
              <motion.div
                key={spot.id}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="absolute"
                style={{
                  left: `${15 + index * 18}%`,
                  top: `${25 + (index % 3) * 25}%`,
                }}
              >
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg ${
                    spot.type === 'private'
                      ? 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-amber-400/50'
                      : 'bg-gradient-to-br from-cyan-400 to-blue-500 shadow-cyan-400/50'
                  }`}
                >
                  {spot.type === 'private' ? (
                    <Lock className="w-5 h-5 text-white" />
                  ) : (
                    <Users className="w-5 h-5 text-white" />
                  )}
                </motion.div>
              </motion.div>
            ))}
          </div>

          {/* Compass */}
          <div className="absolute top-4 right-4 w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
            <Navigation className="w-6 h-6 text-cyan-400" />
          </div>
        </div>
      </div>

      {/* Spots List */}
      <div className="px-6 pb-8 space-y-3">
        {filteredSpots.map((spot, index) => (
          <motion.div
            key={spot.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            whileTap={{ scale: 0.98 }}
            className={`backdrop-blur-xl rounded-2xl p-5 border ${
              spot.type === 'private'
                ? 'bg-gradient-to-br from-amber-500/10 to-orange-600/10 border-amber-400/25'
                : 'bg-gradient-to-br from-cyan-500/10 to-blue-600/10 border-cyan-400/20'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`p-2.5 rounded-xl ${
                spot.type === 'private'
                  ? 'bg-amber-500/20'
                  : 'bg-cyan-500/20'
              }`}>
                {spot.type === 'private' ? (
                  <Lock className="w-5 h-5 text-amber-400" />
                ) : (
                  <Users className="w-5 h-5 text-cyan-400" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-white text-lg">{spot.name}</h3>
                    <p className={`text-sm ${
                      spot.type === 'private' ? 'text-amber-300/70' : 'text-cyan-300/70'
                    }`}>
                      {spot.type === 'private' ? 'Ubicación exacta' : 'Zona aproximada'}
                    </p>
                  </div>
                  <span className="text-xs px-3 py-1 rounded-full bg-white/10 text-cyan-300">
                    {spot.bottom === 'rocky' ? '🪨' : spot.bottom === 'sandy' ? '🏖️' : '🪸'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-cyan-300/60 text-xs mb-1">Profundidad</p>
                    <p className="text-white">{spot.depth}</p>
                  </div>
                  <div>
                    <p className="text-cyan-300/60 text-xs mb-1">
                      {spot.type === 'private' ? 'Mis jornadas' : 'Usuarios'}
                    </p>
                    <p className="text-white">
                      {spot.type === 'private' ? spot.dives : spot.users}
                    </p>
                  </div>
                </div>

                <motion.button
                  whileTap={{ scale: 0.98 }}
                  className={`w-full mt-4 py-2.5 rounded-xl text-sm font-medium ${
                    spot.type === 'private'
                      ? 'bg-gradient-to-r from-amber-500/20 to-orange-600/20 text-amber-300 border border-amber-400/30'
                      : 'bg-gradient-to-r from-cyan-500/20 to-blue-600/20 text-cyan-300 border border-cyan-400/30'
                  }`}
                >
                  {spot.type === 'private' ? 'Ver detalles' : 'Ver zona general'}
                </motion.button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Add Spot Button */}
      <div className="fixed bottom-6 right-6">
        <motion.button
          whileTap={{ scale: 0.95 }}
          className="w-14 h-14 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/50 flex items-center justify-center"
        >
          <MapPin className="w-6 h-6 text-white" />
        </motion.button>
      </div>
    </div>
  );
}
