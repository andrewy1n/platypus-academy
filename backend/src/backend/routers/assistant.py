import uuid
import datetime
import json
import httpx
import os
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from ..database.chromadb_client import db_client
from ..models.assistant import AssistantRequest, AssistantMessage, AssistantConversation
from dotenv import load_dotenv

load_dotenv()

AGENTS_BASE = os.getenv("AGENTS_BASE_URL")
if not AGENTS_BASE:
    raise ValueError("AGENTS_BASE_URL is not set")

router = APIRouter(prefix="/assistant", tags=["assistant"])

async def stream_assistant_execution(request: AssistantRequest, conversation_id: str = None):
    try:
        yield f"data: {json.dumps({'status': 'started', 'step': 'assistant', 'message': 'Assistant: Starting to process your question...'})}\n\n"
        
        try:
            async with httpx.AsyncClient(timeout=300.0) as client:
                async with client.stream(
                    "POST", 
                    f"{AGENTS_BASE}/agents/assistant", 
                    json=request.model_dump(),
                    headers={"Accept": "text/event-stream"}
                ) as response:
                    if response.is_error:
                        yield f"data: {json.dumps({'status': 'error', 'step': 'connection', 'message': 'Failed to connect to agents service'})}\n\n"
                        return
                    
                    assistant_response = ""
                    async for line in response.aiter_lines():
                        if line:
                            yield f"{line}\n"
                            
                            if line.startswith("data: "):
                                try:
                                    event_data = json.loads(line[6:])
                                    if event_data.get("status") == "assistant_response":
                                        assistant_response = event_data.get("data", "")
                                except json.JSONDecodeError:
                                    pass
                    
                    # Save the conversation to history
                    if assistant_response and conversation_id:
                        # Get existing conversation or create new one
                        conversation_data = db_client.get_assistant_conversation(conversation_id)
                        if conversation_data:
                            # Update existing conversation
                            conversation = AssistantConversation(**conversation_data)
                            conversation.messages.append(AssistantMessage(
                                role="user",
                                content=request.user_question,
                                timestamp=datetime.datetime.utcnow()
                            ))
                            conversation.messages.append(AssistantMessage(
                                role="assistant",
                                content=assistant_response,
                                timestamp=datetime.datetime.utcnow()
                            ))
                            conversation.updated_at = datetime.datetime.utcnow()
                            db_client.update_assistant_conversation(conversation_id, conversation)
                        else:
                            # Create new conversation
                            conversation = AssistantConversation(
                                id=conversation_id,
                                user_id=request.user_id,
                                question_id=request.question_id,
                                session_id=request.session_id,
                                messages=[
                                    AssistantMessage(
                                        role="user",
                                        content=request.user_question,
                                        timestamp=datetime.datetime.utcnow()
                                    ),
                                    AssistantMessage(
                                        role="assistant",
                                        content=assistant_response,
                                        timestamp=datetime.datetime.utcnow()
                                    )
                                ],
                                created_at=datetime.datetime.utcnow(),
                                updated_at=datetime.datetime.utcnow()
                            )
                            db_client.add_assistant_conversation(conversation)
                        
                        yield f"data: {json.dumps({'status': 'final', 'step': 'assistant', 'message': 'Assistant response completed', 'conversation_id': conversation_id})}\n\n"
                    else:
                        yield f"data: {json.dumps({'status': 'final', 'step': 'assistant', 'message': 'Assistant response completed'})}\n\n"
                            
        except Exception as e:
            yield f"data: {json.dumps({'status': 'error', 'step': 'assistant', 'message': 'Assistant step failed', 'error': str(e)})}\n\n"
            return
            
    except Exception as e:
        yield f"data: {json.dumps({'status': 'error', 'step': 'pipeline', 'message': 'Assistant pipeline failed', 'error': str(e)})}\n\n"


@router.post("/")
async def assistant(request: AssistantRequest):
    # If question_id is provided, fetch and include question data
    if request.question_id:
        question_data = db_client.get_question(request.question_id)
        if question_data:
            request.question_data = question_data
    
    # If session_id is provided, fetch and include session data with questions
    if request.session_id:
        session_data = db_client.get_session(request.session_id)
        if session_data:
            questions = db_client.get_questions_by_session(request.session_id)
            request.session_data = {
                **session_data,
                "questions": questions
            }
    
    conversation_id = str(uuid.uuid4())
    return StreamingResponse(
        stream_assistant_execution(request, conversation_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
        }
    )


@router.get("/{conversation_id}")
async def get_conversation_messages(conversation_id: str):
    conversation_data = db_client.get_assistant_conversation(conversation_id)
    if not conversation_data:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    return {
        "conversation_id": conversation_id,
        "messages": conversation_data.get("messages", []),
        "created_at": conversation_data.get("created_at"),
        "updated_at": conversation_data.get("updated_at"),
        "user_id": conversation_data.get("user_id"),
        "question_id": conversation_data.get("question_id"),
        "session_id": conversation_data.get("session_id")
    }