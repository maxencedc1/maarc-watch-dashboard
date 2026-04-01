import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Send, Loader2, Trash2, Copy, Check, ShieldCheck, Lightbulb } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function Correcteur() {
  const [input, setInput] = useState('');
  const [corrections, setCorrections] = useState('');
  const [suggestions, setSuggestions] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedCorrections, setCopiedCorrections] = useState(false);
  const [copiedSuggestions, setCopiedSuggestions] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemini-3-flash-preview');
  const [requestCount, setRequestCount] = useState(0);

  const models = [
    { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash (Rapide)', icon: '⚡' },
  ];

  const handleGenerate = async () => {
    if (!input.trim() || isLoading) return;

    setIsLoading(true);
    setCorrections('');
    setSuggestions('');

    try {
      // Prioritize the key from the environment, then from the .env file (via Vite's define)
      const apiKey = (process.env.GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY || "").trim();
      
      console.log("API Key found:", apiKey ? "Yes (starts with " + apiKey.substring(0, 6) + "...)" : "No");
      
      if (!apiKey || apiKey === "undefined" || apiKey === "MY_GEMINI_API_KEY" || apiKey === "") {
        throw new Error("Clé API manquante ou non configurée. Veuillez configurer GEMINI_API_KEY dans les secrets de l'application.");
      }

      const ai = new GoogleGenAI({ apiKey });
      const result = await ai.models.generateContent({
        model: selectedModel,
        contents: [{ role: 'user', parts: [{ text: input }] }],
        config: {
          systemInstruction: `Tu es un expert en linguistique et correction de texte. Analyse le texte de l'utilisateur et fournis deux sections distinctes séparées par le délimiteur "---SUGGESTIONS---".

SECTION 1 (CORRECTIONS) : Liste uniquement les erreurs d'orthographe, de grammaire et de ponctuation de manière extrêmement courte et factuelle sous forme de bullet points. Si aucune erreur n'est détectée, écris uniquement "Aucune erreur détectée".

SECTION 2 (SUGGESTIONS) : Propose une nouvelle version intégrale du texte de l'utilisateur. 
IMPORTANT : 
- Ne donne AUCUNE explication, introduction ou commentaire. 
- Propose directement le texte réécrit de manière plus fluide et élégante.
- Ne change pas la nature ou le sens du texte initial.
- N'ajoute aucun élément d'information nouveau.
- Si le texte est déjà optimal, réécris-le tel quel.

Format de réponse attendu :
[Bullet points des corrections]
---SUGGESTIONS---
[Texte intégral réécrit]`,
        }
      });

      const fullText = result.text || "";
      if (!fullText) throw new Error("Réponse vide de l'IA");

      setRequestCount(prev => prev + 1);

      const parts = fullText.split('---SUGGESTIONS---');
      
      setCorrections(parts[0]?.trim() || "Aucune correction générée.");
      setSuggestions(parts[1]?.trim() || "Aucune suggestion générée.");
    } catch (error: any) {
      console.error("Erreur Gemini:", error);
      const errorMessage = error?.message || "Une erreur inconnue est survenue.";
      setCorrections(`Erreur : ${errorMessage}`);
      setSuggestions("Impossible de générer la version optimisée.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string, setter: (v: boolean) => void) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  const clearAll = () => {
    setInput('');
    setCorrections('');
    setSuggestions('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col gap-6 bg-slate-50/50 rounded-2xl">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-center justify-between shrink-0 px-2 gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-secondary to-slate-700 flex items-center justify-center text-white shadow-lg shadow-secondary/20">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-secondary tracking-tight">Correcteur <span className="text-primary">Maarc</span></h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Correction & Optimisation de texte</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end shrink-0 gap-4">
          <div className="flex items-center gap-4">
            {/* Quota Indicator */}
            <div className="w-[130px] flex items-center gap-3 bg-white border border-slate-200 px-4 h-[42px] rounded-2xl shadow-sm">
              <div className="flex flex-col items-end justify-center w-full">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Plan Gratuit</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                </div>
                <span className="text-[10px] font-bold text-secondary leading-none">{requestCount} requêtes / session</span>
              </div>
            </div>

            <button 
              onClick={clearAll}
              disabled={!input && !corrections && !suggestions}
              className={`w-[130px] flex items-center justify-center gap-2 px-4 h-[42px] text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all border ${
                (input || corrections || suggestions) 
                  ? 'text-red-500 bg-red-50 border-red-100 hover:bg-red-100' 
                  : 'text-slate-300 bg-slate-50 border-slate-100 cursor-not-allowed'
              }`}
            >
              Réinitialiser
            </button>
          </div>
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left: Editor Box (Full Height) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl flex flex-col overflow-hidden group focus-within:ring-4 focus-within:ring-primary/10 transition-all h-[450px]">
          <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Votre texte à vérifier</span>
              <select 
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="text-[10px] font-bold text-secondary bg-slate-100 border-none rounded-lg px-2 py-1 focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer hover:bg-slate-200 transition-colors"
              >
                {models.map(model => (
                  <option key={model.id} value={model.id}>
                    {model.icon} {model.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] text-slate-400 font-mono font-bold">{input.length} caractères</span>
            </div>
          </div>
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Collez ici le texte que vous souhaitez faire corriger et optimiser par l'IA Maarc..."
              className="w-full h-full p-8 text-secondary text-base leading-relaxed focus:outline-none resize-none placeholder:text-slate-300 font-medium"
            />
          </div>
          <div className="p-6 border-t border-slate-100 bg-slate-50/30 flex justify-end">
            <button
              onClick={handleGenerate}
              disabled={!input.trim() || isLoading}
              className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-2xl ${
                input.trim() && !isLoading 
                  ? 'bg-primary text-secondary shadow-primary/40 hover:scale-[1.02] active:scale-95 hover:bg-primary/90' 
                  : 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none'
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Analyse...
                </>
              ) : (
                <>
                  <ShieldCheck size={20} />
                  Vérifier & Optimiser
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right: Two Stacked Boxes */}
        <div className="flex flex-col gap-6 sticky top-24 self-start h-fit">
          {/* Top: Correcteur Box */}
          <div className="h-[213px] bg-white rounded-2xl border border-slate-200 shadow-xl flex flex-col overflow-hidden transition-all hover:shadow-xl">
            <div className="px-6 py-3 border-b border-slate-100 bg-orange-50/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-orange-100 rounded-lg text-4">
                  <ShieldCheck size={14} />
                </div>
                <span className="text-[10px] font-black text-4 uppercase tracking-[0.2em]">Correcteur</span>
              </div>
              {corrections && (
                <button 
                  onClick={() => handleCopy(corrections, setCopiedCorrections)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                    copiedCorrections ? 'bg-orange-100 text-4' : 'text-slate-400 hover:bg-slate-100 hover:text-secondary'
                  }`}
                >
                  {copiedCorrections ? <Check size={12} /> : <Copy size={12} />}
                  {copiedCorrections ? 'Copié !' : 'Copier'}
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-6 bg-white">
              {!corrections && !isLoading ? (
                <EmptyState icon={<ShieldCheck size={24} className="text-orange-200" />} text="Corrections factuelles" />
              ) : isLoading ? (
                <LoadingState text="Analyse des erreurs..." />
              ) : (
                <MarkdownContent content={corrections} />
              )}
            </div>
          </div>

          {/* Bottom: Suggestions Box */}
          <div className="h-[213px] bg-white rounded-2xl border border-slate-200 shadow-xl flex flex-col overflow-hidden transition-all hover:shadow-xl">
            <div className="px-6 py-3 border-b border-slate-100 bg-amber-50/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-100 rounded-lg text-6">
                  <Lightbulb size={14} />
                </div>
                <span className="text-[10px] font-black text-6 uppercase tracking-[0.2em]">Suggestions</span>
              </div>
              {suggestions && (
                <button 
                  onClick={() => handleCopy(suggestions, setCopiedSuggestions)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                    copiedSuggestions ? 'bg-amber-100 text-6' : 'text-slate-400 hover:bg-slate-100 hover:text-secondary'
                  }`}
                >
                  {copiedSuggestions ? <Check size={12} /> : <Copy size={12} />}
                  {copiedSuggestions ? 'Copié !' : 'Copier'}
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-6 bg-white">
              {!suggestions && !isLoading ? (
                <EmptyState icon={<Lightbulb size={24} className="text-amber-200" />} text="Version optimisée" />
              ) : isLoading ? (
                <LoadingState text="Optimisation du style..." />
              ) : (
                <MarkdownContent content={suggestions} />
              )}
            </div>
          </div>
        </div>
      </div>
      
      <p className="text-[10px] text-slate-400 text-center shrink-0">
        L'IA peut faire des erreurs. Vérifiez les informations importantes avant toute publication.
      </p>
    </div>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode, text: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center space-y-3 opacity-40">
      <div className="w-12 h-12 rounded-2xl bg-slate-200 flex items-center justify-center text-slate-400">
        {icon}
      </div>
      <p className="text-xs font-bold text-slate-500">{text}</p>
    </div>
  );
}

function LoadingState({ text }: { text: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center space-y-3">
      <div className="w-8 h-8 rounded-full border-3 border-slate-100 border-t-secondary animate-spin" />
      <p className="text-[10px] font-bold text-slate-400 animate-pulse uppercase tracking-wider">{text}</p>
    </div>
  );
}

function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="text-slate-700 text-sm leading-relaxed">
      <ReactMarkdown
        components={{
          h1: ({node, ...props}) => <h1 className="text-lg font-bold text-slate-800 mt-4 mb-2" {...props} />,
          h2: ({node, ...props}) => <h2 className="text-base font-bold text-slate-800 mt-3 mb-2" {...props} />,
          p: ({node, ...props}) => <p className="mb-3 last:mb-0" {...props} />,
          ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-3 space-y-1" {...props} />,
          ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-3 space-y-1" {...props} />,
          li: ({node, ...props}) => <li className="pl-1" {...props} />,
          code: ({node, ...props}) => <code className="bg-slate-100 px-1.5 py-0.5 rounded text-secondary font-mono text-xs" {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
