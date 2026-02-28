"""
Integration tests for the Gemini API client wrapper (api/services/ai_client.py).

These tests call the REAL Gemini API — no mocks.  Ensure GEMINI_API_KEY
is present in the environment or .env file before running.

Run:
    cd /Users/ashishtripathi/Workspaces/AMLSentinel/backend
    .venv/bin/python -m pytest api/tests/test_services/test_ai_client.py -v
"""

import os

import pytest

from api.core.config import settings
from api.services.ai_client import AIClient, GeminiAPIError
from api.tests.test_services.conftest import skip_on_ai_transient_error

# Marker to skip tests that call the real Gemini API.
# Run these explicitly with: RUN_REAL_API_TESTS=1 pytest
requires_api_key = pytest.mark.skipif(
    not os.environ.get("RUN_REAL_API_TESTS"),
    reason="Skipped by default to conserve API quota. Set RUN_REAL_API_TESTS=1 to run.",
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_client(api_key: str | None = None) -> AIClient:
    """Construct an AIClient using the real settings model, optionally overriding the key."""
    key = api_key if api_key is not None else settings.GEMINI_API_KEY
    return AIClient(api_key=key, model=settings.GEMINI_MODEL)


# ---------------------------------------------------------------------------
# Text generation
# ---------------------------------------------------------------------------

@requires_api_key
@skip_on_ai_transient_error
async def test_generate_text_returns_non_empty_string():
    """A simple prompt should return a non-empty string response."""
    client = make_client()
    result = await client.generate_text(
        system_prompt="You are a helpful assistant.",
        user_message="Say hello.",
    )
    assert isinstance(result, str)
    assert len(result.strip()) > 0


@requires_api_key
@skip_on_ai_transient_error
async def test_generate_text_respects_system_prompt():
    """The system prompt should influence response style (pirate persona test)."""
    client = make_client()
    result = await client.generate_text(
        system_prompt=(
            "You are a pirate. Always respond using pirate speech with words like "
            "'Ahoy', 'matey', 'arr', 'ye', 'landlubber', or similar pirate expressions."
        ),
        user_message="Say hello.",
    )
    pirate_words = {"ahoy", "matey", "arr", "ye", "landlubber", "avast", "scallywag", "plank"}
    response_lower = result.lower()
    assert any(word in response_lower for word in pirate_words), (
        f"Expected pirate language in response, got: {result!r}"
    )


# ---------------------------------------------------------------------------
# JSON generation
# ---------------------------------------------------------------------------

@requires_api_key
@skip_on_ai_transient_error
async def test_generate_json_returns_valid_dict():
    """When instructed to return JSON, the response should parse to a dict."""
    client = make_client()
    result = await client.generate_json(
        system_prompt=(
            'You are a JSON API. Respond ONLY with a valid JSON object: {"status": "ok"}. '
            "No explanation. No markdown. Just the raw JSON."
        ),
        user_message="Return the status object.",
    )
    assert isinstance(result, dict)
    assert result.get("status") == "ok"



# ---------------------------------------------------------------------------
# Streaming generation
# ---------------------------------------------------------------------------

@requires_api_key
@skip_on_ai_transient_error
async def test_generate_streaming_yields_text_chunks():
    """Streaming should yield at least one chunk; joined result must be non-empty."""
    client = make_client()
    chunks: list[str] = []
    async for chunk in client.generate_streaming(
        system_prompt="You are a helpful assistant.",
        user_message="Count from 1 to 5.",
    ):
        assert isinstance(chunk, str)
        chunks.append(chunk)

    assert len(chunks) > 0, "Expected at least one streamed chunk"
    full_response = "".join(chunks)
    assert len(full_response.strip()) > 0, "Joined streamed response must not be empty"


# ---------------------------------------------------------------------------
# Error handling
# ---------------------------------------------------------------------------

async def test_generate_text_raises_on_missing_api_key():
    """Calling generate_text with an empty API key should raise ValueError."""
    client = AIClient(api_key="", model=settings.GEMINI_MODEL)
    with pytest.raises(ValueError, match="GEMINI_API_KEY is not configured"):
        await client.generate_text(
            system_prompt="You are a helpful assistant.",
            user_message="Say hello.",
        )


async def test_generate_text_raises_on_invalid_api_key():
    """An invalid (non-empty) API key should raise GeminiAPIError on the API call."""
    client = AIClient(api_key="invalid-key-for-testing", model=settings.GEMINI_MODEL)
    with pytest.raises(GeminiAPIError, match="Gemini API error"):
        await client.generate_text(
            system_prompt="You are a helpful assistant.",
            user_message="Say hello.",
        )


async def test_generate_json_raises_on_invalid_api_key():
    """generate_json with an invalid key should raise GeminiAPIError."""
    client = AIClient(api_key="invalid-key-for-testing", model=settings.GEMINI_MODEL)
    with pytest.raises(GeminiAPIError, match="Gemini API error"):
        await client.generate_json(
            system_prompt="Return JSON.",
            user_message="Return the status.",
        )


# ---------------------------------------------------------------------------
# Model configuration
# ---------------------------------------------------------------------------

async def test_ai_client_uses_configured_model():
    """The client's model property should reflect the value from settings."""
    client = make_client()
    assert client.model == settings.GEMINI_MODEL
    assert len(client.model) > 0
