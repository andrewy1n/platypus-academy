from dotenv import load_dotenv
from langchain.agents import create_agent
from langchain_core.tools import tool
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_core.chat_history import BaseChatMessageHistory
from langchain_core.messages import BaseMessage
from langchain_mcp_adapters.client import MultiServerMCPClient
import requests
import os

import asyncio
from queue import Queue
from threading import Thread
from typing import List

from agents.models.question import FR

load_dotenv()


class InMemoryChatMessageHistory(BaseChatMessageHistory):
    def __init__(self):
        self.messages: List[BaseMessage] = []
    
    def add_message(self, message: BaseMessage) -> None:
        self.messages.append(message)
    
    def get_messages(self) -> List[BaseMessage]:
        return self.messages
    
    def clear(self) -> None:
        self.messages = []


# Global store for user sessions
user_sessions = {}


def get_session_history(session_id: str) -> InMemoryChatMessageHistory:
    if session_id not in user_sessions:
        user_sessions[session_id] = InMemoryChatMessageHistory()
    return user_sessions[session_id]


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
            query_wolfram_alpha_tool,
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
            - Wolfram|Alpha LLM API for advanced computations and scientific queries (query_wolfram_alpha_tool)
            - Use Wolfram|Alpha for complex calculations, unit conversions, scientific data
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
                    
                    # Use streaming to capture tool calls
                    for chunk in self.agent.stream(input_data):
                        print(f"DEBUG: Stream chunk: {chunk}")
                        
                        # Handle different chunk types
                        for key, value in chunk.items():
                            if key == 'model' and 'messages' in value:
                                # This is a model response chunk
                                for message in value['messages']:
                                    if hasattr(message, 'tool_calls') and message.tool_calls:
                                        # This is a tool call message
                                        for tool_call in message.tool_calls:
                                            queue.put(('tool_call', {
                                                'tool_name': tool_call['name'],
                                                'tool_args': tool_call['args'],
                                                'tool_id': tool_call['id']
                                            }))
                                    elif hasattr(message, 'content') and message.content:
                                        # This is a regular message
                                        if isinstance(message.content, list):
                                            # Handle structured content
                                            for content_item in message.content:
                                                if isinstance(content_item, dict) and content_item.get('type') == 'text':
                                                    queue.put(('message', content_item['text']))
                                        else:
                                            queue.put(('message', message.content))
                            
                            elif key == 'tools' and 'messages' in value:
                                # This is a tool result chunk
                                for message in value['messages']:
                                    if hasattr(message, 'content'):
                                        queue.put(('tool_result', {
                                            'tool_id': getattr(message, 'tool_call_id', 'unknown'),
                                            'result': message.content
                                        }))
                    
                    # Get the final result
                    result = self.agent.invoke(input_data)
                    print(f"DEBUG: Final result: {result}")
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
                    
                    elif isinstance(item, tuple) and item[0] == 'tool_call':
                        # Yield tool call information
                        tool_data = item[1]
                        yield {
                            'type': 'tool_call',
                            'tool_name': tool_data['tool_name'],
                            'tool_args': tool_data['tool_args'],
                            'tool_id': tool_data['tool_id']
                        }
                    
                    elif isinstance(item, tuple) and item[0] == 'tool_result':
                        # Yield tool result information
                        result_data = item[1]
                        yield {
                            'type': 'tool_result',
                            'tool_id': result_data['tool_id'],
                            'result': result_data['result']
                        }
                    
                    elif isinstance(item, tuple) and item[0] == 'message':
                        # Yield intermediate message content
                        yield {
                            'type': 'message',
                            'content': item[1]
                        }
                    
                    elif isinstance(item, tuple) and item[0] == 'result':
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

async def test_streaming():
    """Test the enhanced streaming with tool call visibility"""
    print("🤖 Initializing AssistantAgent...")
    agent = AssistantAgent()
    print("✅ AssistantAgent initialized successfully")
    
    print("\n" + "="*60)
    print("🔍 Testing Enhanced Streaming with Tool Calls")
    print("="*60)
    
    # Test query that should trigger tool calls
    test_query = "What is the derivative of x^2 + 3x + 5? Please verify your answer using Wolfram Alpha."
    
    print(f"Query: {test_query}")
    print("\n📡 Streaming Response:")
    print("-" * 40)
    
    try:
        async for event in agent.generate_response(test_query, "test_thread"):
            if event['type'] == 'tool_call':
                print(f"🔧 Tool Call: {event['tool_name']}")
                print(f"   Args: {event['tool_args']}")
                print(f"   ID: {event['tool_id']}")
                print()
                
            elif event['type'] == 'tool_result':
                print(f"📊 Tool Result (ID: {event['tool_id']}):")
                print(f"   {event['result'][:200]}{'...' if len(event['result']) > 200 else ''}")
                print()
                
            elif event['type'] == 'message':
                print(f"💬 Message: {event['content'][:100]}{'...' if len(event['content']) > 100 else ''}")
                print()
                
            elif event['type'] == 'final_response':
                print(f"✅ Final Response:")
                print(f"   {event['content']}")
                print()
                
            elif event['type'] == 'error':
                print(f"❌ Error: {event['message']}")
                print()
                
    except Exception as e:
        print(f"❌ Error during streaming test: {e}")
    
    print("="*60)
    print("🎉 Streaming test completed!")
    print("="*60)

def main():
    import asyncio
    asyncio.run(test_streaming())

if __name__ == "__main__":
    main()
