from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import time
import os
import tempfile

import ai_engine
import database
from database import flag_topic, get_confusion_summary
import transcriber

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "null",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_text(data)
    except WebSocketDisconnect:
        pass


# ========== 🎨 WHITEBOARD & DIAGRAM OCR ROUTES ==========

class OcrAnalysisRequest(BaseModel):
    imageBase64: str
    mimeType: str
    targetLanguageName: str
    title: str


# Mock whiteboard analysis data (from reference sampleLectures.ts)
MOCK_WHITEBOARD_ANALYSIS = {
    "title": "Double-Slit Interference & Wave Equation Diagram",
    "summary": "Whiteboard sketch depicting light rays passing through slits S1 and S2, path difference delta, and bright fringe math. This demonstration shows the fundamental wave-particle duality principle through Young's double-slit experiment, illustrating how coherent light produces interference patterns on a detector screen.",
    "translatedSummary": "व्हाइटबोर्ड स्केच जो स्लिट्स S1 और S2 से गुजरने वाली प्रकाश किरणों, पथ अंतर डेल्टा और ब्राइट फ्रिंज गणित को दर्शाता है। यह प्रदर्शन यंग के द्वि-स्लिट प्रयोग के माध्यम से तरंग-कण द्वैतता सिद्धांत को दर्शाता है।",
    "extractedText": "Slit distance d, Screen distance L\nPath Difference: delta = d * sin(theta)\nMaxima: d * sin(theta) = m * lambda\nWave Function: Psi(x,t) = A * e^(i(kx - wt))\n\nConstructive Interference: Path difference = m * lambda (m = 0, 1, 2, ...)\nDestructive Interference: Path difference = (m + 1/2) * lambda\n\nFringe Width: Δy = λL / d\nwhere: λ = wavelength, L = screen distance, d = slit separation",
    "diagramSteps": [
        {
            "stepNumber": 1,
            "title": "Coherent Light Source",
            "explanation": "Monochromatic light wave emitted towards barriers.",
            "translatedExplanation": "अवरोधों की ओर उत्सर्जित एकरंगी प्रकाश तरंग।",
        },
        {
            "stepNumber": 2,
            "title": "Slit Separation (d)",
            "explanation": "Wavefront splits at S1 and S2 creating two coherent secondary sources.",
            "translatedExplanation": "तरंगाग्र S1 और S2 पर विभाजित होकर दो सुसंगत द्वितीयक स्रोत बनाता है।",
        },
        {
            "stepNumber": 3,
            "title": "Screen Interference (L)",
            "explanation": "Superposition produces constructive (bright) and destructive (dark) interference fringes.",
            "translatedExplanation": "सुपरपॉजीशन से रचनात्मक (चमकीला) और विनाशी (काला) हस्तक्षेप उत्पन्न होता है।",
        },
    ],
    "formulas": [
        {
            "id": "wf-1",
            "latex": "\\Delta y = \\frac{\\lambda L}{d}",
            "name": "Fringe Width Formula",
            "explanation": "Distance between consecutive bright or dark fringes on the screen.",
            "translatedExplanation": "स्क्रीन पर लगातार चमकीली या काली पट्टियों के बीच की दूरी।",
        },
    ],
    "keyTakeaways": [
        "Light shows wave properties when unobserved.",
        "Fringe spacing increases directly with wavelength lambda and distance L.",
        "Measurement converts wave distribution into particle impacts.",
    ],
    "translatedTakeaways": [
        "अदृश्य रहने पर प्रकाश तरंग गुण दिखाता है।",
        "फ्रिंज स्पेसिंग तरंगदैर्घ्य और दूरी L के साथ सीधे बढ़ती है।",
        "मापन तरंग वितरण को कण प्रभावों में बदल देता है।",
    ],
}


@app.post("/ocr-analyze")
async def ocr_analyze(request: OcrAnalysisRequest):
    """
    Analyze whiteboard/diagram image and return mock OCR analysis.
    
    In production, this would:
    1. Decode the image from base64
    2. Send to Google Gemini Vision API for multimodal analysis
    3. Extract formulas, text, diagram steps, etc.
    4. Translate to target language
    5. Return structured analysis
    
    For now, returns mock data matching the reference prototype structure.
    """
    # Mock implementation: return static data based on image title
    analysis = {
        **MOCK_WHITEBOARD_ANALYSIS,
        "title": request.title or "Double-Slit Interference & Wave Equation Diagram",
    }
    
    return analysis


