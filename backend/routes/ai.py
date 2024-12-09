from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from enum import Enum
from singletons.data import data
import openai
import os
import io
import requests
import base64

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
    
class CustomPersonaRequest(BaseModel):
    student_data: str
    parent_data: str
    teacher_data: str

@router.get("/ai")
async def ai_get():
    """
    Test GET endpoint for AI route
    """
    return {"status": "ok", "message": "AI endpoint working"}

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
async def create_persona(request: CustomPersonaRequest):
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
        {request.student_data}
        
        INFORMATION OF STUDENT FROM PARENT:
        {request.parent_data}
        
        INFORMATION OF STUDENT FROM TEACHER:
        {request.teacher_data}

        Please fill in the template with appropriate information based on the following data:
        The below shows the sample template which you have to follow strictly:
        {persona_template}
        
        Return only the filled XML template without any additional text."""

        print(f"Making API call with prompt...")
        response = client.chat.completions.create(
            model="gpt-4o",  
            messages=[
                {"role": "user", "content": base_prompt}
            ]
        )
        print("API call successful")

        response_text = response.choices[0].message.content
        print(f"Got response text: {response_text}...")
        data["initial_data"]["student_persona"] = response_text
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