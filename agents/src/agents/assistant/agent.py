from dotenv import load_dotenv
from langchain.agents import create_agent
from langchain_core.tools import tool
import requests
import os
import sympy as sp
from sympy import solve, simplify
from sympy.parsing.sympy_parser import parse_expr
import asyncio
import concurrent.futures
from queue import Queue
from threading import Thread

from agents.models.question import FR

load_dotenv()


@tool
def solve_equation_tool(equation: str) -> str:
    """
    Solve a mathematical equation using SymPy.
    
    Args:
        equation: Equation to solve (e.g., "x^2 + 2*x + 1 = 0")
        
    Returns:
        Solutions to the equation
    """
    try:
        # Parse equation (assume format: left_side = right_side)
        if '=' in equation:
            left, right = equation.split('=', 1)
            left_expr = parse_expr(left.strip())
            right_expr = parse_expr(right.strip())
            eq = sp.Eq(left_expr, right_expr)
        else:
            # If no equals sign, assume it's an expression equal to 0
            eq = parse_expr(equation)
        
        # Solve the equation
        solutions = solve(eq, dict=True)
        
        if solutions:
            return f"Solutions: {solutions}"
        else:
            return "No solutions found"
            
    except Exception as e:
        return f"Error solving equation '{equation}': {str(e)}"

@tool
def simplify_expression_tool(expression: str) -> str:
    """
    Simplify a mathematical expression using SymPy.
    
    Args:
        expression: Expression to simplify
        
    Returns:
        Simplified expression
    """
    try:
        expr = parse_expr(expression)
        simplified = simplify(expr)
        return f"Simplified expression: {expression} → {simplified}"
    except Exception as e:
        return f"Error simplifying expression '{expression}': {str(e)}"

@tool
def query_wolfram_alpha_tool(query: str) -> str:
    """
    Query Wolfram|Alpha LLM API for mathematical and scientific computations.
    
    Args:
        query: Natural language query for Wolfram|Alpha
        
    Returns:
        Computed result from Wolfram|Alpha
    """
    try:
        wolfram_app_id = os.getenv("WOLFRAM_APP_ID")
        if not wolfram_app_id:
            return "Error: WOLFRAM_APP_ID not found in environment variables"
        
        # Wolfram|Alpha LLM API endpoint
        url = "https://www.wolframalpha.com/api/v1/llm-api"
        
        # Parameters for the API call
        params = {
            "appid": wolfram_app_id,
            "input": query,
            "maxchars": 2000  # Limit response length for LLM consumption
        }
        
        # Make the API request
        response = requests.get(url, params=params, timeout=30)
        response.raise_for_status()
        
        # Return the computed result
        return response.text
        
    except requests.exceptions.RequestException as e:
        return f"Error querying Wolfram|Alpha API: {str(e)}"
    except Exception as e:
        return f"Unexpected error: {str(e)}"

class AssistantAgent:
    def __init__(self):
        self.wolfram_app_id = os.getenv("WOLFRAM_APP_ID")

        self.agent = create_agent(
            "anthropic:claude-sonnet-4-5",
            tools=[
                solve_equation_tool,
                query_wolfram_alpha_tool,
                simplify_expression_tool,
            ],
        )
        
        self.system = """
            You are a specialized assistant agent. Your job is to:

            Help the user with their question or problem.

            You have access to powerful mathematical and scientific tools:
            - SymPy tools for symbolic mathematics (solve_equation_tool, simplify_expression_tool)
            - Wolfram|Alpha LLM API for advanced computations and scientific queries (query_wolfram_alpha_tool)
            - Use Wolfram|Alpha for complex calculations, unit conversions, scientific data
            - Use SymPy for symbolic math, equation solving, and expression simplification
            
            Always validate mathematical expressions and check answer correctness when possible.
            For scientific questions, use Wolfram|Alpha to verify facts and calculations.
        """
    
    
    async def generate_response(
        self, 
        query: str
    ):
        try:
            prompt_text = f"""
            Query: {query}

            Return the response to the user's query.
            """
            
            final_message = None
            queue = Queue()
            sentinel = object()
            
            def _stream_agent():
                try:
                    for chunk in self.agent.stream(
                        {"messages": [{"role": "user", "content": prompt_text}]},
                        stream_mode="updates",
                    ):
                        queue.put(chunk)
                except Exception as e:
                    queue.put(('error', e))
                finally:
                    queue.put(sentinel)
            
            thread = Thread(target=_stream_agent, daemon=True)
            thread.start()
            
            while True:
                await asyncio.sleep(0.01)
                
                if not queue.empty():
                    item = queue.get()
                    
                    if item is sentinel:
                        break
                    
                    if isinstance(item, tuple) and item[0] == 'error':
                        yield {
                            'type': 'error',
                            'message': f"Error in stream: {str(item[1])}"
                        }
                        break
                    
                    chunk = item
                    for step, data in chunk.items():
                        if 'messages' in data and data['messages']:
                            message = data['messages'][-1]
                            final_message = message
                            
                            if hasattr(message, 'tool_calls') and message.tool_calls:
                                for tool_call in message.tool_calls:
                                    yield {
                                        'type': 'tool_call',
                                        'tool': tool_call['name'],
                                        'args': tool_call['args'],
                                        'id': tool_call['id']
                                    }
            
            if final_message:
                yield {
                    'type': 'final_response',
                    'content': final_message.content
                }
            else:
                yield {
                    'type': 'error',
                    'message': 'No response generated'
                }

        except Exception as e:
            yield {
                'type': 'error',
                'message': f"Error generating response: {str(e)}"
            }

