from dotenv import load_dotenv

from agents.build_pipeline.search_agent import SearchAgent
from agents.build_pipeline.parser_agent import ParserAgent
from agents.build_pipeline.validator_agent import ValidatorAgent
from agents.models.search import PipelineData

load_dotenv()

async def search_step(data: PipelineData):
    """
    Step 1: Use SearchAgent to find relevant URLs - yields events during processing
    """
    try:
        search_agent = SearchAgent()
        search_results = None
        
        async for event in search_agent.invoke(data.search_request):
            if event['type'] == 'tool_call':
                yield {
                    'type': 'tool_call',
                    'tool': event['tool'],
                    'args': event['args'],
                    'id': event['id']
                }
            elif event['type'] == 'final_response':
                search_results = event['data']
            elif event['type'] == 'error':
                data.error_message = event['message']
                data.current_step = "search_failed"
                yield {'type': 'complete', 'data': data}
                return
        
        if search_results:
            data.search_results = search_results.search_results
            data.current_step = "search_completed"
            yield {'type': 'complete', 'data': data}
        else:
            data.error_message = "No search results found"
            data.current_step = "search_failed"
            yield {'type': 'complete', 'data': data}
        
    except Exception as e:
        data.error_message = f"Search step failed: {str(e)}"
        data.current_step = "search_failed"
        yield {'type': 'complete', 'data': data}

async def parse_step(data: PipelineData):
    """
    Step 2: Use ParserAgent to process URLs and extract questions - yields progress updates
    """
    try:
        if not data.search_results:
            data.error_message = "No search results available for parsing"
            data.current_step = "parse_failed"
            yield {'type': 'complete', 'data': data}
            return
        
        parser_agent = ParserAgent()
        
        parsed_results = None
        async for event in parser_agent.process_urls_parallel_with_progress(data.search_results, max_workers=4):
            if event['type'] == 'progress':
                yield {
                    'type': 'progress',
                    'message': event['message'],
                    'step': event.get('step', 'processing'),
                    'url': event.get('url'),
                    'current': event.get('current'),
                    'total': event.get('total'),
                    'chunks_count': event.get('chunks_count'),
                    'index_name': event.get('index_name'),
                    'max_workers': event.get('max_workers'),
                    'total_questions': event.get('total_questions')
                }
            elif event['type'] == 'error':
                yield {
                    'type': 'error',
                    'message': event['message'],
                    'url': event.get('url')
                }
            elif event['type'] == 'final_response':
                parsed_results = event['data']
        
        if parsed_results is not None:
            data.parsed_results = parsed_results
            data.current_step = "parse_completed"
            yield {'type': 'complete', 'data': data}
        else:
            data.error_message = "No parsed results generated"
            data.current_step = "parse_failed"
            yield {'type': 'complete', 'data': data}
        
    except Exception as e:
        data.error_message = f"Parse step failed: {str(e)}"
        data.current_step = "parse_failed"
        yield {'type': 'complete', 'data': data}

async def validate_step(data: PipelineData):
    """
    Step 3: Use ValidatorAgent to validate and structure questions - yields progress updates
    """
    try:
        if not data.parsed_results:
            data.error_message = "No parsed results available for validation"
            data.current_step = "validate_failed"
            yield {'type': 'complete', 'data': data}
            return
        
        validator = ValidatorAgent()
        
        yield {
            'type': 'progress',
            'message': f'Validating {len(data.parsed_results)} question sets...',
            'total': len(data.parsed_results)
        }
        
        # Validate questions
        validated_questions = None
        async for event in validator.validate_questions(
            search_request=data.search_request,
            scrape_output=data.parsed_results,
        ):
            if event['type'] == 'tool_call':
                yield {
                    'type': 'tool_call',
                    'tool': event['tool'],
                    'args': event['args'],
                    'id': event['id']
                }
            elif event['type'] == 'final_response':
                validated_questions = event['data']
            elif event['type'] == 'error':
                data.error_message = event['message']
                data.current_step = "validate_failed"
                yield {'type': 'complete', 'data': data}
                return
        
        if validated_questions:
            yield {
                'type': 'progress',
                'message': f'Validation completed. Generated {len(validated_questions.questions)} validated questions'
            }
        else:
            data.error_message = "No validated questions generated"
            data.current_step = "validate_failed"
            yield {'type': 'complete', 'data': data}
            return
        
        # Update data
        data.validated_questions = validated_questions
        data.current_step = "validate_completed"
        
        yield {'type': 'complete', 'data': data}
        
    except Exception as e:
        data.error_message = f"Validate step failed: {str(e)}"
        data.current_step = "validate_failed"
        yield {'type': 'complete', 'data': data}