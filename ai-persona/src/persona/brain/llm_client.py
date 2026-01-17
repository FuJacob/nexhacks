"""Async Gemini client wrapper."""

import json
from typing import Type, TypeVar
from google import genai
from google.genai import types
from pydantic import BaseModel, Field

from ..utils.logging import get_logger

logger = get_logger(__name__)

T = TypeVar("T", bound=BaseModel)


class PersonaResponse(BaseModel):
    """Structured response schema for persona output."""
    text: str = Field(description="The response text to speak")
    emotion: str = Field(description="The emotion to express (e.g., happy, neutral, excited)")


class LLMClient:
    """Async Gemini client wrapper with structured outputs."""

    def __init__(self, api_key: str, model: str = "gemini-2.5-flash-lite"):
        self.client = genai.Client(api_key=api_key)
        self.model = model

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
            # Convert messages to Gemini format
            # Extract system instruction from messages
            system_instruction = None
            contents = []

            for msg in messages:
                if msg["role"] == "system":
                    system_instruction = msg["content"]
                elif msg["role"] == "user":
                    contents.append(
                        types.Content(
                            role="user",
                            parts=[types.Part.from_text(text=msg["content"])],
                        )
                    )
                elif msg["role"] == "assistant":
                    contents.append(
                        types.Content(
                            role="model",
                            parts=[types.Part.from_text(text=msg["content"])],
                        )
                    )

            # Build config with optional schema
            config_kwargs = {
                "system_instruction": system_instruction,
                "max_output_tokens": max_tokens,
                "temperature": temperature,
                "response_mime_type": "application/json",
            }
            
            # Add JSON schema if provided (Gemini structured outputs)
            if response_schema:
                config_kwargs["response_schema"] = response_schema

            # Use async client
            response = await self.client.aio.models.generate_content(
                model=self.model,
                contents=contents,
                config=types.GenerateContentConfig(**config_kwargs),
            )

            content = response.text
            
            # Parse and validate with Pydantic if schema provided
            if response_schema:
                result = response_schema.model_validate_json(content)
                return result.model_dump()
            else:
                return json.loads(content)

        except json.JSONDecodeError as e:
            logger.error("llm_json_parse_error", error=str(e), content=content[:100] if content else "empty")
            return {"text": content if content else "I'm having trouble responding right now.", "emotion": "neutral"}

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
        Uses Gemini's structured output to guarantee valid JSON.
        """
        result = await self.chat_completion(
            messages=messages,
            max_tokens=max_tokens,
            temperature=temperature,
            response_schema=PersonaResponse,
        )
        return PersonaResponse(**result) if isinstance(result, dict) else result
