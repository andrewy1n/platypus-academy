from dotenv import load_dotenv
from langchain.agents import create_agent
from langchain_core.tools import tool
from langchain_core.prompts import ChatPromptTemplate
import json
import requests
import os
import sympy as sp
from sympy import solve, simplify
from sympy.parsing.sympy_parser import parse_expr

from agents.models.question import FRGrade, Question
from agents.models.search import SearchRequest

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

class FreeResponseGraderAgent:
    def __init__(self):
        self.wolfram_app_id = os.getenv("WOLFRAM_APP_ID")

        self.agent = create_agent(
            "openai:gpt-5-mini",
            tools=[
                solve_equation_tool,
                query_wolfram_alpha_tool,
                simplify_expression_tool,
            ],
            response_format=FRGrade
        )
        
        self.system = """
            You are a specialized free response grading agent. Your job is to:
        

            You have access to powerful mathematical and scientific tools:
            - SymPy tools for symbolic mathematics (solve_equation_tool, simplify_expression_tool)
            - Wolfram|Alpha LLM API for advanced computations and scientific queries (query_wolfram_alpha_tool)
            - Use Wolfram|Alpha for complex calculations, unit conversions, scientific data
            - Use SymPy for symbolic math, equation solving, and expression simplification
            
            Always validate mathematical expressions and check answer correctness when possible.
            For scientific questions, use Wolfram|Alpha to verify facts and calculations.
        """
        
        self.human = "{input}"
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", self.system), 
            ("human", self.human)
        ])
        
        self.agent = create_agent(
            "openai:gpt-5-mini",
            tools=[
                query_wolfram_alpha_tool,
                simplify_expression_tool,
                solve_equation_tool,
            ],
            response_format=List[Question]
        )
    
    
    def validate_questions(
        self, 
        search_request: SearchRequest, 
        scrape_output: List[str], 
    ) -> List[Question]:
        try:
            prompt_text = f"""
            User initial query: {search_request.model_dump()}
            
            Raw Questions Data:
            {json.dumps(scrape_output, indent=2)}
            
            Return the results in the List[Question] format with {search_request.num_questions_range} questions.
            """
            
            print("🤖 Starting validation process with streaming...")
            print("=" * 60)
            
            final_result = None
            
            for chunk in self.agent.stream(
                {"messages": [{"role": "user", "content": prompt_text}]},
                stream_mode="updates",
            ):
                for step, data in chunk.items():
                    print(f"📊 Step: {step}")
                    
                    # Show tool calls
                    if 'messages' in data and data['messages']:
                        message = data['messages'][-1]
                        if hasattr(message, 'tool_calls') and message.tool_calls:
                            print("🔧 Tool Calls:")
                            for tool_call in message.tool_calls:
                                print(f"   📞 Tool: {tool_call['name']}")
                                print(f"   📝 Args: {tool_call['args']}")
                                print(f"   🆔 ID: {tool_call['id']}")
                                print("-" * 40)
                    
                    # Show content blocks
                    if hasattr(message, 'content_blocks') and message.content_blocks:
                        print("📄 Content Blocks:")
                        for block in message.content_blocks:
                            if block.get('type') == 'text':
                                content = block.get('text', '')
                                if content:
                                    print(f"   📝 Text: {content[:200]}{'...' if len(content) > 200 else ''}")
                        print("-" * 40)
                    
                    # Store final result
                    if 'messages' in data and data['messages']:
                        final_result = data['messages'][-1]
            
            print("✅ Streaming completed!")
            print("=" * 60)
            
            # Extract the validated questions from the final result
            if final_result and hasattr(final_result, 'content_blocks') and final_result.content_blocks:
                for block in final_result.content_blocks:
                    if block.get('type') == 'text':
                        try:
                            # Try to parse as ValidatedQuestions
                            questions = json.loads(block.get('text'))
                            
                            return [Question(**q) for q in questions]
                        except (json.JSONDecodeError, ValueError) as e:
                            print(f"❌ Error parsing agent response: {e}")
                            continue
            
            # Fallback: return empty result
            print("⚠️ No valid response found, returning empty result")
            return []
            
        except Exception as e:
            print(f"❌ Error in agent validation: {e}")
            return []

def main():
    sample_scrape_output = [
        {
            "question": "What is the primary enzyme responsible for DNA replication?",
            "answer": "DNA polymerase",
            "explanation": "DNA polymerase is the main enzyme that synthesizes new DNA strands during replication.",
            "source_url": "https://example.com/question1"
        },
        {
            "question": "Calculate the number of hydrogen bonds between A-T base pairs.",
            "answer": "2",
            "explanation": "A-T base pairs form 2 hydrogen bonds, while G-C pairs form 3 hydrogen bonds.",
            "source_url": "https://example.com/question2"
        },
        {
            "question": "What is the speed of light in vacuum?",
            "answer": "299,792,458 m/s",
            "explanation": "The speed of light in vacuum is approximately 3.00 × 10^8 m/s.",
            "source_url": "https://example.com/question3"
        },
        {
            "question": "Solve the equation: x^2 + 5x + 6 = 0",
            "answer": "x = -2 or x = -3",
            "explanation": "Using the quadratic formula or factoring: (x + 2)(x + 3) = 0",
            "source_url": "https://example.com/question4"
        }
    ]
    
    print("Initializing ValidatorAgent...")
    validator = ValidatorAgent()
    
    print("Using LangChain agent to validate questions...")
    validated_questions = validator.validate_questions(
        instruction="Biology DNA replication practice questions", 
        scrape_output=sample_scrape_output,
        target_count=2
    )
    

    print(validated_questions)

if __name__ == "__main__":
    main()
