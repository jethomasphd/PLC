# The Porch Board — Porch Light Council

A calm, browser-first communications surface for Porch Light Council.
Anti-Flood by construction. No feed. No engagement metrics. No accounts.

## What It Is

The Porch Board is a minimal web platform with four sections:

- **The Board** (`/`) — Next meetup, last meetup topics, open reading prompt
- **Town Line** (`/town-line`) — Structured messages from council members (wins, struggles, asks, offers, readings)
- **The Ledger** (`/ledger`) — Rolling record of meetups, topics, and takeaways
- **The Covenant** (`/covenant`) — What this is, what it isn't, how to get the passphrase

## Stack

- **Frontend:** Plain HTML, CSS, JavaScript (no framework)
- **Backend:** Cloudflare Pages Functions
- **Storage:** Cloudflare KV
- **Auth:** HMAC-SHA256 signatures using a shared passphrase (no accounts)
- **Spam resistance:** Client-side proof-of-work (Hashcash-style, ~1-3 seconds)

## Local Development

```bash
# Install dependencies
npm install

# Run local dev server (uses wrangler)
npm run dev
```

This starts a local Cloudflare Pages dev server with KV simulation at `http://localhost:8788`.

## Deployment to Cloudflare Pages

### 1. Create a KV namespace

```bash
npx wrangler kv namespace create PLC_KV
```

Copy the namespace ID and update `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "PLC_KV"
id = "your-namespace-id-here"
```

### 2. Set the passphrase

```bash
# For production
npx wrangler pages secret put PLC_PASSPHRASE
# Enter the passphrase when prompted
```

### 3. Deploy

```bash
npm run deploy
```

Or connect the repo to Cloudflare Pages via the dashboard:
- Build command: (none — static files)
- Build output directory: `public`
- Add the KV binding `PLC_KV` in Settings > Functions > KV namespace bindings
- Add the secret `PLC_PASSPHRASE` in Settings > Environment variables

## Required Environment Variables

| Variable | Description |
|---|---|
| `PLC_PASSPHRASE` | Current council passphrase. Shared in person at meetups. |

## KV Bindings

| Binding | Description |
|---|---|
| `PLC_KV` | Main KV namespace for messages and ledger entries |

## How to Rotate the Passphrase

1. Choose a new passphrase at the meetup
2. Share it in person with attendees
3. Update the environment variable:
   ```bash
   npx wrangler pages secret put PLC_PASSPHRASE
   ```
4. Old messages remain valid. New posts require the new passphrase + a current `meetingId`.

## How to Update the Board

Edit `public/data/board.json` directly and redeploy:

```json
{
  "nextMeetup": {
    "date": "2026-03-10",
    "time": "6:00 PM",
    "location": "Santa Rita Ranch — Homestead Pavilion",
    "note": "Bring a chair. Coffee welcome."
  },
  "lastMeetup": {
    "date": "2026-03-03",
    "topics": ["Topic 1", "Topic 2"],
    "takeaway": "One shared takeaway."
  },
  "openReading": {
    "title": "Book or essay title",
    "prompt": "Bring one quote and one question."
  }
}
```

## Anti-Flood Rules (and Why They Exist)

These constraints are non-negotiable. They exist to keep the platform calm and useful.

**No infinite scroll.** You see the last 25 messages. That's it. Come back later.

**No likes, reactions, or upvotes.** No engagement metrics of any kind. Read it or don't.

**No trending, no algorithms.** Messages are shown most-recent-first. No ranking.

**Structured messages only.** Every post must be one of: WIN, STRUGGLE, ASK, OFFER, or READING. This prevents sludge.

**500-character cap.** Say what matters. Leave the rest for the meetup.

**Covenant gate.** Before composing, you check three boxes affirming the spirit of the platform.

**Proof-of-work.** Your browser solves a small computational puzzle (~1-3 seconds) before posting. This makes automated spam expensive.

**Passphrase required.** You can only post if you have the current council passphrase, shared in person at meetups. This is "in-group authenticity without identity."

**No accounts. No profiles. No personal data.** No IPs stored. No cookies required for auth. Anonymous by construction.

## Signature Model

Messages are signed using HMAC-SHA256:

1. Build canonical JSON payload (sorted keys, no signature field)
2. Derive signing key: `SHA256(passphrase + ":" + meetingId + ":PLC_SIGNING_V1")`
3. Compute signature: `HMAC_SHA256(key, canonical_json)`
4. Compute message ID: `SHA256(canonical_json + ":" + signature)`

The server recomputes and verifies before storing.

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/board` | Board data (next/last meetup, reading) |
| GET | `/api/messages?limit=25&type=ASK` | Recent messages, optional type filter |
| GET | `/api/ledger` | Ledger entries (latest first) |
| POST | `/api/message` | Submit a signed message |
| POST | `/api/ledger` | Submit a signed ledger entry |
