from fastapi import APIRouter, Depends, HTTPException, Request, status

from api.core.auth import (
    authenticate_analyst,
    create_token,
    get_current_analyst,
    revoke_token,
)
from api.schemas.auth import AnalystInfo, LoginRequest, LoginResponse, LogoutResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
async def login(credentials: LoginRequest) -> LoginResponse:
    """Authenticate an analyst and return an access token."""
    analyst_info = authenticate_analyst(credentials.username, credentials.password)
    if analyst_info is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )
    token = create_token(credentials.username)
    return LoginResponse(
        token=token,
        analyst=AnalystInfo(**analyst_info),
    )


@router.post("/logout", response_model=LogoutResponse)
async def logout(request: Request) -> LogoutResponse:
    """Invalidate the current analyst's access token."""
    auth_header = request.headers.get("Authorization", "")
    token = auth_header.removeprefix("Bearer ")
    revoke_token(token)
    return LogoutResponse(message="Logged out successfully")


@router.get("/me", response_model=AnalystInfo)
async def me(analyst: dict = Depends(get_current_analyst)) -> AnalystInfo:
    """Return the currently authenticated analyst's profile."""
    return AnalystInfo(**analyst)
