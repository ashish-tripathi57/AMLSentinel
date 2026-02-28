import secrets

from fastapi import HTTPException, Request, status

# Hardcoded analyst credentials for initial development.
# In production, these would come from a database with hashed passwords.
ANALYSTS: dict[str, dict[str, str]] = {
    "sarah.chen": {
        "password": "analyst123",
        "full_name": "Sarah Chen",
        "role": "Senior Analyst",
    },
    "mike.rodriguez": {
        "password": "analyst123",
        "full_name": "Mike Rodriguez",
        "role": "Analyst",
    },
    "priya.sharma": {
        "password": "analyst123",
        "full_name": "Priya Sharma",
        "role": "Lead Analyst",
    },
}

# In-memory store mapping active tokens to usernames.
active_tokens: dict[str, str] = {}


def authenticate_analyst(username: str, password: str) -> dict | None:
    """Verify analyst credentials and return analyst info if valid.

    Returns a dict with username, full_name, and role on success, or None
    if the username does not exist or the password is incorrect.
    """
    analyst = ANALYSTS.get(username)
    if analyst is None or analyst["password"] != password:
        return None
    return {
        "username": username,
        "full_name": analyst["full_name"],
        "role": analyst["role"],
    }


def create_token(username: str) -> str:
    """Generate a cryptographically secure token and associate it with the analyst."""
    token = secrets.token_hex(32)
    active_tokens[token] = username
    return token


def revoke_token(token: str) -> None:
    """Remove a token from the active tokens store."""
    active_tokens.pop(token, None)


def get_current_analyst(request: Request) -> dict:
    """FastAPI dependency that extracts and validates the Bearer token.

    Raises HTTPException 401 if no token is provided or the token is invalid.
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    token = auth_header.removeprefix("Bearer ")
    username = active_tokens.get(token)
    if username is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    analyst = ANALYSTS[username]
    return {
        "username": username,
        "full_name": analyst["full_name"],
        "role": analyst["role"],
    }
