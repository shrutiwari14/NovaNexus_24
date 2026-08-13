const API_BASE = "http://127.0.0.1:8000";
let activeLectureId = null;

// ========== LIVE CAPTURE & SPEECH STATE ==========
let liveTranscriptEntries = [];
let isMicListening = false;
let selectedSpeakerRole = "professor";
let liveSessionStartTime = null;
let micInterval = null;

// ========== WHITEBOARD OCR STATE ==========
let whiteboardSessions = [];
let activeWhiteboardIndex = null;
let selectedImageBase64 = null;
let selectedImageTitle = "Whiteboard Diagram Snapshot";

// ========== AI TUTOR & DIAGRAM ADVISOR STATE ==========
let diagramSuggestions = [];
let currentFilterCategory = "all";

function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
    
    document.getElementById(`tab-${tabName}`).classList.add('active');
    document.getElementById(`nav-${tabName}`).classList.add('active');
}

// --- LIVE CAPTURE & SPEECH ---

const MOCK_LIVE_TRANSCRIPT = [
    {
        id: "entry-1",
        role: "professor",
        timestamp: "00:12",
        text: "Good morning everyone. Today we delve into wave-particle duality and Young's famous double-slit experiment.",
        translatedText: "सुप्रभात सभी को। आज हम तरंग-कण द्वैतता और यंग के प्रसिद्ध द्वि-स्लिट प्रयोग में गहराई से जाएंगे।",
        langCode: "IN",
    },
    {
        id: "entry-2",
        role: "professor",
        timestamp: "00:45",
        text: "When we fire single photons through two narrow slits, we don't get two solid bands on the detector screen. Instead, we observe an interference pattern.",
        translatedText: "जब हम दो संकीर्ण स्लिटों से एकल फोटॉन फेंकते हैं, तो हमें डिटेक्टर स्क्रीन पर दो ठोस पट्टियाँ नहीं मिलतीं। इसके बजाय, हम एक व्यतिकरण पैटर्न देखते हैं।",
        langCode: "IN",
    },
    {
        id: "entry-3",
        role: "professor",
        timestamp: "01:18",
        text: "This is the fundamental mystery of quantum mechanics. A particle seems to pass through both slits simultaneously, interfering with itself.",
        translatedText: "यह क्वांटम यांत्रिकी का मूल रहस्य है। एक कण ऐसा लगता है जैसे वह एक साथ दोनों स्लिटों से गुजरता है, स्वयं के साथ व्यतिकरण करता है।",
        langCode: "IN",
    },
    {
        id: "entry-4",
        role: "student",
        timestamp: "01:52",
        text: "Professor, does this mean the photon is physically in two places at once before we measure it?",
        translatedText: "प्रोफेसर, क्या इसका मतलब है कि फोटॉन मापने से पहले एक साथ दो स्थानों पर भौतिक रूप से मौजूद है?",
        langCode: "IN",
    },
    {
        id: "entry-5",
        role: "professor",
        timestamp: "02:15",
        text: "That's the million-dollar question. Before measurement, it exists as a probability wave described by the wave function Psi.",
        translatedText: "यह वह करोड़ों डॉलर का प्रश्न है। मापने से पहले, यह तरंग फलन Psi द्वारा वर्णित एक संभाव्यता तरंग के रूप में मौजूद है।",
        langCode: "IN",
    },
];

