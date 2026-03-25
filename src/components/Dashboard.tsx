import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  X, 
  Facebook, 
  Instagram, 
  Linkedin, 
  Youtube,
  Music2,
  Calculator,
  TrendingUp, 
  Eye, 
  MessageSquare, 
  Heart, 
  Share2,
  Info,
  Play,
  RotateCcw,
  Building2,
  Trash2
} from 'lucide-react';

interface PlatformMetrics {
  posts: number;
  interactions: number;
  reach: number;
}

interface MetricsState {
  twitter: PlatformMetrics;
  facebook: PlatformMetrics;
  instagram: PlatformMetrics;
  linkedin: PlatformMetrics;
  tiktok: PlatformMetrics;
  youtube: PlatformMetrics;
}

export default function Dashboard({ title = "Score de visibilité sociale enrichie" }: { title?: string }) {
  const [metrics, setMetrics] = useState<MetricsState>({
    twitter: { posts: 0, interactions: 0, reach: 0 },
    facebook: { posts: 0, interactions: 0, reach: 0 },
    instagram: { posts: 0, interactions: 0, reach: 0 },
    linkedin: { posts: 0, interactions: 0, reach: 0 },
    tiktok: { posts: 0, interactions: 0, reach: 0 },
    youtube: { posts: 0, interactions: 0, reach: 0 },
  });

  const [score, setScore] = useState<number>(0);
  const [totals, setTotals] = useState<{ posts: number; interactions: number; reach: number }>({ posts: 0, interactions: 0, reach: 0 });
  const [isCalculating, setIsCalculating] = useState(false);

  // Formula parameters state
  const [params, setParams] = useState({
    alpha: 0.4,
    beta: 0.4,
    gamma: 0.2,
    mpMax: 2000000,
    eMax: 10000000,
    pMax: 30000000
  });

  const formatNumber = (val: number) => {
    return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  };

  const parseFormattedNumber = (val: string) => {
    return parseInt(val.replace(/\s/g, '')) || 0;
  };

  const handleParamChange = (key: 'alpha' | 'beta' | 'gamma', value: string) => {
    const newVal = parseFloat(value) || 0;
    setParams(prev => {
      const otherKeys = (['alpha', 'beta', 'gamma'] as const).filter(k => k !== key);
      const otherSum = otherKeys.reduce((sum, k) => sum + prev[k], 0);
      const cappedVal = Math.max(0, Math.min(newVal, 1 - otherSum));
      return { ...prev, [key]: cappedVal };
    });
  };

  const handleInputChange = (platform: keyof MetricsState, field: keyof PlatformMetrics, value: string) => {
    const numValue = Math.max(0, parseInt(value) || 0);
    setMetrics(prev => ({
      ...prev,
      [platform]: {
        ...prev[platform],
        [field]: numValue
      }
    }));
  };

  const resetMetrics = () => {
    setMetrics({
      twitter: { posts: 0, interactions: 0, reach: 0 },
      facebook: { posts: 0, interactions: 0, reach: 0 },
      instagram: { posts: 0, interactions: 0, reach: 0 },
      linkedin: { posts: 0, interactions: 0, reach: 0 },
      tiktok: { posts: 0, interactions: 0, reach: 0 },
      youtube: { posts: 0, interactions: 0, reach: 0 },
    });
    setScore(0);
    setTotals({ posts: 0, interactions: 0, reach: 0 });
  };

  const calculateScore = () => {
    setIsCalculating(true);
    
    // Simulate a brief calculation delay for UX
    setTimeout(() => {
      // Calculate cumulative totals
      let totalPosts = 0;
      let totalInteractions = 0;
      let totalReach = 0;

      (Object.keys(metrics) as Array<keyof MetricsState>).forEach(platform => {
        const p = metrics[platform];
        totalPosts += p.posts;
        totalInteractions += p.interactions;
        totalReach += p.reach;
      });

      // Calculate normalized scores (capped at 100) using state params
      const scoreM = Math.min(100, (totalPosts / params.mpMax) * 100);
      const scoreE = Math.min(100, (totalInteractions / params.eMax) * 100);
      const scoreP = Math.min(100, (totalReach / params.pMax) * 100);

      // Final Visibility Score using state params
      const finalScore = (params.alpha * scoreM) + (params.beta * scoreE) + (params.gamma * scoreP);

      // Update state
      setTotals({ posts: totalPosts, interactions: totalInteractions, reach: totalReach });
      setScore(parseFloat(finalScore.toFixed(2)));
      setIsCalculating(false);
    }, 600);
  };

  const platformConfigs = [
    { id: 'twitter', name: 'X', icon: X, color: 'text-secondary', bg: 'bg-slate-100' },
    { id: 'facebook', name: 'Facebook', icon: Facebook, color: 'text-blue-600', bg: 'bg-blue-50' },
    { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'text-pink-600', bg: 'bg-pink-50' },
    { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, color: 'text-blue-700', bg: 'bg-blue-50' },
    { id: 'tiktok', name: 'TikTok', icon: Music2, color: 'text-secondary', bg: 'bg-slate-100' },
    { id: 'youtube', name: 'YouTube', icon: Youtube, color: 'text-red-600', bg: 'bg-red-50' },
  ] as const;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col gap-6 bg-slate-50/50 rounded-3xl">
      {/* Header */}
      <header className="flex flex-col sm:flex-row items-center justify-between shrink-0 px-2 gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-secondary to-slate-700 flex items-center justify-center text-white shadow-lg shadow-secondary/20">
            <TrendingUp size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-secondary tracking-tight">{title} <span className="text-primary">Maarc</span></h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Développé par la cellule de veille Maarc Watch</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Input Section */}
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {platformConfigs.map((platform) => (
                <motion.div 
                  key={platform.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`p-1.5 rounded-lg ${platform.bg}`}>
                      <platform.icon className={`w-4 h-4 ${platform.color}`} />
                    </div>
                    <h2 className="font-bold text-sm uppercase tracking-tight">{platform.name}</h2>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1 truncate">
                        Posts
                      </label>
                      <input 
                        type="number"
                        value={metrics[platform.id].posts || ''}
                        onChange={(e) => handleInputChange(platform.id, 'posts', e.target.value)}
                        placeholder="0"
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-base font-medium"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1 truncate ml-1">
                        Interactions
                      </label>
                      <input 
                        type="number"
                        value={metrics[platform.id].interactions || ''}
                        onChange={(e) => handleInputChange(platform.id, 'interactions', e.target.value)}
                        placeholder="0"
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-base font-medium"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1 truncate ml-1">
                        Portée
                      </label>
                      <input 
                        type="number"
                        value={metrics[platform.id].reach || ''}
                        onChange={(e) => handleInputChange(platform.id, 'reach', e.target.value)}
                        placeholder="0"
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-base font-medium"
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Definitions Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 bg-orange-50 rounded-lg">
                    <Eye className="w-3.5 h-3.5 text-4" />
                  </div>
                  <h3 className="text-[11px] font-black uppercase tracking-[0.15em] text-secondary">Posts</h3>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Volume total de publications. Mesure votre <span className="font-bold text-secondary">présence active</span> et la fréquence d'occupation de l'espace numérique.
                  <span className="block mt-2 pt-2 border-t border-slate-50 text-[10px] italic">
                    Pondéré par le coefficient <span className="font-bold text-4">α (Alpha)</span> après normalisation.
                  </span>
                </p>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 bg-amber-50 rounded-lg">
                    <MessageSquare className="w-3.5 h-3.5 text-6" />
                  </div>
                  <h3 className="text-[11px] font-black uppercase tracking-[0.15em] text-secondary">Interactions</h3>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Engagement cumulé (likes, partages, commentaires). Reflète la <span className="font-bold text-secondary">résonance</span> et l'intérêt généré par vos messages.
                  <span className="block mt-2 pt-2 border-t border-slate-50 text-[10px] italic">
                    Pondéré par le coefficient <span className="font-bold text-6">β (Beta)</span> après normalisation.
                  </span>
                </p>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="p-5 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 bg-emerald-50 rounded-lg">
                    <TrendingUp className="w-3.5 h-3.5 text-5" />
                  </div>
                  <h3 className="text-[11px] font-black uppercase tracking-[0.15em] text-secondary">Portée</h3>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Audience unique potentielle. Indique la <span className="font-bold text-secondary">visibilité</span> globale et l'étendue de la diffusion de vos contenus.
                  <span className="block mt-2 pt-2 border-t border-slate-50 text-[10px] italic">
                    Pondéré par le coefficient <span className="font-bold text-5">γ (Gamma)</span> après normalisation.
                  </span>
                </p>
              </motion.div>
            </div>

            <div className="p-6 bg-secondary rounded-2xl border border-slate-700 space-y-4 shadow-xl">
              <div className="flex items-start gap-4">
                <Info className="w-5 h-5 text-primary mt-1" />
                <div className="text-xs text-slate-300 leading-relaxed space-y-6 flex-1">
                  <div className="space-y-3">
                    <p className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Pondération de la Formule</p>
                    <div className="flex flex-wrap items-center gap-3 font-mono text-sm bg-slate-800 p-3 rounded-lg border border-slate-700">
                      <div className="flex items-center gap-3">
                        <input 
                          type="number" 
                          step="0.1"
                          value={params.alpha} 
                          onChange={(e) => handleParamChange('alpha', e.target.value)}
                          className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-center text-white font-bold text-base focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                        />
                        <span className="text-slate-500">×</span>
                        <span className="text-4 font-black">Score M</span>
                      </div>
                      <span className="text-primary font-bold">+</span>
                      <div className="flex items-center gap-3">
                        <input 
                          type="number" 
                          step="0.1"
                          value={params.beta} 
                          onChange={(e) => handleParamChange('beta', e.target.value)}
                          className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-center text-white font-bold text-base focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                        />
                        <span className="text-slate-500">×</span>
                        <span className="text-6 font-black">Score I</span>
                      </div>
                      <span className="text-primary font-bold">+</span>
                      <div className="flex items-center gap-3">
                        <input 
                          type="number" 
                          step="0.1"
                          value={params.gamma} 
                          onChange={(e) => handleParamChange('gamma', e.target.value)}
                          className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-center text-white font-bold text-base focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                        />
                        <span className="text-slate-500">×</span>
                        <span className="text-5 font-black">Score P</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <p className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Seuils de Normalisation (Max)</p>
                    <ul className="grid grid-cols-3 gap-3">
                      <li className="flex flex-col gap-2 bg-slate-800 p-3 rounded-xl border border-slate-700">
                        <span className="font-bold text-4 text-[10px] uppercase tracking-wider">M (Mentions)</span>
                        <input 
                          type="text" 
                          value={formatNumber(params.mpMax)} 
                          onChange={(e) => setParams(p => ({ ...p, mpMax: parseFormattedNumber(e.target.value) }))}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-right text-white font-mono font-bold text-xs focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                        />
                      </li>
                      <li className="flex flex-col gap-2 bg-slate-800 p-3 rounded-xl border border-slate-700">
                        <span className="font-bold text-6 text-[10px] uppercase tracking-wider">I (Interactions)</span>
                        <input 
                          type="text" 
                          value={formatNumber(params.eMax)} 
                          onChange={(e) => setParams(p => ({ ...p, eMax: parseFormattedNumber(e.target.value) }))}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-right text-white font-mono font-bold text-xs focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                        />
                      </li>
                      <li className="flex flex-col gap-2 bg-slate-800 p-3 rounded-xl border border-slate-700">
                        <span className="font-bold text-5 text-[10px] uppercase tracking-wider">P (Portée)</span>
                        <input 
                          type="text" 
                          value={formatNumber(params.pMax)} 
                          onChange={(e) => setParams(p => ({ ...p, pMax: parseFormattedNumber(e.target.value) }))}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-right text-white font-mono font-bold text-xs focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                        />
                      </li>
                    </ul>
                  </div>
                  <p className="text-[10px] italic text-slate-500 border-t border-slate-700 pt-3">
                    Chaque indicateur est normalisé sur 100 par rapport à son seuil maximum avant l'application des coefficients de pondération.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1 space-y-6 sticky top-24 self-start h-fit">
          <div className="flex gap-2">
            <button
              onClick={calculateScore}
              disabled={isCalculating}
              className="group relative flex-1 flex items-center justify-center gap-2 bg-primary text-secondary h-[42px] rounded-2xl font-black uppercase tracking-widest shadow-lg hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden text-[10px]"
            >
              {isCalculating ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                >
                  <Calculator className="w-4 h-4" />
                </motion.div>
              ) : (
                <Calculator className="w-4 h-4 group-hover:scale-110 transition-transform" />
              )}
              <span>Calculer</span>
              
              {isCalculating && (
                <motion.div 
                  className="absolute bottom-0 left-0 h-1 bg-emerald-500"
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 0.6 }}
                />
              )}
            </button>

            <button
              onClick={resetMetrics}
              className="w-[130px] flex items-center justify-center gap-2 px-4 h-[42px] text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all border text-red-500 bg-red-50 border-red-100 hover:bg-red-100"
            >
              <span>Réinitialiser</span>
            </button>
          </div>

            <div className="bg-secondary p-6 rounded-3xl shadow-2xl border border-secondary flex flex-col h-[350px] text-white">
              <div className="flex-1 flex items-center justify-center">
                <motion.div
                  key="score"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-center relative"
                >
                  {/* Circular Gauge */}
                  <div className="relative w-48 h-48 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="96"
                        cy="96"
                        r="88"
                        stroke="currentColor"
                        strokeWidth="12"
                        fill="transparent"
                        className="text-white/5"
                      />
                      <motion.circle
                        cx="96"
                        cy="96"
                        r="88"
                        stroke="currentColor"
                        strokeWidth="12"
                        fill="transparent"
                        strokeDasharray={552.92}
                        initial={{ strokeDashoffset: 552.92 }}
                        animate={{ strokeDashoffset: 552.92 - (552.92 * (score || 0)) / 100 }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="text-primary"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-7xl font-black text-primary tracking-tighter">
                        {isCalculating ? '...' : score}
                      </span>
                      <p className="text-white/60 font-bold uppercase tracking-widest text-[10px] mt-1">Score / 100</p>
                    </div>
                  </div>
                </motion.div>
              </div>
              
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 grid grid-cols-3 gap-4 w-full border-t border-white/10 pt-4"
              >
                <div className="text-center">
                  <p className="text-[10px] font-bold text-4 uppercase tracking-wider">Posts</p>
                  <p className="text-sm font-bold text-white">{totals.posts.toLocaleString()}</p>
                </div>
                <div className="text-center border-x border-white/10">
                  <p className="text-[10px] font-bold text-6 uppercase tracking-wider">Interactions</p>
                  <p className="text-sm font-bold text-white">{totals.interactions.toLocaleString()}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-bold text-5 uppercase tracking-wider">Portée</p>
                  <p className="text-sm font-bold text-white">{totals.reach.toLocaleString()}</p>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    );
  }
