import React from 'react';
import { SUPPORTED_LANGUAGES, Language, LectureSession } from '../types';
import {
  GraduationCap,
  Mic,
  FileImage,
  BookOpen,
  MessageSquare,
  Globe,
  Download,
  Sparkles,
  ChevronDown,
  PlusCircle,
} from 'lucide-react';

interface HeaderProps {
  activeTab: 'live' | 'whiteboard' | 'notes' | 'tutor';
  setActiveTab: (tab: 'live' | 'whiteboard' | 'notes' | 'tutor') => void;
  selectedLanguage: Language;
  setSelectedLanguage: (lang: Language) => void;
  sessions: LectureSession[];
  activeSessionId: string;
  setActiveSessionId: (id: string) => void;
  onNewSession: () => void;
  onExport: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  selectedLanguage,
  setSelectedLanguage,
  sessions,
  activeSessionId,
  setActiveSessionId,
  onNewSession,
  onExport,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Row: App Title & Session/Language Selectors */}
        <div className="flex flex-col md:flex-row md:items-center justify-between py-3 gap-3">
          {/* Logo & Tagline */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-blue-500 rounded-xl shadow-lg shadow-indigo-500/20 text-white">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-white">
                  Smart Classroom <span className="text-indigo-400">AI</span>
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wider text-emerald-300 bg-emerald-950/80 border border-emerald-800/60 rounded-full">
                  BOB HACK'26
                </span>
              </div>
              <p className="text-xs text-slate-400">Multilingual Real-Time Classroom Assistant</p>
            </div>
          </div>

          {/* Controls: Active Lecture & Language Selector & Export */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Lecture Session Selector */}
            <div className="relative group">
              <select
                id="header-lecture-select"
                aria-label="Select active lecture"
                value={activeSessionId}
                onChange={(e) => {
                  if (e.target.value === 'NEW_SESSION') {
                    onNewSession();
                  } else {
                    setActiveSessionId(e.target.value);
                  }
                }}
                className="appearance-none bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-200 text-xs rounded-lg px-3 py-1.5 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium cursor-pointer transition-colors max-w-[220px] truncate"
              >
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
                <option value="NEW_SESSION">+ Record New Lecture Session</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Language Selector */}
            <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 gap-2">
              <Globe className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-xs text-slate-400 hidden sm:inline">Student Language:</span>
              <select
                id="header-language-select"
                aria-label="Select student native language"
                value={selectedLanguage.id}
                onChange={(e) => {
                  const lang = SUPPORTED_LANGUAGES.find((l) => l.id === e.target.value);
                  if (lang) setSelectedLanguage(lang);
                }}
                className="bg-transparent text-xs text-indigo-300 font-semibold focus:outline-none cursor-pointer pr-1"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.id} value={lang.id} className="bg-slate-900 text-slate-200">
                    {lang.flag} {lang.name} ({lang.nativeName})
                  </option>
                ))}
              </select>
            </div>

            {/* Export Notes */}
            <button
              id="header-export-btn"
              onClick={onExport}
              className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors cursor-pointer font-medium"
            >
              <Download className="w-3.5 h-3.5 text-slate-300" />
              <span className="hidden sm:inline">Export Notes</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex items-center space-x-1 border-t border-slate-800/80 pt-2 pb-1 overflow-x-auto scrollbar-none">
          <button
            id="nav-tab-live"
            onClick={() => setActiveTab('live')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'live'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Mic className="w-4 h-4" />
            <span>1. Live Capture & Speech</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </button>

          <button
            id="nav-tab-whiteboard"
            onClick={() => setActiveTab('whiteboard')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'whiteboard'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <FileImage className="w-4 h-4" />
            <span>2. Whiteboard & Diagram OCR</span>
          </button>

          <button
            id="nav-tab-notes"
            onClick={() => setActiveTab('notes')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'notes'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>3. Multilingual Study Deck</span>
            <Sparkles className="w-3 h-3 text-amber-300" />
          </button>

          <button
            id="nav-tab-tutor"
            onClick={() => setActiveTab('tutor')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'tutor'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>4. AI Tutor & Doubts</span>
          </button>
        </div>
      </div>
    </header>
  );
};