def main():
    print("🤖 Initializing FreeResponseGraderAgent...")
    grader = AssistantAgent()
    print("✅ AssistantAgent initialized successfully")
    
    # Test case 1: Math problem
    print("\n" + "="*60)
    print("📝 Test Case 1: Math Problem")
    print("="*60)
    
    math_question = FR(
        type="fr",
        answer="x = -2 or x = -3",
        points=5,
        rubric="Student should solve the quadratic equation correctly. Award points for: correct factoring (2 points), correct solutions (2 points), clear explanation (1 point)."
    )
    
    student_math_answer = "I can factor this as (x + 2)(x + 3) = 0, so x = -2 or x = -3"
    
    print(f"Question: Solve x^2 + 5x + 6 = 0")
    print(f"Student Answer: {student_math_answer}")
    print(f"Max Points: {math_question.points}")
    
    try:
        math_grade = grader.grade_free_response(math_question, student_math_answer)
        print(f"\n📊 Math Grade Result:")
        print(f"   Score: {math_grade.score}/{math_question.points}")
        print(f"   Explanation: {math_grade.explanation}")
    except Exception as e:
        print(f"❌ Error grading math problem: {e}")
    
    # Test case 2: Biology problem
    print("\n" + "="*60)
    print("📝 Test Case 2: Biology Problem")
    print("="*60)
    
    bio_question = FR(
        type="fr",
        answer="DNA polymerase is the primary enzyme responsible for DNA replication. It synthesizes new DNA strands by adding nucleotides to the growing strand in the 5' to 3' direction.",
        points=4,
        rubric="Student should identify DNA polymerase (2 points) and explain its function in DNA replication (2 points). Partial credit for mentioning other relevant enzymes."
    )
    
    student_bio_answer = "DNA polymerase is the main enzyme for DNA replication. It adds nucleotides to make new DNA strands."
    
    print(f"Question: What is the primary enzyme responsible for DNA replication?")
    print(f"Student Answer: {student_bio_answer}")
    print(f"Max Points: {bio_question.points}")
    
    try:
        bio_grade = grader.grade_free_response(bio_question, student_bio_answer)
        print(f"\n📊 Biology Grade Result:")
        print(f"   Score: {bio_grade.score}/{bio_question.points}")
        print(f"   Explanation: {bio_grade.explanation}")
    except Exception as e:
        print(f"❌ Error grading biology problem: {e}")
    
    # Test case 3: Physics problem
    print("\n" + "="*60)
    print("📝 Test Case 3: Physics Problem")
    print("="*60)
    
    physics_question = FR(
        type="fr",
        answer="The speed of light in vacuum is approximately 3.00 × 10^8 m/s or 299,792,458 m/s. This is a fundamental constant in physics.",
        points=3,
        rubric="Student should provide the correct numerical value (2 points) and mention it's a fundamental constant (1 point)."
    )
    
    student_physics_answer = "The speed of light is about 3 × 10^8 meters per second"
    
    print(f"Question: What is the speed of light in vacuum?")
    print(f"Student Answer: {student_physics_answer}")
    print(f"Max Points: {physics_question.points}")
    
    try:
        physics_grade = grader.grade_free_response(physics_question, student_physics_answer)
        print(f"\n📊 Physics Grade Result:")
        print(f"   Score: {physics_grade.score}/{physics_question.points}")
        print(f"   Explanation: {physics_grade.explanation}")
    except Exception as e:
        print(f"❌ Error grading physics problem: {e}")
    
    print("\n" + "="*60)
    print("🎉 FreeResponseGraderAgent test completed!")
    print("="*60)

if __name__ == "__main__":
    main()
