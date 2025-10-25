from datetime import datetime
from typing import Any, Dict, List, Literal, Optional, Tuple
from urllib.parse import urlparse
from pydantic import BaseModel, Field, model_validator

Subject = Literal["math", "chemistry", "physics", "biology", "computer science"]
Difficulty = Literal["easy","medium","hard"]

class MCQ(BaseModel):
    type: Literal["mcq"]
    choices: List[str]
    answer: str

class TF(BaseModel):
    type: Literal["tf"]
    answer: bool

class Numeric(BaseModel):
    type: Literal["numeric"]
    answer: float

class FIB(BaseModel):
    type: Literal["fib"]
    answer: str

class Matching(BaseModel):
    type: Literal["matching"]
    left: List[str]
    right: List[str]
    answer: List[Tuple]

class Ordering(BaseModel):
    type: Literal["ordering"]
    choices: List[str]
    answer: List[str]

class FR(BaseModel):
    type: Literal["fr"]
    answer: str
    points: int
    rubric: str

class Question(BaseModel):
    id: str = Field(description="Unique identifier for the question")
    data: MCQ | TF | Numeric | FIB | Matching | Ordering | FR
    text: str = Field(description="The question text")
    subject: Subject = Field(description="The subject of the question")
    topic: str = Field(description="The topic of the question")
    source_url: Optional[str] = Field(description="The URL of the source of the question")
    difficulty: Difficulty
    metadata: Dict[str, Any] = Field(default_factory=dict)
    image_url: Optional[str] = Field(description="The URL of the image of the question")
    
    # for ChromaDB metadata!
    # if source_url is provided, use it to fill metadata
    @model_validator(mode="after")
    def fill_metadata_defaults(self):
        md = dict(self.metadata)
        if self.source_url and "source_domain" not in md:
            md["source_domain"] = urlparse(self.source_url).netloc
        md.setdefault("type", self.type)
        md.setdefault("difficulty", self.difficulty)
        md.setdefault("subject", None)
        md.setdefault("topic", None)
        md.setdefault("language", "en")
        md.setdefault("audit_pass", None)
        md.setdefault("version", "v1")
        md.setdefault("created_at", datetime.utcnow().isoformat())
        self.metadata = md
        return self

class FRGrade(BaseModel):
    score: int
    explanation: str