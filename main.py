from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import ai_engine
import database
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
