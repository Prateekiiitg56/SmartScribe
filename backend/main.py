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

# ──────────────────── Models ────────────────────
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

class EvalConfig(BaseModel):
    min_words: int = 0
    style: str = "any"

class EssaySubmit(BaseModel):
    title: str
    content: str
    mode: str = "Standard"
    min_words: int = 0
    style: str = "any"

class AskAI(BaseModel):
    question: str
    context: str
    mode: str = "Standard"

# Teacher-mode models
class TeacherRegister(BaseModel):
    username: str
    email: str
    password: str
    fullName: str

class RoomCreate(BaseModel):
    name: str
    description: str = ""

class JoinRoom(BaseModel):
    room_code: str

class RoomEssaySubmit(BaseModel):
    title: str
    content: str

class TeacherReview(BaseModel):
    grammar: float
    coherence: float
    argument: float
    overall: float
    review: str

class AddMember(BaseModel):
    username: str

# ──────────────────── Auth Routes ────────────────────
@app.post("/api/auth/register")
async def register(user: UserRegister):
    if db.get_user_by_username(user.username):
        raise HTTPException(status_code=400, detail="Username already taken.")

    hashed_pw = auth.get_password_hash(user.password)
    uid = db.create_user(user.username, user.email, hashed_pw, user.fullName, role="student")

    token = auth.create_access_token(data={"sub": str(uid), "role": "student"})
    return {"access_token": token, "token_type": "bearer", "username": user.username, "fullName": user.fullName, "role": "student"}

@app.post("/api/auth/login")
async def login(user: UserLogin):
    db_user = db.get_user_by_username(user.username)
    if not db_user or not auth.verify_password(user.password, db_user["password"]):
        raise HTTPException(status_code=401, detail="Invalid username or password.")

    role = db_user.get("role", "student")
    token = auth.create_access_token(data={"sub": str(db_user["id"]), "role": role})
    return {"access_token": token, "token_type": "bearer", "username": db_user["username"], "fullName": db_user["full_name"], "role": role}

@app.post("/api/auth/google")
async def google_login(body: GoogleAuth):
    """Verify via Google's userinfo endpoint and sign the user in."""
    try:
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

    db_user = db.get_user_by_username(username)
    if not db_user:
        db_user = db.get_user_by_email(email)
    if not db_user:
        uid = db.create_user(
            username=username,
            email=email,
            hashed_pw=auth.get_password_hash(google_id + "_google_secret"),
            full_name=full_name,
            role="student"
        )
        role = "student"
    else:
        uid = db_user["id"]
        full_name = db_user.get("full_name") or full_name
        role = db_user.get("role", "student")

    token = auth.create_access_token(data={"sub": str(uid), "role": role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "username": username,
        "fullName": full_name,
        "email": email,
        "role": role
    }

# ──────────────────── Teacher Auth Routes ────────────────────
@app.post("/api/auth/teacher/register")
async def teacher_register(user: TeacherRegister):
    if db.get_user_by_username(user.username):
        raise HTTPException(status_code=400, detail="Username already taken.")

    hashed_pw = auth.get_password_hash(user.password)
    uid = db.create_user(user.username, user.email, hashed_pw, user.fullName, role="teacher")

    token = auth.create_access_token(data={"sub": str(uid), "role": "teacher"})
    return {"access_token": token, "token_type": "bearer", "username": user.username, "fullName": user.fullName, "role": "teacher"}

@app.post("/api/auth/teacher/login")
async def teacher_login(user: UserLogin):
    db_user = db.get_user_by_username(user.username)
    if not db_user or not auth.verify_password(user.password, db_user["password"]):
        raise HTTPException(status_code=401, detail="Invalid username or password.")

    if db_user.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="This account is not a teacher account.")

    token = auth.create_access_token(data={"sub": str(db_user["id"]), "role": "teacher"})
    return {"access_token": token, "token_type": "bearer", "username": db_user["username"], "fullName": db_user["full_name"], "role": "teacher"}

@app.post("/api/auth/teacher/google")
async def teacher_google_login(body: GoogleAuth):
    """Google sign-in for teachers. Creates a teacher account if new."""
    try:
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
    full_name = userinfo.get("name", body.name or "Google Teacher")
    username = f"t_g_{google_id}"

    db_user = db.get_user_by_username(username)
    if not db_user:
        db_user = db.get_user_by_email(email)

    if not db_user:
        uid = db.create_user(
            username=username, email=email,
            hashed_pw=auth.get_password_hash(google_id + "_google_teacher_secret"),
            full_name=full_name, role="teacher"
        )
        role = "teacher"
    else:
        uid = db_user["id"]
        full_name = db_user.get("full_name") or full_name
        role = db_user.get("role", "student")
        if role != "teacher":
            raise HTTPException(status_code=403, detail="This Google account is registered as a student. Use student login instead.")

    token = auth.create_access_token(data={"sub": str(uid), "role": "teacher"})
    return {
        "access_token": token, "token_type": "bearer",
        "username": username, "fullName": full_name,
        "email": email, "role": "teacher"
    }

