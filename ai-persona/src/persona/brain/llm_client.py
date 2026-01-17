"""Async OpenAI client wrapper."""

import json
from openai import AsyncOpenAI

from ..utils.logging import get_logger

logger = get_logger(__name__)


class LLMClient:
    """Async OpenAI client wrapper with JSON parsing."""

    def __init__(self, api_key: str, model: str = "gpt-4o"):
        self.client = AsyncOpenAI(api_key=api_key)
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
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature,
                response_format={"type": "json_object"},
            )

            content = response.choices[0].message.content
            result = json.loads(content)

            logger.debug(
                "llm_response",
                tokens_used=response.usage.total_tokens if response.usage else 0,
            )

            return result

        except json.JSONDecodeError as e:
            logger.error("llm_json_parse_error", error=str(e), content=content[:100])
            return {"text": content, "emotion": "neutral"}

        except Exception as e:
            logger.error("llm_error", error=str(e))
            raise
