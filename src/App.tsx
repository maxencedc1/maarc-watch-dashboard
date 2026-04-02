/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  Search, 
  LayoutDashboard, 
  Map, 
  BarChart3, 
  FileText, 
  CheckCircle2, 
  Sparkles, 
  Loader2,
  AlertCircle,
  ArrowRight,
  Shield,
  Lightbulb,
  ChevronDown,
  Zap,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { Cartographie } from './components/Cartographie';
import { IndicesDashboard } from './components/Indices';

// --- Types ---
type Page = 'correcteur' | 'cartographie' | 'analyste' | 'indices' | 'indice-social' | 'indice-composite' | 'indice-reputationnel';

interface CorrectionResult {
  errors: string[];
  optimizedText: string;
}

// --- Gemini Service ---
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

async function analyzeText(text: string): Promise<CorrectionResult> {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite-preview",
    contents: `Texte de l'utilisateur : "${text}"`,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
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

  const fullText = response.text || "";
  const parts = fullText.split("---SUGGESTIONS---");
  
  const errorsPart = parts[0]?.trim() || "";
  const optimizedText = parts[1]?.trim() || text;

  // Convert bullet points to array
  const errors = errorsPart
    .split('\n')
    .map(line => line.replace(/^[•\-\*\s]+/, '').trim())
    .filter(line => line.length > 0 && !line.toLowerCase().includes("aucune erreur détectée"));

  return {
    errors: errors.length > 0 ? errors : [],
    optimizedText
  };
}

// --- Components ---

