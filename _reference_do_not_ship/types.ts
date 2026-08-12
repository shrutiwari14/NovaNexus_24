export interface Language {
  id: string;
  code: string; // ISO code like 'hi', 'bn', 'ar', 'es', 'fr', 'de', 'ja', 'en'
  name: string;
  nativeName: string;
  flag: string;
  direction?: 'ltr' | 'rtl';
}

export interface LectureTranscriptChunk {
  id: string;
  timestamp: string; // e.g. "02:15"
  text: string;
  translatedText?: string;
  speaker: 'Professor' | 'Student';
}

export interface KeyConcept {
  id: string;
  title: string;
  description: string;
  translatedTitle?: string;
  translatedDescription?: string;
  importance: 'High' | 'Medium' | 'Core';
}

export interface Formula {
  id: string;
  latex: string;
  name: string;
  explanation: string;
  translatedExplanation?: string;
}

export interface DiagramStep {
  stepNumber: number;
  title: string;
  explanation: string;
  translatedExplanation?: string;
}

export interface DiagramSuggestion {
  id: string;
  type: string;
  category: 'chart' | 'flowchart' | 'schematic' | 'concept_map' | 'comparison';
  matchedKeywords: string[];
  reason: string;
  translatedReason?: string;
  suggestedQuestion: string;
}

export interface DiagramSuggestionsData {
  extractedKeywords: string[];
  suggestions: DiagramSuggestion[];
}

export interface WhiteboardAnalysis {
  id: string;
  title: string;
  imageUrl?: string;
  summary: string;
  translatedSummary?: string;
  extractedText: string;
  diagramSteps: DiagramStep[];
  formulas: Formula[];
  keyTakeaways: string[];
  translatedTakeaways?: string[];
  createdAt: string;
}

export interface Flashcard {
  id: string;
  frontQuestion: string;
  backAnswer: string;
  translatedQuestion?: string;
  translatedAnswer?: string;
  topic: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  mastered?: boolean;
}

export interface QuizQuestion {
  id: string;
  question: string;
  translatedQuestion?: string;
  options: string[];
  translatedOptions?: string[];
  correctAnswerIndex: number;
  explanation: string;
  translatedExplanation?: string;
  topic: string;
}

export interface DoubtMessage {
  id: string;
  sender: 'student' | 'tutor';
  text: string;
  translatedText?: string;
  timestamp: string;
  audioBase64?: string;
  references?: {
    whiteboardTitle?: string;
    transcriptSnippet?: string;
  };
}

export interface LectureSession {
  id: string;
  title: string;
  subject: string;
  professorName: string;
  date: string;
  targetLanguage: Language;
  transcripts: LectureTranscriptChunk[];
  summary: {
    overview: string;
    translatedOverview?: string;
    keyConcepts: KeyConcept[];
    formulas: Formula[];
    glossary: Array<{ term: string; definition: string; translatedDefinition?: string }>;
  };
  whiteboards: WhiteboardAnalysis[];
  flashcards: Flashcard[];
  quiz: QuizQuestion[];
  doubts: DoubtMessage[];
}

export const SUPPORTED_LANGUAGES: Language[] = [
  { id: 'hi', code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { id: 'bn', code: 'bn', name: 'Bangla', nativeName: 'বাংলা', flag: '🇧🇩' },
  { id: 'ar', code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', direction: 'rtl' },
  { id: 'es', code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { id: 'fr', code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { id: 'de', code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { id: 'ja', code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { id: 'ta', code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳' },
  { id: 'te', code: 'te', name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳' },
  { id: 'zh', code: 'zh', name: 'Mandarin', nativeName: '中文', flag: '🇨🇳' },
  { id: 'en', code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
];
