from typing import List, Literal, Optional, Tuple
from pydantic import BaseModel, Field, HttpUrl

class SearchRequest(BaseModel):
    subject: str                    
    topics: List[str]                      
    num_questions_range: Tuple[int, int]
    mode: Literal["practice", "test"]
    special_instructions: Optional[str] = None
    user_id: Optional[str] = None

class SearchResult(BaseModel):
    url: HttpUrl
    title: str
    snippet: str