const TopBar = ({ currentPage, setCurrentPage }: { currentPage: Page, setCurrentPage: (p: Page) => void }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<Page | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems: { id: Page; label: string; icon?: any; dropdownItems?: { id: Page; label: string }[] }[] = [
    { id: 'correcteur', label: 'Correcteur' },
    { id: 'cartographie', label: 'Cartographie' },
    { id: 'analyste', label: 'Analyste' },
    { 
      id: 'indices', 
      label: 'Indices', 
      dropdownItems: [
        { id: 'indice-social', label: 'Indice social enrichi' },
        { id: 'indice-composite', label: 'Indice composite social' },
        { id: 'indice-reputationnel', label: 'Indice réputationnel' },
      ] 
    },
  ];

  const isItemActive = (item: typeof navItems[0]) => {
    if (currentPage === item.id) return true;
    if (item.dropdownItems?.some(sub => sub.id === currentPage)) return true;
    return false;
  };

  return (
    <nav className={`h-16 px-8 flex items-center justify-between sticky top-0 z-50 transition-all duration-300 ${
      isScrolled ? 'bg-white shadow-md' : 'bg-transparent'
    }`}>
      <div className="flex items-center space-x-4">
        {navItems.map((item) => (
          <div 
            key={item.id} 
            className="relative"
            onMouseEnter={() => item.dropdownItems && setActiveDropdown(item.id)}
            onMouseLeave={() => setActiveDropdown(null)}
          >
            <button
              onClick={() => !item.dropdownItems && setCurrentPage(item.id)}
              className={`px-4 py-1.5 rounded-xl text-[13px] font-bold transition-all duration-200 flex items-center space-x-2 ${
                isItemActive(item)
                  ? 'bg-secondary text-white'
                  : 'text-secondary hover:bg-primary hover:text-secondary'
              }`}
            >
              <span>{item.label}</span>
              {item.dropdownItems && <ChevronDown className="w-3.5 h-3.5 opacity-50" />}
            </button>

            {item.dropdownItems && activeDropdown === item.id && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-full left-0 mt-1 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 py-3 overflow-hidden"
              >
                {item.dropdownItems.map((subItem) => (
                  <button
                    key={subItem.id}
                    onClick={() => {
                      setCurrentPage(subItem.id);
                      setActiveDropdown(null);
                    }}
                    className={`w-full px-5 py-2.5 text-left text-[12px] font-bold transition-all ${
                      currentPage === subItem.id
                        ? 'bg-primary/10 text-secondary'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-secondary'
                    }`}
                  >
                    {subItem.label}
                  </button>
                ))}
              </motion.div>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center">
        <a 
          href="https://www.maarc.fr/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="hover:opacity-80 transition-opacity"
        >
          <img 
            src="/logo.png" 
            alt="Maarc Logo" 
            className="h-8 w-auto"
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.src = "https://picsum.photos/seed/maarc/200/60";
            }}
          />
        </a>
      </div>
    </nav>
  );
};

const CorrecteurPage = () => {
  const [inputText, setInputText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<CorrectionResult | null>(null);

  const handleAnalyze = async () => {
    if (!inputText.trim()) return;
    setResult(null);
    setIsAnalyzing(true);
    try {
      const data = await analyzeText(inputText);
      setResult(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setInputText('');
    setResult(null);
  };

  return (
    <div className="max-w-[1800px] mx-auto py-10 px-8">
      {/* Header Section */}
      <header className="mb-10 flex items-center justify-between">
        <div className="flex items-center space-x-5">
          <div className="w-14 h-14 bg-secondary rounded-xl flex items-center justify-center shadow-lg">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-secondary flex items-center">
              Correcteur <span className="text-primary ml-2">Maarc</span>
            </h1>
            <p className="text-[13px] font-bold text-slate-400 tracking-[0.1em] uppercase mt-0.5">
              Correction & Optimisation de texte
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-6">
          <div className="h-12 bg-white border border-gray-100 rounded-2xl px-5 flex items-center space-x-3 shadow-sm">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black text-slate-300 tracking-wider uppercase">Plan Gratuit</span>
              <span className="text-xs font-bold text-secondary">0 requêtes / session</span>
            </div>
            <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
          </div>
          
          <button 
            onClick={handleReset}
            className={`h-12 px-8 text-[13px] font-black tracking-widest uppercase rounded-2xl transition-all flex items-center justify-center ${
              inputText.length > 0 
                ? 'bg-[var(--color-4)]/10 text-[var(--color-4)] hover:bg-[var(--color-4)]/20' 
                : 'bg-gray-50 text-slate-300 hover:bg-gray-100 hover:text-slate-500'
            }`}
          >
            Réinitialiser
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Section */}
        <div className="bg-white rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.15)] border border-gray-100 overflow-hidden flex flex-col h-[500px]">
          <div className="h-14 px-6 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
            <h2 className="text-[12px] font-black text-slate-400 tracking-widest uppercase">
              Votre texte à vérifier
            </h2>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span className="text-[11px] font-bold text-slate-300">{inputText.length}</span>
              </div>
            </div>
          </div>

          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="COLLEZ ICI LE TEXTE QUE VOUS SOUHAITEZ FAIRE CORRIGER ET OPTIMISER PAR L'IA MAARC..."
            className="flex-1 p-8 resize-none focus:outline-none text-secondary/70 placeholder:text-slate-300 placeholder:font-medium placeholder:text-[12px] placeholder:tracking-widest leading-relaxed text-[16px] font-medium"
          />

          <div className="p-6 bg-white flex justify-end">
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !inputText.trim()}
              className={`w-full py-3 rounded-2xl font-black tracking-widest uppercase transition-all flex items-center justify-center space-x-3 ${
                inputText.trim() && !isAnalyzing
                  ? 'bg-primary text-secondary shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98]'
                  : 'bg-gray-50 text-slate-300'
              }`}
            >
              {isAnalyzing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Shield className="w-4 h-4" />
              )}
              <span>Vérifier</span>
            </button>
          </div>
        </div>

        {/* Results Section */}
        <div className="flex flex-col gap-6">
          {/* Correcteur Box */}
          <div className="bg-white rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.15)] border border-gray-100 overflow-hidden flex flex-col h-[238px]">
            <div className="h-14 px-6 border-b border-[var(--color-5)]/10 flex items-center space-x-2 bg-[var(--color-5)]/5">
              <div className="w-6 h-6 bg-[var(--color-5)]/10 rounded-lg flex items-center justify-center">
                <Shield className="w-3.5 h-3.5 text-[var(--color-5)]" />
              </div>
              <h2 className="text-[12px] font-black text-[var(--color-5)] tracking-widest uppercase">
                Correcteur
              </h2>
            </div>
            <div className="flex-1 p-6 overflow-y-auto">
              {!result && !isAnalyzing && (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-2">
                  <Shield className="w-5 h-5 opacity-20" />
                  <p className="text-[12px] font-medium uppercase tracking-widest">Corrections factuelles</p>
                </div>
              )}
              {isAnalyzing && (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-[var(--color-5)]/20 animate-spin" />
                </div>
              )}
              {result && (
                <ul className="space-y-3">
                  {result.errors.length > 0 ? (
                    result.errors.map((error, idx) => (
                      <motion.li 
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        key={idx} 
                        className="flex items-start space-x-3 text-[13px] font-medium text-secondary/80 py-1.5"
                      >
                        <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[var(--color-5)] shrink-0" />
                        <span>{error}</span>
                      </motion.li>
                    ))
                  ) : (
                    <li className="text-[13px] font-bold text-emerald-600 bg-emerald-50/50 p-4 rounded-xl flex items-center space-x-2 border border-emerald-100">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Aucune erreur détectée.</span>
                    </li>
                  )}
                </ul>
              )}
            </div>
          </div>

          {/* Suggestions Box */}
          <div className="bg-white rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.15)] border border-gray-100 overflow-hidden flex flex-col h-[238px]">
            <div className="h-14 px-6 border-b border-[var(--color-6)]/10 flex items-center space-x-2 bg-[var(--color-6)]/5">
              <div className="w-6 h-6 bg-[var(--color-6)]/10 rounded-lg flex items-center justify-center">
                <Lightbulb className="w-3.5 h-3.5 text-[var(--color-6)]" />
              </div>
              <h2 className="text-[12px] font-black text-[var(--color-6)] tracking-widest uppercase">
                Suggestions
              </h2>
            </div>
            <div className="flex-1 p-6 overflow-y-auto">
              {!result && !isAnalyzing && (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-2">
                  <Lightbulb className="w-5 h-5 opacity-20" />
                  <p className="text-[12px] font-medium uppercase tracking-widest">Version optimisée</p>
                </div>
              )}
              {isAnalyzing && (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-[var(--color-6)]/20 animate-spin" />
                </div>
              )}
              {result && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-[14px] text-secondary/80 leading-relaxed font-medium"
                >
                  {result.optimizedText}
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>

      <footer className="mt-12 text-center">
        <p className="text-[11px] font-bold text-slate-400">
          L'IA peut faire des erreurs. Vérifiez les informations importantes avant toute publication.
        </p>
      </footer>
    </div>
  );
};

const PlaceholderPage = ({ title }: { title: string }) => (
  <div className="max-w-[1800px] mx-auto py-32 px-8 text-center">
    <div className="w-24 h-24 bg-white shadow-xl shadow-secondary/5 rounded-[2rem] flex items-center justify-center mx-auto mb-10 relative group">
      <div className="absolute inset-0 bg-primary/20 rounded-[2rem] blur-2xl group-hover:bg-primary/30 transition-all" />
      <LayoutDashboard className="w-10 h-10 text-secondary relative z-10" />
    </div>
    <h1 className="text-4xl font-black text-secondary uppercase tracking-tighter mb-4">
      {title} <span className="text-primary">Maarc</span>
    </h1>
    <div className="w-20 h-1.5 bg-primary mx-auto rounded-full mb-8" />
    <p className="text-slate-400 max-w-md mx-auto font-bold text-lg leading-relaxed">
      Cette section est en cours de développement pour l'usage interne de l'agence Maarc.
    </p>
  </div>
);

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('correcteur');

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans selection:bg-primary/30">
      <TopBar currentPage={currentPage} setCurrentPage={setCurrentPage} />
      
      <main className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {currentPage === 'correcteur' && <CorrecteurPage />}
            {currentPage === 'cartographie' && <Cartographie />}
            {currentPage === 'analyste' && <PlaceholderPage title="Analyste" />}
            {currentPage === 'indices' && <PlaceholderPage title="Indices" />}
            {currentPage === 'indice-social' && <IndicesDashboard title="Indice social enrichi" />}
            {currentPage === 'indice-composite' && <IndicesDashboard title="Indice composite social" />}
            {currentPage === 'indice-reputationnel' && <IndicesDashboard title="Indice réputationnel" />}
          </motion.div>
        </AnimatePresence>
      </main>

      <div className="py-6 border-t border-gray-100 text-center text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">
        &copy; {new Date().getFullYear()} Maarc Internal Dashboard
      </div>
    </div>
  );
}

