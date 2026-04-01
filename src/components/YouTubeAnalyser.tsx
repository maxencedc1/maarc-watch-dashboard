import React, { useState } from 'react';
import { Search, Youtube, MessageSquare, Brain, Loader2, AlertCircle, Sparkles, RotateCcw, Plus, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import ReactMarkdown from 'react-markdown';

const GEMINI_MODEL = "gemini-3-flash-preview";

export default function YouTubeAnalyser() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [videoData, setVideoData] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [isAnalysisExpanded, setIsAnalysisExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const extractVideoId = (url: string) => {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
  };

  const handleSearch = async () => {
    const videoId = extractVideoId(url);
    if (!videoId) {
      setError("URL YouTube invalide");
      return;
    }

    setLoading(true);
    setError(null);
    setAnalysis(null);
    
    try {
      const response = await fetch(`/api/youtube/video?videoId=${videoId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de la récupération des données YouTube");
      }
      
      setVideoData(data.video);
      setComments(data.comments);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const runAnalysis = async () => {
    if (!comments.length) return;

    setAnalyzing(true);
    setIsAnalysisExpanded(true);
    setError(null);

    try {
      const response = await fetch('/api/youtube/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoTitle: videoData.title,
          comments: comments,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur lors de l'analyse");
      }

      const data = await response.json();
      const analysisText = data.analysis;
      setAnalysis(analysisText);

      // Save to Firebase if user is logged in
      if (auth.currentUser) {
        await addDoc(collection(db, 'youtube_analyses'), {
          videoId: videoData.id,
          videoTitle: videoData.title,
          analysis: analysisText,
          createdAt: serverTimestamp(),
          userId: auth.currentUser.uid
        });
      }
    } catch (err: any) {
      setError("Erreur lors de l'analyse IA : " + err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleReset = () => {
    setUrl('');
    setVideoData(null);
    setComments([]);
    setAnalysis(null);
    setIsAnalysisExpanded(false);
    setError(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col gap-6 bg-slate-50/50 rounded-2xl">
      {/* Header Section - Same style as Correcteur and Cartographie */}
      <div className="flex flex-col sm:flex-row items-center justify-between shrink-0 px-2 gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-secondary to-slate-700 flex items-center justify-center text-white shadow-lg shadow-secondary/20">
            <Youtube size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-secondary tracking-tight">YouTube <span className="text-primary">Analyser</span></h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Analyse & Sentiment des commentaires</p>
          </div>
        </div>

        {/* Search Bar - Same height as buttons on other pages (42px) */}
        <div className="flex items-center gap-4 flex-1 justify-end max-w-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Collez l'URL de la vidéo YouTube ici..."
              className="w-full h-[42px] pl-12 pr-4 bg-white border border-slate-200 rounded-2xl shadow-sm focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none font-medium text-sm"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (videoData ? handleReset() : handleSearch())}
            />
          </div>
          <button
            onClick={videoData ? handleReset : handleSearch}
            disabled={loading || (!url && !videoData)}
            className={`w-[130px] flex items-center justify-center px-4 h-[42px] rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border shrink-0 ${
              loading 
                ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'
                : videoData
                  ? 'text-red-500 bg-red-50 border-red-100 hover:bg-red-100'
                  : url 
                    ? 'bg-primary text-secondary border-primary/20 hover:bg-primary/90' 
                    : 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'
            }`}
          >
            {loading ? 'Analyse...' : videoData ? 'Réinitialiser' : 'Analyser'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-700 text-sm font-bold mx-2">
          <AlertCircle size={20} />
          <p>{error}</p>
        </div>
      )}

      {videoData ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 items-stretch">
            {/* Left Column: Video & Info (40%) */}
            <div className="lg:col-span-4 bg-white rounded-2xl shadow-xl p-8 border border-slate-200 flex flex-col h-[450px]">
              <div className="aspect-video rounded-2xl overflow-hidden shadow-2xl bg-black border border-slate-200 shrink-0">
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${videoData.id}`}
                  title="YouTube video player"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
              
              <div className="mt-8 space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                <h2 className="text-2xl font-black text-secondary tracking-tight">{videoData.title}</h2>
                <div className="flex gap-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <span className="flex items-center gap-2">
                    <span className="text-secondary">{parseInt(videoData.viewCount).toLocaleString()}</span> vues
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-secondary">{parseInt(videoData.likeCount).toLocaleString()}</span> likes
                  </span>
                </div>
                <p className="text-slate-600 text-sm leading-relaxed font-medium">
                  {videoData.description}
                </p>
              </div>
            </div>

            {/* Right Column: Comments (60%) */}
            <div className="lg:col-span-6 bg-white rounded-2xl shadow-xl border border-slate-200 flex flex-col h-[450px] overflow-hidden">
              <div className="p-6 bg-white shrink-0">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-black text-slate-900 flex items-center gap-2 uppercase tracking-widest">
                    <MessageSquare size={16} className="text-secondary" />
                    Commentaires
                    <span className="ml-1 bg-secondary/10 text-secondary px-2 py-0.5 rounded-lg text-[10px]">
                      {comments.length}
                    </span>
                  </h3>
                  
                  <button
                    onClick={runAnalysis}
                    disabled={analyzing || !comments.length}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                      analyzing 
                        ? 'bg-amber-100 text-amber-600' 
                        : 'bg-secondary text-white hover:bg-secondary/90 shadow-md shadow-secondary/20'
                    }`}
                  >
                    {analyzing ? <Loader2 className="animate-spin" size={12} /> : <Sparkles size={12} />}
                    {analyzing ? 'Analyse...' : 'Synthèse IA'}
                  </button>
                </div>

                {/* AI Synthesis Accordion */}
                <AnimatePresence>
                  {(analysis || analyzing) && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="bg-[#FBC33C] rounded-2xl overflow-hidden shadow-sm mb-2"
                    >
                      <button 
                        onClick={() => setIsAnalysisExpanded(!isAnalysisExpanded)}
                        className="w-full px-4 py-2.5 flex items-center justify-between text-black hover:bg-black/5 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Sparkles size={14} className="text-black" />
                          <span className="text-[9px] font-black uppercase tracking-widest">Synthèse IA</span>
                        </div>
                        {isAnalysisExpanded ? <Minus size={14} className="text-black" /> : <Plus size={14} className="text-black" />}
                      </button>
                      
                      <AnimatePresence>
                        {isAnalysisExpanded && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="px-4 pb-4 max-h-[300px] overflow-y-auto custom-scrollbar-light"
                          >
                            {analyzing ? (
                              <div className="py-6 flex flex-col items-center justify-center gap-3">
                                <Loader2 size={20} className="text-black animate-spin" />
                                <p className="text-[9px] font-black text-black/60 uppercase tracking-widest animate-pulse">Génération en cours...</p>
                              </div>
                            ) : (
                              <div className="prose prose-sm max-w-none text-[11px] text-left leading-relaxed prose-headings:text-black prose-headings:font-black prose-headings:uppercase prose-headings:tracking-widest prose-h1:text-[12px] prose-headings:mb-3 prose-p:text-black prose-p:font-medium prose-p:mb-3 prose-strong:text-black prose-strong:font-black prose-ul:list-none prose-ul:pl-0 prose-ul:mb-3 prose-li:text-black prose-li:mb-1 prose-li:relative prose-li:pl-4 prose-li:before:content-['-'] prose-li:before:absolute prose-li:before:left-0 prose-li:before:top-0">
                                <ReactMarkdown>{analysis!}</ReactMarkdown>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 pt-0 space-y-4 custom-scrollbar bg-slate-50/30">
                {comments.map((comment) => (
                  <div key={comment.id} className="p-4 bg-white rounded-2xl border border-slate-100 hover:border-primary/20 transition-all group shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-black text-secondary uppercase tracking-wider truncate max-w-[120px]">{comment.author}</span>
                      <span className="text-[8px] font-bold text-slate-400 uppercase whitespace-nowrap">{new Date(comment.publishedAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed font-medium" dangerouslySetInnerHTML={{ __html: comment.text }}></p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 items-stretch">
          {/* Left Placeholder (40%) */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-xl flex flex-col items-center justify-center p-12 text-center h-[450px]">
            <Youtube size={48} className="text-slate-200 mb-4" />
            <h3 className="text-lg font-bold text-slate-400">Vidéo en attente...</h3>
            <p className="text-slate-400 text-sm max-w-xs mt-2">Collez l'URL d'une vidéo YouTube ci-dessus pour commencer.</p>
          </div>
          
          {/* Right Placeholder (60%) */}
          <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 shadow-xl flex flex-col items-center justify-center p-12 text-center h-[450px]">
            <MessageSquare size={48} className="text-slate-200 mb-4" />
            <h3 className="text-lg font-bold text-slate-400">Commentaires en attente...</h3>
            <p className="text-slate-400 text-sm max-w-xs mt-2">L'analyse des commentaires et du sentiment apparaîtra ici.</p>
          </div>
        </div>
      )}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
        
        .custom-scrollbar-light::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar-light::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar-light::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar-light::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
}
