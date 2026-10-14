# TICOH Virtual Coin Sender

Mobile-first independent virtual-points demo for Samsung Android and Vercel. It is **not** an official TikTok service and does not send or credit actual TikTok Coins.

## What works in the included project
- Demo wallet starts at `650,668,250,123`
- Custom coin icon with a musical-note motif
- Username search and profile preview area
- Numeric keypad and quick amounts
- Processing animation and green DONE confirmation
- Demo balance and transaction history persisted in browser localStorage
- Settings to reset balance and clear history
- Profile lookup adapter endpoint, ready for a compatible provider
- Optional TikTok LIVE event worker and event polling endpoint

## Deploy frontend and API on Vercel
1. Upload all project files and folders to a GitHub repository.
2. Import the repository in Vercel and deploy.
3. The frontend and `/api` functions deploy together.
4. The profile lookup remains inactive until configured (see below).

## Real profile lookup configuration
The backend endpoint is `api/profile.js`. It expects a compatible provider that returns public profile details for a username. Configure these Vercel Environment Variables:
- `PROFILE_LOOKUP_URL`: provider endpoint that accepts `?username=...`
- `PROFILE_LOOKUP_API_KEY`: optional bearer token, if required by your provider

The provider response must contain fields equivalent to `username`, `displayName`, and `avatarUrl`, or a `user`/`profile` object with equivalents such as `uniqueId`, `nickname`, and `avatarLarger`. The endpoint validates that the returned username matches the requested username. Do not use an unauthorized scraper or fabricate profile information. Provider formats differ, so adapt `api/profile.js` to your provider's documented response schema.

## Automatic LIVE gift detection (optional)
A long-running worker is included in `live-worker/`. It uses the unofficial `TikTokLive` Python package and writes observed gift events to Supabase. It is not an official TikTok API and can break when the platform changes. Check the package's current documentation and TikTok's terms before using it.

### Set up Supabase
1. Create a Supabase project.
2. Run `live-worker/supabase-schema.sql` in the SQL Editor.
3. In Supabase project settings, copy the project URL and service-role key.
4. Keep the service-role key private. Put it only in the worker's environment and Vercel server environment variables; never expose it in frontend JavaScript.
5. For a real production setup, add authentication and rate limiting to `api/live-events.js` before exposing event data publicly.

### Run the worker on a persistent Python host
Vercel serverless functions are not suitable for maintaining a continuous TikTok LIVE connection. Run the worker on a persistent host or computer while your LIVE is active:
```bash
cd live-worker
pip install -r requirements.txt
export TIKTOK_USERNAME="your_live_account"
export SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"
python worker.py
```
On Windows, use the equivalent environment-variable syntax for your shell. The worker connects to the LIVE account named by `TIKTOK_USERNAME`; it cannot automatically connect to a random LIVE without configuration.

### Vercel environment variables for event display
Set:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Redeploy after setting environment variables. The web app polls `/api/live-events` every five seconds and fills the username field when it sees a new event. It attempts a profile lookup after filling the username.

**Security warning:** `api/live-events.js` is a starter adapter and returns recent events. Before a public deployment, protect it with authentication/authorization so visitors cannot inspect the event feed. Never put a service-role key in browser code.

## Demo rewards and safety
The frontend currently does not automatically deduct demo coins when a LIVE gift is detected. It only fills the sender and shows the detected event. The user must press Send to run the demo transaction. This avoids accidental reward processing from duplicate or replayed events. You can add an explicit opt-in rule if desired.

All “coin” rewards are virtual demo points. The app cannot credit real TikTok Coins or perform a TikTok transfer.

## Files
- `index.html` — UI
- `styles.css` — responsive styling
- `app.js` — demo state, profile lookup, LIVE event polling
- `api/profile.js` — profile provider adapter
- `api/live-events.js` — reads latest gift events from Supabase
- `live-worker/worker.py` — long-running LIVE event reader
- `live-worker/requirements.txt` — Python dependencies
- `live-worker/supabase-schema.sql` — database schema
- `vercel.json` — deployment config


## Install as an app on Android

This project now includes an installable Progressive Web App (PWA) setup. Deploy it to Vercel over HTTPS, open the deployed URL in Chrome on your Samsung phone, then tap **Install app** (or Chrome ⋮ → **Install app / Add to Home screen**). It opens in its own app window rather than a normal browser tab.

The app shell and main interface are cached so the interface can reopen during a temporary connection problem; profile lookup and LIVE events still require internet. Your demo balance and transaction history remain in that browser/app's local storage. This package is not a signed Android APK; a true APK build needs Android build tooling or a service such as Android Studio/Capacitor.
