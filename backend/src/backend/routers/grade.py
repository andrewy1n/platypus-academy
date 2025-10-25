from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from ..database.chromadb_client import db_client
from ..services.auto_grader import AutoGrader
from ..models.question import AutoGradeRequest, AutoGradeResponse, GradeRequest, GradeResponse, TestResult
import httpx
import os
import json
from dotenv import load_dotenv

load_dotenv()

AGENTS_BASE = os.getenv("AGENTS_BASE_URL")
if not AGENTS_BASE:
    raise ValueError("AGENTS_BASE_URL is not set")

router = APIRouter(prefix="/grade", tags=["grade"])

async def grade_free_response_question(question_data: dict, student_answer: str) -> dict:
    """
    Grade a single free response question using the agent grader
    Returns a dict with grading results
    """
    try:
        # Create a GradeRequest for the agent grader
        from ..models.question import AgentGeneratedQuestion
        
        # Reconstruct the question object
        question_obj = AgentGeneratedQuestion(**question_data)
        
        request = GradeRequest(
            question=question_obj,
            student_answer=student_answer
        )
        
        async with httpx.AsyncClient(timeout=300.0) as client:
            response = await client.post(
                f"{AGENTS_BASE}/agents/grade",
                json=request.model_dump(),
                headers={"Accept": "application/json"}
            )
            
            if response.is_error:
                return {
                    "success": False,
                    "error": "Failed to connect to agents service",
                    "points_earned": 0,
                    "explanation": "Failed to grade free response question"
                }
            
            # Parse the response
            result = response.json()
            
            # Extract grading information from the response
            if "data" in result and "grade" in result["data"]:
                grade_info = result["data"]["grade"]
                return {
                    "success": True,
                    "points_earned": grade_info.get("score", 0),
                    "explanation": grade_info.get("explanation", "Free response graded"),
                    "is_correct": grade_info.get("score", 0) > 0
                }
            else:
                return {
                    "success": False,
                    "error": "Invalid response from agent grader",
                    "points_earned": 0,
                    "explanation": "Failed to parse grading response"
                }
                
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "points_earned": 0,
            "explanation": f"Error grading free response: {str(e)}"
        }

async def stream_grade_execution(request: GradeRequest):
    """
    Stream the grading execution with real-time updates
    """
    try:
        yield f"data: {json.dumps({'status': 'started', 'step': 'grade', 'message': 'Free response grader: Starting to grade student answer...'})}\n\n"
        
        try:
            if request.question.data.type != "fr":
                yield f"data: {json.dumps({'status': 'error', 'step': 'grade', 'message': 'Question is not a free response question', 'error': 'Only free response questions can be graded with this endpoint'})}\n\n"
                return
            
            async with httpx.AsyncClient(timeout=300.0) as client:
                async with client.stream(
                    "POST", 
                    f"{AGENTS_BASE}/agents/grade", 
                    json=request.model_dump(),
                    headers={"Accept": "text/event-stream"}
                ) as response:
                    if response.is_error:
                        yield f"data: {json.dumps({'status': 'error', 'step': 'connection', 'message': 'Failed to connect to agents service'})}\n\n"
                        return
                    
                    async for line in response.aiter_lines():
                        if line:
                            yield f"{line}\n"
                            
        except Exception as e:
            yield f"data: {json.dumps({'status': 'error', 'step': 'grade', 'message': 'Grading step failed', 'error': str(e)})}\n\n"
            return
            
    except Exception as e:
        yield f"data: {json.dumps({'status': 'error', 'step': 'pipeline', 'message': 'Grading pipeline failed', 'error': str(e)})}\n\n"

