from fastapi import APIRouter, HTTPException

from backend.models.question import StudentAnswer
from ..database.chromadb_client import db_client

router = APIRouter(prefix="/questions", tags=["questions"])

@router.get("/{question_id}")
async def get_question(question_id: str):
    question_data = db_client.get_question(question_id)
    if not question_data:
        raise HTTPException(status_code=404, detail="Question not found")
    return question_data

@router.post("/{question_id}/save-answer")
async def save_answer(question_id: str, answer: StudentAnswer):
    db_client.update_question_answer(question_id, answer.answer)
    return {"message": "Answer saved successfully"}