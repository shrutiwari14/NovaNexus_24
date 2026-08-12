const API_BASE = "http://127.0.0.1:8000";
let websocket = null;
let recognition = null;
let activeLectureId = null;

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
