import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Youtube, 
  Search, 
  Play, 
  MessageSquare, 
  Loader2, 
  RotateCcw,
  Users,
  Calendar,
  Sparkles,
  RefreshCw,
  Plus,
  Minus,
  User
} from 'lucide-react';
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import Markdown from 'react-markdown';

interface Comment {
  id: string;
  author: string;
  text: string;
  date: string;
  likes: number;
}

const MOCK_COMMENTS: Comment[] = [
  { id: '1', author: 'Jean Dupont', text: 'Excellente analyse, très pertinent !', date: 'Il y a 2h', likes: 24 },
  { id: '2', author: 'Marie Curie', text: 'Je ne suis pas d\'accord sur le point 3, mais le reste est top.', date: 'Il y a 5h', likes: 12 },
  { id: '3', author: 'Tech Enthusiast', text: 'Est-ce que vous allez faire une suite sur ce sujet ?', date: 'Il y a 1j', likes: 45 },
  { id: '4', author: 'Sophie L.', text: 'Merci pour ces explications claires et précises.', date: 'Il y a 2j', likes: 8 },
  { id: '5', author: 'Marc V.', text: 'Vidéo un peu longue mais le contenu est de grande qualité.', date: 'Il y a 3j', likes: 15 },
  { id: '6', author: 'Julie D.', text: 'Superbe montage, très pro.', date: 'Il y a 4j', likes: 32 },
  { id: '7', author: 'Paul B.', text: 'J\'ai appris beaucoup de choses, merci !', date: 'Il y a 1sem', likes: 19 },
];

interface VideoInfo {
  title: string;
  viewCount: string;
  publishedAt: string;
  thumbnail: string;
}

