"""Async Cerebras client wrapper."""

import json
import asyncio
from typing import Type, TypeVar
from pydantic import BaseModel, Field
from cerebras.cloud.sdk import Cerebras

from ..utils.logging import get_logger

logger = get_logger(__name__)

T = TypeVar("T", bound=BaseModel)


class PersonaResponse(BaseModel):
    """Structured response schema for persona output."""
    text: str = Field(description="The response text to speak")


class LLMClient:
    """Async wrapper for Cerebras SDK with structured outputs."""

    def __init__(self, api_key: str, model: str = "llama-3.3-70b"):
        """
        Initialize Cerebras client.
        
        Args:
            api_key: Cerebras API key
            model: Model name (default: llama-3.3-70b)
        """
        self.model = model
        self.client = Cerebras(api_key=api_key)

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
            # Prepare format option
            response_format = {"type": "json_object"} if response_schema else None

            # Run synchronous Cerebras call in a thread
            completion = await asyncio.to_thread(
                self.client.chat.completions.create,
                messages=messages,
                model=self.model,
                temperature=temperature,
                max_completion_tokens=max_tokens,
                response_format=response_format,
            )

            content = completion.choices[0].message.content

            # Parse and validate with Pydantic if schema provided
            if response_schema:
                # If content is already a dict (which happens sometimes with json mode), use it
                # Otherwise parse string
                if isinstance(content, dict):
                    result = response_schema.model_validate(content)
                else:
                    result = response_schema.model_validate_json(content)
                return result.model_dump()
            else:
                # Try to parse as JSON if it looks like one, otherwise return structure
                try:
                    return json.loads(content)
                except:
                    return {"text": content}

        except Exception as e:
            logger.error("llm_error", error=str(e), content=content[:100] if content else "empty")
            # If JSON parsing failed but we have text, return it as fallback
            if content:
                # Try to salvage text if it's not valid JSON
                return {"text": content}
            
            return {"text": "I'm having trouble responding right now."}

    async def get_persona_response(
        self,
        messages: list[dict[str, str]],
        max_tokens: int = 150,
        temperature: float = 0.8,
    ) -> PersonaResponse:
        """
        Get a structured persona response.
        """
        result = await self.chat_completion(
            messages=messages,
            max_tokens=max_tokens,
            temperature=temperature,
            response_schema=PersonaResponse,
        )
        # Handle case where result is already a dict
        if isinstance(result, dict):
            # If 'text' key missing, use the whole result as text/fallback
            if "text" not in result:
                # If keys overlap or if it's weird, just dump str
                result = {"text": str(result)}
            return PersonaResponse(**result)
        
        return PersonaResponse(text=str(result))
