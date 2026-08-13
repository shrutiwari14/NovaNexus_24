const API_BASE = "http://127.0.0.1:8000";
let websocket = null;
let recognition = null;
let activeLectureId = null;

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

// --- 🎙️ LIVE TRANSCRIPTION VIA WEBSOCKET & WEB SPEECH API ---
function startLiveSession() {
    const transcriptBox = document.getElementById("live-transcript-box");
    transcriptBox.innerHTML = "";
    
    // 1. Establish WebSocket Connection
    websocket = new WebSocket(`ws://127.0.0.1:8000/ws/live-transcript`);
    
    websocket.onopen = () => {
        document.getElementById("status-badge").innerText = "Live";
        document.getElementById("status-badge").classList.add("recording");
        document.getElementById("btn-start").disabled = true;
        document.getElementById("btn-stop").disabled = false;
    };

    websocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        const p = document.createElement("p");
        p.innerText = data.text;
        transcriptBox.appendChild(p);
        transcriptBox.scrollTop = transcriptBox.scrollHeight;
    };

    // 2. Initialize Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("Browser does not support Web Speech API. Use Chrome or Edge.");
        return;
    }

    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                const text = event.results[i][0].transcript;
                // Send final chunk through WebSocket
                if (websocket && websocket.readyState === WebSocket.OPEN) {
                    websocket.send(JSON.stringify({ text: text, is_final: true }));
                }
            }
        }
    };

    recognition.start();
}

function stopLiveSession() {
    if (recognition) recognition.stop();
    if (websocket) websocket.close();

    document.getElementById("status-badge").innerText = "Offline";
    document.getElementById("status-badge").classList.remove("recording");
    document.getElementById("btn-start").disabled = false;
    document.getElementById("btn-stop").disabled = true;
}

// --- 📁 FILE UPLOAD & RECORDED ANALYSIS ---
async function uploadLecture() {
    const fileInput = document.getElementById("media-file");
    if (!fileInput.files[0]) return alert("Please select a file first.");

    const formData = new FormData();
    formData.append("file", fileInput.files[0]);

    document.getElementById("upload-status").innerText = "Uploading & processing...";

    try {
        const res = await fetch(`${API_BASE}/api/lectures/upload`, {
            method: "POST",
            body: formData
        });
        const data = await res.json();
        
        activeLectureId = data.lecture_id;
        document.getElementById("upload-status").innerText = `Uploaded ID: ${activeLectureId}`;
        
        // Fetch Lecture Details
        loadLectureDetails(activeLectureId);
    } catch (err) {
        document.getElementById("upload-status").innerText = "Upload failed.";
    }
}

async function loadLectureDetails(id) {
    const res = await fetch(`${API_BASE}/api/lectures/${id}`);
    const data = await res.json();
    document.getElementById("recorded-transcript-box").innerText = data.transcript;
}

// --- 🤖 AI FEATURES ---
async function generateSummary() {
    if (!activeLectureId) return alert("Upload a lecture first!");
    const res = await fetch(`${API_BASE}/api/lectures/${activeLectureId}/summarize`, { method: "POST" });
    const data = await res.json();

    document.getElementById("summary-text").innerText = data.summary;
    const list = document.getElementById("key-points-list");
    list.innerHTML = "";
    data.key_takeaways.forEach(point => {
        const li = document.createElement("li");
        li.innerText = point;
        list.appendChild(li);
    });

    document.getElementById("summary-section").classList.remove("hidden");
}

async function generateFlashcards() {
    if (!activeLectureId) return alert("Upload a lecture first!");
    const res = await fetch(`${API_BASE}/api/lectures/${activeLectureId}/flashcards`, { method: "POST" });
    const data = await res.json();

    const container = document.getElementById("flashcards-container");
    container.innerHTML = "";
    data.flashcards.forEach(card => {
        const div = document.createElement("div");
        div.className = "flashcard";
        div.innerHTML = `<strong>Q: ${card.question}</strong><br><small>A: ${card.answer}</small>`;
        container.appendChild(div);
    });

    document.getElementById("flashcard-section").classList.remove("hidden");
}

async function sendChatMessage() {
    if (!activeLectureId) return alert("Upload a lecture first!");
    const input = document.getElementById("chat-input");
    const question = input.value.trim();
    if (!question) return;

    const chatHistory = document.getElementById("chat-history");
    chatHistory.innerHTML += `<p><strong>You:</strong> ${question}</p>`;
    input.value = "";

    const res = await fetch(`${API_BASE}/api/lectures/${activeLectureId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question })
    });
    const data = await res.json();

    chatHistory.innerHTML += `<p><strong>AI:</strong> ${data.answer}</p>`;
    chatHistory.scrollTop = chatHistory.scrollHeight;
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

// Initialize with mock data on page load
document.addEventListener('DOMContentLoaded', function() {
    loadMockDiagramSuggestions();
});
