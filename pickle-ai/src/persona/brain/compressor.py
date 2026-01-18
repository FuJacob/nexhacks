"""Token compression using The Token Company SDK."""

from dataclasses import dataclass
from typing import Any

from tokenc import TokenClient, AuthenticationError, InvalidRequestError, RateLimitError, APIError

from ..utils.logging import get_logger

logger = get_logger(__name__)


@dataclass
class CompressResult:
    """Result of token compression."""

    text: str
    original_tokens: int
    compressed_tokens: int
    tokens_saved: int
    compression_ratio: float
    compression_time: float
    was_compressed: bool


class TokenCompressor:
    """
    Token compression wrapper using The Token Company SDK.

    Compresses LLM input tokens to reduce costs while preserving meaning.
    """

    def __init__(
        self,
        api_key: str,
        default_aggressiveness: float = 0.5,
        enabled: bool = True,
    ):
        """
        Initialize the token compressor.

        Args:
            api_key: The Token Company API key
            default_aggressiveness: Default compression level (0.0-1.0)
            enabled: Whether compression is enabled
        """
        self.api_key = api_key
        self.default_aggressiveness = default_aggressiveness
        self.enabled = enabled
        self._client: TokenClient | None = None

        if enabled:
            try:
                self._client = TokenClient(api_key=api_key)
                logger.info(
                    "compressor_initialized",
                    aggressiveness=default_aggressiveness,
                )
            except Exception as e:
                logger.error("compressor_init_error", error=str(e))
                self.enabled = False

    def compress(
        self,
        text: str,
        aggressiveness: float | None = None,
    ) -> CompressResult:
        """
        Compress text to reduce token count.

        Args:
            text: The text to compress
            aggressiveness: Compression intensity (0.0-1.0), uses default if None

        Returns:
            CompressResult with compressed text and metrics
        """
        if not self.enabled or not self._client or not text.strip():
            return CompressResult(
                text=text,
                original_tokens=0,
                compressed_tokens=0,
                tokens_saved=0,
                compression_ratio=1.0,
                compression_time=0.0,
                was_compressed=False,
            )

        agg = aggressiveness if aggressiveness is not None else self.default_aggressiveness

        try:
            response = self._client.compress_input(
                input=text,
                aggressiveness=agg,
            )

            result = CompressResult(
                text=response.output,
                original_tokens=response.original_input_tokens,
                compressed_tokens=response.output_tokens,
                tokens_saved=response.tokens_saved,
                compression_ratio=response.compression_ratio,
                compression_time=response.compression_time,
                was_compressed=True,
            )

            logger.debug(
                "tokens_compressed",
                original=result.original_tokens,
                compressed=result.compressed_tokens,
                saved=result.tokens_saved,
                ratio=f"{result.compression_ratio:.2f}x",
                time_ms=f"{result.compression_time * 1000:.1f}",
            )

            return result

        except AuthenticationError:
            logger.error("compressor_auth_error", msg="Invalid API key")
            self.enabled = False
        except RateLimitError:
            logger.warning("compressor_rate_limit", msg="Rate limit exceeded, skipping compression")
        except InvalidRequestError as e:
            logger.error("compressor_invalid_request", error=str(e))
        except APIError as e:
            logger.error("compressor_api_error", error=str(e))
        except Exception as e:
            logger.error("compressor_error", error=str(e))

        # Return original text on any error
        return CompressResult(
            text=text,
            original_tokens=0,
            compressed_tokens=0,
            tokens_saved=0,
            compression_ratio=1.0,
            compression_time=0.0,
            was_compressed=False,
        )

    def compress_messages(
        self,
        messages: list[dict[str, str]],
        compress_system: bool = True,
        compress_user: bool = False,
        aggressiveness: float | None = None,
    ) -> tuple[list[dict[str, str]], dict[str, Any]]:
        """
        Compress a list of LLM messages.

        Args:
            messages: List of message dicts with role and content
            compress_system: Whether to compress system messages
            compress_user: Whether to compress user messages
            aggressiveness: Compression intensity

        Returns:
            Tuple of (compressed messages, compression stats)
        """
        if not self.enabled:
            return messages, {"enabled": False}

        compressed_messages = []
        total_original = 0
        total_compressed = 0
        total_saved = 0

        for msg in messages:
            role = msg.get("role", "")
            content = msg.get("content", "")

            should_compress = (
                (role == "system" and compress_system) or
                (role == "user" and compress_user)
            )

            if should_compress and content:
                result = self.compress(content, aggressiveness)
                compressed_messages.append({
                    "role": role,
                    "content": result.text,
                })
                if result.was_compressed:
                    total_original += result.original_tokens
                    total_compressed += result.compressed_tokens
                    total_saved += result.tokens_saved
            else:
                compressed_messages.append(msg)

        stats = {
            "enabled": True,
            "original_tokens": total_original,
            "compressed_tokens": total_compressed,
            "tokens_saved": total_saved,
            "compression_ratio": total_original / total_compressed if total_compressed > 0 else 1.0,
        }

        if total_saved > 0:
            logger.info(
                "messages_compressed",
                original=total_original,
                compressed=total_compressed,
                saved=total_saved,
            )

        return compressed_messages, stats

    def close(self) -> None:
        """Close the client connection."""
        if self._client:
            try:
                # TokenClient may have a close method
                if hasattr(self._client, 'close'):
                    self._client.close()
            except Exception:
                pass
            self._client = None

    def __enter__(self) -> "TokenCompressor":
        return self

    def __exit__(self, *args: Any) -> None:
        self.close()
