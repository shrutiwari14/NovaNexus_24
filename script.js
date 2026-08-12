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
