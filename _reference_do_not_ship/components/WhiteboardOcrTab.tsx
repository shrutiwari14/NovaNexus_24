import React, { useState } from 'react';
import { LectureSession, Language, WhiteboardAnalysis, DiagramStep, Formula } from '../types';
import {
  FileImage,
  Upload,
  Sparkles,
  Camera,
  Layers,
  CheckCircle2,
  RefreshCw,
  Copy,
  ChevronRight,
  BookOpen,
  Eye,
  Trash2,
} from 'lucide-react';

interface WhiteboardOcrTabProps {
  session: LectureSession;
  selectedLanguage: Language;
  onUpdateSession: (updatedSession: LectureSession) => void;
}

export const WhiteboardOcrTab: React.FC<WhiteboardOcrTabProps> = ({
  session,
  selectedLanguage,
  onUpdateSession,
}) => {
  const [selectedImageBase64, setSelectedImageBase64] = useState<string | null>(null);
  const [imageTitle, setImageTitle] = useState('Whiteboard Diagram Snapshot');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzedResult, setAnalyzedResult] = useState<WhiteboardAnalysis | null>(
    session.whiteboards.length > 0 ? session.whiteboards[0] : null
  );
  const [activeWhiteboardIndex, setActiveWhiteboardIndex] = useState<number>(0);
  const [copiedOcr, setCopiedOcr] = useState(false);

  // Pre-baked SVG diagram generator as fallback sample image
  const generateSampleDiagram = () => {
    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="350" viewBox="0 0 600 350" fill="none">
      <rect width="600" height="350" fill="#0f172a" rx="16"/>
      <rect x="20" y="20" width="560" height="310" stroke="#334155" stroke-width="2" rx="12" fill="#1e293b"/>
      <text x="40" y="50" fill="#38bdf8" font-family="sans-serif" font-size="18" font-weight="bold">Double Slit Wave Interference (Physics 201)</text>
      <!-- Slit barrier -->
      <line x1="180" y1="60" x2="180" y2="140" stroke="#94a3b8" stroke-width="6"/>
      <line x1="180" y1="170" x2="180" y2="230" stroke="#94a3b8" stroke-width="6"/>
      <line x1="180" y1="260" x2="180" y2="310" stroke="#94a3b8" stroke-width="6"/>
      <text x="185" y="155" fill="#f43f5e" font-family="sans-serif" font-size="14">S1</text>
      <text x="185" y="248" fill="#f43f5e" font-family="sans-serif" font-size="14">S2</text>
      <!-- Waves -->
      <path d="M 60 180 Q 120 120 180 155" stroke="#818cf8" stroke-width="2" fill="none"/>
      <path d="M 60 180 Q 120 240 180 245" stroke="#818cf8" stroke-width="2" fill="none"/>
      <path d="M 180 155 Q 350 100 500 80" stroke="#38bdf8" stroke-width="2" stroke-dasharray="4" fill="none"/>
      <path d="M 180 245 Q 350 200 500 80" stroke="#38bdf8" stroke-width="2" stroke-dasharray="4" fill="none"/>
      <!-- Screen -->
      <line x1="500" y1="60" x2="500" y2="310" stroke="#f1f5f9" stroke-width="4"/>
      <text x="515" y="85" fill="#facc15" font-family="sans-serif" font-size="14">Bright Fringe (Maxima)</text>
      <text x="515" y="180" fill="#64748b" font-family="sans-serif" font-size="14">Dark Fringe (Minima)</text>
      <!-- Math Formulas -->
      <text x="40" y="300" fill="#34d399" font-family="monospace" font-size="14">d * sin(theta) = m * lambda | lambda = h / p</text>
    </svg>`;
    return 'data:image/svg+xml;base64,' + btoa(svgContent);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageTitle(file.name.replace(/\.[^/.]+$/, ''));

    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImageBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyzeImage = async () => {
    const imageToAnalyze = selectedImageBase64 || generateSampleDiagram();
    setIsAnalyzing(true);

    try {
      const res = await fetch('http://localhost:8000/api/analyze-whiteboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: imageToAnalyze,
          mimeType: imageToAnalyze.startsWith('data:image/svg') ? 'image/svg+xml' : 'image/jpeg',
          targetLanguageName: selectedLanguage.name,
          title: imageTitle,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        const newAnalysis: WhiteboardAnalysis = {
          id: `wb-${Date.now()}`,
          title: data.title || imageTitle,
          imageUrl: imageToAnalyze,
          summary: data.summary || 'Whiteboard diagram analyzed.',
          translatedSummary: data.translatedSummary || '',
          extractedText: data.extractedText || 'OCR Text extracted.',
          diagramSteps: data.diagramSteps || [],
          formulas: data.formulas || [],
          keyTakeaways: data.keyTakeaways || [],
          translatedTakeaways: data.translatedTakeaways || [],
          createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        setAnalyzedResult(newAnalysis);

        // Append to session whiteboards
        const updatedSession = {
          ...session,
          whiteboards: [newAnalysis, ...session.whiteboards],
        };
        onUpdateSession(updatedSession);
        setActiveWhiteboardIndex(0);
      } else {
        alert(data.error || 'Failed to analyze whiteboard image');
      }
    } catch (e: any) {
      console.error('Whiteboard analysis failed:', e);
      alert('Error analyzing whiteboard image. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const activeWB = session.whiteboards[activeWhiteboardIndex] || analyzedResult;

  return (
    <div className="space-y-6">
      {/* Top Upload & Capture Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <FileImage className="w-5 h-5 text-indigo-400" />
              Whiteboard & Visual Diagram OCR Studio
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Upload photos of professor's whiteboard, slides, or diagrams. Multimodal Gemini Vision extracts LaTeX formulas, steps, and explanations in{' '}
              <span className="text-indigo-400 font-semibold">{selectedLanguage.name}</span>.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const sample = generateSampleDiagram();
                setSelectedImageBase64(sample);
                setImageTitle('Physics Wave Interference Diagram');
              }}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Camera className="w-3.5 h-3.5 text-indigo-400" />
              Load Preset Diagram Sample
            </button>
          </div>
        </div>

        {/* Upload Zone & Preview Box */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          {/* File Picker */}
          <div className="border-2 border-dashed border-slate-800 hover:border-indigo-600/60 bg-slate-950/60 rounded-2xl p-6 text-center transition-colors">
            <Upload className="w-8 h-8 mx-auto text-indigo-400 mb-2" />
            <p className="text-xs font-semibold text-slate-200">Upload Whiteboard Photo or Slide</p>
            <p className="text-[11px] text-slate-500 mb-3">Supports JPG, PNG, WEBP, or SVG</p>

            <label className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl cursor-pointer transition-colors shadow-md">
              <Upload className="w-3.5 h-3.5" />
              <span>Browse Image File</span>
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          {/* Image Preview & Action */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between h-full min-h-[180px]">
            {selectedImageBase64 ? (
              <div className="space-y-3">
                <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-900 h-28 flex items-center justify-center">
                  <img
                    src={selectedImageBase64}
                    alt="Whiteboard Preview"
                    className="max-h-full max-w-full object-contain"
                  />
                  <span className="absolute top-2 left-2 bg-slate-900/90 text-slate-300 text-[10px] font-semibold px-2 py-0.5 rounded border border-slate-700">
                    {imageTitle}
                  </span>
                </div>

                <button
                  id="whiteboard-analyze-btn"
                  onClick={handleAnalyzeImage}
                  disabled={isAnalyzing}
                  className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20 cursor-pointer flex items-center justify-center gap-2"
                >
                  {isAnalyzing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span>Analyzing Diagram with Gemini Vision...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>Run AI Diagram Analysis & OCR</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 py-6">
                <Layers className="w-8 h-8 mb-2 text-slate-700" />
                <p className="text-xs">No image selected yet.</p>
                <p className="text-[11px] text-slate-600">
                  Upload an image or click "Load Preset Diagram Sample" above to try OCR instantly!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Analysis Results & History Deck */}
      {session.whiteboards.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Saved Whiteboards Sidebar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              Analyzed Whiteboards ({session.whiteboards.length})
            </h3>

            <div className="space-y-2">
              {session.whiteboards.map((wb, idx) => (
                <div
                  key={wb.id}
                  onClick={() => setActiveWhiteboardIndex(idx)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    activeWhiteboardIndex === idx
                      ? 'bg-indigo-950/80 border-indigo-600 shadow-md'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white truncate max-w-[160px]">{wb.title}</span>
                    <span className="text-[10px] text-slate-500">{wb.createdAt}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2">{wb.summary}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Active Whiteboard Breakdown (2 cols) */}
          {activeWB && (
            <div className="lg:col-span-2 space-y-5">
              {/* Whiteboard Summary & Multilingual Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-white">{activeWB.title}</h3>
                    <p className="text-xs text-slate-400">Multimodal Diagram & Formula Breakdown</p>
                  </div>
                  <span className="px-2.5 py-1 text-xs font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800/60 rounded-lg">
                    {selectedLanguage.flag} {selectedLanguage.name}
                  </span>
                </div>

                {/* English Summary & Translated Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      English Summary
                    </span>
                    <p className="text-xs text-slate-200 leading-relaxed">{activeWB.summary}</p>
                  </div>

                  <div className="p-4 bg-indigo-950/40 border border-indigo-900/60 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1">
                      <span>{selectedLanguage.flag}</span>
                      <span>Translated ({selectedLanguage.name})</span>
                    </span>
                    <p className="text-xs text-indigo-100 leading-relaxed">
                      {activeWB.translatedSummary || activeWB.summary}
                    </p>
                  </div>
                </div>

                {/* Diagram Step-by-Step Breakdown */}
                {activeWB.diagramSteps.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <ChevronRight className="w-4 h-4 text-indigo-400" />
                      Sequential Diagram & Step Breakdown
                    </h4>

                    <div className="space-y-2.5">
                      {activeWB.diagramSteps.map((step: DiagramStep) => (
                        <div
                          key={step.stepNumber}
                          className="p-3.5 bg-slate-950 border border-slate-800/80 rounded-xl flex items-start gap-3"
                        >
                          <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                            {step.stepNumber}
                          </span>
                          <div className="space-y-1 text-xs">
                            <h5 className="font-bold text-slate-200">{step.title}</h5>
                            <p className="text-slate-400">{step.explanation}</p>
                            {step.translatedExplanation && (
                              <p className="text-indigo-300 pt-1 font-medium border-t border-slate-800/60 mt-1">
                                {selectedLanguage.flag} {step.translatedExplanation}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* OCR Raw Text & LaTeX Formulas */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      OCR Extracted Text & Equations
                    </h4>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(activeWB.extractedText);
                        setCopiedOcr(true);
                        setTimeout(() => setCopiedOcr(false), 1500);
                      }}
                      className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer font-medium"
                    >
                      {copiedOcr ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedOcr ? 'Copied' : 'Copy Text'}</span>
                    </button>
                  </div>

                  <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-emerald-400 whitespace-pre-wrap overflow-x-auto leading-relaxed">
                    {activeWB.extractedText}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