function formatLiveTimestamp() {
    if (!liveSessionStartTime) return "00:00";
    const elapsed = Math.floor((Date.now() - liveSessionStartTime) / 1000);
    const mins = Math.floor(elapsed / 60).toString().padStart(2, "0");
    const secs = (elapsed % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
}

function renderTranscriptFeed() {
    const feed = document.getElementById("live-transcript-feed");
    const countBadge = document.getElementById("transcript-count-badge");
    if (!feed) return;

    countBadge.textContent = `${liveTranscriptEntries.length} item${liveTranscriptEntries.length !== 1 ? "s" : ""}`;

    feed.innerHTML = liveTranscriptEntries.map((entry) => {
        const roleLabel = entry.role === "student" ? "Student" : "Professor";
        return `
            <div class="transcript-entry" data-id="${entry.id}">
                <div class="transcript-entry-header">
                    <div class="transcript-entry-meta">
                        <span class="role-badge ${entry.role}">${roleLabel}</span>
                        <span class="transcript-timestamp">🕐 ${entry.timestamp}</span>
                    </div>
                    <div class="transcript-entry-actions">
                        <button class="transcript-action-btn" title="Play audio" onclick="playTranscriptEntry('${entry.id}')">🔊</button>
                        <button class="transcript-action-btn" title="Copy text" onclick="copyTranscriptEntry('${entry.id}', this)">📋</button>
                    </div>
                </div>
                <p class="transcript-original">${escapeHtml(entry.text)}</p>
                <p class="transcript-translated">
                    <span class="transcript-lang-tag">${entry.langCode || "IN"}</span>
                    <span>${escapeHtml(entry.translatedText)}</span>
                </p>
            </div>
        `;
    }).join("");

    feed.scrollTop = feed.scrollHeight;
}

function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

function playTranscriptEntry(entryId) {
    const entry = liveTranscriptEntries.find((e) => e.id === entryId);
    if (!entry) return;
    if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(entry.text);
        utterance.lang = "en-US";
        window.speechSynthesis.speak(utterance);
    }
}

function copyTranscriptEntry(entryId, btn) {
    const entry = liveTranscriptEntries.find((e) => e.id === entryId);
    if (!entry) return;
    const text = `${entry.text}\n\n${entry.translatedText}`;
    navigator.clipboard.writeText(text).then(() => {
        btn.textContent = "✅";
        btn.classList.add("copied");
        setTimeout(() => {
            btn.textContent = "📋";
            btn.classList.remove("copied");
        }, 2000);
    });
}

function setSpeakerRole(role) {
    selectedSpeakerRole = role;
    document.getElementById("role-professor").classList.toggle("active", role === "professor");
    document.getElementById("role-student").classList.toggle("active", role === "student");
}

function updateAddButtonState() {
    const input = document.getElementById("manual-speech-input");
    const btn = document.getElementById("btn-add-stream");
    if (input && btn) {
        btn.disabled = !input.value.trim();
    }
}

async function toggleLiveMic() {
    const btn = document.getElementById("btn-start-mic");

    if (isMicListening) {
        isMicListening = false;
        if (micInterval) {
            clearInterval(micInterval);
            micInterval = null;
        }
        btn.classList.remove("listening");
        btn.innerHTML = '<span class="btn-icon">🎤</span> Start Live Mic';
        return;
    }

    isMicListening = true;
    liveSessionStartTime = Date.now();
    btn.classList.add("listening");
    btn.innerHTML = '<span class="btn-icon">⏹️</span> Stop Live Mic';

    try {
        const res = await fetch(`${API_BASE}/transcribe`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "start", targetLanguage: "Hindi" }),
        });
        const data = await res.json();

        if (data.entry) {
            liveTranscriptEntries.push(data.entry);
            renderTranscriptFeed();
        }
    } catch (err) {
        console.warn("Transcribe endpoint unavailable, using local mock:", err);
        const mockEntry = {
            id: `entry-${Date.now()}`,
            role: "professor",
            timestamp: formatLiveTimestamp(),
            text: "Let us now consider the de Broglie wavelength, lambda equals h divided by p.",
            translatedText: "अब हम de Broglie तरंगदैर्घ्य पर विचार करते हैं, lambda बराबर h भाग p।",
            langCode: "IN",
        };
        liveTranscriptEntries.push(mockEntry);
        renderTranscriptFeed();
    }

    micInterval = setInterval(async () => {
        if (!isMicListening) return;
        try {
            const res = await fetch(`${API_BASE}/transcribe`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "chunk", targetLanguage: "Hindi" }),
            });
            const data = await res.json();
            if (data.entry) {
                liveTranscriptEntries.push(data.entry);
                renderTranscriptFeed();
            }
        } catch {
            // Silently skip if backend unavailable during interval
        }
    }, 15000);
}

