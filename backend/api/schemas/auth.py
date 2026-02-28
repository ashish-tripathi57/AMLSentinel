from pydantic import BaseModel


class LoginRequest(BaseModel):
    """Schema for analyst login credentials."""

    username: str
    password: str


class AnalystInfo(BaseModel):
    """Public analyst profile information returned in API responses."""

    username: str
    full_name: str
    role: str


class LoginResponse(BaseModel):
    """Schema returned on successful authentication."""

    token: str
    analyst: AnalystInfo


class LogoutResponse(BaseModel):
    """Schema returned on successful logout."""

    message: str
