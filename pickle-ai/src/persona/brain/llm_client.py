"""Async Ollama client wrapper."""

import json
from typing import Type, TypeVar
import aiohttp
from pydantic import BaseModel, Field

from ..utils.logging import get_logger

logger = get_logger(__name__)

T = TypeVar("T", bound=BaseModel)

# Ollama API endpoint
OLLAMA_BASE_URL = "http://localhost:11434"


class PersonaResponse(BaseModel):
    """Structured response schema for persona output."""
    text: str = Field(description="The response text to speak")


class LLMClient:
    """Async Ollama client wrapper with structured outputs."""

    def __init__(self, api_key: str = "", model: str = "phi3.5:latest"):
        """
        Initialize Ollama client.
        
        Args:
            api_key: Not used for Ollama (local), kept for interface compatibility
            model: Ollama model name (default: phi3.5:latest)
        """
        self.model = model
        self.base_url = OLLAMA_BASE_URL

    async def chat_completion(
        self,
        messages: list[dict[str, str]],
        max_tokens: int = 150,
        temperature: float = 0.8,
        response_schema: Type[T] | None = None,
    ) -> dict:
        """
        Get a chat completion with structured JSON response.

        Args:
            messages: List of message dicts with role and content
            max_tokens: Maximum tokens in response
            temperature: Response randomness (0-2)
            response_schema: Optional Pydantic model for structured output

        Returns:
            Parsed JSON response dict
        """
        content = ""
        try:
            # Build Ollama request
            # Convert system message to Ollama format
            ollama_messages = []
            for msg in messages:
                ollama_messages.append({
                    "role": msg["role"],
                    "content": msg["content"]
                })

            # Build request payload
            payload = {
                "model": self.model,
                "messages": ollama_messages,
                "stream": False,
                "options": {
                    "temperature": temperature,
                    "num_predict": max_tokens,
                }
            }

            # Add JSON schema if provided (Ollama structured outputs)
            if response_schema:
                payload["format"] = response_schema.model_json_schema()
            else:
                payload["format"] = "json"

            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.base_url}/api/chat",
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        logger.error("ollama_api_error", status=response.status, error=error_text)
                        raise Exception(f"Ollama API error: {response.status}")
                    
                    data = await response.json()
                    content = data.get("message", {}).get("content", "")

            # Parse and validate with Pydantic if schema provided
            if response_schema:
                result = response_schema.model_validate_json(content)
                return result.model_dump()
            else:
                return json.loads(content)

        except json.JSONDecodeError as e:
            logger.error("llm_json_parse_error", error=str(e), content=content[:100] if content else "empty")
            return {"text": content if content else "I'm having trouble responding right now."}

        except Exception as e:
            logger.error("llm_error", error=str(e))
            raise

    async def get_persona_response(
        self,
        messages: list[dict[str, str]],
        max_tokens: int = 150,
        temperature: float = 0.8,
    ) -> PersonaResponse:
        """
        Get a structured persona response.
        Uses Ollama's structured output to guarantee valid JSON.
        """
        result = await self.chat_completion(
            messages=messages,
            max_tokens=max_tokens,
            temperature=temperature,
            response_schema=PersonaResponse,
        )
        return PersonaResponse(**result) if isinstance(result, dict) else result
