from typing import List, Literal, Optional, Tuple
from pydantic import BaseModel, Field, HttpUrl

from agents.models.question import QuestionList


class SearchRequest(BaseModel):
    subject: str                    
    topic: str                      
    num_questions_range: Tuple[int, int]
    mode: Literal["practice", "test"]
    special_requests: Optional[str] = None

class SearchResult(BaseModel):
    url: HttpUrl
    title: str
    snippet: str

class SearchResults(BaseModel):
    search_results: list[SearchResult]

class PipelineResponse(BaseModel):
    status: str
    step: str
    message: str
    data: Optional[dict] = None
    error: Optional[str] = None

class PipelineData(BaseModel):
    search_request: SearchRequest
    search_results: List[SearchResult] = Field(default_factory=list, description="URLs found by search agent")
    parsed_results: List[str] = Field(default_factory=list, description="Raw question data from parse agent")
    validated_questions: Optional[QuestionList] = Field(default=None, description="Final validated questions")
    current_step: str = Field(default="", description="Current pipeline step")
    error_message: str = Field(default="", description="Error message if any")