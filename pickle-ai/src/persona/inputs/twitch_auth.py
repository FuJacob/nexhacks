"""Twitch OAuth token refresh utility."""

import os
import aiohttp
from pathlib import Path

from ..utils.logging import get_logger

logger = get_logger(__name__)


async def refresh_twitch_token(
    client_id: str,
    client_secret: str,
    refresh_token: str,
) -> dict | None:
    """
    Refresh a Twitch OAuth token using the refresh_token grant.
    
    Returns:
        Dict with 'access_token' and 'refresh_token' if successful, None otherwise.
    """
    if not refresh_token:
        logger.warning("twitch_refresh_skipped", reason="no_refresh_token")
        return None
    
    url = "https://id.twitch.tv/oauth2/token"
    data = {
        "client_id": client_id,
        "client_secret": client_secret,
        "grant_type": "refresh_token",
        "refresh_token": refresh_token,
    }
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(url, data=data) as resp:
                if resp.status == 200:
                    tokens = await resp.json()
                    logger.info("twitch_token_refreshed")
                    return {
                        "access_token": tokens["access_token"],
                        "refresh_token": tokens.get("refresh_token", refresh_token),
                    }
                else:
                    error_text = await resp.text()
                    logger.error(
                        "twitch_refresh_failed",
                        status=resp.status,
                        error=error_text[:100],
                    )
                    return None
    except Exception as e:
        logger.error("twitch_refresh_error", error=str(e))
        return None


def update_env_file(key: str, value: str, env_path: str = ".env") -> bool:
    """
    Update a key in the .env file.
    
    Returns:
        True if successful, False otherwise.
    """
    env_file = Path(env_path)
    
    if not env_file.exists():
        logger.error("env_file_not_found", path=str(env_file))
        return False
    
    try:
        lines = env_file.read_text().splitlines()
        updated = False
        new_lines = []
        
        for line in lines:
            if line.startswith(f"{key}="):
                new_lines.append(f"{key}={value}")
                updated = True
            else:
                new_lines.append(line)
        
        if not updated:
            # Key doesn't exist, append it
            new_lines.append(f"{key}={value}")
        
        env_file.write_text("\n".join(new_lines) + "\n")
        logger.info("env_updated", key=key)
        return True
        
    except Exception as e:
        logger.error("env_update_error", error=str(e))
        return False
