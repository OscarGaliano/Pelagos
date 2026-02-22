import { motion } from 'motion/react';
import { ChevronLeft, Search, Filter, Star, MapPin, Heart } from 'lucide-react';
import { useState } from 'react';

interface MarketplaceScreenProps {
  onNavigate: (screen: string) => void;
}

export function MarketplaceScreen({ onNavigate }: MarketplaceScreenProps) {
  const [category, setCategory] = useState<'all' | 'gear' | 'suits' | 'fins' | 'spearguns'>('all');

  const products = [
    {
      id: 1,
      title: 'Fusil Omer Cayman HF 90cm',
      price: 280,
      category: 'spearguns',
      condition: 'Como nuevo',
      location: 'Barcelona',
      seller: 'Carlos M.',
      rating: 4.8,
      sales: 12,
      featured: true,
      image: 'https://images.unsplash.com/photo-1621451611787-fe22bb474d48?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    },
    {
      id: 2,
      title: 'Traje de Neopreno Cressi 5mm',
      price: 120,
      category: 'suits',
      condition: 'Buen estado',
      location: 'Alicante',
      seller: 'Ana P.',
      rating: 5.0,
      sales: 28,
      featured: false,
      image: 'https://images.unsplash.com/photo-1462947760324-15811216b688?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    },
    {
      id: 3,
      title: 'Aletas Carbono Pathos',
      price: 180,
      category: 'fins',
      condition: 'Seminuevo',
      location: 'Málaga',
      seller: 'Miguel R.',
      rating: 4.5,
      sales: 6,
      featured: true,
      image: 'https://images.unsplash.com/photo-1717935492829-fce9ce727a7a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    },
    {
      id: 4,
      title: 'Computadora Suunto D5',
      price: 320,
      category: 'gear',
      condition: 'Excelente',
      location: 'Valencia',
      seller: 'Laura S.',
      rating: 4.9,
      sales: 15,
      featured: false,
      image: 'https://images.unsplash.com/photo-1571862827667-b8dec6e2418f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400',
    },
  ];

  const filteredProducts = category === 'all' 
    ? products 
    : products.filter(p => p.category === category);

  const featuredProducts = filteredProducts.filter(p => p.featured);
  const regularProducts = filteredProducts.filter(p => !p.featured);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a1628] via-[#0c1f3a] to-[#0a1628]">
      {/* Header */}
      <div className="sticky top-0 z-30 backdrop-blur-xl bg-[#0a1628]/80 border-b border-cyan-400/20">
        <div className="px-6 py-4">
          <div className="flex items-center gap-4 mb-4">
            <motion.button
              onClick={() => onNavigate('home')}
              whileTap={{ scale: 0.9 }}
              className="p-2 rounded-full hover:bg-white/10 active:bg-white/15"
            >
              <ChevronLeft className="w-6 h-6 text-cyan-400" />
            </motion.button>
            <div className="flex-1">
              <h1 className="text-white text-2xl">Mercadillo</h1>
              <p className="text-cyan-300 text-sm">Compra y vende equipo</p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-400/50" />
            <input
              type="text"
              placeholder="Buscar equipo..."
              className="w-full bg-white/5 border border-cyan-400/20 rounded-2xl py-3 pl-12 pr-12 text-white placeholder-cyan-300/30 focus:outline-none focus:border-cyan-400/40"
            />
            <motion.button
              whileTap={{ scale: 0.95 }}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-cyan-500/20"
            >
              <Filter className="w-5 h-5 text-cyan-400" />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="px-6 pt-4 pb-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[
            { value: 'all', label: 'Todos' },
            { value: 'spearguns', label: 'Fusiles' },
            { value: 'suits', label: 'Trajes' },
            { value: 'fins', label: 'Aletas' },
            { value: 'gear', label: 'Equipo' },
          ].map((cat) => (
            <motion.button
              key={cat.value}
              whileTap={{ scale: 0.95 }}
              onClick={() => setCategory(cat.value as any)}
              className={`px-5 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                category === cat.value
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white'
                  : 'bg-white/5 text-cyan-300 border border-cyan-400/20'
              }`}
            >
              {cat.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Featured Products */}
      {featuredProducts.length > 0 && (
        <div className="px-6 pb-4">
          <h3 className="text-white text-lg mb-3 flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-400" />
            Destacados
          </h3>
          <div className="space-y-3">
            {featuredProducts.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                whileTap={{ scale: 0.98 }}
                className="backdrop-blur-xl bg-gradient-to-br from-amber-500/10 to-orange-600/10 rounded-2xl overflow-hidden border border-amber-400/25"
              >
                <div className="flex gap-4 p-4">
                  <div className="relative w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden">
                    <img
                      src={product.image}
                      alt={product.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2">
                      <div className="p-1 rounded-full bg-black/40 backdrop-blur-sm">
                        <Heart className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-white font-medium text-sm line-clamp-2">{product.title}</h4>
                      <span className="text-amber-400 font-bold text-lg ml-2">{product.price}€</span>
                    </div>
                    <p className="text-cyan-300/70 text-xs mb-2">{product.condition}</p>
                    <div className="flex items-center gap-3 text-xs">
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        <span className="text-cyan-300">{product.rating}</span>
                      </div>
                      <div className="flex items-center gap-1 text-cyan-300/70">
                        <MapPin className="w-3 h-3" />
                        <span>{product.location}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Regular Products Grid */}
      <div className="px-6 pb-8">
        <h3 className="text-white text-lg mb-3">Todos los productos</h3>
        <div className="grid grid-cols-2 gap-4">
          {regularProducts.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              whileTap={{ scale: 0.95 }}
              className="backdrop-blur-xl bg-white/5 rounded-2xl overflow-hidden border border-cyan-400/20"
            >
              <div className="relative h-40">
                <img
                  src={product.image}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute top-2 right-2">
                  <div className="p-1.5 rounded-full bg-black/40 backdrop-blur-sm">
                    <Heart className="w-4 h-4 text-white" />
                  </div>
                </div>
                <div className="absolute bottom-2 left-2 right-2">
                  <p className="text-white text-sm font-medium line-clamp-2 mb-1">
                    {product.title}
                  </p>
                </div>
              </div>
              <div className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-cyan-400 font-bold text-lg">{product.price}€</span>
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                    <span className="text-cyan-300 text-xs">{product.rating}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-cyan-300/70 text-xs mb-2">
                  <MapPin className="w-3 h-3" />
                  <span>{product.location}</span>
                </div>
                <div className="text-xs text-cyan-300/70">
                  <span>{product.seller}</span>
                  <span className="mx-1">•</span>
                  <span>{product.sales} ventas</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Sell Button */}
      <div className="fixed bottom-6 right-6">
        <motion.button
          whileTap={{ scale: 0.95 }}
          className="w-14 h-14 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/50 flex items-center justify-center text-white text-2xl font-bold"
        >
          +
        </motion.button>
      </div>
    </div>
  );
}
