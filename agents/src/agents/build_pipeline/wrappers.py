from dotenv import load_dotenv
from pydantic import BaseModel, Field
from typing import List, Optional

from agents.build_pipeline.search_agent import SearchAgent, SearchResult
from agents.build_pipeline.parser_agent import ParserAgent, SearchResult as ParseSearchResult
from agents.build_pipeline.validator_agent import ValidatorAgent
from agents.models.search import PipelineData

load_dotenv()

def search_step(data: PipelineData) -> PipelineData:
    """
    Step 1: Use SearchAgent to find relevant URLs
    """
    try:
        print("🔍 STEP 1: SEARCHING FOR RELEVANT URLs")
        print("=" * 60)
        
        # Initialize search agent
        search_agent = SearchAgent()
        
        search_query = data.search_request.model_dump()

        print(f"📝 Search Query: {search_query}")
        
        # Perform search
        search_results = search_agent.invoke(search_query)
        
        print(f"✅ Found {len(search_results.search_results)} search results")
        
        # Update data
        data.search_results = search_results.search_results
        data.current_step = "search_completed"
        
        return data
        
    except Exception as e:
        print(f"❌ Error in search step: {e}")
        data.error_message = f"Search step failed: {str(e)}"
        data.current_step = "search_failed"
        return data

def parse_step(data: PipelineData) -> PipelineData:
    """
    Step 2: Use ParserAgent to process URLs and extract questions
    """
    try:
        print("\n🕷️ STEP 2: PARSINGING URLs FOR QUESTIONS")
        print("=" * 60)
        
        if not data.search_results:
            print("❌ No search results to parsing")
            data.error_message = "No search results available for parsing"
            data.current_step = "parsing_failed"
            return data
        
        # Initialize parse agent
        parser_agent = ParserAgent()
        
        # Convert SearchResult to ParseSearchResult format
        parsed_input = []
        for result in data.search_results:
            parsed_input.append(ParseSearchResult(
                url=result.url,
                title=result.title,
                snippet=result.snippet
            ))
        
        print(f"📊 Processing {len(parsed_input)} URLs...")
        
        # Process URLs in parallel
        parsed_results = parser_agent.process_urls_parallel(parsed_input, max_workers=3)
        
        print(f"✅ Parsing completed. Generated {len(parsed_results)} question sets")
        
        # Update data
        data.parsed_results = parsed_results
        data.current_step = "parse_completed"
        
        return data
        
    except Exception as e:
        print(f"❌ Error in parse step: {e}")
        data.error_message = f"Parse step failed: {str(e)}"
        data.current_step = "parse_failed"
        return data

def validate_step(data: PipelineData) -> PipelineData:
    """
    Step 3: Use ValidatorAgent to validate and structure questions
    """
    try:
        print("\n✅ STEP 3: VALIDATING QUESTIONS")
        print("=" * 60)
        
        if not data.parsed_results:
            print("❌ No parsed results to validate")
            data.error_message = "No parsed results available for validation"
            data.current_step = "validate_failed"
            return data
        
        # Initialize validator agent
        validator = ValidatorAgent()
        
        print(f"📊 Validating {len(data.parsed_results)} question sets...")
        
        # Validate questions
        validated_questions = validator.validate_questions(
            search_request=data.search_request,
            scrape_output=data.parsed_results,
        )
        
        print(f"✅ Validation completed. Generated {len(validated_questions.questions)} validated questions")
        
        # Update data
        data.validated_questions = validated_questions
        data.current_step = "validate_completed"
        
        return data
        
    except Exception as e:
        print(f"❌ Error in validate step: {e}")
        data.error_message = f"Validate step failed: {str(e)}"
        data.current_step = "validate_failed"
        return data