async function addManualEntry() {
    const input = document.getElementById("manual-speech-input");
    const text = input.value.trim();
    if (!text) return;

    const btn = document.getElementById("btn-add-stream");
    btn.disabled = true;

    try {
        const res = await fetch(`${API_BASE}/add-manual-entry`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                text,
                role: selectedSpeakerRole,
                targetLanguage: "Hindi",
            }),
        });
        const data = await res.json();

        if (data.entry) {
            liveTranscriptEntries.push(data.entry);
        }
    } catch (err) {
        console.warn("Manual entry endpoint unavailable, using local mock:", err);
        liveTranscriptEntries.push({
            id: `entry-${Date.now()}`,
            role: selectedSpeakerRole,
            timestamp: formatLiveTimestamp(),
            text,
            translatedText: `[Hindi translation pending] ${text}`,
            langCode: "IN",
        });
    }

    input.value = "";
    renderTranscriptFeed();
    updateAddButtonState();
}

function generateMultilingualDeck() {
    alert("Generate Multilingual Deck will create flashcards from the live transcript. Wire this to your deck generator next!");
}

function initLiveCaptureTab() {
    liveTranscriptEntries = [...MOCK_LIVE_TRANSCRIPT];
    renderTranscriptFeed();
    updateAddButtonState();
}

// --- 📁 FILE UPLOAD & RECORDED ANALYSIS ---

// Module-level transcript store for the Study Deck tab
let currentTranscript = ""

function _setStatusPill(state) {
    // state: 'ready' | 'processing' | 'done'
    const pill = document.getElementById("upload-status-pill")
    pill.className = "status-pill " + state
    const labels = { ready: "READY", processing: "PROCESSING", done: "DONE" }
    pill.textContent = labels[state] || state.toUpperCase()
}

function _setUploadStatusMsg(msg, isError) {
    const el = document.getElementById("upload-status")
    el.textContent = msg
    el.style.color = isError ? "var(--danger-color)" : "var(--text-muted)"
}

function _enableAIButtons(enabled) {
    document.getElementById("btn-summary").disabled = !enabled
    document.getElementById("btn-flashcards").disabled = !enabled
    document.getElementById("btn-ask").disabled = !enabled
}

function handleFileSelect(event) {
    const file = event.target.files[0]
    const display = document.getElementById("file-name-display")
    if (file) {
        display.textContent = file.name
        display.style.color = "var(--text-primary)"
    } else {
        display.textContent = "No file chosen"
        display.style.color = ""
    }
}

async function uploadLecture() {
    const fileInput = document.getElementById("media-file")
    const file = fileInput.files[0]
    if (!file) {
        _setUploadStatusMsg("Please select a file first.", true)
        return
    }

    // UI: PROCESSING state
    _setStatusPill("processing")
    _setUploadStatusMsg("Uploading & processing…")
    document.getElementById("btn-upload").disabled = true

    // Show loading placeholder in transcript box
    const transcriptBox = document.getElementById("recorded-transcript-box")
    transcriptBox.classList.remove("empty")
    transcriptBox.innerHTML =
        '<div class="transcript-loading"><span class="spinner">⏳</span> Transcribing audio…</div>'

    try {
        const formData = new FormData()
        formData.append("file", file)

        const res = await fetch(`${API_BASE}/transcribe-audio`, {
            method: "POST",
            body: formData,
        })

        if (!res.ok) {
            const err = await res.json().catch(() => ({}))
            throw new Error(err.detail || `Server error ${res.status}`)
        }

        const data = await res.json()
        currentTranscript = data.transcript

        // Display transcript
        transcriptBox.innerHTML =
            `<pre class="transcript-text">${escapeHtml(currentTranscript)}</pre>`

        _setStatusPill("done")
        _setUploadStatusMsg(`Transcription complete — ${currentTranscript.length} characters`)
        _enableAIButtons(true)

    } catch (err) {
        _setStatusPill("ready")
        _setUploadStatusMsg("Upload failed: " + err.message, true)
        transcriptBox.innerHTML =
            '<div class="transcript-empty"><div class="transcript-empty-icon">⚠️</div>' +
            `<p>Upload failed</p><p style="font-size:0.8rem;opacity:0.7">${escapeHtml(err.message)}</p></div>`
        transcriptBox.classList.add("empty")
    } finally {
        document.getElementById("btn-upload").disabled = false
    }
}

