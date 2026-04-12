# SmartScribe — Modern AI Essay Evaluator

**Overview**
- SmartScribe is an AI-assisted essay evaluation web app (React frontend + FastAPI backend).
- It uses deterministic heuristics plus local HuggingFace transformer models for semantic, coherence and sentiment signals. Optionally, it can use an external AI provider (OpenRouter) if configured.

**Key Features**
- Multi-mode evaluation: `Standard`, `Creative`, `Professional`, `Academic`.
- Hybrid scoring: rule-based heuristics + transformer-derived signals (semantic, coherence, sentiment).
- Local transformer-based scoring (no remote API required) using HuggingFace models.
- Google Sign-in (OAuth) for authentication.
- Save, download (PDF), and manage essay history in dashboard.

**Repository structure (important files)**
- `backend/` — FastAPI server, evaluation logic in `backend/ai.py`, API routes in `backend/main.py`.
- `modern_scribe/` — React frontend (Vite). Main UI in `modern_scribe/src`.
- `requirements.txt` — Python dependencies for backend.
- `modern_scribe/package.json` — frontend dependencies & scripts.

**Prerequisites**
- Python 3.10+ (3.11 recommended)
- Node.js + npm
- Git (optional)
- For local transformer evaluation: enough disk & memory to download HF models (models like `sentence-transformers/all-mpnet-base-v2` are used).

**Environment variables**
Create a `.env` file in `backend/` with relevant keys. Example:

```
# backend/.env
DATABASE_URL=sqlite:///./db.sqlite3
SECRET_KEY=your_jwt_secret_here
OPENROUTER_API_KEY=    # optional, if you want cloud AI
HF_EMBEDDING_MODEL=sentence-transformers/all-mpnet-base-v2
HF_SENTIMENT_MODEL=distilbert-base-uncased-finetuned-sst-2-english
```

- `OPENROUTER_API_KEY` (optional) — when set, the backend will call OpenRouter for richer AI scoring and chat. If absent, the system falls back to local heuristics+transformer signals.
- `HF_EMBEDDING_MODEL` and `HF_SENTIMENT_MODEL` are optional overrides for model choices used by the local scorer.

**Setup — Backend**
1. Create a Python venv and activate it (Windows PowerShell example):

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

2. Install dependencies:

```powershell
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

3. (Optional) If you plan to use heavier HF models, install `torch` appropriate for your CUDA/CPU environment per https://pytorch.org.

**Setup — Frontend**
1. Install node deps:

```powershell
cd modern_scribe
npm install
```

**Run locally**
- Start backend (from `backend/`):

```powershell
cd backend
python -m uvicorn main:app --reload
```

- Start frontend (from project root or `modern_scribe/`):

```powershell
cd modern_scribe
npm run dev
# Open http://localhost:3000
```

**Google Sign-in notes**
- In `modern_scribe/src/main.jsx`, a `GOOGLE_CLIENT_ID` is used. Ensure this client ID matches the OAuth client in Google Cloud.
- In Google Cloud Console -> OAuth 2.0 Client IDs -> Edit, set **Authorized JavaScript origins** to `http://localhost:3000` and (if using other ports) add them.
- If the frontend reports `Failed to fetch` or `ERR_CONNECTION_REFUSED` for `http://localhost:8000/api/auth/google`, verify the backend is running and reachable.

**Transformer / Model notes**
- The backend loads HF models on demand. Default models used are `sentence-transformers/all-mpnet-base-v2` (embeddings) and `distilbert-base-uncased-finetuned-sst-2-english` (sentiment).
- These are downloaded automatically when first used; ensure the machine has internet access and enough disk space.
- If large models cause memory issues, switch to a smaller embedding model (set `HF_EMBEDDING_MODEL` in `.env`) or run the scoring on a machine with more RAM.

**Auto-tuning & calibration**
- The evaluation blends heuristic and transformer signals with tunable weights inside `backend/ai.py`.
- To calibrate weights: collect a small labeled dataset of essays with your target scores, then implement a lightweight script that calculates evaluation outputs for many weight combinations and chooses the weights that minimize error (I can help scaffold this if you want).

**Troubleshooting**
- Backend unreachable: check Uvicorn log in the terminal. If `ERR_CONNECTION_REFUSED` appears in browser console, restart backend and ensure port 8000 is free.
- Google OAuth 400 / redirect errors: verify Client ID and origins in Google Cloud Console exactly match the app origin.
- Transformer OOM or long downloads: use a smaller HF model or run on a machine with GPU/adequate RAM.
- If `openrouter` calls fail: verify `OPENROUTER_API_KEY` is set and network connectivity is allowed.

**Testing**
- Manual: use the UI to submit essays and view dashboard; check backend terminal for any traceback.
- Programmatic: the API endpoints are in `backend/main.py` (`/api/evaluate`, `/api/ask-ai`, dashboard endpoints) — you can `curl` or use Postman.

**Development tips**
- Use `python -m uvicorn main:app --reload` for hot-reload while developing backend.
- Use `npm run dev` for frontend hot-reload.
- Keep `.env` out of source control; do not commit secrets.

**How you can ask me to help next**
- I can add a calibration script to auto-tune blend weights.
- I can create a small dataset and sample runner to benchmark old vs new scoring.
- I can add CI scripts, or containerize (Docker) the app for easier deployment.

Tell me which next step you prefer and I’ll implement it.
