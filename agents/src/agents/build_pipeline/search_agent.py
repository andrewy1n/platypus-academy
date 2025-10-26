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
        
        self.chat = ChatPerplexity(temperature=0.2, model=model)
        
        self.system_prompt = """
            You are a search agent that finds educational resources optimized for parsing with unstructured library.
            
            CRITICAL REQUIREMENTS FOR PARSING COMPATIBILITY:
            1. Prefer HTML web pages over PDFs (HTML is most reliable for unstructured)
            2. Avoid JavaScript-heavy sites, authentication-required sites, or sites with anti-bot protection
            3. Prefer sites with clean, structured content layouts
            4. Avoid sites that redirect excessively or have complex navigation
            
            PREFERRED RESOURCE TYPES (in order):
            1. Educational websites with HTML content (OpenStax, LibreTexts, Khan Academy)
            2. Academic institution pages with course materials
            3. Government educational resources (.gov domains)
            4. Non-profit educational organizations
            5. Well-structured PDFs as last resort
            
            AVOID THESE SITE TYPES:
            - Sites requiring login/authentication
            - JavaScript-heavy single-page applications
            - Sites with heavy advertising or popups
            - Social media platforms
            - Video-only content sites
            - Sites with complex interactive elements
            
            For each query find 4 URLs that are relevant and parseable.
            Prefer OER (Open Educational Resources) websites over commercial websites.
            Example OER websites:
                - OpenStax (openstax.org)
                - LibreTexts (libretexts.org)
                - OER Commons (oercommons.org)
                - Saylor Academy (learn.saylor.org)
                - Khan Academy (khanacademy.org)
                - MIT OpenCourseWare (ocw.mit.edu)
            
            Return your answer in machine readable JSON format.
        """
        self.human = "{input}"
        self.prompt = ChatPromptTemplate.from_messages([("system", self.system_prompt), ("human", self.human)])
        
        # Use structured output with the chat pipeline
        self.chat_pipeline = self.prompt | self.chat.with_structured_output(SearchResults)
    

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
            query = (
                f"Find 4 educational web pages about {search_request.subject} {search_request.topics} "
                f"that contain practice questions or educational content. "
                f"PRIORITY: HTML web pages from educational institutions, OER sites, or academic resources. "
                f"AVOID: PDFs, sites requiring login, JavaScript-heavy sites, or sites with complex navigation. "
                f"PREFER: OpenStax, LibreTexts, Khan Academy, MIT OpenCourseWare, or similar educational platforms. "
                f"Each result must have 'title', 'url', and 'snippet' fields. "
                f"Ensure URLs are directly accessible and contain substantial text content."
            )
            
            # Call Perplexity with structured output
            results = self.chat_pipeline.invoke({"input": query})

            yield {
                "type": "final_response",
                "data": results,
            }
        except Exception as e:
            yield {
                "type": "error",
                "message": f"Error during search: {str(e)}",
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
    import asyncio

    async def _run():
        print("🤖 Initializing SearchAgent...")
        search_agent = SearchAgent(temperature=0.2, model="sonar")
        print("✅ SearchAgent initialized successfully")
        print("=" * 60)

        print("🔍 Starting search process...")
        print("=" * 60)

        async for event in search_agent.invoke(SearchRequest(
            subject="Biology",
            topics=["DNA replication"],
            num_questions_range=(2, 4),
            mode="practice"
        )):
            if event["type"] == "final_response":
                search_agent.print_results(event["data"])
                print("\n" + "=" * 60)
                print("🎉 Search completed successfully!")
                print(f"📊 Total results found: {len(event['data'].search_results)}")
                print("=" * 60)
            elif event["type"] == "error":
                print(f"❌ Error: {event['message']}")

    asyncio.run(_run())

if __name__ == "__main__":
    main()