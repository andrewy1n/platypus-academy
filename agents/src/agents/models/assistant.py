from typing import Optional
from pydantic import BaseModel

class AssistantRequest(BaseModel):
    query: str
    thread_id: str

class AssistantResponse(BaseModel):
    status: str
    step: str
    message: str
    data: Optional[dict] = None
    error: Optional[str] = None
