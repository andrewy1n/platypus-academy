from __future__ import annotations
from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field, field_validator, model_validator
from datetime import datetime
from urllib.parse import urlparse
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from agents.router.search import router as search_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(search_router)


# class GradeReq(BaseModel):
#     question: Question
#     user_input: Dict[str, Any]       # shape depends on question.type

# class GradeResp(BaseModel):
#     score: float
#     is_correct: bool
#     feedback: str
    

@app.get("/health")
def health():
    return {"ok": True}
   


# #grades one question based on the request
# @app.post("/agents/grade", response_model=GradeResp)
# def grade(req: GradeReq):
#     q = req.question
#     a = q.answer_json
#     u = req.user_input

#     score = 0.0
#     is_correct = False
#     feedback = "Answer not recognized."

#     if q.type == "mcq":
#         correct = a.get("correct")
#         is_correct = u.get("choice") == correct
#         score = 1.0 if is_correct else 0.0
#         feedback = "Correct!" if is_correct else f"Wrong — correct is {correct}."
#     elif q.type == "tf":
#         is_correct = u.get("value") == a.get("value")
#         score = 1.0 if is_correct else 0.0
#         feedback = "Correct!" if is_correct else "Incorrect."
#     elif q.type == "numeric":
#         val, correct = u.get("value"), a.get("value")
#         tol = a.get("tolerance", 0)
#         if val is not None and correct is not None and abs(val - correct) <= tol:
#             is_correct = True
#             score = 1.0
#             feedback = "Within tolerance!"
#         else:
#             feedback = f"Expected ~{correct} ± {tol}"
#     elif q.type == "fib":
#         is_correct = u.get("value","").strip().lower() == a.get("value","").strip().lower()
#         score = 1.0 if is_correct else 0.0
#         feedback = "Correct!" if is_correct else f"Answer: {a.get('value')}"
#     elif q.type == "fr":
#         feedback = "Free response grading not automated yet."
#         score = 0.5

#     return GradeResp(score=score, is_correct=is_correct, feedback=feedback)

    

# from claude_client import ask_claude

# class TutorReq(BaseModel):
#     question: Question
#     student_msg: Optional[str] = ""       # what the student typed
#     mode: Literal["hint","explain","context"] = "hint"

# class TutorResp(BaseModel):
#     reply: str
#     mode: Literal["hint","explain","context"]

# @app.post("/agents/tutor/assist", response_model=TutorResp)
# def tutor_assist(req: TutorReq):
#     q = req.question
#     msg = (req.student_msg or "").strip()

#     if req.mode == "context":
#         prompt = f"""
# You are a concise tutor. Explain the context of this problem in 2 sentences max:
# Problem: "{q.stem}"
# Avoid giving the final answer. Mention the key concept or formula involved.
# """
#         text = ask_claude(prompt, max_tokens=140)
#         return TutorResp(reply=text, mode="context")

#     if req.mode == "explain":
#         prompt = f"""
# Explain how to solve this problem step by step in 3–5 short sentences:
# Problem: "{q.stem}"
# Be concise, avoid extra theory, no fluff.
# """
#         text = ask_claude(prompt, max_tokens=260)
#         return TutorResp(reply=text, mode="explain")

#     # default: hint
#     prompt = f"""
# You are a supportive tutor. Provide ONE short hint (1–2 sentences) for the student.
# Problem: "{q.stem}"
# Student says: "{msg}"
# Do NOT reveal the final answer. Point to the next micro-step only.
# """
#     text = ask_claude(prompt, max_tokens=140)
#     return TutorResp(reply=text, mode="hint")


