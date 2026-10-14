"""
TICOH LIVE gift event worker (optional integration)
Runs as a separate, long-running Python process, NOT as a Vercel serverless function.
Uses the unofficial TikTokLive Python package. This is not an official TikTok API and may break.

Required environment variables:
  TIKTOK_USERNAME=the account currently LIVE (without @)
  SUPABASE_URL=https://your-project.supabase.co
  SUPABASE_SERVICE_ROLE_KEY=server-only service role key

Install:
  pip install -r requirements.txt

Run:
  python worker.py

Only use this where permitted by TikTok's terms and applicable law. The worker records gift events
for demo points; it does not send TikTok Coins or contact gift senders.
"""
import asyncio
import os
import requests
from TikTokLive import TikTokLiveClient
from TikTokLive.events import ConnectEvent, GiftEvent, LiveEndEvent

TIKTOK_USERNAME = os.environ.get("TIKTOK_USERNAME", "").lstrip("@")
SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

if not TIKTOK_USERNAME or not SUPABASE_URL or not SUPABASE_KEY:
    raise SystemExit("Set TIKTOK_USERNAME, SUPABASE_URL, and SUPABASE_SERVICE_ROLE_KEY first.")

client = TikTokLiveClient(unique_id=TIKTOK_USERNAME)
seen_events = set()

def save_gift(username, gift_name, gift_count, event_id):
    # Service-role key must remain only in this worker's environment, never in frontend code.
    payload = {
        "event_id": event_id,
        "sender_username": username,
        "gift_name": gift_name,
        "gift_count": int(gift_count),
        "demo_points": 200 * int(gift_count) if gift_name.lower() == "rose" else 0,
        "processed": False
    }
    response = requests.post(
        f"{SUPABASE_URL}/rest/v1/live_gift_events",
        headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "resolution=ignore-duplicates,return=minimal"
        },
        json=payload,
        timeout=10
    )
    if response.status_code not in (200, 201, 204):
        print("Could not store gift event:", response.status_code, response.text[:300])

@client.on(ConnectEvent)
async def on_connect(event: ConnectEvent):
    print(f"Connected to LIVE: @{TIKTOK_USERNAME}")

@client.on(GiftEvent)
async def on_gift(event: GiftEvent):
    try:
        user = getattr(event, "user", None)
        username = getattr(user, "unique_id", None) or getattr(user, "uniqueId", None)
        gift = getattr(event, "gift", None)
        gift_name = getattr(gift, "name", None) or "Unknown gift"
        count = getattr(event, "repeat_count", None) or 1
        event_id = str(getattr(event, "msg_id", None) or f"{username}:{gift_name}:{count}:{getattr(event, 'repeat_end', '')}")
        if not username or event_id in seen_events:
            return
        seen_events.add(event_id)
        save_gift(username, gift_name, count, event_id)
        print(f"Gift: @{username} sent {gift_name} x{count}")
    except Exception as exc:
        print("Gift event handling error:", exc)

@client.on(LiveEndEvent)
async def on_live_end(event: LiveEndEvent):
    print("LIVE ended.")

if __name__ == "__main__":
    asyncio.run(client.start())
