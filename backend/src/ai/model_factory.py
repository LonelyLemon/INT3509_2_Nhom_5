from __future__ import annotations

from tenacity import RetryError

from pydantic_ai import models as pai_models
from pydantic_ai.exceptions import ModelAPIError
from pydantic_ai.models.fallback import FallbackModel
from pydantic_ai.models.google import GoogleModel
from pydantic_ai.models.openai import OpenAIModel
from pydantic_ai.providers.google import GoogleProvider
from pydantic_ai.providers.openai import OpenAIProvider

from src.core.config import settings


def make_model() -> pai_models.Model:
    """
    Return the primary model with OpenAI as automatic fallback.

    - Primary: Gemini (configured via GEMINI_API_KEY + GEMINI_MODEL)
    - Fallback: OpenAI (configured via OPENAI_API_KEY + OPENAI_MODEL)

    Falls back to OpenAI on ModelAPIError or tenacity.RetryError (raised when
    Gemini's internal retry exhausts its quota/rate-limit attempts).
    If only one provider is configured, that provider is used directly.
    Raises RuntimeError if neither provider is configured.
    """
    has_gemini = bool(settings.GEMINI_API_KEY)
    has_openai = bool(settings.OPENAI_API_KEY)

    if not has_gemini and not has_openai:
        raise RuntimeError(
            "No AI model configured. Set GEMINI_API_KEY or OPENAI_API_KEY in .env."
        )

    if has_gemini and has_openai:
        gemini = GoogleModel(
            settings.GEMINI_MODEL,
            provider=GoogleProvider(api_key=settings.GEMINI_API_KEY),
        )
        openai = OpenAIModel(
            settings.OPENAI_MODEL,
            provider=OpenAIProvider(api_key=settings.OPENAI_API_KEY),
        )
        return FallbackModel(gemini, openai, fallback_on=(ModelAPIError, RetryError))

    if has_gemini:
        return GoogleModel(
            settings.GEMINI_MODEL,
            provider=GoogleProvider(api_key=settings.GEMINI_API_KEY),
        )

    return OpenAIModel(
        settings.OPENAI_MODEL,
        provider=OpenAIProvider(api_key=settings.OPENAI_API_KEY),
    )
