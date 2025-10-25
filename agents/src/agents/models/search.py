from typing import List, Literal, Optional, Tuple
from pydantic import BaseModel, Field

from agents.build_pipeline.search_agent import SearchResult
from agents.models.question import Question


class SearchRequest(BaseModel):
    subject: str                    
    topic: str                      
    num_questions_range: Tuple[int, int]
    mode: Literal["practice", "test"]

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
    validated_questions: Optional[List[Question]] = Field(default=None, description="Final validated questions")
    current_step: str = Field(default="", description="Current pipeline step")
    error_message: str = Field(default="", description="Error message if any")