// --- 🤖 AI FEATURES ---

async function generateSummary() {
    if (!currentTranscript) return

    const btn = document.getElementById("btn-summary")
    const originalHtml = btn.innerHTML
    btn.disabled = true
    btn.innerHTML = '<span class="spinner">⏳</span> Generating…'

    try {
        const res = await fetch(`${API_BASE}/generate-summary`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ transcript: currentTranscript }),
        })

        if (!res.ok) {
            const err = await res.json().catch(() => ({}))
            throw new Error(err.detail || `Server error ${res.status}`)
        }

        const data = await res.json()

        document.getElementById("summary-text").textContent = data.summary
        const list = document.getElementById("key-points-list")
        list.innerHTML = ""
        data.key_points.forEach(point => {
            const li = document.createElement("li")
            li.textContent = point
            list.appendChild(li)
        })
        document.getElementById("summary-section").classList.remove("hidden")

    } catch (err) {
        _showAiError("summary-section", "summary-text", "Failed to generate summary: " + err.message)
    } finally {
        btn.disabled = false
        btn.innerHTML = originalHtml
    }
}

async function generateFlashcards() {
    if (!currentTranscript) return

    const btn = document.getElementById("btn-flashcards")
    const originalHtml = btn.innerHTML
    btn.disabled = true
    btn.innerHTML = '<span class="spinner">⏳</span> Generating…'

    try {
        const res = await fetch(`${API_BASE}/generate-flashcards`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ transcript: currentTranscript }),
        })

        if (!res.ok) {
            const err = await res.json().catch(() => ({}))
            throw new Error(err.detail || `Server error ${res.status}`)
        }

        const data = await res.json()

        const container = document.getElementById("flashcards-container")
        container.innerHTML = ""
        data.flashcards.forEach((card, i) => {
            const div = document.createElement("div")
            div.className = "flashcard"
            div.innerHTML =
                `<div class="flashcard-q"><span class="flashcard-label">Q${i + 1}</span>${escapeHtml(card.question)}</div>` +
                `<div class="flashcard-a"><span class="flashcard-label answer">A</span>${escapeHtml(card.answer)}</div>`
            container.appendChild(div)
        })
        document.getElementById("flashcard-section").classList.remove("hidden")

    } catch (err) {
        _showAiError("flashcard-section", "flashcards-container", "Failed to create flashcards: " + err.message)
    } finally {
        btn.disabled = false
        btn.innerHTML = originalHtml
    }
}

async function sendChatMessage() {
    const input = document.getElementById("chat-input")
    const question = input.value.trim()
    if (!question || !currentTranscript) return

    const chatHistory = document.getElementById("chat-history")
    const btnAsk = document.getElementById("btn-ask")

    // Append user bubble
    const userBubble = document.createElement("div")
    userBubble.className = "chat-bubble chat-bubble-user"
    userBubble.textContent = question
    chatHistory.appendChild(userBubble)

    input.value = ""
    btnAsk.disabled = true
    btnAsk.textContent = "…"

    // Typing indicator
    const typingBubble = document.createElement("div")
    typingBubble.className = "chat-bubble chat-bubble-ai chat-typing"
    typingBubble.textContent = "⏳ Thinking…"
    chatHistory.appendChild(typingBubble)
    chatHistory.scrollTop = chatHistory.scrollHeight

    try {
        const res = await fetch(`${API_BASE}/ask-lecture`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                question,
                transcript_context: currentTranscript,
            }),
        })

        if (!res.ok) {
            const err = await res.json().catch(() => ({}))
            throw new Error(err.detail || `Server error ${res.status}`)
        }

        const data = await res.json()
        typingBubble.className = "chat-bubble chat-bubble-ai"
        typingBubble.textContent = data.answer

    } catch (err) {
        typingBubble.className = "chat-bubble chat-bubble-ai chat-bubble-error"
        typingBubble.textContent = "⚠️ Error: " + err.message
    } finally {
        btnAsk.disabled = false
        btnAsk.textContent = "Ask"
        chatHistory.scrollTop = chatHistory.scrollHeight
    }
}