export function YoutubeAnalyzer() {
  const [url, setUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasResult, setHasResult] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // AI Synthesis states
  const [synthesis, setSynthesis] = useState("");
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [isSynthesisExpanded, setIsSynthesisExpanded] = useState(false);

  const extractVideoId = (url: string) => {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
  };

  const handleAnalyze = async () => {
    const videoId = extractVideoId(url);
    if (!videoId) {
      setError("URL YouTube invalide.");
      return;
    }

    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      setError("Clé API YouTube manquante. Veuillez la configurer dans les paramètres.");
      return;
    }

    setIsAnalyzing(true);
    setHasResult(false);
    setError(null);
    setSynthesis("");
    setIsSynthesisExpanded(false);
    
    try {
      // 1. Fetch Video Info
      const videoRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoId}&key=${apiKey}`);
      const videoData = await videoRes.json();
      
      if (videoData.error) throw new Error(videoData.error.message);
      if (!videoData.items?.length) throw new Error("Vidéo non trouvée.");

      const item = videoData.items[0];
      setVideoInfo({
        title: item.snippet.title,
        viewCount: item.statistics.viewCount,
        publishedAt: item.snippet.publishedAt,
        thumbnail: item.snippet.thumbnails.maxres?.url || item.snippet.thumbnails.high.url
      });

      // 2. Fetch Comments
      const commentsRes = await fetch(`https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=50&key=${apiKey}`);
      const commentsData = await commentsRes.json();

      if (commentsData.error) {
        if (commentsData.error.errors?.[0]?.reason === 'commentsDisabled') {
          throw new Error("Les commentaires sont désactivés pour cette vidéo.");
        }
        throw new Error(commentsData.error.message);
      }

      const fetchedComments: Comment[] = (commentsData.items || []).map((item: any) => ({
        id: item.id,
        author: item.snippet.topLevelComment.snippet.authorDisplayName,
        text: item.snippet.topLevelComment.snippet.textDisplay,
        date: new Date(item.snippet.topLevelComment.snippet.publishedAt).toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        }),
        likes: item.snippet.topLevelComment.snippet.likeCount
      }));

      setComments(fetchedComments);
      setHasResult(true);
    } catch (err: any) {
      console.error("YouTube Fetch Error:", err);
      setError(err.message || "Une erreur est survenue lors de la récupération des données.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateSynthesis = async () => {
    if (!comments.length) return;
    
    setIsSynthesizing(true);
    setSynthesis("");
    
    try {
      const commentsText = comments.map(c => `- ${c.author}: ${c.text}`).join('\n');
      
      // Initialize Gemini API
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("Clé API Gemini manquante.");
      }

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite-preview",
        contents: `Voici une liste de commentaires sous une vidéo YouTube :\n\n${commentsText}\n\nFais une synthèse concise (environ 150 mots) des réactions de l'audience. Identifie les thèmes récurrents, le sentiment global et les éventuelles questions posées. Réponds en français au format Markdown.`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
          systemInstruction: "Tu es un analyste expert en médias sociaux. Ta mission est de synthétiser les retours d'audience pour en extraire des insights stratégiques.",
        }
      });

      setSynthesis(response.text || "Erreur lors de la génération de la synthèse.");
      setIsSynthesisExpanded(true);
    } catch (err: any) {
      console.error("Synthesis error:", err);
      setSynthesis(`Une erreur est survenue : ${err.message}`);
      setIsSynthesisExpanded(true);
    } finally {
      setIsSynthesizing(false);
    }
  };

  const handleReset = () => {
    setUrl('');
    setHasResult(false);
    setComments([]);
    setVideoInfo(null);
    setError(null);
    setSynthesis("");
    setIsSynthesisExpanded(false);
  };

  const formatViews = (views: string) => {
    const num = parseInt(views);
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toString();
  };

  return (
    <div className="max-w-[1800px] mx-auto py-10 px-8 flex flex-col gap-8">
      {/* Header Section */}
      <header className="mb-2 flex items-center justify-between">
        <div className="flex items-center space-x-5">
          <div className="w-14 h-14 bg-secondary rounded-xl flex items-center justify-center shadow-lg">
            <Youtube className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-secondary flex items-center">
              YouTube <span className="text-primary ml-2">Analyser</span>
            </h1>
            <p className="text-[13px] font-bold text-slate-400 tracking-[0.1em] uppercase mt-0.5">
              Analyse & Sentiment des commentaires
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center space-x-6">
            <div className="h-12 bg-white border border-gray-100 rounded-2xl px-5 flex items-center space-x-4 shadow-sm w-[500px]">
              <Search className="w-4 h-4 text-slate-300" />
              <input 
                type="text" 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Collez l'URL de la vidéo YouTube ici..."
                className="flex-1 bg-transparent border-none outline-none text-sm font-bold text-secondary placeholder:text-slate-300 placeholder:font-bold placeholder:uppercase placeholder:tracking-widest"
              />
            </div>
            
            <button 
              onClick={handleAnalyze}
              disabled={isAnalyzing || !url.trim()}
              className={`h-12 px-8 text-[13px] font-black tracking-widest uppercase rounded-2xl transition-all flex items-center justify-center ${
                url.trim() && !isAnalyzing
                  ? 'bg-primary text-secondary shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98]'
                  : 'bg-gray-50 text-slate-300'
              }`}
            >
              {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Charger
            </button>

            <button 
              onClick={handleReset}
              className={`h-12 px-6 text-[13px] font-black tracking-widest uppercase rounded-2xl transition-all flex items-center justify-center ${
                url.length > 0 
                  ? 'bg-[var(--color-4)]/10 text-[var(--color-4)] hover:bg-[var(--color-4)]/20' 
                  : 'bg-gray-50 text-slate-300 hover:bg-gray-100 hover:text-slate-500'
              }`}
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[10px] font-black text-red-500 uppercase tracking-widest bg-red-50 px-4 py-1.5 rounded-xl border border-red-100"
            >
              {error}
            </motion.div>
          )}
        </div>
      </header>

      <div className="grid grid-cols-12 gap-8">
        {/* Video Preview Box */}
        <div className="col-span-5 bg-white rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.15)] border border-gray-100 overflow-hidden flex flex-col h-[600px]">
          <div className="h-14 px-6 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
            <h2 className="text-[12px] font-black text-slate-400 tracking-widest uppercase">
              Aperçu de la vidéo
            </h2>
          </div>
          
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            {!hasResult ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center"
              >
                <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-6">
                  <Play className="w-8 h-8 text-slate-200" />
                </div>
                <h3 className="text-lg font-black text-slate-400 uppercase tracking-tighter mb-2">Vidéo en attente...</h3>
                <p className="text-slate-300 text-sm font-bold max-w-xs leading-relaxed">
                  Collez l'URL d'une vidéo YouTube ci-dessus pour commencer.
                </p>
              </motion.div>
            ) : videoInfo && (
              <div className="w-full h-full flex flex-col">
                <div className="aspect-video bg-slate-900 rounded-2xl overflow-hidden mb-6 shadow-2xl relative group">
                  <img 
                    src={videoInfo.thumbnail} 
                    alt="Thumbnail"
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center shadow-2xl scale-90 group-hover:scale-100 transition-transform">
                      <Play className="w-6 h-6 text-secondary ml-1" />
                    </div>
                  </div>
                </div>
                <div className="text-left space-y-4">
                  <h4 className="text-xl font-black text-secondary leading-tight">{videoInfo.title}</h4>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-slate-400" />
                      <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{formatViews(videoInfo.viewCount)} vues</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span className="text-xs font-black text-slate-500 uppercase tracking-widest">
                        {new Date(videoInfo.publishedAt).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Analysis Box */}
        <div className="col-span-7 bg-white rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.15)] border border-gray-100 overflow-hidden flex flex-col h-[600px]">
          <div className="p-5 bg-white shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-black text-slate-900 flex items-center gap-2 uppercase tracking-widest">
                <MessageSquare size={14} className="text-secondary" />
                Flux de Commentaires
              </h2>
              <div className="flex items-center gap-2">
                {hasResult && (
                  <button
                    onClick={generateSynthesis}
                    disabled={isSynthesizing}
                    className="flex items-center gap-2 bg-secondary text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-secondary/90 transition-all disabled:opacity-30 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {isSynthesizing ? (
                      <RefreshCw size={12} className="animate-spin" />
                    ) : (
                      <Sparkles size={12} />
                    )}
                    Analyse
                  </button>
                )}
                <span className="text-[10px] font-black bg-secondary/10 text-secondary px-2.5 py-1 rounded-lg">
                  {comments.length}
                </span>
              </div>
            </div>

            {/* AI Synthesis Accordion (Matching Cartographie) */}
            <AnimatePresence>
              {(synthesis || isSynthesizing) && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-[#FBC33C] rounded-2xl overflow-hidden shadow-sm mb-4"
                >
                  <button 
                    onClick={() => setIsSynthesisExpanded(!isSynthesisExpanded)}
                    className="w-full px-4 py-2.5 flex items-center justify-between text-black hover:bg-black/5 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles size={14} className="text-black" />
                      <span className="text-[9px] font-black uppercase tracking-widest">Synthèse IA des conversations</span>
                    </div>
                    {isSynthesisExpanded ? <Minus size={14} className="text-black" /> : <Plus size={14} className="text-black" />}
                  </button>
                  
                  <AnimatePresence>
                    {isSynthesisExpanded && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="px-4 pb-4 max-h-[250px] overflow-y-auto custom-scrollbar-light"
                      >
                        {isSynthesizing ? (
                          <div className="py-6 flex flex-col items-center justify-center gap-3">
                            <RefreshCw size={20} className="text-black animate-spin" />
                            <p className="text-[9px] font-black text-black/60 uppercase tracking-widest animate-pulse">Génération en cours...</p>
                          </div>
                        ) : (
                          <div className="prose prose-sm max-w-none text-[11px] text-left leading-relaxed prose-headings:text-black prose-headings:font-black prose-headings:uppercase prose-headings:tracking-widest prose-h1:text-[12px] prose-headings:mb-3 prose-p:text-black prose-p:font-medium prose-p:mb-3 prose-strong:text-black prose-strong:font-black prose-ul:list-none prose-ul:pl-0 prose-ul:mb-3 prose-li:text-black prose-li:mb-1 prose-li:relative prose-li:pl-4 prose-li:before:content-['-'] prose-li:before:absolute prose-li:before:left-0 prose-li:before:top-0">
                            <Markdown>{synthesis}</Markdown>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {!hasResult ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-6">
                  <MessageSquare className="w-8 h-8 text-slate-200" />
                </div>
                <h3 className="text-lg font-black text-slate-400 uppercase tracking-tighter mb-2">Commentaires en attente...</h3>
                <p className="text-slate-300 text-sm font-bold max-w-xs leading-relaxed">
                  L'analyse des commentaires et du sentiment apparaîtra ici.
                </p>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {comments.map((comment) => (
                  <motion.div
                    key={comment.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-2xl border border-slate-100 bg-slate-50 hover:border-slate-200 transition-all group"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-secondary/10 flex items-center justify-center">
                          <User size={14} className="text-secondary" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-slate-900 group-hover:text-secondary transition-colors">
                            {comment.author}
                          </span>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            {comment.date}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] font-black text-secondary bg-white px-2 py-1 rounded-lg shadow-sm">
                        <Sparkles size={10} className="text-primary" />
                        {comment.likes}
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                      {comment.text}
                    </p>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
