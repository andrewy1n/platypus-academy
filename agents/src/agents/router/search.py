from fastapi import HTTPException
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
import json

from agents.build_pipeline.wrappers import parse_step, search_step, validate_step
from agents.models.search import PipelineData, SearchRequest

router = APIRouter(prefix="/agents", tags=["agents"])

async def stream_pipeline_execution(request: SearchRequest):
    """
    Stream the pipeline execution with real-time updates
    """
    try:
        # Initialize pipeline data
        data = PipelineData(**request)
        
        # Step 1: Search
        yield f"data: {json.dumps({'status': 'started', 'step': 'search', 'message': 'Search agent: Starting search for relevant URLs...'})}\n\n"
        
        try:
            data = search_step(data)
            if data.current_step == "search_completed":
                yield f"data: {json.dumps({'status': 'completed', 'step': 'search', 'message': f'Found {len(data.search_results)} URLs', 'data': {'url_count': len(data.search_results)}})}\n\n"
            else:
                yield f"data: {json.dumps({'status': 'error', 'step': 'search', 'message': 'Search failed', 'error': data.error_message})}\n\n"
                return
        except Exception as e:
            yield f"data: {json.dumps({'status': 'error', 'step': 'search', 'message': 'Search step failed', 'error': str(e)})}\n\n"
            return
        
        # Step 2: parse
        yield f"data: {json.dumps({'status': 'started', 'step': 'parse', 'message': 'Parser agent: Starting to parse URLs for questions...'})}\n\n"
        
        try:
            data = parse_step(data)
            if data.current_step == "parse_completed":
                yield f"data: {json.dumps({'status': 'completed', 'step': 'parse', 'message': f'Generated {len(data.parsed_results)} question sets', 'data': {'question_sets': len(data.parsed_results)}})}\n\n"
            else:
                yield f"data: {json.dumps({'status': 'error', 'step': 'parse', 'message': 'Scraping failed', 'error': data.error_message})}\n\n"
                return
        except Exception as e:
            yield f"data: {json.dumps({'status': 'error', 'step': 'parse', 'message': 'parse step failed', 'error': str(e)})}\n\n"
            return
        
        # Step 3: Validate
        yield f"data: {json.dumps({'status': 'started', 'step': 'validate', 'message': 'Starting to validate questions...'})}\n\n"
        
        try:
            data = validate_step(data)
            if data.current_step == "validate_completed":
                validated_questions = data.validated_questions
                yield f"data: {json.dumps({'status': 'completed', 'step': 'validate', 'message': f'Generated {len(validated_questions.questions)} validated questions', 'data': {'total_questions': validated_questions.total_count, 'valid_questions': validated_questions.valid_count, 'invalid_questions': validated_questions.invalid_count}})}\n\n"
                
                # Stream individual questions
                for i, question in enumerate(validated_questions.questions, 1):
                    question_data = {
                        'question_id': question.question_id,
                        'question_text': question.question_text,
                        'question_type': question.question_type,
                        'difficulty': question.difficulty,
                        'subject': question.subject,
                        'topic': question.topic,
                        'validation_status': question.validation_status,
                        'correct_answer': question.correct_answer,
                        'explanation': question.explanation,
                        'mathematical_verification': question.mathematical_verification,
                        'source_url': question.source_url
                    }
                    yield f"data: {json.dumps({'status': 'question', 'step': 'validate', 'message': f'Question {i}/{len(validated_questions.questions)}', 'data': question_data})}\n\n"
                
                # Final completion
                yield f"data: {json.dumps({'status': 'completed', 'step': 'pipeline', 'message': 'Pipeline completed successfully', 'data': {'total_questions': validated_questions.total_count, 'valid_questions': validated_questions.valid_count, 'success_rate': f'{(validated_questions.valid_count/validated_questions.total_count)*100:.1f}%'}})}\n\n"
            else:
                yield f"data: {json.dumps({'status': 'error', 'step': 'validate', 'message': 'Validation failed', 'error': data.error_message})}\n\n"
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

