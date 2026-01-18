import os
import requests
import asyncio
from dotenv import load_dotenv
from twitchio.ext import commands

load_dotenv()

def verify_token_scopes():
    token = os.getenv("TWITCH_BOT_TOKEN")
    if not token:
        print("Error: TWITCH_BOT_TOKEN not found in .env")
        exit(1)

    clean_token = token.replace("oauth:", "")
    print(f"Checking token: {clean_token[:4]}...{clean_token[-4:]}")

    url = "https://id.twitch.tv/oauth2/validate"
    headers = {"Authorization": f"OAuth {clean_token}"}

    try:
        response = requests.get(url, headers=headers)
        data = response.json()
        
        if response.status_code == 200:
            print("\nScopes:", data.get("scopes"))
            print("User ID:", data.get("user_id"))
            client_id = data.get("client_id")
            print(f"Token Client ID: {client_id}")
            
            env_client_id = os.getenv("TWITCH_CLIENT_ID")
            if env_client_id != client_id:
                print(f"WARNING: Mismatch! .env Client ID is {env_client_id}, but Token is for {client_id}")
            else:
                print("SUCCESS: Client IDs match.")
                
            return client_id
        else:
            print("ERROR: Token validation failed.")
            return None

    except Exception as e:
        print(f"Exception: {e}")
        return None

async def test_chat(client_id):
    print("\nTesting Chat Connection...")
    load_dotenv(override=True)
    new_token = os.getenv("TWITCH_BOT_TOKEN")
    new_client_secret = os.getenv("TWITCH_CLIENT_SECRET")
    channel_name = os.getenv("TWITCH_CHANNEL")
    bot_id = os.getenv("TWITCH_BOT_ID")
    
    if not channel_name.startswith("#"):
        channel_name = f"#{channel_name}"

    bot = commands.Bot(
        token=new_token,
        client_id=client_id,
        client_secret=new_client_secret,
        bot_id=bot_id,
        prefix="!",
        initial_channels=[channel_name]
    )
    
    @bot.event
    async def event_ready():
        print(f"SUCCESS: Chat Bot Logged in as {bot.nick}")
        print(f"Waiting for channel join...")

    @bot.event
    async def event_channel_joined(channel):
        print(f"SUCCESS: Joined channel {channel.name}")
        await bot.close()

    try:
        await bot.start()
    except Exception as e:
        print(f"Chat Connection Failed: {e}")
        # await bot.close() 

if __name__ == "__main__":
    cid = verify_token_scopes()
    if cid:
        try:
            asyncio.run(test_chat(cid))
        except KeyboardInterrupt:
            pass
