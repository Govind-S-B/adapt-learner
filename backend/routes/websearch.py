from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
import openai
import os
import chromadb
from chromadb.config import Settings
import json

router = APIRouter()

# Pydantic models
class WebSearchRequest(BaseModel):
    prompt: str
    image_base64: str

class SearchResult(BaseModel):
    chat_response: str
    sources: List[str]

# Initialize ChromaDB client in-memory
chroma_client = chromadb.Client(Settings(is_persistent=False))
collection = chroma_client.create_collection(name="web_search_results")

async def generate_search_queries(prompt: str, image_base64: str, user_persona: str) -> List[str]:
    """Generate search queries using GPT-4V based on the image and prompt"""
    client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    
    system_prompt = f"""Given the user's request and an image of their study material, generate {3} specific search queries 
    that would help find relevant information online. Return the queries in a JSON array format.
    Consider the user's learning style and needs: {user_persona}"""
    
    response = client.chat.completions.create(
        model="gpt-4-vision-preview",
        messages=[
            {
                "role": "system",
                "content": system_prompt
            },
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{image_base64}"
                        }
                    }
                ]
            }
        ],
        response_format={"type": "json_object"}
    )
    
    result = json.loads(response.choices[0].message.content)
    return result.get("queries", [])

async def get_top_urls(query: str) -> List[str]:
    """Get top URLs from Google search API (placeholder)"""
    # TODO: Implement actual Google Search API integration
    return [f"http://example.com/result_{i}_{query}" for i in range(3)]

async def scrape_url(url: str) -> str:
    """Scrape content from URL (placeholder)"""
    # TODO: Implement actual web scraping
    return f"Sample content scraped from {url}"

async def process_and_store_content(content: str, source_url: str):
    """Process content and store in ChromaDB"""
    # TODO: Implement actual content chunking
    chunks = [content[i:i+500] for i in range(0, len(content), 500)]
    
    # Store chunks in ChromaDB with metadata
    for i, chunk in enumerate(chunks):
        collection.add(
            documents=[chunk],
            metadatas=[{"source_url": source_url}],
            ids=[f"{source_url}_{i}"]
        )

@router.post("/websearch")
async def web_search(request: WebSearchRequest) -> SearchResult:
    """Main endpoint for web search functionality"""
    try:
        # Generate search queries using GPT-4V
        search_queries = await generate_search_queries(
            request.prompt,
            request.image_base64,
            "default_persona"  # TODO: Get from data singleton
        )
        
        # Get URLs for each query
        all_urls = []
        for query in search_queries:
            urls = await get_top_urls(query)
            all_urls.extend(urls)
        
        # Scrape and store content
        for url in all_urls:
            content = await scrape_url(url)
            await process_and_store_content(content, url)
        
        # Perform similarity search
        query_embedding = "TODO"  # TODO: Get embedding from Together AI
        results = collection.query(
            query_texts=[request.prompt],
            n_results=5
        )
        
        # Generate final response with GPT-4
        context = "\n".join(results['documents'][0])
        sources = [meta["source_url"] for meta in results['metadatas'][0]]
        
        client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful AI tutor. Use the provided context to answer the user's question."
                },
                {
                    "role": "user",
                    "content": f"Context:\n{context}\n\nQuestion: {request.prompt}"
                }
            ]
        )
        
        return SearchResult(
            chat_response=response.choices[0].message.content,
            sources=sources
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 