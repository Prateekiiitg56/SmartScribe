from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import database as db
import auth
import ai
import httpx
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")

app = FastAPI(title="SmartScribe API")

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup
@app.on_event("startup")
async def startup():
    db.init_db()

# --- Models ---
class UserRegister(BaseModel):
    username: str
    email: str
    password: str
    fullName: str

class UserLogin(BaseModel):
    username: str
    password: str

class GoogleAuth(BaseModel):
    credential: str   # Google access token
    email: str = ""
    name: str = ""
    sub: str = ""

class EssaySubmit(BaseModel):
    title: str
    content: str
    mode: str = "Standard"

class AskAI(BaseModel):
    question: str
    context: str

# --- Auth Routes ---
@app.post("/api/auth/register")
async def register(user: UserRegister):
    if db.get_user_by_username(user.username):
        raise HTTPException(status_code=400, detail="Username already taken.")

    hashed_pw = auth.get_password_hash(user.password)
    uid = db.create_user(user.username, user.email, hashed_pw, user.fullName)

    token = auth.create_access_token(data={"sub": str(uid)})
    return {"access_token": token, "token_type": "bearer", "username": user.username, "fullName": user.fullName}

@app.post("/api/auth/login")
async def login(user: UserLogin):
    db_user = db.get_user_by_username(user.username)
    if not db_user or not auth.verify_password(user.password, db_user["password"]):
        raise HTTPException(status_code=401, detail="Invalid username or password.")

    token = auth.create_access_token(data={"sub": str(db_user["id"])})
    return {"access_token": token, "token_type": "bearer", "username": db_user["username"], "fullName": db_user["full_name"]}

@app.post("/api/auth/google")
async def google_login(body: GoogleAuth):
    """Verify via Google's userinfo endpoint and sign the user in."""
    try:
        # Verify the access token by calling Google's userinfo endpoint
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {body.credential}"}
            )
        
        if resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid Google token.")
        
        userinfo = resp.json()
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Google verification failed: {str(e)}")

    google_id = userinfo.get("sub", body.sub)
    email = userinfo.get("email", body.email)
    full_name = userinfo.get("name", body.name or "Google User")
    username = f"g_{google_id}"

    # First try to find existing user by username (google sub)
    db_user = db.get_user_by_username(username)
    
    if not db_user:
        # Also check by email in case they registered differently before
        db_user = db.get_user_by_email(email)
    
    if not db_user:
        # Brand new Google user — create account
        uid = db.create_user(
            username=username,
            email=email,
            hashed_pw=auth.get_password_hash(google_id + "_google_secret"),
            full_name=full_name
        )
    else:
        uid = db_user["id"]
        full_name = db_user.get("full_name") or full_name

    token = auth.create_access_token(data={"sub": str(uid)})
    return {
        "access_token": token,
        "token_type": "bearer",
        "username": username,
        "fullName": full_name,
        "email": email
    }


# --- Evaluation Routes ---
@app.post("/api/evaluate")
async def evaluate_essay(essay: EssaySubmit, user_id: int = Depends(auth.get_current_user_id)):
    result = ai.get_ai_evaluation(essay.title, essay.content, essay.mode)

    essay_id = db.save_essay(
        user_id=user_id,
        title=essay.title,
        content=essay.content,
        grammar=result["grammar"],
        coherence=result["coherence"],
        argument=result["argumentation"],
        overall=result["overall"],
        feedback=result["feedback"]
    )

    return {**result, "id": essay_id}

# --- Ask AI Route ---
@app.post("/api/ask-ai")
async def ask_ai(req: AskAI, user_id: int = Depends(auth.get_current_user_id)):
    response = ai.get_ai_chat(req.question, req.context)
    return {"response": response}

# --- Dashboard Routes ---
@app.get("/api/dashboard/stats")
async def get_stats(user_id: int = Depends(auth.get_current_user_id)):
    averages = db.get_average_scores(user_id)
    essays = db.get_user_essays(user_id, limit=5)
    total_submissions = db.get_total_essays(user_id)

    return {
        "averages": averages,
        "recent_essays": essays,
        "total_submissions": total_submissions
    }

@app.get("/api/dashboard/essays")
async def get_all_essays(user_id: int = Depends(auth.get_current_user_id)):
    return db.get_user_essays(user_id)

@app.delete("/api/essays/{essay_id}")
async def delete_essay_endpoint(essay_id: int, user_id: int = Depends(auth.get_current_user_id)):
    success = db.delete_essay(essay_id, user_id)
    if not success:
        raise HTTPException(status_code=404, detail="Essay not found or unauthorized.")
    return {"message": "Essay deleted successfully."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
