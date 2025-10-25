from concurrent.futures import ThreadPoolExecutor, as_completed
import os
import re
from dotenv import load_dotenv
from elasticsearch import Elasticsearch
from elasticsearch.helpers import bulk
from pydantic import BaseModel
from pydantic.networks import HttpUrl
import requests
from unstructured.chunking.title import chunk_by_title
from unstructured.documents.elements import Element
from unstructured.partition.auto import partition

from agents.models.search import SearchResult

load_dotenv()

class ParserAgent:
    def __init__(self):
        self.elasticsearch_url = os.getenv("ELASTICSEARCH_URL")
        self.elasticsearch_api_key = os.getenv("ELASTICSEARCH_API_KEY")
        self.kibana_url = os.getenv("KIBANA_URL")
        
        self.es_client = Elasticsearch(
            self.elasticsearch_url,
            api_key=self.elasticsearch_api_key
        )
    
    def partition_and_chunk(self, url: HttpUrl) -> list[Element]:
        try:
            session = requests.Session()
            session.max_redirects = 5  # Limit redirects
            
            elements = partition(url=str(url), request_timeout=30, max_redirects=5)
            chunks = chunk_by_title(elements)
            return chunks
        except requests.exceptions.TooManyRedirects:
            print(f"Too many redirects for URL: {url}")
            return []
        except requests.exceptions.RequestException as e:
            print(f"Request error for URL {url}: {e}")
            return []
        except Exception as e:
            print(f"Error processing URL {url}: {e}")
            return []
    
    def create_elasticsearch_index_name(self, title: str) -> str:
        index_name = re.sub(r'[^a-zA-Z0-9_-]', '_', title)
        index_name = re.sub(r'_+', '_', index_name)  # Replace multiple underscores with single
        index_name = index_name.strip('_').lower()  # Remove leading/trailing underscores and lowercase
        if index_name and not index_name[0].isalpha():
            index_name = f"index_{index_name}"
        index_name = index_name[:255]
        return index_name
    
    def build_elasticsearch_index(self, chunks: list[Element], index_name: str) -> bool:
        def prepare_documents(chunks):
            for idx, chunk in enumerate(chunks):
                doc = {
                    "_index": index_name,
                    "_id": f"chunk_{idx}",
                    "_source": {
                        "text": chunk.text,
                        "category": chunk.category if hasattr(chunk, 'category') else None,
                        "metadata": {
                            "url": str(chunk.metadata.url) if hasattr(chunk.metadata, 'url') else None,
                            "page_number": chunk.metadata.page_number if hasattr(chunk.metadata, 'page_number') else None,
                            "image_url": chunk.metadata.image_url if hasattr(chunk.metadata, 'image_url') else None,
                            "image_coordinates": chunk.metadata.coordinates if hasattr(chunk.metadata, 'coordinates') else None,
                            "has_image": chunk.category == "Image",
                        }
                    }
                }
                yield doc

        print(f"Indexing {len(chunks)} chunks into {index_name}")
        try:
            success, failed = bulk(self.es_client, prepare_documents(chunks))
            print(f"Successfully indexed: {success} documents")
            print(f"Failed: {len(failed)} documents")
            return True
        except Exception as e:
            print(f"Error indexing chunks: {e}")
            return False
    
    def query_elastic_agent(self, input_text: str, agent_id: str = "test", connector_id=None, conversation_id=None, capabilities=None):
        url = f"{self.kibana_url}/api/agent_builder/converse"
        
        headers = {
            "Authorization": f"ApiKey {self.elasticsearch_api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "kbn-xsrf": "true"
        }
        
        body = {
            "input": input_text,
            "agent_id": agent_id
        }
        if connector_id is not None:
            body["connector_id"] = connector_id
        if conversation_id is not None:
            body["conversation_id"] = conversation_id
        if isinstance(capabilities, dict):
            body["capabilities"] = capabilities
        
        try:
            response = requests.post(url, headers=headers, json=body)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"Error calling Agent Builder converse: {e}")
            return None
    
    def process_single_url(self, result: SearchResult) -> dict:
        try:
            print(f"Processing: {result.title}")
            print(f"URL: {result.url}")
            
            print("Partitioning and chunking...")
            chunks = self.partition_and_chunk(result.url)
            
            if len(chunks) == 0:
                print("No chunks found")
                return {"success": False, "error": "No chunks found", "result": result}
            
            print("Building Elasticsearch index...")
            index_name = self.create_elasticsearch_index_name(result.title)
            if self.build_elasticsearch_index(chunks, index_name):
                print("Elasticsearch index built successfully")
            else:
                print("Elasticsearch index build failed")
                return {"success": False, "error": "Indexing failed", "result": result}
            
            print("Sending agent chat message...")
            prompt = f"""
                Find all questions and their corresponding images + answers(if they exist), return in json format for index: {index_name}
                Website title: {result.title}
                Website snippet: {result.snippet}

                if there are no questions, return an empty list.
            """
            res = self.query_elastic_agent(prompt, "question_parser")
            
            if res:
                print("Agent response received")
                return {
                    "success": True, 
                    "result": result, 
                    "index_name": index_name,
                    "chunks_count": len(chunks),
                    "agent_response": res["response"]["message"]
                }
            else:
                print("Agent chat message failed")
                return {"success": False, "error": "Agent chat failed", "result": result}
                
        except Exception as e:
            print(f"Error processing {result.title}: {e}")
            return {"success": False, "error": str(e), "result": result}
    
    def process_urls_parallel(self, search_results: list[SearchResult], max_workers: int = 4) -> list:
        print(f"Processing {len(search_results)} URLs in parallel...")
        
        practice_questions = []
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_to_result = {
                executor.submit(self.process_single_url, result): result 
                for result in search_results
            }
            
            for future in as_completed(future_to_result):
                result = future_to_result[future]
                try:
                    process_result = future.result()
                    if process_result["success"]:
                        print(f"✅ Successfully processed: {process_result['result'].title}")
                        practice_questions.append(process_result["agent_response"])
                    else:
                        print(f"❌ Failed to process: {process_result['result'].title} - {process_result['error']}")
                except Exception as e:
                    print(f"❌ Exception processing {result.title}: {e}")
        
        return practice_questions
    
    def print_summary(self, practice_questions: list):
        print("\n" + "="*50)
        print("QUESTIONS SUMMARY")
        print("="*50)
        print(f"Total practice questions generated: {len(practice_questions)}")
        for i, question in enumerate(practice_questions, 1):
            print(f"\nQuestion {i}:")
            print(question)
            print("-" * 30)

