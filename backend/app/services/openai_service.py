"""
OpenAI & OpenRouter API Service - DCI HireMind
Handles client lifecycle, connection diagnostics, structured generation,
rate-limit backoff, timeouts, and sanitized enterprise logging.
"""

import json
import logging
import time
from typing import Any, Dict, List, Optional, Type, TypeVar
from pydantic import BaseModel
from fastapi import HTTPException, status
import openai
from openai import OpenAI, AuthenticationError, RateLimitError, APIConnectionError, APITimeoutError, APIError

from app.core.config import get_settings

logger = logging.getLogger("dci_hiremind.openai_service")
settings = get_settings()

T = TypeVar("T", bound=BaseModel)


class OpenAIService:
    """
    Enterprise service wrapping OpenAI and OpenAI-compatible API providers.
    Supports official OpenAI and OpenRouter endpoints with robust error handling.
    """

    def __init__(self, custom_settings: Optional[Any] = None):
        self._custom_settings = custom_settings
        self._client: Optional[OpenAI] = None

    @property
    def settings(self):
        return self._custom_settings or get_settings()

    @property
    def client(self) -> OpenAI:
        """
        Lazy-initializes the OpenAI client with configured credentials and timeouts.
        Raises descriptive HTTPException if API key is not configured.
        """
        current_settings = self.settings
        if not current_settings.has_openai_credentials:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="OpenAI API key is not configured. Please set OPENAI_API_KEY in backend/.env.",
            )

        if self._client is None:
            base_url = current_settings.effective_openai_base_url
            logger.info(
                f"Initializing OpenAI client [Endpoint: {base_url}, Model: {current_settings.effective_openai_model}, "
                f"Key: {current_settings.masked_openai_key}]"
            )
            self._client = OpenAI(
                api_key=current_settings.OPENAI_API_KEY.strip(),
                base_url=base_url,
                timeout=current_settings.OPENAI_TIMEOUT_SECONDS,
                max_retries=current_settings.OPENAI_MAX_RETRIES,
            )
        return self._client

    def check_connection(self) -> Dict[str, Any]:
        """
        Tests live API connectivity and authentication status.
        Does not log secrets or sensitive payload data.

        Returns:
            dict with {status, provider, model, latency_ms, error (if any)}
        """
        current_settings = self.settings
        diagnostics: Dict[str, Any] = {
            "configured": current_settings.has_openai_credentials,
            "masked_key": current_settings.masked_openai_key,
            "base_url": current_settings.effective_openai_base_url,
            "model": current_settings.effective_openai_model,
        }

        if not current_settings.has_openai_credentials:
            diagnostics["status"] = "missing_credentials"
            diagnostics["message"] = "OPENAI_API_KEY is not set in environment."
            return diagnostics

        start_time = time.perf_counter()
        try:
            # Lightweight diagnostic probe using 1-token response
            response = self.client.chat.completions.create(
                model=current_settings.effective_openai_model,
                messages=[{"role": "user", "content": "ping"}],
                max_tokens=1,
            )
            latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
            diagnostics["status"] = "connected"
            diagnostics["latency_ms"] = latency_ms
            diagnostics["model_used"] = response.model
            diagnostics["message"] = "OpenAI API connection active and responsive."
            logger.info(f"OpenAI connection check succeeded ({latency_ms}ms, model: {response.model})")
            return diagnostics

        except AuthenticationError as auth_err:
            diagnostics["status"] = "authentication_failed"
            diagnostics["error"] = "Invalid or expired API credentials."
            logger.warning(f"OpenAI authentication failed: {auth_err.message}")
            return diagnostics

        except RateLimitError as rl_err:
            diagnostics["status"] = "rate_limited"
            diagnostics["error"] = f"Rate limit or quota exceeded: {rl_err.message}"
            logger.warning(f"OpenAI rate limit: {rl_err.message}")
            return diagnostics

        except APITimeoutError:
            diagnostics["status"] = "timeout"
            diagnostics["error"] = f"Request timed out after {settings.OPENAI_TIMEOUT_SECONDS}s."
            logger.error("OpenAI connection timed out.")
            return diagnostics

        except APIConnectionError as conn_err:
            diagnostics["status"] = "connection_error"
            diagnostics["error"] = f"Could not reach API endpoint: {conn_err.message}"
            logger.error(f"OpenAI connection error: {conn_err.message}")
            return diagnostics

        except APIError as api_err:
            diagnostics["status"] = "api_error"
            diagnostics["error"] = f"OpenAI API error ({api_err.code}): {api_err.message}"
            logger.error(f"OpenAI API error: {api_err}")
            return diagnostics

        except Exception as exc:
            diagnostics["status"] = "unknown_error"
            diagnostics["error"] = str(exc)
            logger.error(f"Unexpected error in OpenAI check: {exc}")
            return diagnostics

    def generate_chat_completion(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: float = 0.2,
        max_tokens: Optional[int] = 1500,
        json_mode: bool = False,
    ) -> str:
        """
        Executes a chat completion request with structured error handling.
        """
        target_model = model or self.settings.effective_openai_model
        params: Dict[str, Any] = {
            "model": target_model,
            "messages": messages,
            "temperature": temperature,
        }
        if max_tokens:
            params["max_tokens"] = max_tokens
        if json_mode:
            params["response_format"] = {"type": "json_object"}

        try:
            response = self.client.chat.completions.create(**params)
            content = response.choices[0].message.content or ""
            return content

        except AuthenticationError as exc:
            logger.error("OpenAI Authentication error during completion.")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="OpenAI authentication failed. Please verify API key configuration.",
            ) from exc

        except RateLimitError as exc:
            logger.warning("OpenAI Rate limit encountered.")
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="AI provider rate limit reached. Please retry in a few moments.",
            ) from exc

        except APITimeoutError as exc:
            logger.error(f"OpenAI timeout after {self.settings.OPENAI_TIMEOUT_SECONDS}s.")
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail="AI generation request timed out. Please try again.",
            ) from exc

        except APIConnectionError as exc:
            logger.error(f"OpenAI Connection error: {exc.message}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Unable to reach AI service endpoint. Please check internet connectivity.",
            ) from exc

        except APIError as exc:
            logger.error(f"OpenAI general API error: {exc.message}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"AI provider service error: {exc.message}",
            ) from exc

    def generate_structured_response(
        self,
        messages: List[Dict[str, str]],
        schema_model: Type[T],
        model: Optional[str] = None,
        temperature: float = 0.1,
    ) -> T:
        """
        Generates a validated structured Pydantic object from the LLM.
        Employs native beta.chat.completions.parse with automatic fallback to JSON mode parsing.
        """
        target_model = model or self.settings.effective_openai_model

        # Attempt 1: Native Pydantic Structured Outputs
        try:
            completion = self.client.beta.chat.completions.parse(
                model=target_model,
                messages=messages,
                response_format=schema_model,
                temperature=temperature,
            )
            parsed = completion.choices[0].message.parsed
            if parsed is not None:
                return parsed
        except Exception as e:
            logger.info(f"Native structured parsing fallback triggered: {e}")

        # Attempt 2: JSON mode with schema instruction fallback
        system_instruction = (
            f"You are a strict JSON extraction assistant. "
            f"Output must conform strictly to this JSON schema:\n{json.dumps(schema_model.model_json_schema())}\n"
            f"Output ONLY valid JSON without any markdown formatting or commentary."
        )
        augmented_messages = [{"role": "system", "content": system_instruction}] + messages

        raw_json_str = self.generate_chat_completion(
            messages=augmented_messages,
            model=target_model,
            temperature=temperature,
            json_mode=True,
        )

        try:
            cleaned = raw_json_str.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            if cleaned.startswith("```"):
                cleaned = cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()

            parsed_data = json.loads(cleaned)
            return schema_model.model_validate(parsed_data)
        except Exception as parse_err:
            logger.error(f"Failed to validate response against {schema_model.__name__}: {parse_err}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"AI structured extraction failed validation: {str(parse_err)}",
            ) from parse_err


# Global singleton instance
openai_service = OpenAIService()
