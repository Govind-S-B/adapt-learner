from fastapi import APIRouter

router = APIRouter()

@router.get("/debug")
async def debug():
    """
    Debug endpoint that returns a test response
    """
    return {"status": "ok", "message": "Debug endpoint working"}