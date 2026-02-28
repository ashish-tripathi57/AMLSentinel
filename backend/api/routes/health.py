from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/api/health")
async def health_check() -> dict:
    """Return service liveness status."""
    return {"status": "healthy", "service": "AML Sentinel API"}