function handleChatKey(event) {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault()
        sendChatMessage()
    }
}

function _showAiError(sectionId, contentId, msg) {
    const section = document.getElementById(sectionId)
    const content = document.getElementById(contentId)
    content.innerHTML = `<span style="color:var(--danger-color)">${escapeHtml(msg)}</span>`
    section.classList.remove("hidden")
}

// ========== 🎨 WHITEBOARD & DIAGRAM OCR FUNCTIONS ==========

// Generate a sample SVG diagram (Physics Double-Slit Experiment)
function generateSampleDiagram() {
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
}

// Handle file upload from input
function handleOcrFileUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    selectedImageTitle = file.name.replace(/\.[^/.]+$/, '');

    const reader = new FileReader();
    reader.onloadend = () => {
        selectedImageBase64 = reader.result;
        updateOcrPreview();
    };
    reader.readAsDataURL(file);
}

// Load preset diagram sample
function loadPresetDiagram() {
    selectedImageBase64 = generateSampleDiagram();
    selectedImageTitle = "Physics Wave Interference Diagram";
    updateOcrPreview();
}

// Update the preview UI
function updateOcrPreview() {
    const previewContainer = document.getElementById("ocr-preview-container");
    const emptyState = document.getElementById("ocr-empty-state");
    const previewImg = document.getElementById("ocr-preview-img");

    if (selectedImageBase64) {
        previewImg.src = selectedImageBase64;
        previewContainer.classList.remove("hidden");
        emptyState.style.display = "none";
    } else {
        previewContainer.classList.add("hidden");
        emptyState.style.display = "flex";
    }
}

// Handle analyze image button
async function handleAnalyzeImage() {
    if (!selectedImageBase64) return alert("Please select an image first.");

    const analyzeBtn = document.getElementById("analyze-btn");
    analyzeBtn.disabled = true;
    analyzeBtn.textContent = "⏳ Analyzing...";

    try {
        const res = await fetch(`${API_BASE}/ocr-analyze`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                imageBase64: selectedImageBase64,
                mimeType: selectedImageBase64.startsWith("data:image/svg") ? "image/svg+xml" : "image/jpeg",
                targetLanguageName: "English",
                title: selectedImageTitle,
            }),
        });

        const data = await res.json();

        if (res.ok) {
            const newAnalysis = {
                id: `wb-${Date.now()}`,
                title: data.title || selectedImageTitle,
                imageUrl: selectedImageBase64,
                summary: data.summary || "Whiteboard diagram analyzed.",
                translatedSummary: data.translatedSummary || "",
                extractedText: data.extractedText || "OCR Text extracted.",
                diagramSteps: data.diagramSteps || [],
                formulas: data.formulas || [],
                keyTakeaways: data.keyTakeaways || [],
                translatedTakeaways: data.translatedTakeaways || [],
                createdAt: new Date().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                }),
            };

            whiteboardSessions.unshift(newAnalysis);
            activeWhiteboardIndex = 0;
            updateWhiteboardUI();
        } else {
            alert(data.error || "Failed to analyze whiteboard image");
        }
    } catch (e) {
        console.error("Whiteboard analysis failed:", e);
        alert("Error analyzing whiteboard image. Please try again.");
    } finally {
        analyzeBtn.disabled = false;
        analyzeBtn.textContent = "✨ Run AI Diagram Analysis & OCR";
    }
}

