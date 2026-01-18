"""Long-term memory using ChromaDB with sentence-transformers embeddings."""

import re
from dataclasses import dataclass
from datetime import datetime
from typing import Any
from pathlib import Path

import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer

from ...utils.logging import get_logger

logger = get_logger(__name__)

# Minimum word count for a message to be stored in LTM
MIN_WORDS_FOR_LTM = 5

# Entity patterns that warrant LTM storage regardless of length
ENTITY_PATTERNS = [
    r"\b(play(?:ed|ing)?|watch(?:ed|ing)?|stream(?:ed|ing)?)\b",  # Activities
    r"\b(love|hate|like|prefer|favorite)\b",  # Preferences
    r"\b(name(?:d)?|call(?:ed)?)\b",  # Identity
    r"\b(tomorrow|yesterday|next\s+\w+|last\s+\w+)\b",  # Time references
    r"\b(always|never|usually|sometimes)\b",  # Habits
    r"\b(birthday|anniversary|holiday)\b",  # Events
    r"\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b",  # Proper nouns (names, places)
]


@dataclass
class LTMResult:
    """A result from long-term memory search."""

    content: str
    timestamp: str
    source: str | None
    user: str | None
    relevance_score: float
    metadata: dict[str, Any]

    def __str__(self) -> str:
        time_str = self.timestamp[:10] if self.timestamp else "unknown"
        if self.user:
            return f"[{time_str}] {self.user}: {self.content}"
        return f"[{time_str}] {self.content}"


