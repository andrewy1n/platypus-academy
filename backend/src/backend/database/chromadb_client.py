import chromadb
from chromadb.config import Settings
import json
from typing import List, Optional, Dict, Any
from ..models.session import Session
from ..models.question import Question
from ..models.user import User

class ChromaDBClient:
    def __init__(self, persist_directory: str = "./chroma_db"):
        self.client = chromadb.PersistentClient(
            path=persist_directory,
            settings=Settings(
                anonymized_telemetry=False,
                allow_reset=True
            )
        )
        
        self.users_collection = self.client.get_or_create_collection(
            name="users",
            metadata={"description": "Store user data"}
        )
        
        self.sessions_collection = self.client.get_or_create_collection(
            name="sessions",
            metadata={"description": "Store session data"}
        )
        
        self.questions_collection = self.client.get_or_create_collection(
            name="questions",
            metadata={"description": "Store question data"}
        )

    def add_user(self, user: User) -> None:
        user_dict = user.model_dump()
        user_dict['created_at'] = user_dict['created_at'].isoformat()
        
        self.users_collection.add(
            ids=[user.id],
            documents=[json.dumps(user_dict)],
            metadatas=[{
                "email": user.email,
                "created_at": user_dict['created_at']
            }]
        )

    def get_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        result = self.users_collection.get(
            ids=[user_id],
            include=["documents", "metadatas"]
        )
        
        if result["ids"]:
            return json.loads(result["documents"][0])
        return None

    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        result = self.users_collection.get(
            where={"email": email},
            include=["documents", "metadatas"]
        )
        
        if result["ids"]:
            return json.loads(result["documents"][0])
        return None

    def update_user_sessions(self, user_id: str, session_id: str) -> None:
        user_data = self.get_user(user_id)
        if user_data:
            if session_id not in user_data["session_ids"]:
                user_data["session_ids"].append(session_id)
            
            self.users_collection.update(
                ids=[user_id],
                documents=[json.dumps(user_data)],
                metadatas=[{
                    "email": user_data["email"],
                    "created_at": user_data["created_at"]
                }]
            )

    def get_user_sessions(self, user_id: str) -> List[str]:
        user_data = self.get_user(user_id)
        if user_data:
            return user_data.get("session_ids", [])
        return []

    def add_session(self, session: Session) -> None:
        session_dict = session.model_dump()
        session_dict['created_at'] = session_dict['created_at'].isoformat()
        
        self.sessions_collection.add(
            ids=[session.id],
            documents=[json.dumps(session_dict)],
            metadatas=[{
                "status": session.status,
                "mode": session.mode,
                "num_questions": session.num_questions,
                "created_at": session_dict['created_at']
            }]
        )

    def add_question(self, question: Question, session_id: Optional[str] = None) -> None:
        question_dict = question.model_dump()
        
        metadata = {
            "subject": question.question.subject,
            "topic": question.question.topic,
            "difficulty": question.question.difficulty,
            "is_completed": question.is_completed,
            "points": question.points,
        }
        
        if session_id:
            metadata["session_id"] = session_id
        
        self.questions_collection.add(
            ids=[question.id],
            documents=[json.dumps(question_dict)],
            metadatas=[metadata]
        )

    def add_questions_batch(self, questions: List[Question], session_id: Optional[str] = None) -> None:
        if not questions:
            return
            
        ids = []
        documents = []
        metadatas = []
        
        for question in questions:
            question_dict = question.model_dump()
            
            metadata = {
                "subject": question.question.subject,
                "topic": question.question.topic,
                "difficulty": question.question.difficulty,
                "is_completed": question.is_completed,
                "points": question.points,
            }
            
            if session_id:
                metadata["session_id"] = session_id
            
            ids.append(question.id)
            documents.append(json.dumps(question_dict))
            metadatas.append(metadata)
        
        self.questions_collection.add(
            ids=ids,
            documents=documents,
            metadatas=metadatas
        )

    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        result = self.sessions_collection.get(
            ids=[session_id],
            include=["documents", "metadatas"]
        )
        
        if result["ids"]:
            return json.loads(result["documents"][0])
        return None

    def get_question(self, question_id: str) -> Optional[Dict[str, Any]]:
        result = self.questions_collection.get(
            ids=[question_id],
            include=["documents", "metadatas"]
        )
        
        if result["ids"]:
            return json.loads(result["documents"][0])
        return None

    def get_questions_by_session(self, session_id: str) -> List[Dict[str, Any]]:
        result = self.questions_collection.get(
            where={"session_id": session_id},
            include=["documents", "metadatas"]
        )
        
        return [json.loads(doc) for doc in result["documents"]]

    def query_questions(
        self, 
        subject: Optional[str] = None,
        difficulty: Optional[str] = None,
        topic: Optional[str] = None,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        where_filter = {}
        
        if subject:
            where_filter["subject"] = subject
        if difficulty:
            where_filter["difficulty"] = difficulty
        if topic:
            where_filter["topic"] = topic
        
        result = self.questions_collection.get(
            where=where_filter if where_filter else None,
            limit=limit,
            include=["documents", "metadatas"]
        )
        
        return [json.loads(doc) for doc in result["documents"]]

    def update_session_status(self, session_id: str, status: str, score: Optional[float] = None) -> None:
        session_data = self.get_session(session_id)
        if session_data:
            session_data["status"] = status
            if score is not None:
                session_data["score"] = score
            
            self.sessions_collection.update(
                ids=[session_id],
                documents=[json.dumps(session_data)],
                metadatas=[{
                    "status": status,
                    "mode": session_data["mode"],
                    "num_questions": session_data["num_questions"],
                    "created_at": session_data["created_at"]
                }]
            )

    def update_question_completion(self, question_id: str, is_completed: bool, points_earned: int) -> None:
        question_data = self.get_question(question_id)
        if question_data:
            question_data["is_completed"] = is_completed
            question_data["points_earned"] = points_earned
            
            self.questions_collection.update(
                ids=[question_id],
                documents=[json.dumps(question_data)],
                metadatas=[{
                    "subject": question_data["question"]["subject"],
                    "topic": question_data["question"]["topic"],
                    "difficulty": question_data["question"]["difficulty"],
                    "is_completed": is_completed,
                    "points": question_data["points"],
                }]
            )

    def update_question_answer(self, question_id: str, student_answer: str) -> None:
        question_data = self.get_question(question_id)
        if question_data:
            question_data["student_answer"] = student_answer
            
            self.questions_collection.update(
                ids=[question_id],
                documents=[json.dumps(question_data)],
                metadatas=[{
                    "subject": question_data["question"]["subject"],
                    "topic": question_data["question"]["topic"],
                    "difficulty": question_data["question"]["difficulty"],
                    "is_completed": question_data.get("is_completed", False),
                    "points": question_data["points"],
                }]
            )

    def update_question(self, question_id: str, question_data: dict) -> None:
        self.questions_collection.update(
            ids=[question_id],
            documents=[json.dumps(question_data)],
            metadatas=[{
                "subject": question_data["question"]["subject"],
                "topic": question_data["question"]["topic"],
                "difficulty": question_data["question"]["difficulty"],
                "is_completed": question_data.get("is_completed", False),
                "points": question_data["points"],
            }]
        )

db_client = ChromaDBClient()

