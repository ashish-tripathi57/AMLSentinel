"""
Gemini API client wrapper for AML Sentinel.

Wraps the Google Generative AI SDK and provides three interaction patterns:
  - generate_text      : single-turn completion, returns a string
  - generate_json      : single-turn completion, parses the response as JSON
  - generate_streaming : async generator that yields text deltas (SSE-ready)

Used by: pattern analysis, investigation chat, checklist auto-check, SAR generation.

The module exports a ready-to-use singleton ``ai_client`` built from the
application settings.  A ``ValueError`` is raised at *call time* (not import
time) when ``GEMINI_API_KEY`` is missing, keeping imports safe in test
environments that set the key separately.
"""

import json
from collections.abc import AsyncIterator

from google import genai
from google.genai import types as genai_types

from api.core.config import settings


class GeminiAPIError(Exception):
    """Raised when the Gemini API returns an error that callers should handle."""


class AIClient:
    """Thin async wrapper around the Google Generative AI SDK.

    Designed to be used via the module-level ``ai_client`` singleton but can
    also be instantiated directly in tests to exercise specific configurations.

    Args:
        api_key: Google AI API key.  An empty string is accepted here so
                 that the object can be constructed without a key; the missing-
                 key error is surfaced on the *first API call* instead, which
                 makes the singleton safe to import.
        model: Gemini model identifier (e.g. ``"gemini-2.5-flash"``).
    """

    def __init__(self, api_key: str, model: str) -> None:
        self._api_key = api_key
        self._model = model
        # Defer client creation so an empty key doesn't raise at import time.
        self._client: genai.Client | None = None

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _get_client(self) -> genai.Client:
        """Return (or lazily create) the underlying Gemini client.

        Raises:
            ValueError: When ``GEMINI_API_KEY`` was not configured.
        """
        if not self._api_key:
            raise ValueError(
                "GEMINI_API_KEY is not configured. "
                "Set it in your environment or .env file."
            )
        if self._client is None:
            self._client = genai.Client(api_key=self._api_key)
        return self._client

    # ------------------------------------------------------------------
    # Public interface
    # ------------------------------------------------------------------

    async def generate_text(
        self,
        system_prompt: str,
        user_message: str,
        max_tokens: int = 4096,
    ) -> str:
        """Call Gemini and return the full response as a plain string.

        Args:
            system_prompt: Sets the model's role/persona for this request.
            user_message: The user-facing prompt.
            max_tokens: Upper bound on response length.

        Returns:
            The text content of the response.

        Raises:
            ValueError: When ``GEMINI_API_KEY`` is not configured.
            GeminiAPIError: On any Google AI SDK error.
        """
        client = self._get_client()
        try:
            response = await client.aio.models.generate_content(
                model=self._model,
                contents=user_message,
                config=genai_types.GenerateContentConfig(
                    system_instruction=system_prompt,
                    max_output_tokens=max_tokens,
                ),
            )
            return response.text
        except Exception as exc:
            raise GeminiAPIError(f"Gemini API error: {exc}") from exc

    async def generate_streaming(
        self,
        system_prompt: str,
        user_message: str,
        max_tokens: int = 4096,
    ) -> AsyncIterator[str]:
        """Stream Gemini's response as text deltas.

        Yields one string chunk per streaming event, making it easy to
        forward chunks directly to an SSE endpoint.

        Args:
            system_prompt: Sets the model's role/persona for this request.
            user_message: The user-facing prompt.
            max_tokens: Upper bound on response length.

        Yields:
            Incremental text strings as they arrive from the API.

        Raises:
            ValueError: When ``GEMINI_API_KEY`` is not configured.
            GeminiAPIError: On any Google AI SDK error.
        """
        client = self._get_client()
        try:
            stream = await client.aio.models.generate_content_stream(
                model=self._model,
                contents=user_message,
                config=genai_types.GenerateContentConfig(
                    system_instruction=system_prompt,
                    max_output_tokens=max_tokens,
                ),
            )
            async for chunk in stream:
                if chunk.text:
                    yield chunk.text
        except Exception as exc:
            raise GeminiAPIError(f"Gemini API error: {exc}") from exc

    async def generate_json(
        self,
        system_prompt: str,
        user_message: str,
        max_tokens: int = 4096,
    ) -> dict:
        """Call Gemini in JSON response mode and return the parsed dict.

        Uses ``response_mime_type="application/json"`` so Gemini is constrained
        at the API level to produce valid JSON — no markdown fences, no
        truncated strings.

        Args:
            system_prompt: Should instruct the model to respond with valid JSON only.
            user_message: The user-facing prompt.
            max_tokens: Upper bound on response length.

        Returns:
            Parsed dictionary from the response text.

        Raises:
            ValueError: When the response cannot be parsed as JSON, or when
                        ``GEMINI_API_KEY`` is not configured.
            GeminiAPIError: On any Google AI SDK error.
        """
        client = self._get_client()
        try:
            response = await client.aio.models.generate_content(
                model=self._model,
                contents=user_message,
                config=genai_types.GenerateContentConfig(
                    system_instruction=system_prompt,
                    max_output_tokens=max_tokens,
                    response_mime_type="application/json",
                ),
            )
            raw_text = response.text
        except Exception as exc:
            raise GeminiAPIError(f"Gemini API error: {exc}") from exc

        try:
            return json.loads(raw_text)
        except json.JSONDecodeError as exc:
            raise ValueError(
                f"Model response is not valid JSON. Response was: {raw_text!r}"
            ) from exc

    @property
    def model(self) -> str:
        """The Gemini model identifier used by this client."""
        return self._model


# ---------------------------------------------------------------------------
# Module-level singleton — import and use directly across the application.
# ---------------------------------------------------------------------------
ai_client = AIClient(
    api_key=settings.GEMINI_API_KEY,
    model=settings.GEMINI_MODEL,
)
