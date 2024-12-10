from fastapi import APIRouter, HTTPException, UploadFile, File, Response
from pydantic import BaseModel
from enum import Enum
from singletons.data import data
import openai
import os
import io
import requests
import base64
from typing import List
import textwrap
import aiohttp
import json

router = APIRouter()

class Role(str, Enum):
    TEACHER = "teacher"
    PARENT = "parent"
    STUDENT = "student"

class PromptRequest(BaseModel):
    prompt: str

class InitialDataRequest(BaseModel):
    role: Role
    audio: str
    
class MultiModal(BaseModel):
    prompt: str
    image_base64: str

class TextToSpeechRequest(BaseModel):
    text: str

class ImageGenerationRequest(BaseModel):
    prompt: str
    width: int = 1024
    height: int = 768
    steps: int = 1
    n: int = 1

class FeedbackRequest(BaseModel):
    request: str
    material: str
    output: str
    feedback: str

@router.get("/ai")
async def ai_get():
    """
    Test GET endpoint for AI route
    """
    return {"status": "ok", "message": "AI endpoint working"}

@router.post("/ai/call-multimodal")
async def multimodal_call(request: MultiModal):
    """
    Endpoint to call OpenAI API with a prompt and a base64-encoded image.
    """
    try:
        print("Setting OpenAI API key...")  
        client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        print("Client initialized")
        
        if not client.api_key:
            raise HTTPException(status_code=500, detail="OpenAI API key not configured")

        # Clean the base64 string if it contains the data URL prefix
        base64_image = request.image_base64
        if ',' in base64_image:
            base64_image = base64_image.split(',')[1]

        # Prepare the API request
        print("Making API call with vision model...")
        
        prompt=f'''You are given a user quesry and a custom persona. The persona is of a student and the query is the 
        student asking questions related to his study materials. the uploaded image is a small snippet of what the student is 
        learning and want personalisation in. Your job is to create a relevant answer suitable to the users query and image, 
        the generated answer should strictly be aligned with the user persona of the student. In your output,
        also generate a prompt to generate an image relevant to the users query and materials. Also generate a summary scrip of 
        the response which will be later converted to audio. DONOT ADD SPECIAL CHARACTERS to the responses. STRICTLY ALIGN TO THE FORMAT GIVEN
        
        THE USER QUERY :
        {request.prompt}
        
        THE USER PERSONA :
        {data['student_persona']}
        
        The output should be strictly in the following format: 
        
        CHAT_RESPONSE :
        <answer to users query with his persona in mind>
        
        IMAGE_PROMPT :
        <prompt to generate an image relevant to the users query and materials>
        
        SUMMARY_SCRIPT :
        <summary script of the response which will be later converted to audio>
        
        '''
        
        response = client.chat.completions.create(
            model="gpt-4o",  # Using the correct model name
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": prompt 
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}"
                            }
                        }
                    ]
                }
            ],
            max_tokens=300  # Limiting response length
        )

        if not response.choices:
            raise HTTPException(status_code=500, detail="No response generated from the model")

        response_text = response.choices[0].message.content
        print(f"Got response text: {response_text[:50]}...")

        # Extract content under CHAT_RESPONSE
        chat_response = ""
        image_prompt = ""  # Initialize image prompt variable
        
        if "CHAT_RESPONSE" in response_text:
            print("Found CHAT_RESPONSE marker")
            sections = response_text.split("CHAT_RESPONSE")
            if len(sections) > 1:
                chat_response = sections[1].split("IMAGE_PROMPT")[0].strip()
                print(f"Extracted chat response: {chat_response[:50]}...")
        else:
            print("CHAT_RESPONSE marker not found in:", response_text)

        if "IMAGE_PROMPT" in response_text:
            print("Found IMAGE_PROMPT marker")
            sections = response_text.split("IMAGE_PROMPT")
            if len(sections) > 1:
                image_prompt = sections[1].strip()
                print(f"Extracted image prompt: {image_prompt[:50]}...")
        else:
            print("IMAGE_PROMPT marker not found in response")
            
        # Generate image using the extracted prompt
        generated_image = None
        image_base64 = None
        if image_prompt:
            try:
                response = await generate_image(image_prompt)
                if isinstance(response, Response):
                    # Convert binary image data to base64
                    image_base64 = base64.b64encode(response.body).decode('utf-8')
                    # Add the image to the chat response in markdown format
                    chat_response += f"\n\n![Generated Image](data:image/png;base64,{image_base64})"
                print("Successfully generated image from prompt")
                print(f"Generated image base64: {image_base64[:50]}...")
            except Exception as e:
                print(f"Error generating image: {str(e)}")
                # Continue execution even if image generation fails

        return {
            "status": "success",
            "response": chat_response,
            "image_prompt": image_prompt,
            "image_base64": image_base64
            }

    except openai.APIError as e:
        print(f"OpenAI API Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"OpenAI API Error: {str(e)}")
    except ValueError as e:
        print(f"Value Error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Invalid request format: {str(e)}")
    except Exception as e:
        print(f"Unexpected Error: {type(e).__name__}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

@router.post("/ai/call-llm")
async def call_llm(request: PromptRequest):
    """
    Endpoint to call OpenAI API with a prompt
    """
    try:
        print("Setting OpenAI API key...")
        client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        print("Client initialized")
        
        if not client.api_key:
            raise HTTPException(status_code=500, detail="OpenAI API key not configured")

        print(f"Making API call with prompt: {request.prompt[:50]}...")
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "user", "content": request.prompt}
            ]
        )
        print("API call successful")

        response_text = response.choices[0].message.content
        print(f"Got response text: {response_text[:50]}...")

        return {
            "status": "success",
            "response": response_text
        }

    except Exception as e:
        print(f"Error occurred: {type(e).__name__}")
        print(f"Error details: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))    


@router.post("/ai/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    """
    Endpoint to transcribe audio using Groq API
    """
    try:
        buffer_data = await file.read()
        print(f"Received audio file: {file.filename}, size: {len(buffer_data)} bytes")
        
        groq_api_key = os.getenv("GROQ_API_KEY")
        if not groq_api_key:
            raise HTTPException(status_code=500, detail="Groq API key not configured")

        try:
            transcribed_text = groq_transcribe(buffer_data, groq_api_key)
            print(f"Transcription result: {transcribed_text}")

            return {
                "status": "success",
                "transcription": transcribed_text
            }

        except Exception as e:
            print(f"Transcription error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

    except Exception as e:
        print(f"Upload error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"File upload failed: {str(e)}")

@router.post("/ai/set-initial-data")
async def set_initial_data(request: InitialDataRequest):
    """
    Endpoint to set initial data for a specific role using audio input
    """
    try:
        if "initial_data" not in data:
            data["initial_data"] = {}

        # Decode base64 string to bytes
        audio_bytes = base64.b64decode(request.audio)
        
        groq_api_key = os.getenv("GROQ_API_KEY")
        if not groq_api_key:
            raise HTTPException(status_code=500, detail="Groq API key not configured")

        # Convert bytes to transcribed text
        transcribed_text = groq_transcribe(audio_bytes, groq_api_key)
        
        data["initial_data"][request.role.value] = transcribed_text

        print(data)
        
        return {
            "status": "success",
            "role": request.role,
            "transcribed_text": transcribed_text
        }

    except Exception as e:
        print(f"Error in set_initial_data: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    
@router.post("/ai/create-user-persona")
async def create_persona():
    try:
        print("Reading persona template...")
        template_path = os.path.join(os.path.dirname(__file__), 'persona_template.xml')
        with open(template_path, 'r') as f:
            persona_template = f.read()

        print("Setting OpenAI API key...")
        client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        print("Client initialized")
        
        if not client.api_key:
            raise HTTPException(status_code=500, detail="OpenAI API key not configured")

        base_prompt = f"""
        You are an expert people persona creator. You can create a custom user persona based on the data provided for a student.
        The below data gives the details of a student in the perspective of his teacher, parent and the student himself.
        The information about the student are as follows with respect to different roles:
        
        INFORMATION FROM STUDENT HIMSELF:
        {data['initial_data']["student"]}
        
        INFORMATION OF STUDENT FROM PARENT:
        {data['initial_data']["parent"]}
        
        INFORMATION OF STUDENT FROM TEACHER:
        {data['initial_data']["teacher"]}

        Please fill in the template with appropriate information based on the following data:
        The below shows the sample template which you have to follow strictly:
        {persona_template}
        
        Return only the filled XML template without any additional text."""

        print(f"Making API call with prompt...")
        print(base_prompt)

        response = client.chat.completions.create(
            model="gpt-4o",  
            messages=[
                {"role": "user", "content": base_prompt}
            ]
        )
        print("API call successful")

        response_text = response.choices[0].message.content
        print(f"Got response text: {response_text}...")
        data["student_persona"] = response_text
        print(data)


        return {
            "status": "success",
            "response": response_text
        }

    except FileNotFoundError:
        print("Persona template file not found")
        raise HTTPException(status_code=500, detail="Persona template file not found")
    except Exception as e:
        print(f"Error occurred: {type(e).__name__}")
        print(f"Error details: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

async def evaluator(user_persona, request, material_image_url, output, feedback):
    """
    Evaluates an interaction and returns a score and reason using GPT-4V
    
    Args:
        user_persona (str): The student's persona
        request (str): The student's original request
        material_image_url (str): URL or base64 of the image being worked with
        output (str): The response given to the student
        feedback (str): The student's feedback on the response
    
    Returns:
        tuple: (score, reason)
    """
    try:
        client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        
        prompt = f"""You are an expert evaluator of a student's learning.
        Evaluate the interaction and return ONLY a JSON object with exactly two fields:
        - score: a number between 0 and 100
        - reason: a brief explanation for the score

        Consider:
        1. How well the response matched the student's persona
        2. How accurately the image was interpreted
        3. How helpful the response was based on the student's feedback

        DO NOT include any other text besides the JSON object."""

        response = client.chat.completions.create(
            model="gpt-4-vision-preview",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": prompt
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": material_image_url
                            }
                        },
                        {
                            "type": "text",
                            "text": f"""STUDENT PERSONA: {user_persona}
                            STUDENT REQUEST: {request}
                            OUTPUT GIVEN: {output}
                            STUDENT FEEDBACK: {feedback}"""
                        }
                    ]
                }
            ],
            max_tokens=300,
            response_format={ "type": "json_object" }  # Enforce JSON output
        )

        result = json.loads(response.choices[0].message.content)
        return (result["score"], result["reason"])

    except Exception as e:
        print(f"Error in evaluator: {str(e)}")
        return (0, f"Evaluation failed: {str(e)}")

def optimize_prompt(history, user_persona):
    """
    Function that optimizes the user persona based on interaction history
    """
    try:
        client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        
        # Create a filtered version of history without image URLs
        filtered_history = [{
            "request": item["request"],
            "output": item["output"],
            "feedback": item["feedback"],
            "score": item.get("score", {})
        } for item in history]
        
        prompt = f"""You are an expert in analyzing learning interactions and optimizing student personas.
        Based on the provided interaction history and current user persona, create an optimized version of the persona
        that addresses any weaknesses or gaps identified in the learning process.

        Current User Persona:
        {user_persona}

        Interaction History:
        {json.dumps(filtered_history, indent=2)}

        Analyze the scores and feedback in the history to identify:
        1. Areas where responses didn't match the student's needs
        2. Patterns in successful interactions
        3. Common themes in feedback
        4. Score patterns and their reasons

        Return ONLY a JSON object with a single key 'new_user_persona' containing the optimized persona.
        The new persona should maintain the same XML structure as the original but with optimized content."""

        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "user", "content": prompt}
            ],
            response_format={ "type": "json_object" }
        )

        result = json.loads(response.choices[0].message.content)
        return result["new_user_persona"]

    except Exception as e:
        print(f"Error in optimize_prompt: {str(e)}")
        return user_persona  # Return original persona if optimization fails

@router.post("/ai/learn")
async def learn():
    """
    Endpoint to evaluate and optimize the learning process based on history
    """
    try:
        if "history" not in data or "user_persona" not in data:
            raise HTTPException(status_code=400, detail="History or user persona not found in data")

        threshold = 60  # Score threshold for success
        max_iterations = 5  # Maximum number of optimization attempts

        for iteration in range(max_iterations):
            total_score = 0
            
            # Score each interaction in history
            for interaction in data["history"]:
                score_data = await evaluator(
                    data["user_persona"],
                    interaction.get("request"),
                    interaction.get("material"),
                    interaction.get("output"),
                    interaction.get("feedback")
                )
                interaction["score"] = {
                    "value": score_data[0],  # Numeric score
                    "reason": score_data[1]  # Reason for the score
                }
                total_score += score_data[0]
            
            # Calculate average score
            average_score = total_score / len(data["history"])
            
            # If average score is above threshold, we're done
            if average_score >= threshold:
                # Clear history before returning
                data["history"] = []
                return {
                    "status": "success",
                    "message": "Learning optimization complete",
                    "final_score": average_score
                }
            
            # Otherwise, optimize the user persona
            data["user_persona"] = optimize_prompt(data["history"], data["user_persona"])
        
        # If we reach here, we've hit max iterations without success
        raise HTTPException(
            status_code=400, 
            detail=f"Failed to achieve target score after {max_iterations} optimization attempts"
        )

    except Exception as e:
        print(f"Error in learn endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

def groq_transcribe(buffer_data, api_key):
    url = "https://api.groq.com/openai/v1/audio/transcriptions"
    headers = {
        "Authorization": f"Bearer {api_key}"
    }
    files = {
        "file": ("audio.mp3", io.BytesIO(buffer_data), "audio/mpeg"),
        "model": (None, "whisper-large-v3"),
        "response_format": (None, "verbose_json")
    }
    
    response = requests.post(url, headers=headers, files=files)
    
    if response.status_code == 200:
        transcribe = response.json()
        transcribed_str = transcribe['text']
    else:
        raise Exception(f"Groq API request failed with status code {response.status_code}: {response.text}")
    
    return transcribed_str 

@router.post("/ai/gen-audio")
async def generate_audio(request: TextToSpeechRequest):
    """
    Endpoint to convert text to speech using Deepgram API
    """
    try:
        deepgram_api_key = os.getenv("DEEPGRAM_API_KEY")
        if not deepgram_api_key:
            raise HTTPException(status_code=500, detail="Deepgram API key not configured")

        # Split text into chunks of 2000 characters
        text_chunks = textwrap.wrap(request.text, 2000, break_long_words=False, break_on_hyphens=False)
        
        audio_chunks: List[bytes] = []
        
        async with aiohttp.ClientSession() as session:
            for chunk in text_chunks:
                headers = {
                    "Authorization": f"Token {deepgram_api_key}",
                    "Content-Type": "text/plain"
                }
                
                url = "https://api.deepgram.com/v1/speak?model=aura-asteria-en"
                
                async with session.post(url, headers=headers, data=chunk) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        raise HTTPException(
                            status_code=response.status,
                            detail=f"Deepgram API request failed: {error_text}"
                        )
                    
                    audio_chunk = await response.read()
                    audio_chunks.append(audio_chunk)
        
        # Combine all audio chunks
        combined_audio = b''.join(audio_chunks)
        
        # Return the audio as a response with appropriate headers
        return Response(
            content=combined_audio,
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": "attachment; filename=generated_audio.mp3"
            }
        )

    except Exception as e:
        print(f"Error in generate_audio: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 

@router.post("/ai/gen-image")
async def generate_image(request: ImageGenerationRequest):
    """
    Endpoint to generate images using Together AI API
    """
    try:
        together_api_key = os.getenv("TOGETHER_API_KEY")
        if not together_api_key:
            raise HTTPException(status_code=500, detail="Together AI API key not configured")

        url = "https://api.together.xyz/v1/images/generations"
        headers = {
            "Authorization": f"Bearer {together_api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": "black-forest-labs/FLUX.1-schnell-Free",
            "prompt": request.prompt,
            "width": request.width,
            "height": request.height,
            "steps": request.steps,
            "n": request.n,
            "response_format": "b64_json"
        }

        async with aiohttp.ClientSession() as session:
            async with session.post(url, headers=headers, json=payload) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise HTTPException(
                        status_code=response.status,
                        detail=f"Together AI API request failed: {error_text}"
                    )
                
                result = await response.json()
                
                # Extract base64 image data
                if "data" in result and len(result["data"]) > 0:
                    image_data = result["data"][0]["b64_json"]
                    
                    # Return the image with appropriate headers
                    return Response(
                        content=base64.b64decode(image_data),
                        media_type="image/png",
                        headers={
                            "Content-Disposition": "attachment; filename=generated_image.png"
                        }
                    )
                else:
                    raise HTTPException(
                        status_code=500,
                        detail="No image data received from API"
                    )

    except Exception as e:
        print(f"Error in generate_image: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 
    
    
async def generate_image(query):
    """
    Endpoint to generate images using Together AI API
    """
    try:
        together_api_key = os.getenv("TOGETHER_API_KEY")
        if not together_api_key:
            raise HTTPException(status_code=500, detail="Together AI API key not configured")

        url = "https://api.together.xyz/v1/images/generations"
        headers = {
            "Authorization": f"Bearer {together_api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": "black-forest-labs/FLUX.1-schnell-Free",
            "prompt": query,
            "width": 1024,
            "height": 768,
            "steps": 1,
            "n": 1,
            "response_format": "b64_json"
        }

        async with aiohttp.ClientSession() as session:
            async with session.post(url, headers=headers, json=payload) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise HTTPException(
                        status_code=response.status,
                        detail=f"Together AI API request failed: {error_text}"
                    )
                
                result = await response.json()
                
                # Extract base64 image data
                if "data" in result and len(result["data"]) > 0:
                    image_data = result["data"][0]["b64_json"]
                    
                    # Return the image with appropriate headers
                    return Response(
                        content=base64.b64decode(image_data),
                        media_type="image/png",
                        headers={
                            "Content-Disposition": "attachment; filename=generated_image.png"
                        }
                    )
                else:
                    raise HTTPException(
                        status_code=500,
                        detail="No image data received from API"
                    )

    except Exception as e:
        print(f"Error in generate_image: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 

@router.post("/ai/feedback")
async def store_feedback(feedback_data: FeedbackRequest):
    """
    Endpoint to store interaction feedback in history
    """
    try:
        # Create history entry
        history_entry = {
            "request": feedback_data.request,
            "material": feedback_data.material,
            "output": feedback_data.output,
            "feedback": feedback_data.feedback
        }
        
        # Add to history array in data singleton
        data["history"].append(history_entry)
        
        return {
            "status": "success",
            "message": "Feedback stored successfully"
        }

    except Exception as e:
        print(f"Error storing feedback: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 