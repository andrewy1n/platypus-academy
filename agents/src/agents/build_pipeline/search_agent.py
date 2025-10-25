from dotenv import load_dotenv
from langchain.agents import create_agent
from langchain_core.tools import tool
from langchain_core.prompts import ChatPromptTemplate
from langchain_perplexity import ChatPerplexity
import json
from langchain_anthropic import ChatAnthropic
from langchain.agents.structured_output import ToolStrategy
import asyncio
from queue import Queue
from threading import Thread

from agents.models.search import SearchRequest, SearchResults, SearchResult

load_dotenv()


@tool
def search_perplexity_tool(input_text: str) -> str:
    """
    Search the web for information using Perplexity.
    Args:
        input_text: The query to search for.
    Returns:
        A string containing the search results.
    """
    try:
        chat = ChatPerplexity(temperature=1, model="sonar")
        
        system = """You are a helpful assistant that can search the web for information. 
MAKE SURE TO INCLUDE URL LINKS IN YOUR RESPONSE.

Return your answer in machine readable JSON format.
"""
        human = "{input}"
        prompt = ChatPromptTemplate.from_messages([("system", system), ("human", human)])
        
        chat_pipeline = prompt | chat
        
        # Get response
        response = chat_pipeline.invoke({"input": input_text})
        return response.content
        
    except Exception as e:
        return f"Error searching with Perplexity: {str(e)}"
    

class SearchAgent:
    def __init__(self, temperature=1, model="sonar"):
        """
        Initialize the SearchAgent with Perplexity and LangChain agent.
        
        Args:
            temperature: Temperature for Perplexity model (default: 1)
            model: Perplexity model name (default: "sonar")
            agent_model: LangChain agent model (default: "openai:gpt-5-mini")
        """
        self.temperature = temperature
        self.model = model
        
        self.chat = ChatPerplexity(temperature=temperature, model=model)
        
        self.perplexity_system_prompt = """You are a helpful assistant that can search the web for information. 
            MAKE SURE TO INCLUDE URL LINKS IN YOUR RESPONSE.

            Return your answer in machine readable JSON format.
            """
        self.human = "{input}"
        self.prompt = ChatPromptTemplate.from_messages([("system", self.perplexity_system_prompt), ("human", self.human)])
        
        self.chat_pipeline = self.prompt | self.chat
        
        self.system_prompt = """
            You are a search agent that can search the web for information.
            You have access to the search_perplexity_tool tool to search the web for information.
            You will be given a query and you need to return the search results in JSON format.
            You will need to include the URL links in your response.

            For each query find 4 URLs that are relevant to the query.

            DO NOT call the perplexity tool too many times, make sure to request links in your tool.

            Prefer OER (Open Educational Resources) websites over commercial websites.
            Example OER websites:
                - OpenStax
                - LibreTexts
                - OER Commons
                - Saylor Academy
            Return your answer in machine readable JSON format.
        """

        model = ChatAnthropic(
            model="claude-sonnet-4-5",
        )
        self.agent = create_agent(
            model,
            tools=[search_perplexity_tool],
            system_prompt=self.system_prompt,
            response_format=ToolStrategy(SearchResults)  
        )
    
    
    async def invoke(self, search_request: SearchRequest):
        try:
            query = f"Find URLs to {search_request.subject} {search_request.topic} textbooks with practice questions, return your answer in JSON format. Prefer website links over pdf links."
            
            search_results = None
            queue = Queue()
            sentinel = object()
            
            def _stream_agent():
                try:
                    for chunk in self.agent.stream(
                        {"messages": [{"role": "user", "content": query}]},
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
                            'message': f"Error in search: {str(item[1])}"
                        }
                        break
                    
                    chunk = item
                    for step, data in chunk.items():
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
                            search_results = data['structured_response']
            
            if search_results:
                yield {
                    'type': 'final_response',
                    'data': search_results
                }
            else:
                yield {
                    'type': 'final_response',
                    'data': SearchResults(search_results=[])
                }
            
        except Exception as e:
            yield {
                'type': 'error',
                'message': f"Error during search: {str(e)}"
            }
    
    def print_results(self, results: SearchResults):
        print("\n📋 SEARCH RESULTS SUMMARY")
        print("=" * 60)
        
        if not results.search_results:
            print("❌ No search results found.")
            return
            
        print(f"✅ Found {len(results.search_results)} results:")
        print("=" * 50)
        
        for i, result in enumerate(results.search_results, 1):
            print(f"\n📝 Result {i}:")
            print(f"   📄 Title: {result.title}")
            print(f"   🔗 URL: {result.url}")
            print(f"   📝 Snippet: {result.snippet[:150]}{'...' if len(result.snippet) > 150 else ''}")
            print(f"   📊 Snippet length: {len(result.snippet)} characters")
            print("-" * 30)

def main():
    print("🤖 Initializing SearchAgent...")
    search_agent = SearchAgent()
    print("✅ SearchAgent initialized successfully")
    print("=" * 60)
    
    # Test query
    test_query = "Find URLs to biology DNA replication textbooks with practice questions, return your answer in JSON format. Prefer website links over pdf links."
    
    print("🔍 Starting search process...")
    print("=" * 60)
    
    # Perform search with streaming
    results = search_agent.invoke(SearchRequest(
        subject="Biology",
        topic="DNA replication",
        num_questions_range=(2, 4),
        mode="practice"
    ))
    
    # Print results
    search_agent.print_results(results)
    
    print("\n" + "=" * 60)
    print("🎉 Search completed successfully!")
    print(f"📊 Total results found: {len(results.search_results)}")
    print("=" * 60)

if __name__ == "__main__":
    main()