# ========== LIVE CAPTURE & SPEECH ROUTES ==========

class TranscribeRequest(BaseModel):
    action: str = "start"
    targetLanguage: str = "Hindi"


class ManualEntryRequest(BaseModel):
    text: str
    role: str = "professor"
    targetLanguage: str = "Hindi"


MOCK_MIC_CHUNKS = [
    {
        "role": "professor",
        "text": "The fringe spacing on the screen is given by delta-y equals lambda L over d.",
        "translatedText": "स्क्रीन पर फ्रिंज स्पेसिंग delta-y बराबर lambda L भाग d द्वारा दी जाती है।",
    },
    {
        "role": "professor",
        "text": "Notice how increasing the slit separation d compresses the interference pattern.",
        "translatedText": "ध्यान दें कि स्लिट separation d बढ़ाने से व्यतिकरण पैटर्न संकुचित हो जाता है।",
    },
    {
        "role": "student",
        "text": "So if we use electrons instead of photons, do we still see the same pattern?",
        "translatedText": "तो अगर हम फोटॉन के बजाय इलेक्ट्रॉन का उपयोग करें, तो क्या हम अभी भी वही पैटर्न देखते हैं?",
    },
]

_mic_chunk_index = 0


def _make_transcript_entry(role: str, text: str, translated_text: str, timestamp: str = "00:00") -> dict:
    return {
        "id": f"entry-{int(time.time() * 1000)}",
        "role": role,
        "timestamp": timestamp,
        "text": text,
        "translatedText": translated_text,
        "langCode": "IN",
    }


@app.post("/transcribe")
async def transcribe_live(request: TranscribeRequest):
    """
    Mock live transcription endpoint.
    Returns a sample transcript entry when mic is started or a new chunk arrives.
    """
    global _mic_chunk_index

    if request.action == "start":
        entry = _make_transcript_entry(
            role="professor",
            text="Listening... The wave function Psi describes the quantum state of our particle system.",
            translated_text="सुन रहे हैं... तरंग फलन Psi हमारे कण प्रणाली की क्वांटम अवस्था का वर्णन करता है।",
            timestamp="00:03",
        )
        return {"status": "listening", "entry": entry}

    chunk = MOCK_MIC_CHUNKS[_mic_chunk_index % len(MOCK_MIC_CHUNKS)]
    _mic_chunk_index += 1
    entry = _make_transcript_entry(
        role=chunk["role"],
        text=chunk["text"],
        translated_text=chunk["translatedText"],
        timestamp="00:30",
    )
    return {"status": "chunk", "entry": entry}


@app.post("/add-manual-entry")
async def add_manual_entry(request: ManualEntryRequest):
    """
    Mock manual speech input endpoint.
    Accepts typed professor/student remarks and returns a translated transcript entry.
    """
    role = request.role if request.role in ("professor", "student") else "professor"
    mock_translation = f"[{request.targetLanguage}] {request.text}"

    entry = _make_transcript_entry(
        role=role,
        text=request.text,
        translated_text=mock_translation,
        timestamp="00:00",
    )
    return {"status": "ok", "entry": entry}


# ========== 📖 MULTILINGUAL STUDY DECK ROUTES ==========

# ── /transcribe-audio ────────────────────────────────────────────────────────

class TranscribeAudioResponse(BaseModel):
    transcript: str


