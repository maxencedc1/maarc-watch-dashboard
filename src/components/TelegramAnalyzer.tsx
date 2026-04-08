import React, { useState } from 'react';
import { Send, Loader2, MessageSquare, Calendar, User, ExternalLink, Shield, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TelegramPost {
  id: string;
  text: string;
  date: string;
  channel: string;
  url: string;
  [key: string]: any;
}

export function TelegramAnalyzer() {
  const [channels, setChannels] = useState('durov, telegram');
  const [maxPosts, setMaxPosts] = useState(10);
  const [daysRange, setDaysRange] = useState(3);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<TelegramPost[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    const token = import.meta.env.VITE_APIFY_TOKEN;
    if (!token) {
      setError("Le token API Apify est manquant. Veuillez le configurer dans les paramètres.");
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setResults([]);

    try {
      const input = {
        "channels": channels,
        "maxPosts": maxPosts,
        "daysRange": daysRange,
        "includeText": true,
        "mediaOnly": false,
        "downloadMedia": false
      };

      // Run the Actor via REST API
      const runResponse = await fetch(`https://api.apify.com/v2/acts/f9ah2tzQwzhF8OyfK/runs?token=${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });

      if (!runResponse.ok) {
        const errorData = await runResponse.json();
        throw new Error(errorData.error?.message || "Erreur lors du lancement de l'Actor.");
      }

      const runData = await runResponse.json();
      const runId = runData.data.id;
      const datasetId = runData.data.defaultDatasetId;

      // Simple polling for completion
      let isFinished = false;
      let attempts = 0;
      const maxAttempts = 60; // 5 minutes (5s interval)

      while (!isFinished && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        attempts++;

        const statusResponse = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${token}`);
        const statusData = await statusResponse.json();
        const status = statusData.data.status;

        if (status === 'SUCCEEDED') {
          isFinished = true;
        } else if (status === 'FAILED' || status === 'ABORTED' || status === 'TIMED-OUT') {
          throw new Error(`L'analyse a échoué avec le statut : ${status}`);
        }
      }

      if (!isFinished) {
        throw new Error("L'analyse prend trop de temps. Veuillez vérifier la console Apify.");
      }

      // Fetch results from dataset
      const datasetResponse = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}`);
      const items = await datasetResponse.json();
      
      // Map results to our interface
      const mappedItems: TelegramPost[] = items.map((item: any) => ({
        id: item.id || Math.random().toString(36).substr(2, 9),
        text: item.text || item.message || '',
        date: item.date || item.publishedAt || new Date().toISOString(),
        channel: item.channelName || item.author || 'Unknown',
        url: item.url || item.link || '#',
        ...item
      }));

      setResults(mappedItems);
    } catch (err: any) {
      console.error('Apify Error:', err);
      setError(err.message || "Une erreur est survenue lors de l'analyse Telegram.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-[1800px] mx-auto py-10 px-8">
      {/* Header Section */}
      <header className="mb-10 flex items-center justify-between">
        <div className="flex items-center space-x-5">
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-tr from-primary via-primary/50 to-transparent rounded-2xl blur-md opacity-30 animate-pulse" />
            <div className="relative w-14 h-14 bg-secondary rounded-2xl flex items-center justify-center shadow-2xl border border-white/10 overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <Send className="w-7 h-7 text-primary drop-shadow-[0_0_8px_rgba(251,195,60,0.4)]" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-black text-secondary flex items-center">
              Analyseur <span className="text-primary ml-2">Telegram</span>
            </h1>
            <p className="text-[13px] font-bold text-slate-400 tracking-[0.1em] uppercase mt-0.5">
              Veille et extraction de données via Apify
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Configuration Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.05)] border border-gray-100 p-8">
            <h2 className="text-[12px] font-black text-slate-400 tracking-widest uppercase mb-6">Configuration</h2>
            
            <div className="space-y-5">
              <div>
                <label className="block text-[11px] font-black text-secondary uppercase tracking-wider mb-2">Canaux (séparés par virgule)</label>
                <input 
                  type="text" 
                  value={channels}
                  onChange={(e) => setChannels(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-bold text-secondary"
                  placeholder="ex: durov, telegram"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-black text-secondary uppercase tracking-wider mb-2">Max Posts</label>
                  <input 
                    type="number" 
                    value={maxPosts}
                    onChange={(e) => setMaxPosts(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-bold text-secondary"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black text-secondary uppercase tracking-wider mb-2">Plage (jours)</label>
                  <input 
                    type="number" 
                    value={daysRange}
                    onChange={(e) => setDaysRange(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-bold text-secondary"
                  />
                </div>
              </div>

              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className={`w-full py-4 rounded-2xl font-black tracking-widest uppercase transition-all flex items-center justify-center space-x-3 mt-4 ${
                  !isAnalyzing
                    ? 'bg-primary text-secondary shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98]'
                    : 'bg-gray-50 text-slate-300'
                }`}
              >
                {isAnalyzing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
                <span>Lancer l'analyse</span>
              </button>
            </div>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border border-red-100 p-5 rounded-2xl flex items-start space-x-3"
            >
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs font-bold text-red-600 leading-relaxed">{error}</p>
            </motion.div>
          )}

          <div className="bg-secondary p-6 rounded-2xl border border-slate-800 shadow-xl">
            <div className="flex items-center space-x-3 mb-4">
              <Shield className="w-4 h-4 text-primary" />
              <h3 className="text-[10px] font-black text-white uppercase tracking-widest">Note Sécurité</h3>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
              Cette analyse utilise l'Actor Apify <code className="text-primary">f9ah2tzQwzhF8OyfK</code>. Assurez-vous que votre token dispose des crédits nécessaires.
            </p>
          </div>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.05)] border border-gray-100 overflow-hidden min-h-[600px] flex flex-col">
            <div className="h-14 px-6 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-[12px] font-black text-slate-400 tracking-widest uppercase">
                Résultats de l'extraction
              </h2>
              {results.length > 0 && (
                <span className="bg-primary/10 text-secondary text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                  {results.length} messages trouvés
                </span>
              )}
            </div>

            <div className="flex-1 p-6 overflow-y-auto">
              {!isAnalyzing && results.length === 0 && !error && (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-4 py-20">
                  <MessageSquare className="w-12 h-12 opacity-10" />
                  <p className="text-[12px] font-bold uppercase tracking-widest">Aucun résultat à afficher</p>
                </div>
              )}

              {isAnalyzing && (
                <div className="h-full flex flex-col items-center justify-center py-20 space-y-6">
                  <Loader2 className="w-12 h-12 text-primary animate-spin" />
                  <div className="text-center">
                    <p className="text-sm font-black text-secondary uppercase tracking-widest">Analyse en cours...</p>
                    <p className="text-[11px] text-slate-400 font-bold mt-1">Apify extrait les données des canaux Telegram</p>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <AnimatePresence>
                  {results.map((post, idx) => (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="bg-slate-50/50 border border-slate-100 rounded-2xl p-6 hover:border-primary/30 transition-all group"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100">
                            <User className="w-5 h-5 text-secondary" />
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-secondary">@{post.channel}</h4>
                            <div className="flex items-center space-x-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              <Calendar className="w-3 h-3" />
                              <span>{new Date(post.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>
                        </div>
                        <a 
                          href={post.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 hover:text-primary hover:shadow-md transition-all border border-slate-100"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                      <p className="text-sm text-secondary/80 leading-relaxed font-medium whitespace-pre-wrap">
                        {post.text}
                      </p>
                      
                      {post.views && (
                        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center space-x-4">
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Vues: <span className="text-secondary ml-1">{post.views.toLocaleString()}</span>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
