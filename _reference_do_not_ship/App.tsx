import React, { useState } from 'react';
import { SAMPLE_LECTURES } from './data/sampleLectures';
import { LectureSession, SUPPORTED_LANGUAGES, Language } from './types';
import { Header } from './components/Header';
import { LiveLectureTab } from './components/LiveLectureTab';
import { WhiteboardOcrTab } from './components/WhiteboardOcrTab';
import { NotesStudioTab } from './components/NotesStudioTab';
import { AiTutorTab } from './components/AiTutorTab';
import { ExportModal } from './components/ExportModal';

export default function App() {
  const [sessions, setSessions] = useState<LectureSession[]>(SAMPLE_LECTURES);
  const [activeSessionId, setActiveSessionId] = useState<string>(SAMPLE_LECTURES[0].id);
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(SUPPORTED_LANGUAGES[0]); // Hindi default
  const [activeTab, setActiveTab] = useState<'live' | 'whiteboard' | 'notes' | 'tutor'>('live');
  const [isGeneratingNotes, setIsGeneratingNotes] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0];

  const handleUpdateSession = (updatedSession: LectureSession) => {
    setSessions((prev) => prev.map((s) => (s.id === updatedSession.id ? updatedSession : s)));
  };

  const handleNewSession = () => {
    const newSession: LectureSession = {
      id: `session-${Date.now()}`,
      title: `Live Lecture #${sessions.length + 1}`,
      subject: 'Computer Science & AI',
      professorName: 'Guest Professor',
      date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      targetLanguage: selectedLanguage,
      transcripts: [],
      summary: {
        overview: 'New lecture session started. Dictate or record professor speech to generate notes.',
        keyConcepts: [],
        formulas: [],
        glossary: [],
      },
      whiteboards: [],
      flashcards: [],
      quiz: [],
      doubts: [],
    };

    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setActiveTab('live');
  };

  const handleGenerateNotes = async () => {
    if (!activeSession) return;
    const fullTranscriptText = activeSession.transcripts.map((t) => `${t.speaker}: ${t.text}`).join('\n');

    if (!fullTranscriptText.trim()) {
      alert('Please add or record some lecture transcript lines before generating notes!');
      return;
    }

    setIsGeneratingNotes(true);

    try {
      const res = await fetch('http://localhost:8000/api/process-lecture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: fullTranscriptText,
          title: activeSession.title,
          subject: activeSession.subject,
          targetLanguage: selectedLanguage.code,
          targetLanguageName: selectedLanguage.name,
        }),
      });

      const data = await res.json();

      if (res.ok && data.summary) {
        const updatedSession: LectureSession = {
          ...activeSession,
          summary: data.summary,
          flashcards: data.flashcards || activeSession.flashcards,
          quiz: data.quiz || activeSession.quiz,
        };

        handleUpdateSession(updatedSession);
        setActiveTab('notes');
      } else {
        alert(data.error || 'Failed to generate study deck notes.');
      }
    } catch (e) {
      console.error('Failed to generate notes:', e);
      alert('An error occurred while generating study notes. Please check network connection.');
    } finally {
      setIsGeneratingNotes(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedLanguage={selectedLanguage}
        setSelectedLanguage={setSelectedLanguage}
        sessions={sessions}
        activeSessionId={activeSessionId}
        setActiveSessionId={setActiveSessionId}
        onNewSession={handleNewSession}
        onExport={() => setShowExportModal(true)}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'live' && (
          <LiveLectureTab
            session={activeSession}
            selectedLanguage={selectedLanguage}
            onUpdateSession={handleUpdateSession}
            onGenerateNotes={handleGenerateNotes}
            isGenerating={isGeneratingNotes}
          />
        )}

        {activeTab === 'whiteboard' && (
          <WhiteboardOcrTab
            session={activeSession}
            selectedLanguage={selectedLanguage}
            onUpdateSession={handleUpdateSession}
          />
        )}

        {activeTab === 'notes' && (
          <NotesStudioTab
            session={activeSession}
            selectedLanguage={selectedLanguage}
            onUpdateSession={handleUpdateSession}
            onGenerateNotes={handleGenerateNotes}
            isGenerating={isGeneratingNotes}
          />
        )}

        {activeTab === 'tutor' && (
          <AiTutorTab
            session={activeSession}
            selectedLanguage={selectedLanguage}
            onUpdateSession={handleUpdateSession}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 text-center text-xs text-slate-500">
        <p>Smart Classroom AI • BOB HACK'26 Multilingual Learning Platform • Powered by Gemini AI</p>
      </footer>

      {/* Export Modal */}
      {showExportModal && (
        <ExportModal
          session={activeSession}
          selectedLanguage={selectedLanguage}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </div>
  );
}