# ──────────────────── Teacher Dashboard Stats ────────────────────
@app.get("/api/teacher/dashboard/stats")
async def teacher_stats(teacher_id: int = Depends(auth.get_current_teacher_id)):
    return db.get_teacher_stats(teacher_id)

# ──────────────────── Evaluation Routes ────────────────────
@app.post("/api/evaluate")
async def evaluate_essay(essay: EssaySubmit, user_id: int = Depends(auth.get_current_user_id)):
    result = ai.get_ai_evaluation(essay.title, essay.content, essay.mode, essay.min_words, essay.style)

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

# ──────────────────── Ask AI Route ────────────────────
@app.post("/api/ask-ai")
async def ask_ai(req: AskAI, user_id: int = Depends(auth.get_current_user_id)):
    response = ai.get_ai_chat(req.question, req.context, req.mode)
    return {"response": response}

# ──────────────────── Dashboard Routes ────────────────────
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

# ──────────────────── Room Routes (Teacher) ────────────────────
@app.post("/api/rooms")
async def create_room(body: RoomCreate, teacher_id: int = Depends(auth.get_current_teacher_id)):
    result = db.create_room(teacher_id, body.name, body.description)
    if not result:
        raise HTTPException(status_code=500, detail="Failed to create room. Try again.")
    return {"message": "Room created.", **result}

@app.get("/api/rooms")
async def list_rooms(teacher_id: int = Depends(auth.get_current_teacher_id)):
    return db.get_teacher_rooms(teacher_id)

@app.get("/api/rooms/{room_id}")
async def get_room(room_id: int, teacher_id: int = Depends(auth.get_current_teacher_id)):
    room = db.get_room_by_id(room_id)
    if not room or room["teacher_id"] != teacher_id:
        raise HTTPException(status_code=404, detail="Room not found.")
    members = db.get_room_members(room_id, status_filter='approved')
    pending = db.get_pending_members(room_id)
    essays = db.get_room_essays(room_id)
    return {**room, "members": members, "pending_members": pending, "essays": essays}

@app.post("/api/rooms/{room_id}/members")
async def add_member(room_id: int, body: AddMember, teacher_id: int = Depends(auth.get_current_teacher_id)):
    room = db.get_room_by_id(room_id)
    if not room or room["teacher_id"] != teacher_id:
        raise HTTPException(status_code=404, detail="Room not found.")

    student = db.get_user_by_username(body.username)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")
    if student.get("role") == "teacher":
        raise HTTPException(status_code=400, detail="Cannot add a teacher as a student member.")

    success = db.add_room_member(room_id, student["id"])
    if not success:
        raise HTTPException(status_code=400, detail="Student is already a member of this room.")
    # Teacher-initiated add = auto-approve
    db.approve_room_member(room_id, student["id"])
    return {"message": f"Student '{body.username}' added to room."}

@app.post("/api/rooms/{room_id}/members/{student_id}/approve")
async def approve_member(room_id: int, student_id: int, teacher_id: int = Depends(auth.get_current_teacher_id)):
    room = db.get_room_by_id(room_id)
    if not room or room["teacher_id"] != teacher_id:
        raise HTTPException(status_code=404, detail="Room not found.")

    success = db.approve_room_member(room_id, student_id)
    if not success:
        raise HTTPException(status_code=404, detail="No pending request found.")
    return {"message": "Student approved."}

@app.post("/api/rooms/{room_id}/members/{student_id}/reject")
async def reject_member(room_id: int, student_id: int, teacher_id: int = Depends(auth.get_current_teacher_id)):
    room = db.get_room_by_id(room_id)
    if not room or room["teacher_id"] != teacher_id:
        raise HTTPException(status_code=404, detail="Room not found.")

    success = db.reject_room_member(room_id, student_id)
    if not success:
        raise HTTPException(status_code=404, detail="No pending request found.")
    return {"message": "Student rejected."}

@app.delete("/api/rooms/{room_id}/members/{student_id}")
async def remove_member(room_id: int, student_id: int, teacher_id: int = Depends(auth.get_current_teacher_id)):
    room = db.get_room_by_id(room_id)
    if not room or room["teacher_id"] != teacher_id:
        raise HTTPException(status_code=404, detail="Room not found.")

    success = db.remove_room_member(room_id, student_id)
    if not success:
        raise HTTPException(status_code=404, detail="Student not found in this room.")
    return {"message": "Student removed from room."}