class LongTermMemory:
    """
    Long-term memory using ChromaDB for semantic search.

    Uses all-MiniLM-L6-v2 for embeddings (runs locally).
    Stores important messages and allows semantic retrieval.
    """

    def __init__(
        self,
        persist_directory: str | Path = "./data/chromadb",
        collection_name: str = "persona_memory",
        embedding_model: str = "all-MiniLM-L6-v2",
    ):
        """
        Initialize long-term memory.

        Args:
            persist_directory: Directory to persist ChromaDB data
            collection_name: Name of the ChromaDB collection
            embedding_model: Sentence transformer model to use
        """
        self.persist_directory = Path(persist_directory)
        self.collection_name = collection_name

        # Create persist directory if needed
        self.persist_directory.mkdir(parents=True, exist_ok=True)

        logger.info("ltm_loading_embedding_model", model=embedding_model)
        self._embedding_model = SentenceTransformer(embedding_model)
        logger.info("ltm_embedding_model_loaded")

        # Initialize ChromaDB with persistence
        self._client = chromadb.PersistentClient(
            path=str(self.persist_directory),
            settings=Settings(anonymized_telemetry=False),
        )

        # Get or create collection
        self._collection = self._client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"},  # Use cosine similarity
        )

        logger.info(
            "ltm_initialized",
            persist_dir=str(self.persist_directory),
            collection=collection_name,
            existing_count=self._collection.count(),
        )

    def _generate_embedding(self, text: str) -> list[float]:
        """Generate embedding for text using sentence-transformers."""
        embedding = self._embedding_model.encode(text, convert_to_numpy=True)
        return embedding.tolist()

    def should_save_to_ltm(self, content: str) -> bool:
        """
        Determine if a message should be saved to long-term memory.

        Criteria:
        - Message has more than MIN_WORDS_FOR_LTM words, OR
        - Message contains important entities/patterns

        Args:
            content: The message content

        Returns:
            True if the message should be saved
        """
        # Check word count
        words = content.split()
        if len(words) >= MIN_WORDS_FOR_LTM:
            return True

        # Check for important entities/patterns
        for pattern in ENTITY_PATTERNS:
            if re.search(pattern, content, re.IGNORECASE):
                return True

        return False

    def add_memory(
        self,
        content: str,
        source: str | None = None,
        user: str | None = None,
        role: str = "user",
        metadata: dict[str, Any] | None = None,
        force: bool = False,
    ) -> str | None:
        """
        Add a memory to long-term storage.

        Args:
            content: The message content
            source: Source type ("chat", "speech", "vision")
            user: Username if from chat
            role: "user" or "assistant"
            metadata: Additional metadata
            force: Force add even if doesn't meet criteria

        Returns:
            The memory ID if saved, None if skipped
        """
        # Check if message is worth saving
        if not force and not self.should_save_to_ltm(content):
            logger.debug("ltm_skipped", reason="criteria_not_met", content=content[:50])
            return None

        # Generate unique ID
        timestamp = datetime.now().isoformat()
        memory_id = f"{timestamp}_{hash(content) % 10000:04d}"

        # Build metadata
        doc_metadata = {
            "timestamp": timestamp,
            "source": source or "unknown",
            "user": user or "",
            "role": role,
            **(metadata or {}),
        }

        # Generate embedding
        embedding = self._generate_embedding(content)

        # Add to ChromaDB
        self._collection.add(
            ids=[memory_id],
            embeddings=[embedding],
            documents=[content],
            metadatas=[doc_metadata],
        )

        logger.debug(
            "ltm_added",
            memory_id=memory_id,
            content_len=len(content),
            total_count=self._collection.count(),
        )

        return memory_id

    def retrieve(
        self,
        query: str,
        n_results: int = 5,
        min_relevance: float = 0.3,
    ) -> list[LTMResult]:
        """
        Retrieve relevant memories using semantic search.

        Args:
            query: The search query
            n_results: Maximum number of results
            min_relevance: Minimum relevance score (0-1, higher is more similar)

        Returns:
            List of LTMResult objects, sorted by relevance
        """
        if self._collection.count() == 0:
            return []

        # Generate query embedding
        query_embedding = self._generate_embedding(query)

        # Search ChromaDB
        results = self._collection.query(
            query_embeddings=[query_embedding],
            n_results=min(n_results, self._collection.count()),
            include=["documents", "metadatas", "distances"],
        )

        # Process results
        ltm_results = []

        if results["documents"] and results["documents"][0]:
            for i, doc in enumerate(results["documents"][0]):
                # ChromaDB returns distances, convert to similarity score
                # For cosine distance: similarity = 1 - distance
                distance = results["distances"][0][i] if results["distances"] else 0
                relevance = 1 - distance

                if relevance < min_relevance:
                    continue

                metadata = results["metadatas"][0][i] if results["metadatas"] else {}

                ltm_results.append(
                    LTMResult(
                        content=doc,
                        timestamp=metadata.get("timestamp", ""),
                        source=metadata.get("source"),
                        user=metadata.get("user") or None,
                        relevance_score=relevance,
                        metadata=metadata,
                    )
                )

        # Sort by relevance (highest first)
        ltm_results.sort(key=lambda x: x.relevance_score, reverse=True)

        logger.debug(
            "ltm_retrieved",
            query=query[:50],
            results_count=len(ltm_results),
        )

        return ltm_results

    def get_formatted_context(
        self,
        query: str,
        n_results: int = 3,
        min_relevance: float = 0.4,
    ) -> str:
        """
        Get relevant memories formatted as context string.

        Args:
            query: The search query
            n_results: Maximum number of results
            min_relevance: Minimum relevance score

        Returns:
            Formatted string of relevant memories
        """
        results = self.retrieve(query, n_results, min_relevance)

        if not results:
            return ""

        lines = ["Relevant past context:"]
        for result in results:
            lines.append(f"- {result}")

        return "\n".join(lines)

    def clear(self) -> None:
        """Clear all long-term memory."""
        self._client.delete_collection(self.collection_name)
        self._collection = self._client.create_collection(
            name=self.collection_name,
            metadata={"hnsw:space": "cosine"},
        )
        logger.info("ltm_cleared")

    @property
    def count(self) -> int:
        """Get the number of memories stored."""
        return self._collection.count()
