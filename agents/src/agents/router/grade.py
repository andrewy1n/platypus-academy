from fastapi import HTTPException
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
import json

from agents.grading.free_response import FreeResponseGraderAgent
from agents.models.question import GradeRequest, GradeResponse

router = APIRouter(prefix="/agents", tags=["agents"])

async def stream_grade_execution(request: GradeRequest):
    """
    Stream the grading execution with real-time updates
    """
    try:
        grader = FreeResponseGraderAgent()
        
        yield f"data: {json.dumps({'status': 'started', 'step': 'grade', 'message': 'Free response grader: Starting to grade student answer...'})}\n\n"
        
        try:
            if request.question.data.type != "fr":
                yield f"data: {json.dumps({'status': 'error', 'step': 'grade', 'message': 'Question is not a free response question', 'error': 'Only free response questions can be graded with this endpoint'})}\n\n"
                return
            
            grade_result = None
            async for event in grader.grade_free_response(
                question=request.question.data,
                student_answer=request.student_answer
            ):
                if event['type'] == 'tool_call':
                    yield f"data: {json.dumps({'status': 'tool_call', 'step': 'grade', 'tool': event['tool'], 'args': event['args'], 'tool_id': event['id']})}\n\n"
                elif event['type'] == 'final_response':
                    grade_result = event['data']
                    yield f"data: {json.dumps({'status': 'completed', 'step': 'grade', 'message': 'Grading completed successfully', 'data': {'score': grade_result.score, 'max_points': request.question.data.points, 'explanation': grade_result.explanation}})}\n\n"
                    
                    grade_data = {
                        'score': grade_result.score,
                        'max_points': request.question.data.points,
                        'explanation': grade_result.explanation,
                        'question_id': request.question.id,
                        'question_text': request.question.text,
                        'student_answer': request.student_answer
                    }
                    yield f"data: {json.dumps({'status': 'completed', 'step': 'pipeline', 'message': 'Grading pipeline completed successfully', 'data': grade_data})}\n\n"
                elif event['type'] == 'error':
                    yield f"data: {json.dumps({'status': 'error', 'step': 'grade', 'message': 'Grading failed', 'error': event['message']})}\n\n"
                    return
                
        except Exception as e:
            yield f"data: {json.dumps({'status': 'error', 'step': 'grade', 'message': 'Grading step failed', 'error': str(e)})}\n\n"
            return
            
    except Exception as e:
        yield f"data: {json.dumps({'status': 'error', 'step': 'pipeline', 'message': 'Grading pipeline failed', 'error': str(e)})}\n\n"

@router.post("/grade")
async def grade_free_response(request: GradeRequest):
    """
    Grade a free response question using the free response grader agent
    """
    try:
        # Create streaming response
        return StreamingResponse(
            stream_grade_execution(request),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "*",
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start grading: {str(e)}")


