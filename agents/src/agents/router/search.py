from fastapi import HTTPException
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
import json
import asyncio

from agents.build_pipeline.wrappers import parse_step, search_step, validate_step
from agents.models.search import PipelineData, SearchRequest

router = APIRouter(prefix="/agents", tags=["agents"])

async def stream_pipeline_execution(request: SearchRequest):
    """
    Stream the pipeline execution with real-time updates
    """
    try:
        data = PipelineData(search_request=request)
        
        # Step 1: Search
        yield f"data: {json.dumps({'status': 'started', 'step': 'search', 'message': 'Search agent: Starting search for relevant URLs...'})}\n\n"
        await asyncio.sleep(0)
        
        try:
            async for event in search_step(data):
                print(f"[stream_pipeline_execution] Received event: {event['type']}")
                if event['type'] == 'tool_call':
                    print(f"[stream_pipeline_execution] Yielding tool_call")
                    yield f"data: {json.dumps({'status': 'tool_call', 'step': 'search', 'tool': event['tool'], 'args': event['args'], 'tool_id': event['id']})}\n\n"
                    await asyncio.sleep(0)
                elif event['type'] == 'progress':
                    print(f"[stream_pipeline_execution] Yielding progress: {event['message']}")
                    yield f"data: {json.dumps({'status': 'progress', 'step': 'search', 'message': event['message']})}\n\n"
                    await asyncio.sleep(0)
                elif event['type'] == 'complete':
                    print(f"[stream_pipeline_execution] Received complete")
                    data = event['data']
                    if data.current_step == "search_completed":
                        yield f"data: {json.dumps({'status': 'completed', 'step': 'search', 'message': f'Found {len(data.search_results)} URLs', 'data': {'url_count': len(data.search_results)}})}\n\n"
                        await asyncio.sleep(0)
                    else:
                        yield f"data: {json.dumps({'status': 'error', 'step': 'search', 'message': 'Search failed', 'error': data.error_message})}\n\n"
                        await asyncio.sleep(0)
                        return
        except Exception as e:
            yield f"data: {json.dumps({'status': 'error', 'step': 'search', 'message': 'Search step failed', 'error': str(e)})}\n\n"
            return
        
        # Step 2: parse
        yield f"data: {json.dumps({'status': 'started', 'step': 'parse', 'message': 'Parser agent: Starting to parse URLs for questions...'})}\n\n"
        await asyncio.sleep(0)
        
        try:
            async for event in parse_step(data):
                if event['type'] == 'progress':
                    yield f"data: {json.dumps({'status': 'progress', 'step': 'parse', 'message': event['message'], 'current': event['current'], 'total': event['total']})}\n\n"
                    await asyncio.sleep(0)
                elif event['type'] == 'complete':
                    data = event['data']
                    if data.current_step == "parse_completed":
                        yield f"data: {json.dumps({'status': 'completed', 'step': 'parse', 'message': f'Generated {len(data.parsed_results)} question sets', 'data': {'question_sets': len(data.parsed_results)}})}\n\n"
                        await asyncio.sleep(0)
                    else:
                        yield f"data: {json.dumps({'status': 'error', 'step': 'parse', 'message': 'Parsing failed', 'error': data.error_message})}\n\n"
                        await asyncio.sleep(0)
                        return
        except Exception as e:
            yield f"data: {json.dumps({'status': 'error', 'step': 'parse', 'message': 'Parse step failed', 'error': str(e)})}\n\n"
            return
        
        # Step 3: Validate
        yield f"data: {json.dumps({'status': 'started', 'step': 'validate', 'message': 'Starting to validate questions...'})}\n\n"
        await asyncio.sleep(0)
        
        try:
            data = validate_step(data)
            if data.current_step == "validate_completed":
                validated_questions = data.validated_questions
                await asyncio.sleep(0)
                
                for i, question in enumerate(validated_questions.questions, 1):
                    question_data = question.model_dump()
                    yield f"data: {json.dumps({'status': 'question', 'step': 'validate', 'message': f'Question {i}/{len(validated_questions.questions)}', 'data': question_data})}\n\n"
                    await asyncio.sleep(0)
                
                await asyncio.sleep(0)
            else:
                yield f"data: {json.dumps({'status': 'error', 'step': 'validate', 'message': 'Validation failed', 'error': data.error_message})}\n\n"
                await asyncio.sleep(0)
                return
        except Exception as e:
            yield f"data: {json.dumps({'status': 'error', 'step': 'validate', 'message': 'Validate step failed', 'error': str(e)})}\n\n"
            return
            
    except Exception as e:
        yield f"data: {json.dumps({'status': 'error', 'step': 'pipeline', 'message': 'Pipeline failed', 'error': str(e)})}\n\n"

@router.post("/search")
async def search_questions(request: SearchRequest):
    """
    Start a new question search pipeline
    """
    try:
        # Create streaming response
        return StreamingResponse(
            stream_pipeline_execution(request),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "*",
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start pipeline: {str(e)}")

