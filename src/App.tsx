import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import Correcteur from './components/Correcteur';
import Cartographie from './components/Cartographie';
import YouTubeAnalyser from './components/YouTubeAnalyser';
const logo = '/logo.png';
import { ChevronDown, Youtube } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState<'indices' | 'correcteur' | 'cartographie' | 'youtube'>('correcteur');
  const [activeTab, setActiveTab] = useState('visibilite');
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const tabs = [
    { id: 'visibilite', label: 'Visibilité sociale enrichie', title: 'Score de visibilité sociale enrichie' },
    { id: 'composite', label: 'Indice composite social', title: 'Indice composite social' },
    { id: 'reputationnel', label: 'Indice réputationnel', title: 'Indice réputationnel' },
  ];

  const handleTabSelect = (tabId: string) => {
    setActiveTab(tabId);
    setCurrentView('indices');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Bar */}
      <nav className={`sticky top-0 z-50 shrink-0 transition-all duration-300 ${
        scrolled 
          ? 'bg-white border-b border-slate-200 shadow-sm py-0' 
          : 'bg-transparent border-b border-transparent py-2'
      }`}>
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Correcteur Button */}
            <button
              onClick={() => setCurrentView('correcteur')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                currentView === 'correcteur'
                  ? 'bg-secondary text-white shadow-md'
                  : 'text-slate-600 hover:bg-primary hover:text-secondary'
              }`}
            >
              Correcteur
            </button>

            {/* Cartographie Button */}
            <button
              onClick={() => setCurrentView('cartographie')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                currentView === 'cartographie'
                  ? 'bg-secondary text-white shadow-md'
                  : 'text-slate-600 hover:bg-primary hover:text-secondary'
              }`}
            >
              Cartographie
            </button>

            {/* Analyste Dropdown */}
            <div className="relative group">
              <button 
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  currentView === 'youtube' 
                    ? 'bg-secondary text-white shadow-md' 
                    : 'text-slate-600 hover:bg-primary hover:text-secondary'
                }`}
              >
                Analyste
                <ChevronDown size={16} className="transition-transform group-hover:rotate-180" />
              </button>
              
              {/* Dropdown Content */}
              <div className="absolute left-0 top-full pt-2 opacity-0 invisible translate-y-2 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 transition-all duration-200 z-50">
                <div className="bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden min-w-[200px]">
                  <button
                    onClick={() => setCurrentView('youtube')}
                    className={`w-full text-left px-4 py-3 text-sm font-bold transition-colors flex items-center gap-2 ${
                      currentView === 'youtube'
                        ? 'bg-slate-50 text-secondary border-l-4 border-secondary'
                        : 'text-slate-600 hover:bg-primary hover:text-secondary'
                    }`}
                  >
                    <Youtube size={16} />
                    YouTube
                  </button>
                </div>
              </div>
            </div>

            {/* Dropdown Menu */}
            <div className="relative group">
              <button 
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  currentView === 'indices' 
                    ? 'bg-secondary text-white shadow-md' 
                    : 'text-slate-600 hover:bg-primary hover:text-secondary'
                }`}
              >
                Indices
                <ChevronDown size={16} className="transition-transform group-hover:rotate-180" />
              </button>
              
              {/* Dropdown Content */}
              <div className="absolute left-0 top-full pt-2 opacity-0 invisible translate-y-2 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 transition-all duration-200 z-50">
                <div className="bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden min-w-[240px]">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => handleTabSelect(tab.id)}
                      className={`w-full text-left px-4 py-3 text-sm font-bold transition-colors ${
                        currentView === 'indices' && activeTab === tab.id
                          ? 'bg-slate-50 text-secondary border-l-4 border-secondary'
                          : 'text-slate-600 hover:bg-primary hover:text-secondary'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          <a 
            href="https://www.maarc.fr/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="h-10 block hover:opacity-80 transition-opacity"
          >
            <img 
              src={logo} 
              alt="Maarc" 
              className="h-full object-contain" 
              referrerPolicy="no-referrer" 
            />
          </a>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 py-4 pb-12">
        {currentView === 'indices' ? (
          tabs.map((tab) => (
            <div key={tab.id} className={activeTab === tab.id ? 'block' : 'hidden'}>
              <Dashboard title={tab.title} />
            </div>
          ))
        ) : currentView === 'correcteur' ? (
          <Correcteur />
        ) : currentView === 'cartographie' ? (
          <Cartographie />
        ) : (
          <YouTubeAnalyser />
        )}
      </main>
    </div>
  );
}
