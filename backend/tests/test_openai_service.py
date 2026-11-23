"""
OpenAI & OpenRouter Service Integration Tests - DCI HireMind
Verifies client configuration, credential handling, real completions,
error propagation, and structured schema extraction.
"""

import os
import unittest
from pydantic import BaseModel, Field
from fastapi import HTTPException
from openai import OpenAI

from app.core.config import Settings, get_settings
from app.services.openai_service import OpenAIService


class SampleExtractionSchema(BaseModel):
    """Pydantic test schema for structured response extraction."""
    extracted_title: str = Field(..., description="Job or candidate title")
    skills: list[str] = Field(..., description="List of detected skills")
    rating: int = Field(..., ge=1, le=10, description="Confidence rating from 1 to 10")


class TestOpenAIService(unittest.TestCase):
    """Test suite covering OpenAI SDK configuration, error handling, and live completion."""

    def setUp(self):
        self.settings = get_settings()

    def test_01_client_configuration(self):
        """1. Verify client configuration, masked key, and base URL resolution."""
        print("\n[TEST 1] Verifying OpenAI client configuration...")
        self.assertTrue(
            self.settings.has_openai_credentials,
            "OPENAI_API_KEY must be configured in environment."
        )

        masked_key = self.settings.masked_openai_key
        # Verify key is masked and not exposed in plain text
        self.assertTrue(masked_key.endswith("2b9") or masked_key.endswith("****"))
        self.assertIn("...", masked_key)
        self.assertNotIn(self.settings.OPENAI_API_KEY, masked_key)
        print(f"  ✓ Key safely masked: {masked_key}")

        base_url = self.settings.effective_openai_base_url
        print(f"  ✓ Effective Base URL: {base_url}")
        print(f"  ✓ Model: {self.settings.effective_openai_model}")

    def test_02_missing_api_key_handling(self):
        """2. Verify graceful handling when API key is missing."""
        print("\n[TEST 2] Verifying missing API key handling...")
        empty_settings = Settings(OPENAI_API_KEY="", OPENAI_MODEL="gpt-4o-mini")
        service = OpenAIService(custom_settings=empty_settings)
        
        diag = service.check_connection()
        self.assertEqual(diag.get("status"), "missing_credentials")
        print("  ✓ check_connection() gracefully returned 'missing_credentials'")

        with self.assertRaises(HTTPException) as ctx:
            _ = service.client
        self.assertEqual(ctx.exception.status_code, 503)
        self.assertIn("not configured", ctx.exception.detail)
        print("  ✓ Calling service.client with missing key correctly raised HTTP 503")

    def test_03_invalid_api_key_handling(self):
        """3. Verify authentication error handling with invalid key."""
        print("\n[TEST 3] Verifying invalid API key handling...")
        invalid_settings = Settings(
            OPENAI_API_KEY="sk-or-v1-invalid-key-000000000000000000000000000000000000000000000000",
            OPENAI_BASE_URL="https://openrouter.ai/api/v1",
            OPENAI_MODEL="openai/gpt-4o-mini",
        )
        service = OpenAIService(custom_settings=invalid_settings)

        diag = service.check_connection()
        self.assertEqual(diag.get("status"), "authentication_failed")
        self.assertIn("Invalid or expired", diag.get("error", ""))
        print(f"  ✓ Invalid key check returned status: {diag.get('status')}")
        print(f"  ✓ Safe error message: {diag.get('error')}")

    def test_04_successful_live_completion(self):
        """4. Execute live API request with real configured credentials."""
        print("\n[TEST 4] Executing real API completion request...")
        service = OpenAIService()
        diag = service.check_connection()
        self.assertEqual(
            diag.get("status"),
            "connected",
            f"Live API connection failed: {diag.get('error')}"
        )
        print(f"  ✓ Connection probe succeeded in {diag.get('latency_ms')}ms")
        print(f"  ✓ Model verified: {diag.get('model_used')}")

        # Real chat completion
        response = service.generate_chat_completion(
            messages=[
                {"role": "system", "content": "You are a concise recruitment assistant."},
                {"role": "user", "content": "Respond with exactly five words describing DCI HireMind."},
            ],
            temperature=0.1,
            max_tokens=25,
        )
        self.assertTrue(len(response.strip()) > 0)
        print(f"  ✓ Real completion response: \"{response.strip()}\"")

    def test_05_structured_response_extraction(self):
        """5. Verify structured Pydantic schema generation."""
        print("\n[TEST 5] Testing structured schema extraction...")
        service = OpenAIService()
        
        sample_prompt = [
            {
                "role": "system",
                "content": "Extract candidate qualifications into the required schema.",
            },
            {
                "role": "user",
                "content": "Candidate Alex is a Senior Backend Developer proficient in Python, FastAPI, and Docker. Score confidence at 9.",
            },
        ]

        structured_obj = service.generate_structured_response(
            messages=sample_prompt,
            schema_model=SampleExtractionSchema,
            temperature=0.1,
        )

        self.assertIsInstance(structured_obj, SampleExtractionSchema)
        self.assertTrue("Python" in structured_obj.skills or "FastAPI" in structured_obj.skills)
        self.assertGreaterEqual(structured_obj.rating, 1)
        print(f"  ✓ Extracted Title: {structured_obj.extracted_title}")
        print(f"  ✓ Extracted Skills: {structured_obj.skills}")
        print(f"  ✓ Confidence Rating: {structured_obj.rating}/10")


if __name__ == "__main__":
    unittest.main()
