from fastapi import FastAPI
from routes import debug, ai
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

app = FastAPI()

# Include routers
app.include_router(debug.router)
app.include_router(ai.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app, 
        host=os.getenv("API_HOST", "0.0.0.0"),
        port=int(os.getenv("API_PORT", 8000))
    )
