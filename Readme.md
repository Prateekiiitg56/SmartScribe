# SmartScribe 🖊️

AI-powered essay evaluator that provides instant feedback on grammar, coherence, and argumentation strength.

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React + Vite |
| Backend | FastAPI (Python) |
| Database | SQLite |
| Auth | JWT + Google OAuth |
| AI | OpenRouter API |

## Project Structure

```
SmartScribe/
├── backend/          # FastAPI backend
│   ├── main.py       # API routes
│   ├── auth.py       # JWT + password hashing
│   ├── database.py   # SQLite operations
│   ├── ai.py         # OpenRouter AI integration
│   └── .env          # API keys (not committed)
│
├── modern_scribe/    # React frontend (Vite)
│   └── src/
│       ├── App.jsx
│       ├── api.js
│       └── views/
│           ├── Auth.jsx      # Login / Register / Google OAuth
│           ├── Evaluate.jsx  # Essay editor + AI evaluation
│           └── Dashboard.jsx # User stats
│
├── smartscribe.db    # SQLite database
└── requirements.txt  # Python dependencies
```

## Setup

### Backend
```bash
pip install -r requirements.txt
python backend/main.py
```

### Frontend
```bash
cd modern_scribe
npm install
npm run dev
```

### Environment Variables (`backend/.env`)
```env
OPENROUTER_API_KEY=your_key
GOOGLE_CLIENT_ID=your_google_client_id
JWT_SECRET=your_secret_key
```

## Features
- ✅ Essay evaluation with AI (grammar, coherence, argumentation)
- ✅ Real Google OAuth sign-in
- ✅ JWT-based authentication
- ✅ User dashboard with history and stats
- ✅ Ask AI about your essay
