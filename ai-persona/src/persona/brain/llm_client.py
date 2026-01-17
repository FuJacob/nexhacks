"""Async Gemini client wrapper."""

import json
from google import genai
from google.genai import types

from ..utils.logging import get_logger

logger = get_logger(__name__)


class LLMClient:
    """Async Gemini client wrapper with JSON parsing."""

    def __init__(self, api_key: str, model: str = "gemini-2.5-flash"):
        self.client = genai.Client(api_key=api_key)
        self.model = model

    async def chat_completion(
        self,
        messages: list[dict[str, str]],
        max_tokens: int = 150,
        temperature: float = 0.8,
    ) -> dict:
        """
        Get a chat completion with JSON response.

        Args:
            messages: List of message dicts with role and content
            max_tokens: Maximum tokens in response
            temperature: Response randomness (0-2)

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

            # Use async client
            response = await self.client.aio.models.generate_content(
                model=self.model,
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    max_output_tokens=max_tokens,
                    temperature=temperature,
                    response_mime_type="application/json",
                ),
            )

            content = response.text
            result = json.loads(content)

            logger.debug(
                "llm_response",
                model=self.model,
            )

            return result

        except json.JSONDecodeError as e:
            logger.error("llm_json_parse_error", error=str(e), content=content[:100] if content else "empty")
            return {"text": content if content else "I'm having trouble responding right now.", "emotion": "neutral"}

        except Exception as e:
            logger.error("llm_error", error=str(e))
            raise