@app.post("/transcribe-audio", response_model=TranscribeAudioResponse)
async def transcribe_audio(file: UploadFile = File(...)):
    """
    Accept an uploaded audio/video file, persist it to a temp location, and
    return a transcript.

    Real path:  wire `transcriber.transcribe(path)` once Whisper is configured.
    Fallback:   returns a realistic sample transcript so the UI flow is fully
                exercisable without a Whisper installation.
    """
    # ── Save the upload to a real temp file (real file I/O, not skipped) ──
    suffix = os.path.splitext(file.filename or "upload.mp3")[1] or ".mp3"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        contents = await file.read()
        tmp.write(contents)
        tmp_path = tmp.name

    try:
        # Real Whisper path – uncomment once transcriber.transcribe() is wired:
        # transcript = transcriber.transcribe(tmp_path)
        # if transcript:
        #     return TranscribeAudioResponse(transcript=transcript)

        # ── FALLBACK: sample transcript (clearly labelled) ─────────────────
        transcript = (
            "[SAMPLE TRANSCRIPT — replace with real Whisper output]\n\n"
            "Professor: Good morning everyone. Today we continue with Chapter 4 — "
            "Wave-Particle Duality and the Double-Slit Experiment.\n\n"
            "The central question in quantum mechanics is: is light a wave or a particle? "
            "The answer, as Young demonstrated in 1801, is that it behaves as both depending "
            "on the experimental setup.\n\n"
            "When we fire photons through two closely-spaced slits, we observe an interference "
            "pattern on a detector screen — constructive and destructive fringes that can only "
            "be explained by wave behaviour. The fringe spacing is given by Δy = λL / d, where "
            "λ is the wavelength, L the screen distance, and d the slit separation.\n\n"
            "Student: What happens if we only open one slit?\n\n"
            "Professor: Excellent question. With a single slit open, we see a simple diffraction "
            "pattern — no interference fringes. The two-slit interference vanishes because there "
            "is only one wavefront.\n\n"
            "Now, the de Broglie relation tells us that matter itself has a wavelength: λ = h/p. "
            "This was confirmed experimentally with electrons by Davisson and Germer in 1927.\n\n"
            f"[File received: {file.filename}, size: {len(contents)} bytes]"
        )
        return TranscribeAudioResponse(transcript=transcript)
    finally:
        # Clean up temp file
        try:
            os.unlink(tmp_path)
        except OSError:
            pass


# ── /generate-summary ────────────────────────────────────────────────────────

class SummaryRequest(BaseModel):
    transcript: str


class SummaryResponse(BaseModel):
    summary: str
    key_points: list[str]


@app.post("/generate-summary", response_model=SummaryResponse)
async def generate_summary_route(request: SummaryRequest):
    """
    Generate a concise summary and key bullet points from a transcript.
    Delegates to ai_engine.generate_summary() — real AI or labelled mock.
    """
    if not request.transcript.strip():
        raise HTTPException(status_code=400, detail="transcript must not be empty")
    result = ai_engine.generate_summary(request.transcript)
    return SummaryResponse(
        summary=result["summary"],
        key_points=result["key_points"],
    )


# ── /generate-flashcards ─────────────────────────────────────────────────────

class FlashcardsRequest(BaseModel):
    transcript: str


class Flashcard(BaseModel):
    question: str
    answer: str


class FlashcardsResponse(BaseModel):
    flashcards: list[Flashcard]


@app.post("/generate-flashcards", response_model=FlashcardsResponse)
async def generate_flashcards_route(request: FlashcardsRequest):
    """
    Generate Q&A flashcards from a transcript.
    Delegates to ai_engine.generate_flashcards() — real AI or labelled mock.
    """
    if not request.transcript.strip():
        raise HTTPException(status_code=400, detail="transcript must not be empty")
    cards = ai_engine.generate_flashcards(request.transcript)
    return FlashcardsResponse(flashcards=[Flashcard(**c) for c in cards])


# ── /ask-lecture ─────────────────────────────────────────────────────────────

class AskLectureRequest(BaseModel):
    question: str
    transcript_context: str


class AskLectureResponse(BaseModel):
    answer: str


@app.post("/ask-lecture", response_model=AskLectureResponse)
async def ask_lecture_route(request: AskLectureRequest):
    """
    Answer a student's question grounded in the lecture transcript.
    Delegates to ai_engine.ask_lecture() — real AI or labelled mock.
    """
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="question must not be empty")
    answer = ai_engine.ask_lecture(request.question, request.transcript_context)
    return AskLectureResponse(answer=answer)


# ========== FEEDBACK LOOP / TEACHER INSIGHTS ==========

class FlagRequest(BaseModel):
    topic: str


@app.post("/flag-topic")
def flag_topic_route(payload: FlagRequest):
    new_count = flag_topic(payload.topic)
    return {"topic": payload.topic, "count": new_count}


@app.get("/confusion-summary")
def confusion_summary_route():
    return {"topics": get_confusion_summary()}
