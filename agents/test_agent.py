import asyncio
import os
from dotenv import load_dotenv
from thenvoi.platform import ThenvoiLink

load_dotenv()

agent_id = os.getenv("BAND_AGENT_ID")
api_key = os.getenv("BAND_API_KEY")

print(f"Agent ID: {agent_id}")
print(f"API Key: {api_key[:10]}...")
print("Connecting to Band Platform...")

async def test():
    link = ThenvoiLink(agent_id=agent_id, api_key=api_key)
    await link.connect()
    print("✅ Connected!")
    
    await link.subscribe_agent_rooms(agent_id)
    print("✅ Subscribed to agent rooms!")
    
    print("\nWaiting for messages... (Press Ctrl+C to stop)")
    async for event in link:
        print(f"Event received: {event}")
        await link.close()
        break

asyncio.run(test())