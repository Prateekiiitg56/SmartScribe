# ✍️ SmartScribe – AI-Powered Essay Evaluation & Feedback System

SmartScribe is a web application that automatically evaluates essays and provides scores along with clear, actionable feedback using artificial intelligence and natural language processing.

## 🚀 Features

| Feature | Description |
|---------|-------------|
| **Grammar Analysis** | NLP-powered checks for spelling, punctuation, and sentence structure |
| **Coherence Scoring** | Measures logical flow, paragraph transitions, and readability |
| **Argument Evaluation** | Analyzes thesis strength, evidence quality, and reasoning |
| **Rubric-Based Scoring** | Multi-dimensional scoring aligned with academic rubrics |
| **Smart Feedback** | Actionable, section-level improvement suggestions |
| **Progress Tracking** | Compare submissions over time with visual charts |
| **User Authentication** | Secure registration, login & profile management |

## 📁 Project Structure

```
SmartScribe/
├── app.py                  # Main Streamlit application entry point
├── requirements.txt        # Python dependencies
├── .streamlit/
│   └── config.toml         # Streamlit theme & server config
├── auth/
│   ├── __init__.py
│   └── auth.py             # Authentication module (login, register, sessions)
├── database/
│   ├── __init__.py
│   └── db.py               # SQLite database layer (users, essays)
├── pages/
│   ├── __init__.py
│   ├── home.py             # Home / landing / dashboard page
│   └── profile.py          # User profile & submission history
├── uml/
│   └── prateekUML.pdf      # UML diagrams
├── srs.pdf                 # Software Requirements Specification
└── Readme.md               # This file
```

## 🛠️ Setup & Installation

### Prerequisites
- Python 3.9+
- pip

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/Prateekiiitg56/SmartScribe.git
cd SmartScribe

# 2. Create a virtual environment (recommended)
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS / Linux

# 3. Install dependencies
pip install -r requirements.txt

# 4. Run the application
streamlit run app.py
```

The app will open at **http://localhost:8501**.

## 🔑 Auth Module

- **Register** – Create an account with username, email, and password (bcrypt-hashed).
- **Login** – Authenticate with username + password; session managed via Streamlit `session_state`.
- **Logout** – Clears session and redirects to home.
- **Profile** – View & edit profile info, change password, view submission history with progress charts.

## 📄 Pages

| Page | Route | Description |
|------|-------|-------------|
| **Home (Landing)** | Unauthenticated | Hero, features, how-it-works, CTA |
| **Home (Dashboard)** | Authenticated | Stats overview, recent submissions |
| **Login** | `/login` | Sign-in form |
| **Register** | `/register` | Account creation form |
| **Profile** | `/profile` | User info, edit profile, change password, history + charts |
| **Evaluate** | `/evaluate` | Essay submission (placeholder – AI engine coming soon) |

## 🧑‍💻 Tech Stack

- **Frontend**: Streamlit
- **Backend**: Python 3
- **Database**: SQLite
- **Auth**: bcrypt password hashing + session-based auth
- **Charts**: Plotly

## 📝 License

This project is part of the Computer Engineering Lab coursework (Semester 6).

