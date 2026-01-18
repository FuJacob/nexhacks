"""Context Assembler - stitches STM and LTM into a coherent prompt."""

from dataclasses import dataclass
from typing import Any

from .memory import ShortTermMemory, LongTermMemory, MemoryEntry
from .compressor import TokenCompressor
from ..utils.logging import get_logger

logger = get_logger(__name__)


@dataclass
class AssembledContext:
    """The assembled context ready for LLM consumption."""

    system_prompt: str
    messages: list[dict[str, str]]
    ltm_context: str
    stm_context: str

    def get_full_system_prompt(self) -> str:
        """Get system prompt with LTM context injected."""
        if self.ltm_context:
            return f"{self.system_prompt}\n\n{self.ltm_context}"
        return self.system_prompt


class ContextAssembler:
    """
    Assembles context from short-term and long-term memory for LLM prompts.

    Flow:
    1. Receive new input
    2. Query LTM for semantically relevant past memories
    3. Fetch recent STM for conversational flow
    4. Build coherent prompt combining both
    """

    def __init__(
        self,
        stm: ShortTermMemory,
        ltm: LongTermMemory,
        compressor: TokenCompressor | None = None,
        stm_message_count: int = 10,
        ltm_result_count: int = 3,
        ltm_min_relevance: float = 0.4,
    ):
        """
        Initialize the context assembler.

        Args:
            stm: Short-term memory instance
            ltm: Long-term memory instance
            compressor: Optional token compressor for reducing token costs
            stm_message_count: Number of STM messages to include
            ltm_result_count: Number of LTM results to retrieve
            ltm_min_relevance: Minimum relevance score for LTM results
        """
        self.stm = stm
        self.ltm = ltm
        self.compressor = compressor
        self.stm_message_count = stm_message_count
        self.ltm_result_count = ltm_result_count
        self.ltm_min_relevance = ltm_min_relevance

    def process_input(
        self,
        content: str,
        source: str = "chat",
        user: str | None = None,
        role: str = "user",
        metadata: dict[str, Any] | None = None,
    ) -> MemoryEntry:
        """
        Process a new input, storing it in both STM and potentially LTM.

        Args:
            content: The message content
            source: Source type ("chat", "speech", "vision")
            user: Username if from chat
            role: "user" or "assistant"
            metadata: Additional metadata

        Returns:
            The created MemoryEntry
        """
        # Add to short-term memory
        entry = self.stm.add(
            role=role,
            content=content,
            source=source,
            user=user,
            metadata=metadata,
        )

        # Potentially add to long-term memory
        self.ltm.add_memory(
            content=content,
            source=source,
            user=user,
            role=role,
            metadata=metadata,
        )

        return entry

    def process_response(self, content: str) -> MemoryEntry:
        """
        Process a persona response, storing it in memory.

        Args:
            content: The response content

        Returns:
            The created MemoryEntry
        """
        # Add to STM
        entry = self.stm.add_assistant_message(content)

        # Add to LTM (persona responses often contain important info)
        self.ltm.add_memory(
            content=content,
            role="assistant",
            force=True,  # Always save persona responses
        )

        return entry

    def assemble(
        self,
        current_input: str,
        system_prompt: str,
    ) -> AssembledContext:
        """
        Assemble full context for LLM from memories.

        Args:
            current_input: The current user input (for LTM query)
            system_prompt: The base system prompt

        Returns:
            AssembledContext with all components
        """
        # Get relevant long-term memories
        ltm_context = self.ltm.get_formatted_context(
            query=current_input,
            n_results=self.ltm_result_count,
            min_relevance=self.ltm_min_relevance,
        )

        # Get recent short-term messages
        stm_messages = self.stm.get_messages(self.stm_message_count)
        stm_context = self.stm.get_formatted(self.stm_message_count)

        logger.debug(
            "context_assembled",
            ltm_results=len(ltm_context.split("\n")) - 1 if ltm_context else 0,
            stm_messages=len(stm_messages),
        )

        return AssembledContext(
            system_prompt=system_prompt,
            messages=stm_messages,
            ltm_context=ltm_context,
            stm_context=stm_context,
        )

    def build_messages(
        self,
        current_input: str,
        system_prompt: str,
        compress: bool = True,
    ) -> list[dict[str, str]]:
        """
        Build the full message list for LLM, including system prompt with LTM.

        Args:
            current_input: The current user input
            system_prompt: The base system prompt
            compress: Whether to apply token compression

        Returns:
            List of messages ready for LLM
        """
        context = self.assemble(current_input, system_prompt)

        # Get the full system prompt with LTM context
        full_system_prompt = context.get_full_system_prompt()

        # Compress the system prompt if compressor is available
        if compress and self.compressor:
            result = self.compressor.compress(full_system_prompt)
            if result.was_compressed:
                full_system_prompt = result.text
                logger.info(
                    "context_compressed",
                    original_tokens=result.original_tokens,
                    compressed_tokens=result.compressed_tokens,
                    tokens_saved=result.tokens_saved,
                    ratio=f"{result.compression_ratio:.2f}x",
                )

        # Build context as a single message instead of role-based conversation
        # This prevents the LLM from thinking it should role-play as the user
        context_parts = []
        
        # Add recent context (formatted as observations, not as user messages)
        recent = self.stm.get_recent(self.stm_message_count)
        for entry in recent:
            if entry.role == "assistant":
                context_parts.append(f"[You previously said]: {entry.content}")
            elif entry.source == "vision":
                context_parts.append(f"[What you see on stream]: {entry.content}")
            elif entry.source == "speech":
                context_parts.append(f"[Streamer said]: {entry.content}")
            elif entry.source == "chat":
                # Format chat message clearly - this is what needs to be rephrased
                context_parts.append(f"[Chat from {entry.user or 'viewer'}]: {entry.content}")
            else:
                context_parts.append(f"[Input]: {entry.content}")
        
        # Add the current input clearly marked
        context_parts.append(f"\n[CURRENT CHAT MESSAGE TO VOICE]: {current_input}")
        context_parts.append("Now rephrase this chat message as speech directed at the streamer (convert he/she to you):")
        
        user_context = "\n".join(context_parts)

        messages = [
            {"role": "system", "content": full_system_prompt},
            {"role": "user", "content": user_context},
        ]

        return messages

    def get_memory_stats(self) -> dict[str, Any]:
        """Get statistics about memory usage."""
        return {
            "stm_count": len(self.stm),
            "stm_max": self.stm.max_size,
            "ltm_count": self.ltm.count,
        }
