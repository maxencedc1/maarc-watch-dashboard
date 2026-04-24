import React, { useState, useRef } from 'react';
import { 
  Download, 
  Upload, 
  Type, 
  BarChart3, 
  FileText, 
  Plus, 
  Trash2,
  Settings2,
  Save,
  Image as ImageIcon,
  Loader2,
  Shield
} from 'lucide-react';
import { motion } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const NotePage: React.FC = () => {
  const [title] = useState('Panoramique 2030');
  const [subtitle] = useState("Analyse de l'opinion numérique");
  const [period, setPeriod] = useState('Semaine du 15 au 21 avril 2024');
  const clientLogo = "/logo-client.png.webp";
  const [customKPIs, setCustomKPIs] = useState([
    { value: 0, label: 'Mentions', trend: [0, 0, 0, 0, 0, 0, 0] }
  ]);
  
  const SOCIAL_PLATFORMS = [
    { name: 'X', color: '#000000' },
    { name: 'Facebook', color: '#1877f2' },
    { name: 'Instagram', color: '#e4405f' },
    { name: 'LinkedIn', color: '#0077b5' },
    { name: 'YouTube', color: '#ff0000' },
    { name: 'Bluesky', color: '#0085ff' },
    { name: 'Threads', color: '#000000' },
    { name: 'Telegram', color: '#24a1de' },
    { name: 'Discord', color: '#5865f2' },
    { name: 'TikTok', color: '#000000' },
  ];

  const [socialData, setSocialData] = useState([
    { name: 'X', value: 0, color: '#000000' },
    { name: 'Facebook', value: 0, color: '#1877f2' },
    { name: 'Instagram', value: 0, color: '#e4405f' },
  ]);

  const [shareOfVoiceData, setShareOfVoiceData] = useState([
    { name: 'Solideo', value: 0, color: '#FBC33C' },
    { name: 'JO 2030', value: 0, color: '#FF5E34' },
  ]);

  const [analysisGroups, setAnalysisGroups] = useState([
    { 
      title: 'A retenir',
      subjects: [
        { 
          subject: 'Sujet 1', 
          analysis: "Entrez votre analyse ici...",
          tone: 'neutral' as 'positive' | 'neutral' | 'critical'
        }
      ]
    }
  ]);
  
  const [isExporting, setIsExporting] = useState(false);
  const deliverableRef = useRef<HTMLDivElement>(null);

  const COLORS = ['#1E016F', '#FBC33C', '#FF5E34', '#6366f1', '#10b981', '#f43f5e', '#8b5cf6', '#e4405f', '#0077b5', '#1877f2'];

  const addKPI = () => {
    setCustomKPIs([...customKPIs, { value: 0, label: 'Nouveau KPI', trend: [0, 0, 0, 0, 0, 0, 0] }]);
  };

  const removeKPI = (index: number) => {
    setCustomKPIs(customKPIs.filter((_, i) => i !== index));
  };

  const updateKPI = (index: number, field: 'value' | 'label' | 'trend', value: any) => {
    setCustomKPIs(prev => prev.map((k, i) => i === index ? { ...k, [field]: value } : k));
  };

  const updateKPITrend = (kpiIdx: number, trendIdx: number, value: number) => {
    setCustomKPIs(prev => prev.map((k, i) => {
      if (i === kpiIdx) {
        const newTrend = [...(k.trend || [0, 0, 0, 0, 0, 0, 0])];
        newTrend[trendIdx] = value;
        return { ...k, trend: newTrend };
      }
      return k;
    }));
  };

  const addSocialData = () => {
    const platform = SOCIAL_PLATFORMS[socialData.length % SOCIAL_PLATFORMS.length];
    setSocialData([...socialData, { ...platform, value: 0 }]);
  };

  const removeSocialData = (index: number) => {
    setSocialData(socialData.filter((_, i) => i !== index));
  };

  const updateSocialData = (index: number, field: 'name' | 'value', value: any) => {
    setSocialData(prev => prev.map((s, i) => {
      if (i === index) {
        if (field === 'name') {
          const platform = SOCIAL_PLATFORMS.find(p => p.name === value);
          return { ...s, name: value, color: platform?.color || s.color };
        }
        return { ...s, [field]: value };
      }
      return s;
    }));
  };

  const addShareOfVoice = () => {
    setShareOfVoiceData([...shareOfVoiceData, { name: 'Nouveau', value: 0, color: COLORS[(shareOfVoiceData.length + 2) % COLORS.length] }]);
  };

  const removeShareOfVoice = (index: number) => {
    setShareOfVoiceData(shareOfVoiceData.filter((_, i) => i !== index));
  };

  const addGroup = () => {
    setAnalysisGroups([...analysisGroups, { title: 'Nouvelle Section', subjects: [{ subject: 'Sujet 1', analysis: '', tone: 'neutral' }] }]);
  };

  const removeGroup = (groupIdx: number) => {
    setAnalysisGroups(analysisGroups.filter((_, i) => i !== groupIdx));
  };

  const updateGroupTitle = (groupIdx: number, title: string) => {
    setAnalysisGroups(prev => prev.map((g, i) => i === groupIdx ? { ...g, title } : g));
  };

  const addSubject = (groupIdx: number) => {
    const newGroups = [...analysisGroups];
    newGroups[groupIdx].subjects.push({ subject: 'Nouveau Sujet', analysis: '', tone: 'neutral' });
    setAnalysisGroups(newGroups);
  };

  const removeSubject = (groupIdx: number, subIdx: number) => {
    const newGroups = [...analysisGroups];
    newGroups[groupIdx].subjects = newGroups[groupIdx].subjects.filter((_, i) => i !== subIdx);
    setAnalysisGroups(newGroups);
  };

  const updateSubject = (groupIdx: number, subIdx: number, field: string, value: any) => {
    setAnalysisGroups(prev => prev.map((g, i) => i === groupIdx ? {
      ...g,
      subjects: g.subjects.map((s, j) => j === subIdx ? { ...s, [field]: value } : s)
    } : g));
  };

  const handlePrint = () => {
    window.print();
  };

  const exportImage = async () => {
    if (!deliverableRef.current) return;
    setIsExporting(true);

    try {
      // Use html2canvas directly to get a high-quality image
      const canvas = await html2canvas(deliverableRef.current, {
        scale: 3, // High resolution
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      const fileName = title.toLowerCase().replace(/\s+/g, '-') + '.png';
      link.download = fileName;
      link.href = imgData;
      link.click();
    } catch (error) {
      console.error('Erreur lors de l\'export Image:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const exportPDF = async () => {
    if (!deliverableRef.current) return;
    setIsExporting(true);
    
    try {
      const canvas = await html2canvas(deliverableRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          // Fix for html2canvas oklch/oklab parsing error (Tailwind 4 uses these by default)
          // We force standard RGB/Hex colors and remove problematic rules
          
          // 1. Target all style tags and strip out problematic color functions
          const styles = clonedDoc.getElementsByTagName('style');
          for (let i = 0; i < styles.length; i++) {
            const style = styles[i];
            if (style.innerHTML.includes('oklch') || style.innerHTML.includes('oklab')) {
              style.innerHTML = style.innerHTML
                .replace(/oklch\([^)]+\)/g, '#000000')
                .replace(/oklab\([^)]+\)/g, '#000000')
                .replace(/color-mix\([^)]+\)/g, '#000000');
            }
          }

          // 2. Inject a powerful override style tag
          const styleOverride = clonedDoc.createElement('style');
          styleOverride.innerHTML = `
            :root {
              --color-slate-50: #f8fafc !important;
              --color-slate-100: #f1f5f9 !important;
              --color-slate-200: #e2e8f0 !important;
              --color-slate-300: #cbd5e1 !important;
              --color-slate-400: #94a3b8 !important;
              --color-slate-500: #64748b !important;
              --color-slate-600: #475569 !important;
              --color-slate-700: #334155 !important;
              --color-slate-800: #1e293b !important;
              --color-slate-900: #0f172a !important;
              
              --color-gray-50: #f9fafb !important;
              --color-gray-100: #f3f4f6 !important;
              --color-gray-200: #e5e7eb !important;
              --color-gray-300: #d1d5db !important;
              --color-gray-400: #9ca3af !important;
              --color-gray-500: #6b7280 !important;
              
              --color-blue-50: #eff6ff !important;
              --color-blue-100: #dbeafe !important;
              --color-red-50: #fef2f2 !important;
              --color-red-100: #fee2e2 !important;
              --color-emerald-50: #ecfdf5 !important;
              --color-emerald-100: #d1fae5 !important;

              /* Neutralize any potential oklab/oklch usage in system vars */
              --tw-ring-color: rgba(0,0,0,0) !important;
              --tw-ring-offset-color: rgba(0,0,0,0) !important;
              --tw-shadow: 0 0 #0000 !important;
              --tw-shadow-colored: 0 0 #0000 !important;
              --tw-ring-shadow: 0 0 #0000 !important;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              color-adjust: exact !important;
              print-color-adjust: exact !important;
              box-shadow: none !important;
              text-shadow: none !important;
            }
            .bg-slate-50 { background-color: #f8fafc !important; }
            .bg-primary { background-color: #FBC33C !important; }
            .bg-secondary { background-color: #1C1C1C !important; }
            .text-primary { color: #FBC33C !important; }
            .text-secondary { color: #1C1C1C !important; }
            .border-slate-100 { border-color: #f1f5f9 !important; }
            .text-slate-300 { color: #cbd5e1 !important; }
            .text-slate-400 { color: #94a3b8 !important; }
            .bg-\\[\\#fdfbf7\\] { background-color: #fdfbf7 !important; }
            .border-\\[\\#f5efdf\\] { border-color: #f5efdf !important; }
            .bg-\\[\\#fcfdff\\] { background-color: #fcfdff !important; }
            .bg-\\[\\#fff9f9\\] { background-color: #fff9f9 !important; }
            .bg-primary\\/30 { background-color: #fdecbc !important; }
            .bg-primary\\/2 { background-color: #fffcf5 !important; }
            
            /* Ensure the font is applied and fix alignment */
            .deliverable-root { 
              font-family: Calibri, "Segoe UI", Helvetica, Arial, sans-serif !important; 
            }
            .deliverable-root * {
              box-sizing: border-box !important;
            }
            .flex { display: flex !important; }
            .items-center { align-items: center !important; }
            .items-baseline { align-items: baseline !important; }
          `;
          clonedDoc.head.appendChild(styleOverride);
        }
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      const fileName = title.toLowerCase().replace(/\s+/g, '-') + '.pdf';
      pdf.save(fileName);
    } catch (error) {
      console.error('Erreur lors de l\'export PDF:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="max-w-[1500px] mx-auto pt-10 pb-20 px-8">
      <style>
        {`
          @media print {
            @page {
              margin: 0;
              size: A4;
            }
            body {
              background: white !important;
              padding: 0 !important;
              margin: 0 !important;
            }
            .no-print, 
            header, 
            footer:not(.deliverable-footer),
            aside,
            .xl\\:col-span-4 {
              display: none !important;
            }
            .xl\\:col-span-8 {
              width: 100% !important;
              max-width: none !important;
              padding: 0 !important;
              margin: 0 !important;
            }
            .deliverable-root {
              width: 100% !important;
              max-width: none !important;
              height: auto !important;
              min-height: 100vh !important;
              box-shadow: none !important;
              padding: 40px 60px !important;
              margin: 0 !important;
              border: none !important;
              position: absolute !important;
              top: 0 !important;
              left: 0 !important;
            }
            .max-w-\\[1500px\\] {
              max-width: none !important;
              padding: 0 !important;
              margin: 0 !important;
            }
          }
        `}
      </style>
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
        {/* Left Control Panel / Editor */}
        <div className="xl:col-span-4 space-y-8">
          <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 flex flex-col h-fit sticky top-10">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-black text-secondary tracking-tighter">Éditeur</h2>
              <div className="flex space-x-2">
                <button 
                  onClick={handlePrint}
                  className="flex items-center space-x-2 px-3 py-2 bg-slate-100 text-slate-600 rounded-xl font-black text-[10px] tracking-widest uppercase hover:bg-slate-200 transition-all"
                  title="Impression native (plus précis)"
                >
                  <Plus className="w-3 h-3 rotate-45" />
                  <span>Imprimer</span>
                </button>
                <button 
                  onClick={exportImage}
                  disabled={isExporting}
                  className="flex items-center space-x-2 px-3 py-2 bg-slate-100 text-slate-600 rounded-xl font-black text-[10px] tracking-widest uppercase hover:bg-slate-200 transition-all disabled:opacity-50"
                  title="Export Image Haute Résolution"
                >
                  {isExporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImageIcon className="w-3 h-3" />}
                  <span>Image</span>
                </button>
                <button 
                  onClick={exportPDF}
                  disabled={isExporting}
                  className="flex items-center space-x-2 px-3 py-2 bg-primary text-secondary rounded-xl font-black text-[10px] tracking-widest uppercase hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                >
                  {isExporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                  <span>PDF</span>
                </button>
              </div>
            </div>

            <div className="space-y-8 overflow-y-auto max-h-[700px] pr-2 custom-scrollbar">
              {/* Configuration Section */}
              <section className="space-y-4">
                <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] flex items-center">
                  <Settings2 className="w-3 h-3 mr-2" />
                  Général
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Période d'analyse</label>
                    <input 
                      type="text" 
                      value={period}
                      onChange={(e) => setPeriod(e.target.value)}
                      className="w-full p-3 bg-slate-50 border-none rounded-xl font-bold text-secondary text-sm focus:ring-1 focus:ring-primary/20"
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Indicateurs (KPIs)</label>
                      <button onClick={addKPI} className="p-1 px-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-all font-black text-[8px] uppercase tracking-tighter">
                        + Ajouter
                      </button>
                    </div>
                    <div className="space-y-0">
                      {customKPIs.map((kpi, idx) => (
                        <div key={idx} className="py-4 border-b border-slate-100 last:border-0 group space-y-4">
                          <div className="flex items-center space-x-2">
                            <input 
                              type="text" 
                              value={kpi.label}
                              onChange={(e) => updateKPI(idx, 'label', e.target.value)}
                              className="flex-1 bg-slate-50 px-3 py-2 border-none rounded-xl focus:ring-1 focus:ring-primary/20 text-[11px] font-bold text-secondary"
                              placeholder="Libellé"
                            />
                            <input 
                              type="number" 
                              value={kpi.value}
                              onChange={(e) => updateKPI(idx, 'value', parseInt(e.target.value) || 0)}
                              className="w-24 bg-slate-50 px-3 py-2 border-none rounded-xl focus:ring-1 focus:ring-primary/20 text-[11px] font-bold text-secondary"
                              placeholder="Valeur"
                            />
                            <button onClick={() => removeKPI(idx)} className="p-1.5 opacity-0 group-hover:opacity-100 text-rose-500 hover:text-rose-600 transition-all">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          
                          <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Tendance (7 jours)</label>
                            <div className="grid grid-cols-7 gap-1">
                              {(kpi.trend || [0, 0, 0, 0, 0, 0, 0]).map((val, tIdx) => (
                                <input 
                                  key={tIdx}
                                  type="number"
                                  value={val}
                                  onChange={(e) => updateKPITrend(idx, tIdx, parseInt(e.target.value) || 0)}
                                  className="w-full bg-slate-50 px-1 py-2 border-none rounded-lg focus:ring-1 focus:ring-primary/20 text-[9px] font-bold text-secondary text-center"
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              {/* Social Media Distribution */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] flex items-center">
                    <BarChart3 className="w-3 h-3 mr-2" />
                    Plateformes
                  </h3>
                  <button onClick={addSocialData} className="p-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-all">
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <div className="space-y-0">
                  {socialData.map((item, idx) => (
                    <div key={idx} className="flex items-center space-x-2 py-2 border-b border-slate-100 last:border-0 group">
                      <select 
                        value={item.name}
                        onChange={(e) => updateSocialData(idx, 'name', e.target.value)}
                        className="flex-1 bg-slate-50 px-3 py-2 border-none rounded-xl focus:ring-1 focus:ring-primary/20 text-[11px] font-bold text-secondary appearance-none"
                      >
                        {SOCIAL_PLATFORMS.map(p => (
                          <option key={p.name} value={p.name}>{p.name}</option>
                        ))}
                      </select>
                      <input 
                        type="number" 
                        value={item.value}
                        onChange={(e) => updateSocialData(idx, 'value', parseInt(e.target.value) || 0)}
                        className="w-20 bg-slate-50 px-3 py-2 border-none rounded-xl focus:ring-1 focus:ring-primary/20 text-[11px] font-bold text-secondary"
                        placeholder="Val"
                      />
                      <button onClick={() => removeSocialData(idx)} className="p-1.5 opacity-0 group-hover:opacity-100 text-rose-500 hover:text-rose-600 transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              {/* Share of Voice */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] flex items-center">
                    <Shield className="w-3 h-3 mr-2" />
                    Part de Voix (%)
                  </h3>
                  <button onClick={addShareOfVoice} className="p-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-all">
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <div className="space-y-0">
                  {shareOfVoiceData.map((item, idx) => (
                    <div key={idx} className="flex items-center space-x-2 py-2 border-b border-slate-100 last:border-0 group">
                      <input 
                        type="text" 
                        value={item.name}
                        onChange={(e) => {
                          setShareOfVoiceData(prev => prev.map((it, i) => i === idx ? { ...it, name: e.target.value } : it));
                        }}
                        className="flex-1 bg-slate-50 px-3 py-2 border-none rounded-xl focus:ring-1 focus:ring-primary/20 text-[11px] font-bold text-secondary"
                        placeholder="Nom"
                      />
                      <input 
                        type="number" 
                        value={item.value}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setShareOfVoiceData(prev => prev.map((it, i) => i === idx ? { ...it, value: val } : it));
                        }}
                        className="w-20 bg-slate-50 px-3 py-2 border-none rounded-xl focus:ring-1 focus:ring-primary/20 text-[11px] font-bold text-secondary"
                        placeholder="%"
                      />
                      <button onClick={() => removeShareOfVoice(idx)} className="p-1.5 opacity-0 group-hover:opacity-100 text-rose-500 hover:text-rose-600 transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              {/* Analysis Groups */}
              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] flex items-center">
                    <FileText className="w-3 h-3 mr-2" />
                    Sections d'Analyse
                  </h3>
                  <button onClick={addGroup} className="p-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-all">
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                
                <div className="space-y-8">
                  {analysisGroups.map((group, groupIdx) => (
                    <div key={groupIdx} className="space-y-4 border-l-2 border-primary/20 pl-4 py-2 relative group">
                      <div className="flex items-center space-x-2">
                        <input 
                          type="text" 
                          value={group.title}
                          onChange={(e) => updateGroupTitle(groupIdx, e.target.value)}
                          className="flex-1 bg-transparent border-none focus:ring-0 text-xs font-black text-primary uppercase tracking-widest p-0"
                          placeholder="Titre de la section..."
                        />
                        <button onClick={() => addSubject(groupIdx)} className="p-1 bg-slate-100 text-slate-400 rounded hover:bg-slate-200">
                          <Plus className="w-3 h-3" />
                        </button>
                        <button onClick={() => removeGroup(groupIdx)} className="p-1 opacity-0 group-hover:opacity-100 text-rose-500 hover:text-rose-600 transition-all">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="space-y-4">
                        {group.subjects.map((sub, subIdx) => (
                          <div key={subIdx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 relative group/sub">
                            <button 
                              onClick={() => removeSubject(groupIdx, subIdx)}
                              className="absolute top-2 right-2 p-1.5 opacity-0 group-hover/sub:opacity-100 text-rose-500 hover:text-rose-600 transition-all"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                            
                            <div className="flex items-center space-x-2 mb-2">
                              <input 
                                type="text" 
                                value={sub.subject}
                                onChange={(e) => updateSubject(groupIdx, subIdx, 'subject', e.target.value)}
                                className="flex-1 bg-transparent border-none focus:ring-0 text-[11px] font-bold text-secondary p-0"
                                placeholder="Sujet..."
                              />
                              <div className="flex bg-white px-2 py-1 rounded-lg border border-slate-200">
                                <button 
                                  onClick={() => updateSubject(groupIdx, subIdx, 'tone', 'critical')}
                                  className={`w-4 h-4 rounded-full flex items-center justify-center transition-all ${sub.tone === 'critical' ? 'scale-110 shadow-sm' : 'opacity-30'}`}
                                >
                                  😡
                                </button>
                                <button 
                                  onClick={() => updateSubject(groupIdx, subIdx, 'tone', 'neutral')}
                                  className={`w-4 h-4 rounded-full flex items-center justify-center transition-all mx-1 ${sub.tone === 'neutral' ? 'scale-110 shadow-sm' : 'opacity-30'}`}
                                >
                                  😐
                                </button>
                                <button 
                                  onClick={() => updateSubject(groupIdx, subIdx, 'tone', 'positive')}
                                  className={`w-4 h-4 rounded-full flex items-center justify-center transition-all ${sub.tone === 'positive' ? 'scale-110 shadow-sm' : 'opacity-30'}`}
                                >
                                  😊
                                </button>
                              </div>
                            </div>

                            <textarea 
                              value={sub.analysis}
                              onChange={(e) => updateSubject(groupIdx, subIdx, 'analysis', e.target.value)}
                              className="w-full bg-transparent border-none focus:ring-0 text-[10px] text-secondary/70 leading-relaxed p-0 h-20 resize-none"
                              placeholder="Analyse..."
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>

        {/* Deliverable Preview */}
        <div className="xl:col-span-8">
          <div 
            ref={deliverableRef}
            className="bg-white rounded-none shadow-2xl mx-auto w-full max-w-[900px] min-h-[1150px] pt-10 px-[60px] pb-[60px] flex flex-col relative overflow-hidden deliverable-root"
            style={{ fontFamily: 'Calibri, "Segoe UI", Helvetica, Arial, sans-serif' }}
          >
            {/* Header */}
            <div className="flex justify-between items-start mb-2 relative z-10">
              <div className="flex flex-col">
                <div className="flex items-center space-x-6 mb-4 h-6">
                  <div className="w-12 h-[2px] bg-primary flex-shrink-0" />
                  <span className="text-[11px] font-black text-secondary uppercase tracking-[0.2em] leading-none">
                    {period}
                  </span>
                </div>
                <div className="space-y-1">
                  <h1 className="text-5xl font-black text-[#1E016F] tracking-tighter leading-tight">
                    {title}
                  </h1>
                  <p className="text-lg font-bold text-slate-400 tracking-tight">
                    {subtitle}
                  </p>
                </div>
              </div>
              
              <div className="relative group">
                <img 
                  src={clientLogo} 
                  alt="Client Logo" 
                  className="max-h-24 max-w-[220px] object-contain" 
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    // Fallback to a placeholder SVG mountain if the logo fails to load
                    e.currentTarget.style.display = 'none';
                    const parent = e.currentTarget.parentElement;
                    if (parent && !parent.querySelector('.logo-fallback')) {
                      const fallback = document.createElement('div');
                      fallback.className = 'logo-fallback flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl p-4 w-[180px] h-24 bg-slate-50/50';
                      fallback.innerHTML = `
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m8 3 4 8 5-5 5 15H2L8 3z"/></svg>
                        <span style="font-size: 8px; font-weight: bold; color: #94a3b8; margin-top: 8px; text-transform: uppercase; letter-spacing: 0.1em;">Logo Client</span>
                      `;
                      parent.appendChild(fallback);
                    }
                  }}
                />
              </div>
            </div>

            {/* Combined Metrics Dashboard Banner */}
            <div className="px-5 mb-4 relative z-10 transition-all">
              <div className="grid grid-cols-3 gap-20">
                {/* Total Mentions / Custom KPIs (Left side) */}
                <div className="flex flex-col items-center justify-start h-full">
                  <div className="h-[220px] w-full flex flex-col justify-start items-center space-y-6 pt-2 overflow-hidden">
                    {customKPIs.map((kpi, idx) => (
                      <div key={idx} className="flex flex-col items-center justify-center w-full">
                        <div className="flex items-baseline space-x-3 mb-1">
                          <div className="text-5xl font-black text-black tabular-nums leading-none">
                            {kpi.value.toLocaleString('fr-FR')}
                          </div>
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{kpi.label}</div>
                        </div>
                        
                        {/* Trend Sparkline */}
                        {kpi.trend && (
                          <div className="h-10 w-full max-w-[140px] mt-2">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={kpi.trend.map((v, i) => ({ val: v, day: i }))}>
                                <Line 
                                  type="monotone" 
                                  dataKey="val" 
                                  stroke={idx === 0 ? "#1E016F" : COLORS[idx % COLORS.length]} 
                                  strokeWidth={3} 
                                  dot={false}
                                  isAnimationActive={false}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="h-[40px]" /> {/* Spacer to align with legends */}
                </div>

                {/* Social Donut (Middle) */}
                <div className="flex flex-col items-center justify-start h-full">
                  <div className="h-[210px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart margin={{ top: 0, right: 35, bottom: 0, left: 35 }}>
                        <Pie
                          data={socialData}
                          innerRadius={30}
                          outerRadius={40}
                          paddingAngle={4}
                          dataKey="value"
                          isAnimationActive={false}
                          labelLine={false}
                          label={false}
                        >
                          {socialData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} stroke="rgba(255,255,255,0.5)" strokeWidth={1} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Custom Legend for Social Distribution */}
                  <div className="mt-4 flex flex-col space-y-1.5 items-center w-full">
                    <div className="inline-flex flex-col items-start min-w-[100px]">
                      {socialData.map((item, idx) => (
                        <div key={idx} className="flex items-center w-full min-h-[12px]">
                          <div 
                            className="w-2 h-2 rounded-full mr-2 flex-shrink-0" 
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-[8px] font-black text-black uppercase tracking-wider whitespace-nowrap leading-none pt-[1px]">
                            {item.name} ({item.value})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-8 text-center w-full">Répartition Plateformes</span>
                </div>

                {/* Share of Voice Pie (Right side) */}
                <div className="flex flex-col items-center justify-start h-full">
                  <div className="h-[210px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart margin={{ top: 0, right: 35, bottom: 0, left: 35 }}>
                        <Pie
                          data={shareOfVoiceData}
                          outerRadius={40}
                          dataKey="value"
                          isAnimationActive={false}
                          labelLine={false}
                          label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, value }) => {
                            if (!value || value === 0) return null;
                            const RADIAN = Math.PI / 180;
                            const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                            const x = cx + radius * Math.cos(-midAngle * RADIAN);
                            const y = cy + radius * Math.sin(-midAngle * RADIAN);
                            return (
                              <text 
                                x={x} 
                                y={y} 
                                fill="black" 
                                textAnchor="middle" 
                                dominantBaseline="central" 
                                style={{ fontSize: '11px', fontWeight: '900', pointerEvents: 'none' }}
                              >
                                {value}%
                              </text>
                            );
                          }}
                        >
                          {shareOfVoiceData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} stroke="rgba(255,255,255,0.5)" strokeWidth={1} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Custom Legend for Share of Voice */}
                  <div className="mt-4 flex flex-col space-y-1.5 items-center w-full">
                    <div className="inline-flex flex-col items-start min-w-[100px]">
                      {shareOfVoiceData.map((item, idx) => (
                        <div key={idx} className="flex items-center w-full min-h-[12px]">
                          <div 
                            className="w-2 h-2 rounded-full mr-2 flex-shrink-0" 
                            style={{ backgroundColor: COLORS[(idx + 2) % COLORS.length] }}
                          />
                          <span className="text-[8px] font-black text-black uppercase tracking-wider whitespace-nowrap leading-none pt-[1px]">
                            {item.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-8 text-center w-full">Part de Voix (%)</span>
                </div>
              </div>
            </div>

            {/* Analysis Section */}
            <div className="flex-1 relative z-10">
              <div className="space-y-16">
                {analysisGroups.map((group, gIdx) => (
                  <div key={gIdx} className="space-y-10">
                    <h2 className="text-[11px] font-black text-primary uppercase tracking-[0.4em] pb-4 border-b border-slate-100 flex items-center">
                      {group.title}
                    </h2>

                    <div className="space-y-10">
                      {group.subjects.map((sub, idx) => (
                        <motion.div 
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          key={idx} 
                          className="relative"
                        >
                          <h3 className="text-xl font-bold text-secondary mb-4 flex items-center min-h-[28px]">
                            <span className="w-4 h-[2px] bg-primary mr-3 flex-shrink-0 self-center" />
                            <span className="flex-1 leading-tight">{sub.subject || "Sujet d'analyse"}</span>
                            <div className="flex items-center ml-3 self-center h-full">
                              <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest mr-2 leading-none">Sentiment</span>
                              <span className="text-lg flex items-center justify-center leading-none h-[1.2rem]">
                                {sub.tone === 'positive' && '😊'}
                                {sub.tone === 'neutral' && '😐'}
                                {sub.tone === 'critical' && '😡'}
                              </span>
                            </div>
                          </h3>
                          <p className="text-[15px] text-secondary/80 leading-[1.9] font-medium text-justify whitespace-pre-wrap">
                            {sub.analysis || "En attente d'analyse..."}
                          </p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="mt-20 pt-10 border-t border-slate-100 flex justify-between items-center relative z-10">
              <div className="flex items-center">
                <img 
                  src="/logo.png" 
                  alt="Maarc Logo" 
                  className="h-8 w-auto object-contain"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const parent = e.currentTarget.parentElement;
                    if (parent && !parent.querySelector('.maarc-fallback')) {
                      const fallback = document.createElement('div');
                      fallback.className = 'maarc-fallback flex items-center space-x-2';
                      fallback.innerHTML = `
                        <div class="w-8 h-8 bg-[#1C1C1C] rounded-lg flex items-center justify-center">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FBC33C" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                        </div>
                      `;
                      parent.appendChild(fallback);
                    }
                  }}
                />
              </div>
              <div className="text-[10px] font-black text-slate-400">
                1
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