// Select a whiteboard from the list
function selectWhiteboard(index) {
    activeWhiteboardIndex = index;
    updateWhiteboardUI();
}

// Copy OCR text to clipboard
function copyOcrText() {
    const extractedText = document.getElementById("ocr-extracted-text").innerText;
    navigator.clipboard.writeText(extractedText).then(() => {
        const copyBtn = document.getElementById("copy-ocr-btn");
        const originalText = copyBtn.textContent;
        copyBtn.textContent = "✅ Copied!";
        copyBtn.classList.add("copied");
        setTimeout(() => {
            copyBtn.textContent = originalText;
            copyBtn.classList.remove("copied");
        }, 2000);
    }).catch(err => console.error("Failed to copy:", err));
}

// Update all whiteboard UI sections
function updateWhiteboardUI() {
    if (whiteboardSessions.length === 0) {
        document.getElementById("ocr-results-section").classList.add("hidden");
        return;
    }

    document.getElementById("ocr-results-section").classList.remove("hidden");

    // Update whiteboard list
    const listContainer = document.getElementById("whiteboard-list");
    listContainer.innerHTML = "";
    document.getElementById("wb-count").innerText = whiteboardSessions.length;

    whiteboardSessions.forEach((wb, idx) => {
        const item = document.createElement("div");
        item.className = `wb-item ${idx === activeWhiteboardIndex ? "active" : ""}`;
        item.onclick = () => selectWhiteboard(idx);
        item.innerHTML = `
            <div class="wb-item-title">${wb.title}</div>
            <div class="wb-item-time">${wb.createdAt}</div>
            <div class="wb-item-summary">${wb.summary}</div>
        `;
        listContainer.appendChild(item);
    });

    // Update active whiteboard details
    const activeWB = whiteboardSessions[activeWhiteboardIndex];
    if (activeWB) {
        document.getElementById("summary-text").innerText = activeWB.summary;
        document.getElementById("translated-summary-text").innerText = activeWB.translatedSummary || activeWB.summary;
        document.getElementById("ocr-extracted-text").innerText = activeWB.extractedText;

        // Update diagram steps
        const stepsContainer = document.getElementById("diagram-steps-container");
        stepsContainer.innerHTML = "";

        if (activeWB.diagramSteps && activeWB.diagramSteps.length > 0) {
            activeWB.diagramSteps.forEach((step) => {
                const stepEl = document.createElement("div");
                stepEl.className = "step-item";
                stepEl.innerHTML = `
                    <div class="step-number">${step.stepNumber}</div>
                    <div class="step-content">
                        <div class="step-title">${step.title}</div>
                        <div class="step-explanation">${step.explanation}</div>
                    </div>
                `;
                stepsContainer.appendChild(stepEl);
            });
        }
    }
}

// ========== AI TUTOR & DIAGRAM ADVISOR FUNCTIONS ==========

const TRANSCRIPT_KEYWORDS = [
    "Wave-Particle Duality",
    "Interference Pattern",
    "Double-Slit",
    "De Brogie Wavelength",
    "Momentum Equation",
    "Wave Function Collapse",
    "Observer Effect",
];

let teacherInsightsOpen = false;
const flaggedTopicsLocal = new Set();

function renderKeywordPills() {
    const container = document.getElementById("keywords-container");
    const countEl = document.getElementById("keywords-count");
    if (!container) return;

    if (countEl) countEl.textContent = TRANSCRIPT_KEYWORDS.length;

    container.innerHTML = TRANSCRIPT_KEYWORDS.map((topic) => {
        const isFlagged = flaggedTopicsLocal.has(topic);
        return `
            <span class="keyword-pill${isFlagged ? " flagged" : ""}" data-topic="${escapeHtml(topic)}">
                <span class="keyword-text">${escapeHtml(topic)}</span>
                <button
                    type="button"
                    class="keyword-flag-btn${isFlagged ? " flagged" : ""}"
                    title="Flag as confusing"
                    aria-label="Flag ${escapeHtml(topic)} as confusing"
                    onclick="flagTopic(this)"
                >${isFlagged ? "★" : "☆"}</button>
            </span>
        `;
    }).join("");
}

