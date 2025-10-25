from fastapi import FastAPI
from backend.routers.session import router as session_router
from backend.routers.question import router as question_router
from backend.routers.grade import router as grade_router
from backend.routers.user import router as user_router

app = FastAPI(title="Platypus API Service", version="0.1.0")

app.include_router(session_router)
app.include_router(question_router)
app.include_router(grade_router)
app.include_router(user_router)