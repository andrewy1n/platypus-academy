from pydantic import BaseModel
from typing import List, Literal, Optional
from datetime import datetime
from ..models.question import Subject

class Session(BaseModel):
    id: str
    subject: Subject
    topic: str
    questions: List[str] # question ids
    num_questions: int
    num_questions_answered: int
    status: Literal["in_progress", "completed"]
    created_at: datetime
    mode: Literal["practice", "test"]
    score: Optional[float] = None