async function flagTopic(btn) {
    const pill = btn.closest(".keyword-pill");
    const topic = pill?.dataset.topic;
    if (!topic || !btn) return;

    btn.disabled = true;

    try {
        const res = await fetch(`${API_BASE}/flag-topic`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ topic }),
        });

        if (!res.ok) throw new Error("Flag request failed");

        flaggedTopicsLocal.add(topic);

        btn.textContent = "★";
        btn.classList.add("flagged", "just-flagged");
        btn.closest(".keyword-pill")?.classList.add("flagged");

        setTimeout(() => btn.classList.remove("just-flagged"), 600);

        if (teacherInsightsOpen) {
            loadConfusionSummary();
        }
    } catch (err) {
        console.error("Failed to flag topic:", err);
    } finally {
        btn.disabled = false;
    }
}

function toggleTeacherInsights() {
    const panel = document.getElementById("teacher-insights-panel");
    const toggleBtn = document.getElementById("btn-teacher-insights");
    if (!panel || !toggleBtn) return;

    teacherInsightsOpen = !teacherInsightsOpen;
    panel.classList.toggle("hidden", !teacherInsightsOpen);
    toggleBtn.classList.toggle("active", teacherInsightsOpen);

    if (teacherInsightsOpen) {
        loadConfusionSummary();
    }
}

async function loadConfusionSummary() {
    const list = document.getElementById("confusion-summary-list");
    if (!list) return;

    list.innerHTML = '<p class="confusion-empty">Loading...</p>';

    try {
        const res = await fetch(`${API_BASE}/confusion-summary`);
        if (!res.ok) throw new Error("Summary request failed");
        const data = await res.json();
        renderConfusionSummary(data.topics || []);
    } catch (err) {
        console.error("Failed to load confusion summary:", err);
        list.innerHTML = '<p class="confusion-empty">Could not load insights. Is the server running?</p>';
    }
}

function renderConfusionSummary(topics) {
    const list = document.getElementById("confusion-summary-list");
    if (!list) return;

    if (!topics.length) {
        list.innerHTML = '<p class="confusion-empty">No topics flagged yet. Students can flag keywords above.</p>';
        return;
    }

    const maxCount = topics[0].count || 1;

    list.innerHTML = topics.map(({ topic, count }) => {
        const widthPct = Math.max(8, Math.round((count / maxCount) * 100));
        return `
            <div class="confusion-row">
                <div class="confusion-row-label">
                    <span class="confusion-topic-pill">${escapeHtml(topic)}</span>
                </div>
                <span class="confusion-count-badge">${count}</span>
                <div class="confusion-bar-track">
                    <div class="confusion-bar-fill" style="width: ${widthPct}%"></div>
                </div>
            </div>
        `;
    }).join("");
}

function initAiTutorFeedback() {
    renderKeywordPills();
}

