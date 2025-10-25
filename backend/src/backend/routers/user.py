import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from typing import List
from ..models.user import User
from ..database.chromadb_client import db_client

router = APIRouter(prefix="/users", tags=["users"])

class CreateUserRequest(BaseModel):
    email: EmailStr
    password: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    session_ids: List[str]
    created_at: str

class LoginResponse(BaseModel):
    user_id: str
    email: str
    message: str

@router.post("/create", response_model=UserResponse)
async def create_user(req: CreateUserRequest):
    existing_user = db_client.get_user_by_email(req.email)
    if existing_user:
        raise HTTPException(status_code=400, detail="User with this email already exists")
    
    user = User(
        id=str(uuid.uuid4()),
        email=req.email,
        password=req.password,
        session_ids=[],
        created_at=datetime.utcnow()
    )
    
    db_client.add_user(user)
    
    return UserResponse(
        id=user.id,
        email=user.email,
        session_ids=user.session_ids,
        created_at=user.created_at.isoformat()
    )

@router.post("/login", response_model=LoginResponse)
async def login_user(req: LoginRequest):
    user_data = db_client.get_user_by_email(req.email)
    
    if not user_data:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if user_data["password"] != req.password:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    return LoginResponse(
        user_id=user_data["id"],
        email=user_data["email"],
        message="Login successful"
    )

@router.get("/{user_id}/sessions", response_model=List[str])
async def get_user_sessions(user_id: str):
    user_data = db_client.get_user(user_id)
    
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user_data.get("session_ids", [])

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: str):
    user_data = db_client.get_user(user_id)
    
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserResponse(
        id=user_data["id"],
        email=user_data["email"],
        session_ids=user_data.get("session_ids", []),
        created_at=user_data["created_at"]
    )

