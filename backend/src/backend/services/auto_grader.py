import re
import difflib
from typing import Union, List, Tuple
from ..models.question import (
    MCQ, TF, Numeric, FIB, ShortAnswer, Matching, Ordering, FR,
    AutoGradeResponse
)

class AutoGrader:    
    @staticmethod
    def grade_mcq(question_data: dict, student_answer: str) -> AutoGradeResponse:
        is_correct = student_answer.strip().lower() == question_data["answer"].strip().lower()
        points_earned = 1 if is_correct else 0
        
        explanation = f"Correct answer: {question_data['answer']}"
        if not is_correct:
            explanation += f"\nYour answer: {student_answer}"
        
        return AutoGradeResponse(
            is_correct=is_correct,
            points_earned=points_earned,
            max_points=1,
            explanation=explanation,
            correct_answer=question_data["answer"]
        )
    
    @staticmethod
    def grade_tf(question_data: dict, student_answer: str) -> AutoGradeResponse:
        student_bool = AutoGrader._parse_boolean(student_answer)
        is_correct = student_bool == question_data["answer"]
        points_earned = 1 if is_correct else 0
        
        explanation = f"Correct answer: {question_data['answer']}"
        if not is_correct:
            explanation += f"\nYour answer: {student_answer}"
        
        return AutoGradeResponse(
            is_correct=is_correct,
            points_earned=points_earned,
            max_points=1,
            explanation=explanation,
            correct_answer=str(question_data["answer"])
        )
    
    @staticmethod
    def grade_numeric(question_data: dict, student_answer: str) -> AutoGradeResponse:
        try:
            student_num = float(student_answer.strip())
            correct_num = question_data["answer"]
            
            tolerance = abs(correct_num) * 0.01
            is_correct = abs(student_num - correct_num) <= tolerance
            
            points_earned = 1 if is_correct else 0
            
            explanation = f"Correct answer: {correct_num}"
            if not is_correct:
                explanation += f"\nYour answer: {student_num}"
                explanation += f"\nTolerance: ±{tolerance:.4f}"
            
            return AutoGradeResponse(
                is_correct=is_correct,
                points_earned=points_earned,
                max_points=1,
                explanation=explanation,
                correct_answer=str(correct_num)
            )
        except ValueError:
            return AutoGradeResponse(
                is_correct=False,
                points_earned=0,
                max_points=1,
                explanation=f"Invalid numeric format. Correct answer: {question_data['answer']}",
                correct_answer=str(question_data["answer"])
            )
    
    @staticmethod
    def grade_fib(question_data: dict, student_answer: str) -> AutoGradeResponse:
        correct_answer = question_data["answer"].strip().lower()
        student_answer_clean = student_answer.strip().lower()
        
        is_correct = student_answer_clean == correct_answer
        points_earned = 1 if is_correct else 0
        
        explanation = f"Correct answer: {question_data['answer']}"
        if not is_correct:
            explanation += f"\nYour answer: {student_answer}"
        
        return AutoGradeResponse(
            is_correct=is_correct,
            points_earned=points_earned,
            max_points=1,
            explanation=explanation,
            correct_answer=question_data["answer"]
        )
    
    @staticmethod
    def grade_short_answer(question_data: dict, student_answer: str) -> AutoGradeResponse:
        correct_answer = question_data["answer"].strip().lower()
        student_answer_clean = student_answer.strip().lower()
        
        similarity = difflib.SequenceMatcher(None, correct_answer, student_answer_clean).ratio()
        is_correct = similarity >= 0.7
        
        points_earned = 1 if is_correct else 0
        
        explanation = f"Correct answer: {question_data['answer']}"
        if not is_correct:
            explanation += f"\nYour answer: {student_answer}"
            explanation += f"\nSimilarity: {similarity:.2%}"
        
        return AutoGradeResponse(
            is_correct=is_correct,
            points_earned=points_earned,
            max_points=1,
            explanation=explanation,
            correct_answer=question_data["answer"]
        )
    
    @staticmethod
    def grade_matching(question_data: dict, student_answer: str) -> AutoGradeResponse:
        try:
            student_pairs = AutoGrader._parse_matching_answer(student_answer)
            correct_pairs = question_data["answer"]
            
            if len(student_pairs) != len(correct_pairs):
                return AutoGradeResponse(
                    is_correct=False,
                    points_earned=0,
                    max_points=1,
                    explanation=f"Number of pairs doesn't match. Expected {len(correct_pairs)}, got {len(student_pairs)}",
                    correct_answer=str(correct_pairs)
                )
            
            correct_count = 0
            for student_pair, correct_pair in zip(student_pairs, correct_pairs):
                if student_pair == correct_pair:
                    correct_count += 1
            
            is_correct = correct_count == len(correct_pairs)
            points_earned = correct_count / len(correct_pairs)
            
            explanation = f"Correct pairs: {correct_count}/{len(correct_pairs)}"
            explanation += f"\nCorrect answer: {correct_pairs}"
            if not is_correct:
                explanation += f"\nYour answer: {student_pairs}"
            
            return AutoGradeResponse(
                is_correct=is_correct,
                points_earned=points_earned,
                max_points=1,
                explanation=explanation,
                correct_answer=str(correct_pairs)
            )
        except Exception as e:
            return AutoGradeResponse(
                is_correct=False,
                points_earned=0,
                max_points=1,
                explanation=f"Invalid format: {str(e)}. Expected format: (item1,item2),(item3,item4)",
                correct_answer=str(question_data["answer"])
            )
    
    @staticmethod
    def grade_ordering(question_data: dict, student_answer: str) -> AutoGradeResponse:
        try:
            student_order = AutoGrader._parse_ordering_answer(student_answer)
            correct_order = question_data["answer"]
            
            if len(student_order) != len(correct_order):
                return AutoGradeResponse(
                    is_correct=False,
                    points_earned=0,
                    max_points=1,
                    explanation=f"Number of items doesn't match. Expected {len(correct_order)}, got {len(student_order)}",
                    correct_answer=str(correct_order)
                )
            
            is_correct = student_order == correct_order
            points_earned = 1 if is_correct else 0
            
            explanation = f"Correct order: {correct_order}"
            if not is_correct:
                explanation += f"\nYour order: {student_order}"
            
            return AutoGradeResponse(
                is_correct=is_correct,
                points_earned=points_earned,
                max_points=1,
                explanation=explanation,
                correct_answer=str(correct_order)
            )
        except Exception as e:
            return AutoGradeResponse(
                is_correct=False,
                points_earned=0,
                max_points=1,
                explanation=f"Invalid format: {str(e)}. Expected format: item1,item2,item3",
                correct_answer=str(question_data["answer"])
            )
    
    @staticmethod
    def grade_question(question_data: dict, student_answer: str) -> AutoGradeResponse:
        if not student_answer or student_answer.strip() == "":
            return AutoGradeResponse(
                is_correct=False,
                points_earned=0,
                max_points=1,
                explanation="No answer provided",
                correct_answer="Answer required"
            )
        
        match question_data["type"]:
            case "mcq":
                return AutoGrader.grade_mcq(question_data, student_answer)
            case "tf":
                return AutoGrader.grade_tf(question_data, student_answer)
            case "numeric":
                return AutoGrader.grade_numeric(question_data, student_answer)
            case "fib":
                return AutoGrader.grade_fib(question_data, student_answer)
            case "short_answer":
                return AutoGrader.grade_short_answer(question_data, student_answer)
            case "matching":
                return AutoGrader.grade_matching(question_data, student_answer)
            case "ordering":
                return AutoGrader.grade_ordering(question_data, student_answer)
            case _:
                return AutoGradeResponse(
                    is_correct=False,
                    points_earned=0,
                    max_points=1,
                    explanation="Free response questions require manual grading",
                    correct_answer="Manual grading required"
                )
    
    @staticmethod
    def _parse_boolean(answer: str) -> bool:
        answer_lower = answer.strip().lower()
        true_values = ['true', 't', 'yes', 'y', '1', 'correct']
        false_values = ['false', 'f', 'no', 'n', '0', 'incorrect']
        
        if answer_lower in true_values:
            return True
        elif answer_lower in false_values:
            return False
        else:
            raise ValueError(f"Cannot parse boolean from: {answer}")
    
    @staticmethod
    def _parse_matching_answer(answer: str) -> List[Tuple]:
        """Parse matching answer format: (item1,item2),(item3,item4)"""
        # Remove whitespace and split by ),(
        pairs = re.findall(r'\(([^)]+)\)', answer)
        result = []
        for pair in pairs:
            items = [item.strip() for item in pair.split(',')]
            if len(items) == 2:
                result.append((items[0], items[1]))
            else:
                raise ValueError(f"Invalid pair format: {pair}")
        return result
    
    @staticmethod
    def _parse_ordering_answer(answer: str) -> List[str]:
        """Parse ordering answer format: item1,item2,item3"""
        return [item.strip() for item in answer.split(',')]
