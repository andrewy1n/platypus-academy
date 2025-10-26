from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routers.session import router as session_router
from backend.routers.question import router as question_router
from backend.routers.grade import router as grade_router
from backend.routers.user import router as user_router
from backend.routers.assistant import router as assistant_router

app = FastAPI(title="Platypus API Service", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(session_router)
app.include_router(question_router)
app.include_router(grade_router)
app.include_router(user_router)
app.include_router(assistant_router)