@router.post("/session/{session_id}", response_model=TestResult)
async def grade_session(session_id: str):
    """
    Grade all questions in a session and return a TestResult
    """
    # Get session data
    session_data = db_client.get_session(session_id)
    if not session_data:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Get all questions for this session
    questions = db_client.get_questions_by_session(session_id)
    if not questions:
        raise HTTPException(status_code=404, detail="No questions found for this session")
    
    total_points = 0
    points_earned = 0
    graded_questions = []
    
    # Process each question
    for question_data in questions:
        question_type = question_data["question"]["data"]["type"]
        question_points = question_data.get("points", 1)
        total_points += question_points
        
        # Check if student has answered
        student_answer = question_data.get("student_answer")
        if not student_answer:
            # No answer provided, 0 points
            points_earned += 0
            graded_questions.append({
                "question_id": question_data["id"],
                "type": question_type,
                "points": question_points,
                "points_earned": 0,
                "is_correct": False,
                "explanation": "No answer provided"
            })
            continue
        
        # Grade based on question type
        if question_type == "fr":
            # Free response questions use agent grader
            fr_result = await grade_free_response_question(
                question_data["question"]["data"], 
                student_answer
            )
            
            # Calculate points earned for this question
            question_points_earned = int(fr_result["points_earned"] * question_points)
            points_earned += question_points_earned
            
            # Update question completion in database
            db_client.update_question_completion(
                question_data["id"], 
                True, 
                question_points_earned
            )
            
            graded_questions.append({
                "question_id": question_data["id"],
                "type": question_type,
                "points": question_points,
                "points_earned": question_points_earned,
                "is_correct": fr_result["is_correct"],
                "explanation": fr_result["explanation"]
            })
        else:
            # Auto-grade other question types
            grade_result = AutoGrader.grade_question(
                question_data["question"]["data"], 
                student_answer
            )
            
            # Calculate points earned for this question
            question_points_earned = int(grade_result.points_earned * question_points)
            points_earned += question_points_earned
            
            # Update question completion in database
            db_client.update_question_completion(
                question_data["id"], 
                True, 
                question_points_earned
            )
            
            graded_questions.append({
                "question_id": question_data["id"],
                "type": question_type,
                "points": question_points,
                "points_earned": question_points_earned,
                "is_correct": grade_result.is_correct,
                "explanation": grade_result.explanation
            })
    
    
    # Calculate percentage
    percentage = (points_earned / total_points * 100) if total_points > 0 else 0
    
    # Generate summary and improvements
    correct_count = sum(1 for q in graded_questions if q["is_correct"])
    total_questions = len(graded_questions)
    
    summary = f"Completed {total_questions} questions with {correct_count} correct answers. "
    summary += f"Scored {points_earned}/{total_points} points ({percentage:.1f}%)."
    
    # Generate improvement suggestions
    improvements = []
    if percentage < 70:
        improvements.append("Review fundamental concepts and practice more problems")
    if percentage < 50:
        improvements.append("Consider seeking additional help or tutoring")
    
    # Analyze by question type
    type_performance = {}
    for q in graded_questions:
        q_type = q["type"]
        if q_type not in type_performance:
            type_performance[q_type] = {"correct": 0, "total": 0}
        type_performance[q_type]["total"] += 1
        if q["is_correct"]:
            type_performance[q_type]["correct"] += 1
    
    for q_type, stats in type_performance.items():
        if stats["total"] > 0:
            type_percentage = (stats["correct"] / stats["total"]) * 100
            if type_percentage < 60:
                improvements.append(f"Focus on improving {q_type} questions (scored {type_percentage:.1f}%)")
    
    # Update session with final score
    db_client.update_session_status(session_id, "completed", percentage)
    
    return TestResult(
        percentage=percentage,
        total_points=total_points,
        points_earned=points_earned,
        summary=summary,
        improvements=improvements
    )

@router.post("/question/{question_id}", response_model=AutoGradeResponse)
async def grade_question(question_id: str):
    question_data = db_client.get_question(question_id)
    if not question_data:
        raise HTTPException(status_code=404, detail="Question not found")
    
    # Check if it's a free response question
    if question_data["question"]["data"]["type"] == "fr":
        raise HTTPException(
            status_code=400, 
            detail="Free response questions should use /grade/free-response endpoint"
        )

    # Check if student_answer exists
    student_answer = question_data.get("student_answer")
    if student_answer is None:
        raise HTTPException(
            status_code=400, 
            detail="No student answer provided for this question"
        )

    # Grade the question
    grade_result = AutoGrader.grade_question(question_data["question"]["data"], student_answer)
    
    # Update question completion status in database
    points_earned = int(grade_result.points_earned * question_data["points"])
    db_client.update_question_completion(
        question_id, 
        True, 
        points_earned
    )
    
    return grade_result

@router.post("/free-response")
async def grade_free_response(request: GradeRequest):
    try:
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