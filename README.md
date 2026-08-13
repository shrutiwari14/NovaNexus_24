# NovaNexus_24
Problem Statement 1: The Smart Classroom AI

# Setup & Run Instructions

# Backend (FastAPI)

1. Open a terminal in the project root (`NovaNexus_24/`).
2. Create and activate a virtual environment (skip creation if `venv/` already exists):
```powershell
   python -m venv venv
   venv\scripts\Activate.ps1
```
3. Install dependencies:
```powershell
   pip install -r requirements.txt
```
4. Copy `.env.example` to `.env` and add any required API keys:
```powershell
   copy .env.example .env
```
5. Start the backend server:
```powershell
   uvicorn main:app --reload
```
6. Confirm it's running by visiting `http://localhost:8000/health` — should return `{"status": "ok"}`.
   Interactive API docs are available at `http://localhost:8000/docs`.

# Frontend (plain HTML/CSS/JS)

1. Open the `NovaNexus_24/` folder in VS Code.
2. Right-click `index.html` → **Open with Live Server** (requires the Live Server extension).
3. This will open the site at `http://127.0.0.1:5500` — the frontend is already configured to call 
   the backend at `http://localhost:8000`.

Both the backend (step 1) and frontend (step 2) need to be running at the same time for the app 
to work fully.

# Future Scope

- Live streaming transcription (current build uses record-then-process for reliability)
- Confusion-tracking feedback loop: Tracks which topics students found difficult and needed explained again, then shows this information to professors on a dashboard.

- LMS/classroom-recording integration for passive, semester-long use
- Extension beyond CS lectures to any subject with technical notation
