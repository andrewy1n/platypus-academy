from dotenv import load_dotenv
from langchain.agents import create_agent
from langchain_core.tools import tool
from langchain_anthropic import ChatAnthropic
from langchain.agents.structured_output import ToolStrategy
from typing import List
import json
import requests
import os

from agents.models.question import QuestionList
from agents.models.search import SearchRequest

load_dotenv()



@tool
def query_wolfram_alpha_tool(query: str) -> str:
    """
    Query Wolfram|Alpha LLM API for mathematical and scientific computations.
    
    IMPORTANT: Use simplified keyword queries for best results.
    
    Args:
        query: Simplified keyword query for Wolfram|Alpha (keep it concise)
        
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
        
        # Handle 501 errors with helpful message
        if response.status_code == 501:
            return f"Wolfram|Alpha couldn't interpret the query: '{query}'. Try simplifying to keywords (e.g., 'A-T base pair hydrogen bonds' instead of 'number of hydrogen bonds between adenine and thymine'). You may want to rephrase and try again."
        
        response.raise_for_status()
        
        # Return the computed result
        return response.text
        
    except requests.exceptions.RequestException as e:
        return f"Error querying Wolfram|Alpha API: {str(e)}"
    except Exception as e:
        return f"Unexpected error: {str(e)}"

class ValidatorAgent:
    def __init__(self):
        self.wolfram_app_id = os.getenv("WOLFRAM_APP_ID")

        model = ChatAnthropic(
            model="claude-sonnet-4-5",
        )
        self.system = """
        You are a specialized question validator agent. Your job is to:
        
            Take raw question data from scrape agents and transform them into properly structured, validated questions
            Use mathematical tools to verify answers when applicable
            Ensure questions meet quality standards and schema requirements
            Return validated questions in the specified format

            Note: FIB stands for Fill-in-the blank, requires the blank be somewhere inside the sentence.
            Short answer questions should be answered in a single word, otherwise they become free response questions.

            Follow this workflow:
            1. First consider which questions shold be included based on the user query.
            2. Check if those questions are actually in the resource listed, you can do this by querying the elastic search index which includes
            chunks of the parsed site.
            - If the question is not in the resource, DO NOT include the question in the output.
            3. Next, check the correctness of the answer, you can do this by using the mathematical and scientific tools.
            - If the answer is not correct, DO NOT include the question in the output.
            4. If the question is valid, include it in the output.

            You have access to powerful mathematical and scientific tools:
            - Wolfram|Alpha LLM API for advanced computations and scientific queries (query_wolfram_alpha_tool)
            - Use Wolfram|Alpha for complex calculations, unit conversions, scientific data
            
            IMPORTANT: When using Wolfram|Alpha, use SIMPLIFIED KEYWORD QUERIES:
            - Good: "adenine thymine hydrogen bonds", "speed of light", "solve x^2+5x+6=0"
            - Bad: "how many hydrogen bonds between adenine and thymine", "what is the speed of light"
            - Convert verbose questions to concise keyword format before querying
            
            Always validate mathematical expressions and check answer correctness when possible.
            For scientific questions, use Wolfram|Alpha to verify facts and calculations.
            Any mathematical/scientific text should be formatted in unicode characters.
        """
        
        self.agent = create_agent(
            model,
            system_prompt=self.system,
            tools=[
                query_wolfram_alpha_tool,
            ],
            response_format=ToolStrategy(QuestionList)
        )
        
    
    async def validate_questions(
        self, 
        search_request: SearchRequest, 
        scrape_output: List[str], 
    ):
        try:
            prompt_text = f"""
            User initial query: {search_request.model_dump()}
            
            Raw Questions Data:
            {json.dumps(scrape_output, indent=2)}
            
            Return the results in the QuestionList format with {search_request.num_questions_range} questions.
            """
            
            questions = None
            
            for chunk in self.agent.stream(
                {"messages": [{"role": "user", "content": prompt_text}]},
                stream_mode="updates",
            ):
                for step, data in chunk.items():
                    # Yield tool calls
                    if 'messages' in data and data['messages']:
                        message = data['messages'][-1]
                        if hasattr(message, 'tool_calls') and message.tool_calls:
                            for tool_call in message.tool_calls:
                                yield {
                                    'type': 'tool_call',
                                    'tool': tool_call['name'],
                                    'args': tool_call['args'],
                                    'id': tool_call['id']
                                }
                    
                    if 'structured_response' in data:
                        questions = data['structured_response']
            
            if questions:
                yield {
                    'type': 'final_response',
                    'data': questions
                }
            else:
                yield {
                    'type': 'final_response',
                    'data': QuestionList(questions=[])
                }
            
        except Exception as e:
            yield {
                'type': 'error',
                'message': f"Error in agent validation: {str(e)}"
            }

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
    
    search_request = SearchRequest(
        subject="Biology",
        topics=["DNA replication"],
        num_questions_range=(2, 4),
        mode="practice"
    )
    
    print("Using LangChain agent to validate questions...")
    
    async def test_validation():
        async for event in validator.validate_questions(
            search_request=search_request, 
            scrape_output=sample_scrape_output
        ):
            if event['type'] == 'tool_call':
                print(f"🔧 Tool Call: {event['tool']}")
                print(f"   Args: {event['args']}")
                print(f"   ID: {event['id']}")
                print("-" * 40)
            elif event['type'] == 'final_response':
                print("✅ Final Response:")
                print(event['data'])
            elif event['type'] == 'error':
                print(f"❌ Error: {event['message']}")
    
    import asyncio
    asyncio.run(test_validation())

if __name__ == "__main__":
    main()
