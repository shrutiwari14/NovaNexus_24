import React, { useState, useEffect } from 'react';
import { LectureSession, Language, DiagramSuggestion, DiagramSuggestionsData } from '../types';
import {
  Sparkles,
  BarChart2,
  Workflow,
  Layers,
  Network,
  Columns,
  RefreshCw,
  Send,
  Eye,
  ChevronDown,
  ChevronUp,
  Tag,
  HelpCircle,
} from 'lucide-react';

interface DiagramSuggestionsWidgetProps {
  session: LectureSession;
  selectedLanguage: Language;
  onSelectSuggestedQuestion: (questionText: string) => void;
}

export const DiagramSuggestionsWidget: React.FC<DiagramSuggestionsWidgetProps> = ({
  session,
  selectedLanguage,
  onSelectSuggestedQuestion,
}) => {
  const [data, setData] = useState<DiagramSuggestionsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');
  const [previewingDiagramId, setPreviewingDiagramId] = useState<string | null>(null);

  // Helper for generating intelligent local fallback diagram suggestions if API is offline or loading
  const generateFallbackSuggestions = (session: LectureSession): DiagramSuggestionsData => {
    const textToScan = `${session.summary.overview} ${session.summary.keyConcepts
      .map((k) => `${k.title} ${k.description}`)
      .join(' ')} ${session.transcripts.map((t) => t.text).join(' ')}`;

    const lowerText = textToScan.toLowerCase();

    const extractedKeywords: string[] = [];
    if (lowerText.includes('wave') || lowerText.includes('interference') || lowerText.includes('duality')) {
      extractedKeywords.push('Wave-Particle Duality', 'Interference Pattern', 'Double-Slit');
    }
    if (lowerText.includes('de broglie') || lowerText.includes('lambda') || lowerText.includes('momentum')) {
      extractedKeywords.push('De Broglie Wavelength', 'Momentum Equation');
    }
    if (lowerText.includes('gradient') || lowerText.includes('derivative') || lowerText.includes('partial')) {
      extractedKeywords.push('Gradient Vector Field', 'Level Curves', '3D Surface');
    }
    if (lowerText.includes('collapse') || lowerText.includes('measurement') || lowerText.includes('photon')) {
      extractedKeywords.push('Wave Function Collapse', 'Observer Effect');
    }

    if (extractedKeywords.length === 0) {
      extractedKeywords.push(
        session.summary.keyConcepts[0]?.title || 'Core Lecture Concept',
        session.summary.keyConcepts[1]?.title || 'Formula Application',
        'Academic Keyword'
      );
    }

    const suggestions: DiagramSuggestion[] = [
      {
        id: 'fallback-1',
        type: lowerText.includes('gradient') ? '3D Surface & Vector Contour Field Map' : '2D Intensity Profile & Wave Superposition Plot',
        category: 'chart',
        matchedKeywords: extractedKeywords.slice(0, 2),
        reason: 'Visualizing exact mathematical wave distribution or field curves clarifies constructive vs destructive superposition.',
        translatedReason: selectedLanguage.code === 'hi' 
          ? 'सटीक गणितीय तरंग वितरण का चित्रण रचनात्मक और विनाशी स्थितियों को स्पष्ट रूप से समझाता है।'
          : 'Visualizing wave distribution clarifies constructive vs destructive superposition.',
        suggestedQuestion: `Can you explain the ${lowerText.includes('gradient') ? '3D Surface Contour Field Map' : '2D Wave Intensity Profile'} step-by-step for this lecture?`,
      },
      {
        id: 'fallback-2',
        type: 'Step-by-Step Quantum State Measurement Flowchart',
        category: 'flowchart',
        matchedKeywords: extractedKeywords.slice(1, 3),
        reason: 'Flowcharts break down multi-stage physical processes (emission -> slit diffraction -> observer measurement -> collapse) sequentially.',
        translatedReason: selectedLanguage.code === 'hi'
          ? 'फ़्लोचार्ट बहु-स्तरीय भौतिक प्रक्रियाओं को क्रमिक रूप से चरणों में विभाजित करते हैं।'
          : 'Flowcharts break down multi-stage physical processes sequentially.',
        suggestedQuestion: 'How does the wave function collapse step-by-step when a detector is placed at the slit?',
      },
      {
        id: 'fallback-3',
        type: 'Conceptual Relationship Mindmap (Classical vs. Quantum)',
        category: 'concept_map',
        matchedKeywords: extractedKeywords.slice(0, 3),
        reason: 'Contrasts classical Newtonian particle trajectories with probabilistic quantum wave packet dynamics.',
        translatedReason: selectedLanguage.code === 'hi'
          ? 'शास्त्रीय न्यूटोनियन कणों और संभावना आधारित क्वांटम तरंगों के बीच संबंधों का तुलनात्मक नक्शा।'
          : 'Contrasts classical trajectories with probabilistic quantum waves.',
        suggestedQuestion: 'What are the key structural differences between Classical and Quantum mechanics represented in a concept map?',
      },
    ];

    return {
      extractedKeywords: Array.from(new Set(extractedKeywords)),
      suggestions,
    };
  };

  const fetchDiagramSuggestions = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/suggest-diagrams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summaryOverview: session.summary.overview,
          keyConcepts: session.summary.keyConcepts,
          formulas: session.summary.formulas,
          transcriptText: session.transcripts.map((t) => t.text).join(' '),
          targetLanguageName: selectedLanguage.name,
        }),
      });

      if (!res.ok) {
        throw new Error('API failed');
      }

      const json = await res.json();
      if (json && json.suggestions && json.suggestions.length > 0) {
        setData(json);
      } else {
        setData(generateFallbackSuggestions(session));
      }
    } catch (e) {
      console.warn('Using fallback diagram suggestions:', e);
      setData(generateFallbackSuggestions(session));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDiagramSuggestions();
  }, [session.id, selectedLanguage.code]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'chart':
        return <BarChart2 className="w-4 h-4 text-emerald-400" />;
      case 'flowchart':
        return <Workflow className="w-4 h-4 text-cyan-400" />;
      case 'schematic':
        return <Layers className="w-4 h-4 text-purple-400" />;
      case 'concept_map':
        return <Network className="w-4 h-4 text-amber-400" />;
      case 'comparison':
        return <Columns className="w-4 h-4 text-rose-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-indigo-400" />;
    }
  };

  const filteredSuggestions = data?.suggestions.filter((s) => {
    if (activeCategoryFilter === 'all') return true;
    return s.category === activeCategoryFilter;
  }) || [];

  // Mini SVG Graphic Preview generator based on category
  const renderMiniDiagramPreview = (s: DiagramSuggestion) => {
    if (s.category === 'chart') {
      return (
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 my-2">
          <div className="text-[10px] text-slate-400 mb-1 flex items-center justify-between">
            <span>2D Intensity Function Plot Preview: I(x) = I₀ cos²(β)</span>
            <span className="text-emerald-400 font-mono">λ = h / p</span>
          </div>
          <svg className="w-full h-24 bg-slate-900 rounded-lg p-2" viewBox="0 0 300 80">
            <line x1="20" y1="70" x2="280" y2="70" stroke="#475569" strokeWidth="1" />
            <line x1="20" y1="10" x2="20" y2="70" stroke="#475569" strokeWidth="1" />
            {/* Interference wave intensity peaks */}
            <path
              d="M 20 70 Q 35 10 50 70 Q 65 30 80 70 Q 95 10 110 70 Q 125 50 140 70 Q 150 10 160 70 Q 175 40 190 70 Q 205 10 220 70 Q 235 50 250 70 Q 265 10 280 70"
              fill="none"
              stroke="#10b981"
              strokeWidth="2"
            />
            {/* Bright fringe markers */}
            <circle cx="35" cy="10" r="3" fill="#34d399" />
            <circle cx="95" cy="10" r="3" fill="#34d399" />
            <circle cx="160" cy="10" r="3" fill="#34d399" />
            <circle cx="220" cy="10" r="3" fill="#34d399" />
            <text x="150" y="25" fill="#6366f1" fontSize="10" textAnchor="middle">
              Central Maxima (m=0)
            </text>
          </svg>
        </div>
      );
    } else if (s.category === 'flowchart') {
      return (
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 my-2">
          <div className="text-[10px] text-slate-400 mb-1">Process Sequence Flowchart Preview</div>
          <div className="flex items-center justify-between gap-1 text-[10px]">
            <div className="p-2 bg-slate-900 border border-cyan-800 text-cyan-300 rounded-lg text-center flex-1">
              1. Photon Emission
            </div>
            <span className="text-cyan-500">➔</span>
            <div className="p-2 bg-slate-900 border border-indigo-800 text-indigo-300 rounded-lg text-center flex-1">
              2. Slit S1/S2 Diffraction
            </div>
            <span className="text-cyan-500">➔</span>
            <div className="p-2 bg-slate-900 border border-purple-800 text-purple-300 rounded-lg text-center flex-1">
              3. Detector Measurement (Collapse)
            </div>
          </div>
        </div>
      );
    } else {
      return (
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 my-2">
          <div className="text-[10px] text-slate-400 mb-1">Concept Relationship Map Preview</div>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="p-2 bg-indigo-950/60 border border-indigo-800 text-indigo-200 rounded-lg">
              <span className="font-bold text-indigo-400">Wave Mechanics</span>
              <p className="text-[9px] text-slate-400 mt-0.5">Continuous field Ψ(x,t), interference fringes</p>
            </div>
            <div className="p-2 bg-amber-950/60 border border-amber-800 text-amber-200 rounded-lg">
              <span className="font-bold text-amber-400">Particle Trajectories</span>
              <p className="text-[9px] text-slate-400 mt-0.5">Discrete photon impacts, momentum p = mv</p>
            </div>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl text-white shadow-md">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Automated AI Diagram Advisor
              <span className="text-[10px] bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-800 font-semibold">
                Transcript-Driven
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              AI suggests tailored diagram types based on key terms in current lecture's summary
            </p>
          </div>
        </div>

        <button
          onClick={fetchDiagramSuggestions}
          disabled={isLoading}
          className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-xl border border-slate-700 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
          <span>{isLoading ? 'Analyzing Keywords...' : 'Refresh Suggestions'}</span>
        </button>
      </div>

      {/* Extracted Keywords Bar */}
      {data?.extractedKeywords && data.extractedKeywords.length > 0 && (
        <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-300">
            <Tag className="w-3.5 h-3.5 text-indigo-400" />
            <span>Detected Transcript Keywords ({data.extractedKeywords.length}):</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {data.extractedKeywords.map((kw, idx) => (
              <span
                key={idx}
                className="text-[10px] bg-indigo-950/70 text-indigo-200 border border-indigo-800/60 px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Category Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-none">
        <span className="text-slate-400 font-medium shrink-0">Filter Type:</span>
        {[
          { id: 'all', label: 'All Diagram Types' },
          { id: 'chart', label: '📊 Plots & Graphs' },
          { id: 'flowchart', label: '🔀 Flowcharts' },
          { id: 'concept_map', label: '🗺️ Concept Maps' },
        ].map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategoryFilter(cat.id)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-colors shrink-0 cursor-pointer ${
              activeCategoryFilter === cat.id
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Diagram Suggestions Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {filteredSuggestions.map((s) => {
          const isPreviewing = previewingDiagramId === s.id;

          return (
            <div
              key={s.id}
              className="bg-slate-950/90 border border-slate-800 hover:border-slate-700 p-4 rounded-xl space-y-3 flex flex-col justify-between transition-all"
            >
              <div className="space-y-2">
                {/* Card Title & Icon */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-slate-900 border border-slate-700 rounded-lg">
                      {getCategoryIcon(s.category)}
                    </div>
                    <span className="text-xs font-bold text-white leading-tight">{s.type}</span>
                  </div>
                </div>

                {/* Matched keywords */}
                {s.matchedKeywords && s.matchedKeywords.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {s.matchedKeywords.map((mkw, idx) => (
                      <span
                        key={idx}
                        className="text-[9px] bg-slate-900 text-slate-300 border border-slate-800 px-1.5 py-0.5 rounded"
                      >
                        🏷️ {mkw}
                      </span>
                    ))}
                  </div>
                )}

                {/* Pedagogical Purpose Reason */}
                <p className="text-[11px] text-slate-300 leading-relaxed bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
                  {selectedLanguage.code !== 'en' && s.translatedReason ? s.translatedReason : s.reason}
                </p>

                {/* Mini Visual Preview Toggle */}
                {isPreviewing && renderMiniDiagramPreview(s)}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <button
                  onClick={() => setPreviewingDiagramId(isPreviewing ? null : s.id)}
                  className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <Eye className="w-3 h-3 text-indigo-400" />
                  <span>{isPreviewing ? 'Hide Blueprint' : 'View Blueprint'}</span>
                  {isPreviewing ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>

                <button
                  onClick={() => onSelectSuggestedQuestion(s.suggestedQuestion)}
                  className="flex items-center gap-1.5 text-[11px] bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-3 py-1.5 rounded-lg shadow transition-all cursor-pointer"
                >
                  <Send className="w-3 h-3" />
                  <span>Ask AI Tutor</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
