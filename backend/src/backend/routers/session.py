import uuid
import datetime
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from ..models.session import Session
from ..models.search import SearchRequest
from ..models.question import AgentGeneratedQuestion, Question
from ..database.chromadb_client import db_client
import httpx
import os
import json
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/sessions", tags=["sessions"])

AGENTS_BASE = os.getenv("AGENTS_BASE_URL")
if not AGENTS_BASE:
    raise ValueError("AGENTS_BASE_URL is not set")

async def stream_agent_pipeline(req: SearchRequest):
    questions = []
    
    async with httpx.AsyncClient(timeout=300.0) as client:
        async with client.stream(
            "POST", 
            f"{AGENTS_BASE}/agents/search", 
            json=req.model_dump(),
            headers={"Accept": "text/event-stream"}
        ) as response:
            if response.is_error:
                yield f"data: {json.dumps({'status': 'error', 'step': 'connection', 'message': 'Failed to connect to agents service'})}\n\n"
                return
            
            async for line in response.aiter_lines():
                if line:
                    yield f"{line}\n"
                    
                    if line.startswith("data: "):
                        try:
                            event_data = json.loads(line[6:])
                            if event_data.get("status") == "question":
                                question_dict = event_data.get("data")
                                if question_dict:
                                    questions.append(question_dict)
                        except json.JSONDecodeError:
                            pass
    
    question_list = []
    
    for question in questions:
        question_list.append(Question(
            id=str(uuid.uuid4()),
            question=AgentGeneratedQuestion(**question),
            is_completed=False,
            points=question.get("points", 1),
        ))

    session = Session(
        id=str(uuid.uuid4()),
        subject=req.subject,
        topics=req.topics,
        questions=[question.id for question in question_list],
        num_questions=len(question_list),
        num_questions_answered=0,
        status="in_progress",
        created_at=datetime.datetime.utcnow(),
        mode=req.mode,
    )
    
    db_client.add_session(session)
    db_client.add_questions_batch(question_list, session_id=session.id)
    
    if req.user_id:
        db_client.update_user_sessions(req.user_id, session.id)

    yield f"data: {json.dumps({'status': 'final', 'step': 'session', 'message': 'Session created', 'session_id': session.id})}\n\n"

@router.post("/create")
async def create_session(req: SearchRequest):
    return StreamingResponse(
        stream_agent_pipeline(req),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )

@router.get("/{session_id}")
async def get_session(session_id: str):
    session_data = db_client.get_session(session_id)
    if not session_data:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Session not found")
    return session_data

@router.get("/{session_id}/questions")
async def get_session_questions(session_id: str):
    questions = db_client.get_questions_by_session(session_id)
    if not questions:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="No questions found for this session")
    return {"questions": questions, "count": len(questions)}