import os
import asyncio
from dotenv import load_dotenv
from twitchio.ext import commands

load_dotenv()

token = os.getenv("TWITCH_BOT_TOKEN")
channel = os.getenv("TWITCH_CHANNEL")
client_id = "gp762nuuoqcoxypju8c569th9wz7q5"
client_secret = os.getenv("TWITCH_CLIENT_SECRET")
bot_id = os.getenv("TWITCH_BOT_ID")

if not channel.startswith("#"):
    channel = f"#{channel}"

print(f"Attempting to join channel: {channel}")

class Bot(commands.Bot):
    def __init__(self):
        super().__init__(
            token=token,
            prefix="?",
            initial_channels=[channel],
            client_id=client_id,
            client_secret=None, # Testing None
            bot_id=bot_id
        )

    async def event_ready(self):
        print(f"Logged in as | {self.user.name if self.user else 'Unknown'}")
        print(f"User id is | {self.user.id if self.user else 'Unknown'}")
        
        # Introspect methods
        methods = [m for m in dir(self) if "join" in m.lower() or "channel" in m.lower()]
        print(f"Available methods (join/channel): {methods}")
        
        # Try explicit join if available
        if "join_channels" in dir(self):
            print("Trying explicit join_channels...")
            await self.join_channels([channel])
        elif "join_channel" in dir(self):
             print("Trying explicit join_channel...")
             await self.join_channel(channel)
        
    async def event_channel_joined(self, channel):
        print(f"Joined channel: {channel.name}")

    async def event_message(self, message):
        if message.echo:
            return
        print(f"Message in {message.channel.name}: {message.content}")

bot = Bot()
bot.run()
