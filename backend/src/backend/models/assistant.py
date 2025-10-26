from pydantic import BaseModel
from typing import List, Optional, Literal
from datetime import datetime

class AssistantMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str
    timestamp: datetime

class AssistantRequest(BaseModel):
    question_id: Optional[str] = None
    session_id: Optional[str] = None
    user_question: str
    user_id: Optional[str] = None
    question_data: Optional[dict] = None
    session_data: Optional[dict] = None

class AssistantResponse(BaseModel):
    message: str
    conversation_id: Optional[str] = None

class AssistantConversation(BaseModel):
    id: str
    user_id: Optional[str] = None
    question_id: Optional[str] = None
    session_id: Optional[str] = None
    messages: List[AssistantMessage]
    created_at: datetime
    updated_at: datetime