function refreshDiagramSuggestions() {
    // Fetch diagram suggestions from backend
    fetch(`${API_BASE}/diagram-suggestions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            lectureContext: "Physics 201: Wave-Particle Duality & Double-Slit Experiment",
            transcriptText: "Good morning everyone. Today we delve into wave-particle duality and Young's famous double-slit experiment. When we fire single photons through two narrow slits, we don't get two solid bands on the detector screen. Instead, we observe an interference pattern.",
            targetLanguage: "English"
        })
    })
    .then(res => res.json())
    .then(data => {
        diagramSuggestions = data.suggestions || [];
        renderDiagramCards(diagramSuggestions);
    })
    .catch(err => {
        console.error('Failed to fetch diagram suggestions:', err);
        // Use fallback mock data
        loadMockDiagramSuggestions();
    });
}

function loadMockDiagramSuggestions() {
    // Mock data for development/offline mode
    diagramSuggestions = [
        {
            id: 'diag-1',
            type: '2D Intensity Profile & Wave Superposition Plot',
            category: 'chart',
            icon: '📊',
            tags: ['Wave-Particle Duality', 'Interference Pattern'],
            description: 'सटीक गणितीय तरंग वितरण का चित्रण रचनात्मक और विनाशी स्थितियों को स्पष्ट रूप से समझाता है।',
            suggestedQuestion: 'Can you explain the 2D Wave Intensity Profile step-by-step?'
        },
        {
            id: 'diag-2',
            type: 'Step-by-Step Quantum State Measurement Flowchart',
            category: 'flowchart',
            icon: '➡️',
            tags: ['Interference Pattern', 'Double-Slit'],
            description: 'फ़्लोचार्ट बहु-स्तरीय भौतिक प्रक्रियाओं को क्रमिक रूप से चरणों में विभाजित करते हैं।',
            suggestedQuestion: 'How does wave function collapse step-by-step?'
        },
        {
            id: 'diag-3',
            type: 'Conceptual Relationship Mindmap (Classical vs. Quantum)',
            category: 'concept_map',
            icon: '🗺️',
            tags: ['Wave-Particle Duality', 'Interference Pattern', 'Double-Slit'],
            description: 'शास्त्रीय न्यूटोनियन कणों और संभावना आधारित क्वांटम तरंगों के बीच संबंधों का तुलनात्मक नक्शा।',
            suggestedQuestion: 'What are the key differences between Classical and Quantum mechanics?'
        }
    ];
    renderDiagramCards(diagramSuggestions);
}

function renderDiagramCards(cards) {
    const container = document.getElementById('diagram-cards-container');
    
    // Filter by current category
    let filtered = cards;
    if (currentFilterCategory !== 'all') {
        filtered = cards.filter(card => card.category === currentFilterCategory);
    }
    
    container.innerHTML = '';
    
    filtered.forEach((card, index) => {
        const cardEl = document.createElement('div');
        cardEl.className = 'diagram-card';
        
        const tagsHtml = card.tags.map(tag => 
            `<span class="diagram-tag">${tag}</span>`
        ).join('');
        
        cardEl.innerHTML = `
            <div class="diagram-card-icon">${card.icon || '📋'}</div>
            <h3 class="diagram-card-title">${card.type}</h3>
            <div class="diagram-card-tags">${tagsHtml}</div>
            <p class="diagram-card-description">${card.description}</p>
            <div class="diagram-card-buttons">
                <button class="btn btn-secondary btn-sm" onclick="viewDiagramBlueprint('${card.id}')">👁️ View Blueprint</button>
                <button class="btn btn-primary btn-sm" onclick="askAiTutor('${card.id}')">💬 Ask AI Tutor</button>
            </div>
        `;
        
        container.appendChild(cardEl);
    });
}

function filterDiagrams(category) {
    currentFilterCategory = category;
    
    // Update active button state
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Re-render cards with filter
    renderDiagramCards(diagramSuggestions);
}

function viewDiagramBlueprint(diagramId) {
    const diagram = diagramSuggestions.find(d => d.id === diagramId);
    if (diagram) {
        alert(`📐 Blueprint: ${diagram.type}\n\nThis feature will open an interactive diagram editor in a future version.\n\nSuggested: ${diagram.suggestedQuestion}`);
    }
}

function askAiTutor(diagramId) {
    const diagram = diagramSuggestions.find(d => d.id === diagramId);
    if (diagram) {
        // Switch to chat tab (or show a modal with pre-filled question)
        const question = diagram.suggestedQuestion;
        
        // Pre-fill chat and ask the tutor
        const chatInput = document.getElementById('chat-input');
        if (chatInput) {
            chatInput.value = question;
            sendChatMessage();
            // Switch to the recorded tab where chat is located
            switchTab('recorded');
        } else {
            alert(`Question: ${question}\n\nChat integration coming soon!`);
        }
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    initLiveCaptureTab();
    initAiTutorFeedback();
    loadMockDiagramSuggestions();
});
