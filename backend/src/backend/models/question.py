from typing import Any, List, Literal, Optional, Tuple
from pydantic import BaseModel, Field

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

class ShortAnswer(BaseModel):
    type: Literal["short_answer"]
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

class AgentGeneratedQuestion(BaseModel):
    data: MCQ | TF | Numeric | FIB | ShortAnswer | Matching | Ordering | FR
    text: str = Field(description="The question text")
    subject: Subject = Field(description="The subject of the question")
    topic: str = Field(description="The topic of the question")
    source_url: Optional[str] = Field(description="The URL of the source of the question")
    difficulty: Difficulty
    image_url: Optional[str] = Field(description="The URL of the image of the question")

class AgentGeneratedQuestionList(BaseModel):
    questions: List[AgentGeneratedQuestion]

class Question(BaseModel):
    id: str
    question: AgentGeneratedQuestion
    student_answer: Optional[Any] = None
    is_completed: bool = False
    points: int = 1
    points_earned: Optional[int] = None

class FRGrade(BaseModel):
    score: int
    explanation: str

class GradeRequest(BaseModel):
    question: AgentGeneratedQuestion
    student_answer: str

class GradeResponse(BaseModel):
    status: str
    step: str
    message: str
    data: Optional[dict] = None
    error: Optional[str] = None

class AutoGradeRequest(BaseModel):
    question_id: str
    student_answer: str

class AutoGradeResponse(BaseModel):
    is_correct: bool
    points_earned: int
    max_points: int
    explanation: str
    correct_answer: str

class TestResult(BaseModel):
    percentage: float
    total_points: int
    points_earned: int
    summary: str
    improvements: List[str]