@app.get("/api/rooms/{room_id}/essays/{essay_id}")
async def get_room_essay(room_id: int, essay_id: int, teacher_id: int = Depends(auth.get_current_teacher_id)):
    room = db.get_room_by_id(room_id)
    if not room or room["teacher_id"] != teacher_id:
        raise HTTPException(status_code=404, detail="Room not found.")

    essay = db.get_room_essay_by_id(essay_id)
    if not essay or essay["room_id"] != room_id:
        raise HTTPException(status_code=404, detail="Essay not found.")
    return essay

@app.post("/api/rooms/{room_id}/essays/{essay_id}/review")
async def review_essay(room_id: int, essay_id: int, body: TeacherReview, teacher_id: int = Depends(auth.get_current_teacher_id)):
    room = db.get_room_by_id(room_id)
    if not room or room["teacher_id"] != teacher_id:
        raise HTTPException(status_code=404, detail="Room not found.")

    essay = db.get_room_essay_by_id(essay_id)
    if not essay or essay["room_id"] != room_id:
        raise HTTPException(status_code=404, detail="Essay not found.")

    success = db.save_teacher_review(
        essay_id=essay_id,
        review=body.review,
        grammar=body.grammar,
        coherence=body.coherence,
        argument=body.argument,
        overall=body.overall
    )
    if not success:
        raise HTTPException(status_code=500, detail="Failed to save review.")
    return {"message": "Review submitted successfully."}

@app.post("/api/rooms/{room_id}/essays/{essay_id}/ai-review")
async def ai_review_essay(room_id: int, essay_id: int, config: EvalConfig, teacher_id: int = Depends(auth.get_current_teacher_id)):
    """Run AI evaluation on a room essay (uses the same AI engine as the main evaluate)."""
    room = db.get_room_by_id(room_id)
    if not room or room["teacher_id"] != teacher_id:
        raise HTTPException(status_code=404, detail="Room not found.")

    essay = db.get_room_essay_by_id(essay_id)
    if not essay or essay["room_id"] != room_id:
        raise HTTPException(status_code=404, detail="Essay not found.")

    # Run AI evaluation
    result = ai.get_ai_evaluation(essay["title"], essay["content"], "Academic", config.min_words, config.style)

    # Save AI scores
    db.save_ai_review(
        essay_id=essay_id,
        feedback=result.get("feedback", ""),
        grammar=result.get("grammar", 0),
        coherence=result.get("coherence", 0),
        argument=result.get("argumentation", 0),
        overall=result.get("overall", 0)
    )

    return {"message": "AI review completed.", "ai_scores": result}

@app.post("/api/rooms/{room_id}/essays/{essay_id}/hf-review")
async def hf_review_essay(room_id: int, essay_id: int, config: EvalConfig, teacher_id: int = Depends(auth.get_current_teacher_id)):
    """Run local HuggingFace transformer evaluation on a room essay."""
    room = db.get_room_by_id(room_id)
    if not room or room["teacher_id"] != teacher_id:
        raise HTTPException(status_code=404, detail="Room not found.")

    essay = db.get_room_essay_by_id(essay_id)
    if not essay or essay["room_id"] != room_id:
        raise HTTPException(status_code=404, detail="Essay not found.")

    # Run HuggingFace-only evaluation (transformer scores)
    try:
        hf_scores = ai.get_transformer_scores(essay["content"], config.min_words, config.style)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"HuggingFace evaluation failed: {str(e)}")

    grammar_score = hf_scores.get("grammar", 70)
    coherence_score = hf_scores.get("coherence", 70)
    argument_score = hf_scores.get("argument", 70)
    overall_score = hf_scores.get("overall", 70)
    feedback_text = hf_scores.get("feedback", "")
    feedback = f"{feedback_text}\n\nHuggingFace Transformer Evaluation:\n- Grammar: {grammar_score}/100\n- Coherence: {coherence_score}/100\n- Argumentation: {argument_score}/100\n- Overall: {overall_score}/100"

    db.save_ai_review(
        essay_id=essay_id,
        feedback=feedback,
        grammar=grammar_score,
        coherence=coherence_score,
        argument=argument_score,
        overall=overall_score
    )

    return {"message": "HuggingFace review completed.", "hf_scores": hf_scores, "overall": overall_score}

@app.delete("/api/rooms/{room_id}")
async def delete_room(room_id: int, teacher_id: int = Depends(auth.get_current_teacher_id)):
    """Teacher deletes an entire room."""
    success = db.delete_room(room_id, teacher_id)
    if not success:
        raise HTTPException(status_code=404, detail="Room not found or you don't have permission.")
    return {"message": "Room deleted successfully."}

