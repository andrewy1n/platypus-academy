from fastapi import HTTPException
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
import json

from agents.assistant.agent import AssistantAgent
from agents.models.assistant import AssistantRequest

router = APIRouter(prefix="/agents", tags=["agents"])

async def stream_assistant_execution(request: AssistantRequest):
    try:
        assistant = AssistantAgent()
        
        yield f"data: {json.dumps({'status': 'started', 'step': 'assistant', 'message': 'Assistant agent: Starting to process your query...'})}\n\n"
        
        try:
            async for event in assistant.generate_response(request.query):
                if event['type'] == 'tool_call':
                    yield f"data: {json.dumps({'status': 'tool_call', 'step': 'assistant', 'tool': event['tool'], 'args': event['args'], 'tool_id': event['id']})}\n\n"
                elif event['type'] == 'final_response':
                    yield f"data: {json.dumps({'status': 'completed', 'step': 'assistant', 'message': 'Response generated successfully', 'data': event['content']})}\n\n"
                elif event['type'] == 'error':
                    yield f"data: {json.dumps({'status': 'error', 'step': 'assistant', 'message': 'Response generation failed', 'error': event['message']})}\n\n"
                    return
                
        except Exception as e:
            yield f"data: {json.dumps({'status': 'error', 'step': 'assistant', 'message': 'Assistant step failed', 'error': str(e)})}\n\n"
            return
            
    except Exception as e:
        yield f"data: {json.dumps({'status': 'error', 'step': 'assistant', 'message': 'Assistant failed', 'error': str(e)})}\n\n"

@router.post("/assistant")
async def get_assistant_response(request: AssistantRequest):
    try:
        return StreamingResponse(
            stream_assistant_execution(request),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "*",
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start assistant: {str(e)}")
