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

export function IndicesDashboard({ title = "Score de visibilité sociale enrichie" }: { title?: string }) {
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
    <div className="max-w-[1800px] mx-auto py-10 px-8 flex flex-col gap-8">
      {/* Header */}
      <header className="mb-2 flex items-center justify-between">
        <div className="flex items-center space-x-5">
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-tr from-primary via-primary/50 to-transparent rounded-2xl blur-md opacity-30 animate-pulse" />
            <div className="relative w-14 h-14 bg-secondary rounded-2xl flex items-center justify-center shadow-2xl border border-white/10 overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <TrendingUp className="w-7 h-7 text-primary drop-shadow-[0_0_8px_rgba(251,195,60,0.4)]" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-black text-secondary flex items-center">
              {title} <span className="text-primary ml-2">Maarc</span>
            </h1>
            <p className="text-[13px] font-bold text-slate-400 tracking-[0.1em] uppercase mt-0.5">
              Développé par la cellule de veille Maarc Watch
            </p>
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
                  className="bg-white p-4 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.05)] border border-gray-100 hover:border-primary transition-all"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${platform.bg}`}>
                      <platform.icon className={`w-4 h-4 ${platform.color}`} />
                    </div>
                    <h2 className="font-black text-[10px] uppercase tracking-widest text-secondary">{platform.name}</h2>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1 truncate">
                        Posts
                      </label>
                      <input 
                        type="number"
                        value={metrics[platform.id].posts || ''}
                        onChange={(e) => handleInputChange(platform.id, 'posts', e.target.value)}
                        placeholder="0"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-bold text-secondary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1 truncate ml-1">
                        Interactions
                      </label>
                      <input 
                        type="number"
                        value={metrics[platform.id].interactions || ''}
                        onChange={(e) => handleInputChange(platform.id, 'interactions', e.target.value)}
                        placeholder="0"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-bold text-secondary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1 truncate ml-1">
                        Portée
                      </label>
                      <input 
                        type="number"
                        value={metrics[platform.id].reach || ''}
                        onChange={(e) => handleInputChange(platform.id, 'reach', e.target.value)}
                        placeholder="0"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-bold text-secondary"
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
                className="p-5 bg-white rounded-2xl border border-gray-100 shadow-[0_10px_30px_rgba(0,0,0,0.05)] hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-7 h-7 bg-orange-50 rounded-lg flex items-center justify-center">
                    <Eye className="w-3.5 h-3.5 text-4" />
                  </div>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-secondary">Posts</h3>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                  Volume total de publications. Mesure votre <span className="font-bold text-secondary">présence active</span> et la fréquence d'occupation de l'espace numérique.
                  <span className="block mt-2 pt-2 border-t border-slate-50 text-[9px] italic font-bold">
                    Pondéré par le coefficient <span className="text-4">α (Alpha)</span>.
                  </span>
                </p>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="p-5 bg-white rounded-2xl border border-gray-100 shadow-[0_10px_30px_rgba(0,0,0,0.05)] hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-7 h-7 bg-amber-50 rounded-lg flex items-center justify-center">
                    <MessageSquare className="w-3.5 h-3.5 text-6" />
                  </div>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-secondary">Interactions</h3>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                  Engagement cumulé (likes, partages, commentaires). Reflète la <span className="font-bold text-secondary">résonance</span> et l'intérêt généré par vos messages.
                  <span className="block mt-2 pt-2 border-t border-slate-50 text-[9px] italic font-bold">
                    Pondéré par le coefficient <span className="text-6">β (Beta)</span>.
                  </span>
                </p>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="p-5 bg-white rounded-2xl border border-gray-100 shadow-[0_10px_30px_rgba(0,0,0,0.05)] hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-7 h-7 bg-emerald-50 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-3.5 h-3.5 text-5" />
                  </div>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-secondary">Portée</h3>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                  Audience unique potentielle. Indique la <span className="font-bold text-secondary">visibilité</span> globale et l'étendue de la diffusion de vos contenus.
                  <span className="block mt-2 pt-2 border-t border-slate-50 text-[9px] italic font-bold">
                    Pondéré par le coefficient <span className="text-5">γ (Gamma)</span>.
                  </span>
                </p>
              </motion.div>
            </div>

            <div className="p-6 bg-secondary rounded-2xl border border-slate-700 space-y-5 shadow-2xl">
              <div className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Info className="w-4 h-4 text-primary" />
                </div>
                <div className="text-xs text-slate-300 leading-relaxed space-y-6 flex-1">
                  <div className="space-y-3">
                    <p className="font-black text-slate-400 uppercase tracking-[0.2em] text-[9px]">Pondération de la Formule</p>
                    <div className="flex flex-wrap items-center gap-3 font-mono text-xs bg-slate-800/50 p-4 rounded-2xl border border-slate-700">
                      <div className="flex items-center gap-3">
                        <input 
                          type="number" 
                          step="0.1"
                          value={params.alpha} 
                          onChange={(e) => handleParamChange('alpha', e.target.value)}
                          className="w-16 bg-slate-900 border border-slate-700 rounded-xl px-2 py-2 text-center text-white font-black text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                        />
                        <span className="text-slate-500 font-black">×</span>
                        <span className="text-4 font-black uppercase tracking-widest text-[10px]">Score M</span>
                      </div>
                      <span className="text-primary font-black">+</span>
                      <div className="flex items-center gap-3">
                        <input 
                          type="number" 
                          step="0.1"
                          value={params.beta} 
                          onChange={(e) => handleParamChange('beta', e.target.value)}
                          className="w-16 bg-slate-900 border border-slate-700 rounded-xl px-2 py-2 text-center text-white font-black text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                        />
                        <span className="text-slate-500 font-black">×</span>
                        <span className="text-6 font-black uppercase tracking-widest text-[10px]">Score I</span>
                      </div>
                      <span className="text-primary font-black">+</span>
                      <div className="flex items-center gap-3">
                        <input 
                          type="number" 
                          step="0.1"
                          value={params.gamma} 
                          onChange={(e) => handleParamChange('gamma', e.target.value)}
                          className="w-16 bg-slate-900 border border-slate-700 rounded-xl px-2 py-2 text-center text-white font-black text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                        />
                        <span className="text-slate-500 font-black">×</span>
                        <span className="text-5 font-black uppercase tracking-widest text-[10px]">Score P</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <p className="font-black text-slate-400 uppercase tracking-[0.2em] text-[9px]">Seuils de Normalisation (Max)</p>
                    <ul className="grid grid-cols-3 gap-3">
                      <li className="flex flex-col gap-2 bg-slate-800/50 p-3 rounded-2xl border border-slate-700">
                        <span className="font-black text-4 text-[8px] uppercase tracking-[0.2em]">M (Mentions)</span>
                        <input 
                          type="text" 
                          value={formatNumber(params.mpMax)} 
                          onChange={(e) => setParams(p => ({ ...p, mpMax: parseFormattedNumber(e.target.value) }))}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2 py-1.5 text-right text-white font-mono font-black text-[10px] focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                        />
                      </li>
                      <li className="flex flex-col gap-2 bg-slate-800/50 p-3 rounded-2xl border border-slate-700">
                        <span className="font-black text-6 text-[8px] uppercase tracking-[0.2em]">I (Interactions)</span>
                        <input 
                          type="text" 
                          value={formatNumber(params.eMax)} 
                          onChange={(e) => setParams(p => ({ ...p, eMax: parseFormattedNumber(e.target.value) }))}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2 py-1.5 text-right text-white font-mono font-black text-[10px] focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                        />
                      </li>
                      <li className="flex flex-col gap-2 bg-slate-800/50 p-3 rounded-2xl border border-slate-700">
                        <span className="font-black text-5 text-[8px] uppercase tracking-[0.2em]">P (Portée)</span>
                        <input 
                          type="text" 
                          value={formatNumber(params.pMax)} 
                          onChange={(e) => setParams(p => ({ ...p, pMax: parseFormattedNumber(e.target.value) }))}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2 py-1.5 text-right text-white font-mono font-black text-[10px] focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                        />
                      </li>
                    </ul>
                  </div>
                  <p className="text-[9px] italic text-slate-500 border-t border-slate-700 pt-3 font-bold">
                    Chaque indicateur est normalisé sur 100 par rapport à son seuil maximum avant l'application des coefficients de pondération.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1 space-y-6 sticky top-24 self-start h-fit">
            <div className="flex gap-3">
              <button
                onClick={calculateScore}
                disabled={isCalculating}
                className="group relative flex-1 flex items-center justify-center gap-3 bg-primary text-secondary h-12 rounded-2xl font-black uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden text-[11px]"
              >
                {isCalculating ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  >
                    <Calculator className="w-5 h-5" />
                  </motion.div>
                ) : (
                  <Calculator className="w-5 h-5 group-hover:scale-110 transition-transform" />
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
                className="w-12 flex items-center justify-center bg-white border border-slate-200 rounded-2xl text-red-500 hover:bg-red-50 transition-all shadow-sm"
                title="Réinitialiser"
              >
                <Trash2 size={18} />
              </button>
            </div>

            <div className="bg-secondary p-8 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-slate-800 flex flex-col h-[380px] text-white relative overflow-hidden">
              <div className="flex-1 flex items-center justify-center">
                <motion.div
                  key="score"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-center relative"
                >
                  {/* Circular Gauge */}
                  <div className="relative w-56 h-56 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="112"
                        cy="112"
                        r="100"
                        stroke="currentColor"
                        strokeWidth="14"
                        fill="transparent"
                        className="text-white/5"
                      />
                      <motion.circle
                        cx="112"
                        cy="112"
                        r="100"
                        stroke="currentColor"
                        strokeWidth="14"
                        fill="transparent"
                        strokeDasharray={628.3}
                        initial={{ strokeDashoffset: 628.3 }}
                        animate={{ strokeDashoffset: 628.3 - (628.3 * (score || 0)) / 100 }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className="text-primary"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-8xl font-black text-primary tracking-tighter">
                        {isCalculating ? '...' : Math.round(score)}
                      </span>
                      <p className="text-white/40 font-black uppercase tracking-[0.3em] text-[10px] mt-2">Score / 100</p>
                    </div>
                  </div>
                </motion.div>
              </div>
              
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 grid grid-cols-3 gap-4 w-full border-t border-white/10 pt-6"
              >
                <div className="text-center">
                  <p className="text-[9px] font-black text-4 uppercase tracking-[0.2em] mb-1">Posts</p>
                  <p className="text-sm font-black text-white">{totals.posts.toLocaleString()}</p>
                </div>
                <div className="text-center border-x border-white/10">
                  <p className="text-[9px] font-black text-6 uppercase tracking-[0.2em] mb-1">Inter</p>
                  <p className="text-sm font-black text-white">{totals.interactions.toLocaleString()}</p>
                </div>
                <div className="text-center">
                  <p className="text-[9px] font-black text-5 uppercase tracking-[0.2em] mb-1">Portée</p>
                  <p className="text-sm font-black text-white">{totals.reach.toLocaleString()}</p>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    );
}