@app.delete("/api/rooms/{room_id}/history")
async def clear_room_history(room_id: int, teacher_id: int = Depends(auth.get_current_teacher_id)):
    """Delete all archived essays for students who are no longer in the room."""
    room = db.get_room_by_id(room_id)
    if not room or room["teacher_id"] != teacher_id:
        raise HTTPException(status_code=404, detail="Room not found.")
    
    count = db.clear_room_history(room_id)
    return {"message": f"Cleared {count} archived essay(s) from history."}

# ──────────────────── Student Room Routes ────────────────────
@app.post("/api/student/rooms/join")
async def join_room(body: JoinRoom, student_id: int = Depends(auth.get_current_user_id)):
    room = db.get_room_by_code(body.room_code.strip().upper())
    if not room:
        raise HTTPException(status_code=404, detail="Invalid room code.")

    existing = db.is_room_member(room["id"], student_id)
    if existing:
        if existing["status"] == "pending":
            raise HTTPException(status_code=400, detail="Your join request is pending teacher approval.")
        raise HTTPException(status_code=400, detail="You are already a member of this room.")

    db.add_room_member(room["id"], student_id)  # status defaults to 'pending'
    return {"message": f"Join request sent for room '{room['name']}'. Waiting for teacher approval.", "room_id": room["id"]}

@app.get("/api/student/rooms")
async def student_list_rooms(student_id: int = Depends(auth.get_current_user_id)):
    return db.get_student_rooms(student_id)

@app.get("/api/student/rooms/{room_id}")
async def student_get_room(room_id: int, student_id: int = Depends(auth.get_current_user_id)):
    membership = db.is_room_member(room_id, student_id)
    if not membership:
        raise HTTPException(status_code=403, detail="You are not a member of this room.")
    if membership["status"] == "pending":
        room = db.get_room_by_id(room_id)
        return {**(room or {}), "status": "pending", "essays": []}
    room = db.get_room_by_id(room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found.")
    essays = db.get_student_room_essays(room_id, student_id)
    return {**room, "status": "approved", "essays": essays}

@app.delete("/api/student/rooms/{room_id}/leave")
async def student_leave_room(room_id: int, student_id: int = Depends(auth.get_current_user_id)):
    """Student leaves a room."""
    # Ensure they are actually a member first to provide accurate feedback
    if not db.is_room_member(room_id, student_id):
        raise HTTPException(status_code=404, detail="You are not a member of this room.")
    
    success = db.remove_room_member(room_id, student_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to leave room.")
    return {"message": "Left room successfully."}

@app.post("/api/student/rooms/{room_id}/essays")
async def student_submit_essay(room_id: int, body: RoomEssaySubmit, student_id: int = Depends(auth.get_current_user_id)):
    if not db.is_approved_member(room_id, student_id):
        raise HTTPException(status_code=403, detail="You must be approved to submit essays.")

    essay_id = db.submit_room_essay(room_id, student_id, body.title, body.content)
    return {"message": "Essay submitted.", "essay_id": essay_id}

@app.get("/api/student/rooms/{room_id}/essays/{essay_id}")
async def student_get_essay(room_id: int, essay_id: int, student_id: int = Depends(auth.get_current_user_id)):
    """Students can view the full details of their own essay, including any reviews."""
    if not db.is_room_member(room_id, student_id):
        raise HTTPException(status_code=403, detail="You are not a member of this room.")
    essay = db.get_room_essay_by_id(essay_id)
    if not essay or essay["room_id"] != room_id or essay["student_id"] != student_id:
        raise HTTPException(status_code=404, detail="Essay not found.")
    return essay

@app.delete("/api/student/rooms/{room_id}/essays/{essay_id}")
async def student_delete_essay(room_id: int, essay_id: int, student_id: int = Depends(auth.get_current_user_id)):
    """Students can delete their own essay."""
    # Note: Even if they left the room, they still wrote it, but let's check membership to be safe
    if not db.is_room_member(room_id, student_id):
        raise HTTPException(status_code=403, detail="You are not a member of this room.")
    
    success = db.delete_essay(essay_id, student_id)
    if not success:
        raise HTTPException(status_code=404, detail="Essay not found or could not be deleted.")
    return {"message": "Essay deleted successfully."}

@app.put("/api/student/rooms/{room_id}/essays/{essay_id}")
async def student_resubmit_essay(room_id: int, essay_id: int, body: RoomEssaySubmit, student_id: int = Depends(auth.get_current_user_id)):
    """Students can edit/resubmit their essay, which resets any reviews."""
    if not db.is_approved_member(room_id, student_id):
        raise HTTPException(status_code=403, detail="You must be approved to submit/edit essays.")
        
    success = db.resubmit_essay(essay_id, student_id, body.title, body.content)
    if not success:
        raise HTTPException(status_code=404, detail="Essay not found or could not be updated.")
    return {"message": "Essay updated successfully."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

