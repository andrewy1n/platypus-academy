from pydantic import BaseModel, EmailStr
from typing import List
from datetime import datetime

class User(BaseModel):
    id: str
    email: EmailStr
    password: str
    session_ids: List[str] = []
    created_at: datetime

