import React, { useState, useRef, useEffect } from 'react';
import { LectureSession, Language, DoubtMessage } from '../types';
import { DiagramSuggestionsWidget } from './DiagramSuggestionsWidget';
import {
  MessageSquare,
  Send,
  Mic,
  MicOff,
  Sparkles,
  Volume2,
  Bot,
  User,
  BookOpen,
  RefreshCw,
  HelpCircle,
  Clock,
  Bookmark,
} from 'lucide-react';

interface AiTutorTabProps {
  session: LectureSession;
  selectedLanguage: Language;
  onUpdateSession: (updatedSession: LectureSession) => void;
}

export const AiTutorTab: React.FC<AiTutorTabProps> = ({
  session,
  selectedLanguage,
  onUpdateSession,
}) => {
  const [inputText, setInputText] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [isListeningMic, setIsListeningMic] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session.doubts]);

  // Setup Web Speech Recognition for mic input
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = selectedLanguage.code === 'hi' ? 'hi-IN' : 'en-US';

        recognition.onresult = (event: any) => {
          const text = event.results[0][0].transcript;
          if (text) {
            setInputText(text);
          }
          setIsListeningMic(false);
        };

        recognition.onerror = () => setIsListeningMic(false);
        recognition.onend = () => setIsListeningMic(false);

        recognitionRef.current = recognition;
      }
    }
  }, [selectedLanguage]);

  const toggleMicInput = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. Please type your doubt below!');
      return;
    }

    if (isListeningMic) {
      recognitionRef.current.stop();
      setIsListeningMic(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListeningMic(true);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleSendDoubt = async (questionText?: string) => {
    const textToSend = questionText || inputText;
    if (!textToSend.trim() || isAsking) return;

    const userMessage: DoubtMessage = {
      id: `m-${Date.now()}`,
      sender: 'student',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedDoubts = [...session.doubts, userMessage];
    onUpdateSession({ ...session, doubts: updatedDoubts });
    setInputText('');
    setIsAsking(true);

    try {
      const res = await fetch('http://localhost:8000/api/ask-doubt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: textToSend,
          targetLanguageName: selectedLanguage.name,
          lectureContext: {
            title: session.title,
            summaryOverview: session.summary.overview,
            whiteboardSummaries: session.whiteboards.map((w) => w.summary).join('; '),
          },
        }),
      });

      const data = await res.json();
      const tutorReply = data.answer || 'I apologize, I could not process your doubt at this moment.';

      const tutorMessage: DoubtMessage = {
        id: `m-${Date.now() + 1}`,
        sender: 'tutor',
        text: tutorReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        references: {
          transcriptSnippet: session.transcripts[0]?.text,
          whiteboardTitle: session.whiteboards[0]?.title,
        },
      };

      onUpdateSession({
        ...session,
        doubts: [...updatedDoubts, tutorMessage],
      });
    } catch (e) {
      console.error('Ask doubt error:', e);
    } finally {
      setIsAsking(false);
    }
  };

  const handleSpeakTutor = (msgId: string, text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setPlayingAudioId(msgId);

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = selectedLanguage.code === 'hi' ? 'hi-IN' : 'en-US';

      utterance.onend = () => setPlayingAudioId(null);
      utterance.onerror = () => setPlayingAudioId(null);

      window.speechSynthesis.speak(utterance);
    }
  };

  const starterDoubts = [
    `Explain ${session.summary.keyConcepts[0]?.title || 'Key Concepts'} using a simple real-world analogy.`,
    'Why does the double-slit interference pattern collapse when observed?',
    'How do I apply the wavelength formula step-by-step in exam problems?',
  ];

  return (
    <div className="space-y-6">
      {/* Automated Diagram Suggestions Advisor */}
      <DiagramSuggestionsWidget
        session={session}
        selectedLanguage={selectedLanguage}
        onSelectSuggestedQuestion={(q) => handleSendDoubt(q)}
      />

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col h-[650px]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-blue-500 rounded-xl text-white shadow-lg shadow-indigo-600/20">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                BOB Multilingual AI Tutor
                <span className="px-2 py-0.5 text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-800 rounded-full font-semibold">
                  {selectedLanguage.flag} {selectedLanguage.name}
                </span>
              </h2>
              <p className="text-xs text-slate-400">Contextualized on current lecture & whiteboard notes</p>
            </div>
          </div>
        </div>

        {/* Doubt Starter Buttons */}
        <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <span className="text-xs text-slate-400 font-medium shrink-0 flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
            Quick Doubts:
          </span>
          {starterDoubts.map((doubtStr, idx) => (
            <button
              key={idx}
              onClick={() => handleSendDoubt(doubtStr)}
              className="text-xs bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white px-3 py-1.5 rounded-xl border border-slate-700/80 transition-colors shrink-0 cursor-pointer font-medium"
            >
              "{doubtStr}"
            </button>
          ))}
        </div>

        {/* Chat Feed */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin scrollbar-thumb-slate-700">
          {session.doubts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 p-6">
              <Bot className="w-12 h-12 mb-3 text-slate-700" />
              <p className="text-sm font-medium text-slate-400">Ask any doubt about this lecture!</p>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                You can type or speak in {selectedLanguage.name}. BOB Tutor will explain step-by-step with analogies and LaTeX formulas.
              </p>
            </div>
          ) : (
            session.doubts.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-2xl ${msg.sender === 'student' ? 'ml-auto flex-row-reverse' : ''}`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    msg.sender === 'student' ? 'bg-indigo-600 text-white' : 'bg-blue-600 text-white'
                  }`}
                >
                  {msg.sender === 'student' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                <div
                  className={`p-4 rounded-2xl text-xs leading-relaxed space-y-2 border ${
                    msg.sender === 'student'
                      ? 'bg-indigo-600 text-white border-indigo-500'
                      : 'bg-slate-950 text-slate-200 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-[10px] text-slate-400">
                    <span className="font-bold">{msg.sender === 'student' ? 'Student' : 'BOB AI Tutor'}</span>
                    <span>{msg.timestamp}</span>
                  </div>

                  <p className="whitespace-pre-wrap">{msg.text}</p>

                  {/* References card */}
                  {msg.references && msg.sender === 'tutor' && (
                    <div className="pt-2 border-t border-slate-800 text-[11px] text-indigo-300 space-y-1">
                      {msg.references.whiteboardTitle && (
                        <p className="flex items-center gap-1">
                          <Bookmark className="w-3 h-3 text-indigo-400" />
                          Referenced Diagram: {msg.references.whiteboardTitle}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Audio TTS button */}
                  {msg.sender === 'tutor' && (
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-end">
                      <button
                        onClick={() => handleSpeakTutor(msg.id, msg.text)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                          playingAudioId === msg.id
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-700 animate-pulse'
                            : 'bg-slate-900 text-slate-400 hover:text-white'
                        }`}
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>{playingAudioId === msg.id ? 'Playing Voice...' : 'Read Aloud'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {isAsking && (
            <div className="flex gap-3 max-w-2xl">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-indigo-300 flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>BOB Tutor is formulating explanation in {selectedLanguage.name}...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center gap-2">
          <button
            onClick={toggleMicInput}
            title="Mic Voice Input"
            className={`p-3 rounded-xl border transition-colors cursor-pointer ${
              isListeningMic
                ? 'bg-rose-600 text-white border-rose-500 animate-pulse'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            {isListeningMic ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          <input
            id="tutor-chat-input"
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendDoubt()}
            placeholder={`Ask a doubt in ${selectedLanguage.name} or English...`}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          <button
            id="tutor-chat-send-btn"
            onClick={() => handleSendDoubt()}
            disabled={!inputText.trim() || isAsking}
            className="p-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl transition-all shadow-md cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
