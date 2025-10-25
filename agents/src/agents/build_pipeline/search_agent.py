from dotenv import load_dotenv
from langchain.agents import create_agent
from langchain_core.tools import tool
from pydantic import BaseModel, HttpUrl
from langchain_core.prompts import ChatPromptTemplate
from langchain_perplexity import ChatPerplexity
import json

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

class SearchResult(BaseModel):
    url: HttpUrl
    title: str
    snippet: str

class SearchResults(BaseModel):
    search_results: list[SearchResult]

class SearchAgent:
    def __init__(self, temperature=1, model="sonar", agent_model="openai:gpt-5-mini"):
        """
        Initialize the SearchAgent with Perplexity and LangChain agent.
        
        Args:
            temperature: Temperature for Perplexity model (default: 1)
            model: Perplexity model name (default: "sonar")
            agent_model: LangChain agent model (default: "openai:gpt-5-mini")
        """
        self.temperature = temperature
        self.model = model
        self.agent_model = agent_model
        
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
        self.agent = create_agent(
            agent_model,
            tools=[search_perplexity_tool],
            system_prompt=self.system_prompt,
            response_format=SearchResults  
        )
    
    
    def invoke(self, query: str) -> SearchResults:
        try:
            print("🔍 Starting search process with streaming...")
            print("=" * 60)
            print(f"📝 Query: {query}")
            print("=" * 60)
            
            # Use streaming to see tool calls in real-time
            final_result = None
            
            for chunk in self.agent.stream(
                {"messages": [{"role": "user", "content": query}]},
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
            
            # Extract the search results from the final result
            if final_result and hasattr(final_result, 'content_blocks') and final_result.content_blocks:
                for block in final_result.content_blocks:
                    if block.get('type') == 'text':
                        json_text = block.get('text')
                        if json_text:
                            try:
                                print("🔍 Parsing search results...")
                                parsed_data = json.loads(json_text)
                                search_results_data = parsed_data.get('search_results', [])
                                search_results = [SearchResult(**result_data) for result_data in search_results_data]
                                print(f"✅ Found {len(search_results)} search results")
                                return SearchResults(search_results=search_results)
                            except (json.JSONDecodeError, ValueError) as e:
                                print(f"❌ Error parsing JSON: {e}")
                                return SearchResults(search_results=[])
            
            print("⚠️ No valid search results found")
            return SearchResults(search_results=[])
            
        except Exception as e:
            print(f"❌ Error during search: {e}")
            return SearchResults(search_results=[])
    
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
    test_query = "Find 5 URL links to biology DNA replication textbooks with practice questions, return your answer in JSON format. Prefer website links over pdf links."
    
    print("🔍 Starting search process...")
    print("=" * 60)
    
    # Perform search with streaming
    results = search_agent.invoke(test_query)
    
    # Print results
    search_agent.print_results(results)
    
    print("\n" + "=" * 60)
    print("🎉 Search completed successfully!")
    print(f"📊 Total results found: {len(results.search_results)}")
    print("=" * 60)

if __name__ == "__main__":
    main()