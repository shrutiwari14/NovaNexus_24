"""
ai_engine.py — AI feature implementations for the Smart Classroom backend.

Real API path: uses OpenAI chat completions (gpt-3.5-turbo).
Fallback path:  if OPENAI_API_KEY is not set, returns clearly-labelled mock
                responses so the demo still runs without any key.

To enable real AI:  set the OPENAI_API_KEY environment variable.
"""

import os
import json

# ---------------------------------------------------------------------------
# Optional OpenAI import – falls back gracefully if not installed / no key
# ---------------------------------------------------------------------------
_OPENAI_KEY = os.environ.get("OPENAI_API_KEY", "").strip()

try:
    import openai as _openai_lib
    _openai_lib.api_key = _OPENAI_KEY
    _OPENAI_AVAILABLE = bool(_OPENAI_KEY)
except ImportError:
    _openai_lib = None
    _OPENAI_AVAILABLE = False


def _call_openai(system_prompt: str, user_prompt: str, max_tokens: int = 800) -> str:
    """Call OpenAI chat completions. Raises on failure."""
    response = _openai_lib.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        max_tokens=max_tokens,
        temperature=0.7,
    )
    return response.choices[0].message.content.strip()


# ---------------------------------------------------------------------------
# translate_and_structure  (pre-existing stub – preserved)
# ---------------------------------------------------------------------------

def translate_and_structure(text, target_language):
    # Will call an LLM to translate text and structure it into notes.
    pass


def simplify(text):
    # Will call an LLM to simplify the given text.
    pass


def answer_question(question, context):
    # Will call an LLM to answer a question using the provided context.
    pass


# ---------------------------------------------------------------------------
# generate_summary
# ---------------------------------------------------------------------------

def generate_summary(transcript: str) -> dict:
    """
    Returns {"summary": str, "key_points": list[str]}.

    Real path:  GPT-3.5-turbo with JSON output.
    Fallback:   labelled mock data.
    """
    if _OPENAI_AVAILABLE:
        system = (
            "You are a lecture summarisation assistant. "
            "Given a lecture transcript, return ONLY valid JSON with two keys: "
            '"summary" (a concise 2-3 sentence paragraph) and '
            '"key_points" (a list of 4-6 bullet-point strings). '
            "No markdown, no explanation, just the JSON object."
        )
        raw = _call_openai(system, f"Transcript:\n{transcript}")
        # Strip potential markdown fences
        raw = raw.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
        return json.loads(raw)

    # ── FALLBACK MOCK (clearly labelled) ──────────────────────────────────
    return {
        "summary": (
            "[MOCK — set OPENAI_API_KEY for real AI] "
            "This lecture covers foundational concepts in wave-particle duality and "
            "the double-slit experiment, illustrating how quantum objects exhibit both "
            "wave and particle behaviour depending on observation. "
            "Key equations such as the de Broglie relation and fringe-spacing formula "
            "were derived and applied to experimental scenarios."
        ),
        "key_points": [
            "[MOCK] Light demonstrates wave properties through interference patterns",
            "[MOCK] de Broglie wavelength: λ = h / p",
            "[MOCK] Fringe spacing formula: Δy = λL / d",
            "[MOCK] Observation collapses the quantum superposition",
            "[MOCK] Electrons show identical interference patterns to photons",
        ],
    }


# ---------------------------------------------------------------------------
# generate_flashcards
# ---------------------------------------------------------------------------

def generate_flashcards(transcript: str) -> list[dict]:
    """
    Returns a list of {"question": str, "answer": str} dicts.

    Real path:  GPT-3.5-turbo with JSON output.
    Fallback:   labelled mock data.
    """
    if _OPENAI_AVAILABLE:
        system = (
            "You are a flashcard creator for university students. "
            "Given a lecture transcript, return ONLY valid JSON: an array of objects, "
            'each with "question" and "answer" string fields. '
            "Create 5-8 flashcards covering key concepts. "
            "No markdown, no explanation, just the JSON array."
        )
        raw = _call_openai(system, f"Transcript:\n{transcript}", max_tokens=1000)
        raw = raw.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
        return json.loads(raw)

    # ── FALLBACK MOCK ──────────────────────────────────────────────────────
    return [
        {
            "question": "[MOCK] What does the double-slit experiment demonstrate?",
            "answer": "It demonstrates wave-particle duality: particles create an interference pattern (wave behaviour) when unobserved, but behave like particles when measured.",
        },
        {
            "question": "[MOCK] State the de Broglie relation.",
            "answer": "λ = h / p, where λ is wavelength, h is Planck's constant, and p is the momentum of the particle.",
        },
        {
            "question": "[MOCK] What is the fringe-spacing formula?",
            "answer": "Δy = λL / d, where λ = wavelength, L = screen distance, d = slit separation.",
        },
        {
            "question": "[MOCK] What happens to the interference pattern when a detector is placed at the slits?",
            "answer": "The interference pattern disappears — the act of measurement collapses the superposition and causes particle-like behaviour.",
        },
        {
            "question": "[MOCK] How does increasing slit separation d affect fringe spacing?",
            "answer": "Fringe spacing Δy decreases; the interference pattern becomes more compressed.",
        },
    ]


# ---------------------------------------------------------------------------
# ask_lecture
# ---------------------------------------------------------------------------

def ask_lecture(question: str, transcript_context: str) -> str:
    """
    Returns a plain-text answer string.

    Real path:  GPT-3.5-turbo using the transcript as grounding context.
    Fallback:   labelled mock string.
    """
    if _OPENAI_AVAILABLE:
        system = (
            "You are a knowledgeable teaching assistant. "
            "Answer the student's question using only the provided lecture transcript as context. "
            "Be concise, accurate, and helpful. If the answer is not in the transcript, say so."
        )
        user = f"Lecture transcript:\n{transcript_context}\n\nStudent question: {question}"
        return _call_openai(system, user, max_tokens=400)

    # ── FALLBACK MOCK ──────────────────────────────────────────────────────
    return (
        f"[MOCK — set OPENAI_API_KEY for real AI] "
        f"Based on the lecture, '{question}' relates to core quantum mechanics principles "
        "covered in this session. The transcript discusses wave-particle duality, the "
        "double-slit experiment, and fringe spacing. For a precise answer, please review "
        "the relevant section of the transcript above."
    )
