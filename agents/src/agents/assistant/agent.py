from dotenv import load_dotenv
from langchain.agents import create_agent
from langchain_core.tools import tool
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_core.chat_history import BaseChatMessageHistory
from langchain_core.messages import BaseMessage
from langchain_mcp_adapters.client import MultiServerMCPClient
import requests
import os
import sympy as sp
from sympy import solve, simplify
from sympy.parsing.sympy_parser import parse_expr
import asyncio
import concurrent.futures
from queue import Queue
from threading import Thread
from typing import List
import json

from agents.models.question import FR

load_dotenv()


class InMemoryChatMessageHistory(BaseChatMessageHistory):
    """In-memory chat message history store"""
    
    def __init__(self):
        self.messages: List[BaseMessage] = []
    
    def add_message(self, message: BaseMessage) -> None:
        """Add a message to the store"""
        self.messages.append(message)
    
    def get_messages(self) -> List[BaseMessage]:
        """Retrieve all messages from the store"""
        return self.messages
    
    def clear(self) -> None:
        """Clear all messages from the store"""
        self.messages = []


# Global store for user sessions
user_sessions = {}


def get_session_history(session_id: str) -> InMemoryChatMessageHistory:
    """Get or create a session history for a user"""
    if session_id not in user_sessions:
        user_sessions[session_id] = InMemoryChatMessageHistory()
    return user_sessions[session_id]


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
        self.mcp_url = os.getenv("ELASTIC_MCP_URL")
        self.mcp_api_key = os.getenv("ELASTICSEARCH_API_KEY")
        
        self.mcp_client = None
        self.mcp_tools_loaded = False
        
        if self.mcp_url and self.mcp_api_key:
            self.mcp_client = MultiServerMCPClient({
                "elastic_agent_builder": {
                    "transport": "streamable_http",
                    "url": self.mcp_url,
                    "headers": {
                        "Authorization": f"ApiKey {self.mcp_api_key}"
                    }
                }
            })
        
        self.base_tools = [
            solve_equation_tool,
            query_wolfram_alpha_tool,
            simplify_expression_tool,
        ]

        # Create the base agent
        self.base_agent = create_agent(
            "anthropic:claude-sonnet-4-5",
            tools=self.base_tools,
        )
        
        # For now, use the base agent directly and handle memory manually
        self.agent = self.base_agent
        
        self.system = """
            You are a specialized assistant agent. Your job is to:

            Help the user with their question or problem.

            Use the elastic search tools to retrieve context about any practice/test problem the user is asking about.
            You can also use other scientific and mathematical tools to fact check your reasoning before explaining anything.

            You have access to powerful mathematical and scientific tools:
            - SymPy tools for symbolic mathematics (solve_equation_tool, simplify_expression_tool)
            - Wolfram|Alpha LLM API for advanced computations and scientific queries (query_wolfram_alpha_tool)
            - Use Wolfram|Alpha for complex calculations, unit conversions, scientific data
            - Use SymPy for symbolic math, equation solving, and expression simplification
            - MCP tools from Elastic Agent Builder for advanced search and knowledge retrieval (if configured)
            
            Always validate mathematical expressions and check answer correctness when possible.
            For scientific questions, use Wolfram|Alpha to verify facts and calculations.
        """
    
    async def _load_mcp_tools(self):
        if not self.mcp_tools_loaded and self.mcp_client:
            try:
                print("Fetching tools from MCP server...")
                
                mcp_tools = await self.mcp_client.get_tools()
                print(f"Retrieved {len(mcp_tools)} tools from MCP server")
                
                if mcp_tools:
                    all_tools = self.base_tools + mcp_tools
                    # Recreate base agent with MCP tools
                    self.base_agent = create_agent(
                        "anthropic:claude-sonnet-4-5",
                        tools=all_tools,
                    )
                    # Update the agent reference
                    self.agent = self.base_agent
                    print(f"✓ Agent updated with {len(mcp_tools)} MCP tools from Elastic Agent Builder")
                    for tool in mcp_tools:
                        print(f"  - {tool.name}: {tool.description[:100] if hasattr(tool, 'description') else 'No description'}")
                else:
                    print("No MCP tools retrieved from server")
                    
                self.mcp_tools_loaded = True
            except Exception as e:
                import traceback
                print(f"Warning: Could not load MCP tools: {e}")
                print(f"Traceback: {traceback.format_exc()}")
                self.mcp_tools_loaded = True
    
    
    async def generate_response(
        self, 
        query: str,
        thread_id: str
    ):
        await self._load_mcp_tools()
        
        try:
            # Get conversation history for this thread
            history = get_session_history(thread_id)
            chat_history = history.get_messages()
            
            # Create input with user message and history
            input_data = {
                "messages": [
                    {"role": "user", "content": query}
                ]
            }
            
            # Add conversation history if it exists
            if chat_history:
                # Convert history to the format expected by the agent
                history_messages = []
                for msg in chat_history:
                    if hasattr(msg, 'content'):
                        if hasattr(msg, '__class__') and 'Human' in msg.__class__.__name__:
                            history_messages.append({"role": "user", "content": msg.content})
                        elif hasattr(msg, '__class__') and 'AI' in msg.__class__.__name__:
                            history_messages.append({"role": "assistant", "content": msg.content})
                
                # Prepend history to current message
                input_data["messages"] = history_messages + input_data["messages"]
            
            final_message = None
            queue = Queue()
            sentinel = object()
            
            def _stream_agent():
                try:
                    # Debug: Print what we're sending
                    print(f"DEBUG: Input data: {input_data}")
                    
                    # Use the agent directly with messages format
                    result = self.agent.invoke(input_data)
                    print(f"DEBUG: Result: {result}")
                    queue.put(('result', result))
                except Exception as e:
                    print(f"DEBUG: Error: {e}")
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
                    
                    if isinstance(item, tuple) and item[0] == 'result':
                        result = item[1]
                        # Extract the final response from the result
                        if 'output' in result:
                            # The response is in the 'output' field
                            response_content = result['output']
                            
                            # Save to conversation history
                            from langchain_core.messages import HumanMessage, AIMessage
                            history = get_session_history(thread_id)
                            history.add_message(HumanMessage(content=query))
                            history.add_message(AIMessage(content=response_content))
                            
                            yield {
                                'type': 'final_response',
                                'content': response_content
                            }
                        elif 'messages' in result and result['messages']:
                            # Fallback to messages format
                            final_message = result['messages'][-1]
                            
                            # Save to conversation history
                            from langchain_core.messages import HumanMessage, AIMessage
                            history = get_session_history(thread_id)
                            history.add_message(HumanMessage(content=query))
                            history.add_message(AIMessage(content=final_message.content))
                            
                            yield {
                                'type': 'final_response',
                                'content': final_message.content
                            }
                        else:
                            yield {
                                'type': 'error',
                                'message': 'No response generated'
                            }
                        break
            
            # This check is now redundant since we handle it above

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