def main():
    search_results_data = [
        {
            "title":"Chapter 14 — Review Questions (Biology for AP® Courses, OpenStax)",
            "url":"https://openstax.org/books/biology-ap-courses/pages/14-review-questions",
            "snippet":"End-of-chapter review questions for Chapter 14 (DNA Structure and Function) — freely available practice questions on DNA replication concepts (OpenStax, OER)."},
        {
            "title":"Chapter 14 — Critical Thinking Questions (Biology for AP® Courses, OpenStax)",
            "url":"https://openstax.org/books/biology-ap-courses/pages/14-critical-thinking-questions",
            "snippet":"Critical thinking and application questions for Chapter 14 covering DNA replication mechanisms and enzyme roles (OpenStax, open educational resource)."},
        {
            "title":"Chapter 14 — Test Prep for AP® Courses (Biology for AP® Courses, OpenStax)",
            "url":"https://openstax.org/books/biology-ap-courses/pages/14-test-prep-for-ap-r-courses",
            "snippet":"AP-style practice and science-practice challenge questions related to DNA replication and associated topics (OpenStax test-prep materials, openly accessible)."},
        {
            "title":"14.E: DNA Structure and Function (Exercises) — Biology (LibreTexts)",
            "url":"https://bio.libretexts.org/Bookshelves/Introductory_and_General_Biology/General_Biology_1e_(OpenStax)/3:_Genetics/14:_DNA_Structure_and_Function/14.E:_DNA_Structure_and_Function_(Exercises)",
            "snippet":"Exercise set on DNA structure and replication (questions on base-pairing, replication models, Meselson–Stahl experiment) — LibreTexts open educational resource."},
        {
            "title":"1.30: DNA, RNA, and DNA Replication — Microbiology Laboratory Manual (LibreTexts)",
            "url":"https://bio.libretexts.org/Bookshelves/Microbiology/Microbiology_Laboratory_Manual_(Hartline)/01:_Labs/1.30:_DNA_RNA_and_DNA_Replication",
            "snippet":"Lab exercise with practice questions/activities modeling DNA replication, primer use, and complementary-strand synthesis — LibreTexts OER."}
    ]
    
    # Convert to SearchResult objects
    search_results = []
    for result_data in search_results_data:
        search_results.append(SearchResult(**result_data))
    
    print("Initializing ParserAgent...")
    parser_agent = ParserAgent()
    
    print("Starting parallel processing of biology DNA replication URLs...")
    print("=" * 60)
    
    # Process URLs in parallel
    practice_questions = parser_agent.process_urls_parallel(search_results, max_workers=3)
    
    # Print summary
    parser_agent.print_summary(practice_questions)
    
    print("\n" + "=" * 60)
    print("Processing completed!")

if __name__ == "__main__":
    main()