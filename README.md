# Porch Light Council

A calm, anonymous bulletin board for a local fatherhood group. No accounts. No feed. No noise. Just a porch light that stays on.

**Live:** [plc-5oz.pages.dev](https://plc-5oz.pages.dev)

---

## Quick Start (For Members)

### Reading

Open the site. You'll see four tabs:

- **Board** — Next meetup date/time, last meetup's topics and takeaway, and the open reading prompt.
- **Thread** — Messages from other members. Filter by type: Win, Struggle, Ask, Offer, Reading.
- **Ledger** — A record of every meetup: topics discussed, the shared takeaway, next actions.
- **Covenant** — What this is, what it isn't, and how to post.

### Posting

1. Go to **Thread**
2. Check the three affirmations (they glow gold when checked)
3. Enter the **council passphrase** (shared in person at meetups)
4. Pick the **meeting date** and a **message type**
5. Write your message (500 characters max)
6. Hit **Post** — your browser solves a quick puzzle (~2 seconds), then it's posted
7. You'll get a **Lantern Receipt** — an anonymous hash proving you posted. No name attached.

### Message Types

| Type | What it is |
|---|---|
| **Win** | Something that went right this week |
| **Struggle** | One pressure point — no rants, just the weight |
| **Ask** | One question you need help with |
| **Offer** | One thing you can share or do for someone |
| **Reading** | One quote and why it matters |

---

## Deployment

### Stack

- Plain HTML/CSS/JS (no framework)
- Cloudflare Pages + Functions
- Cloudflare KV for storage
- HMAC-SHA256 signatures (shared passphrase, no accounts)
- Client-side proof-of-work for spam resistance

### Setup

```bash
npm install

# Create a KV namespace
npx wrangler kv namespace create PLC_KV
# Copy the ID into wrangler.toml

# Set the passphrase
npx wrangler pages secret put PLC_PASSPHRASE

# Deploy
npm run deploy
```

Or connect the repo to Cloudflare Pages via the dashboard:
- Build command: (none)
- Build output directory: `public`
- KV binding: `PLC_KV` (Settings > Functions > KV namespace bindings)
- Secret: `PLC_PASSPHRASE` (Settings > Environment variables)

### Local Development

```bash
npm run dev
# Opens at http://localhost:8788
```

---

## Managing the Board

Edit `public/data/board.json` and redeploy:

```json
{
  "nextMeetup": {
    "date": "2026-03-24",
    "time": "6:00 PM",
    "location": "TBD",
    "note": "Last Tuesday of every month, 6 PM."
  },
  "lastMeetup": {
    "date": "2026-02-24",
    "topics": ["Topic 1", "Topic 2"],
    "takeaway": "One shared takeaway."
  },
  "openReading": {
    "title": "Book or essay title",
    "prompt": "Bring one quote and one question."
  }
}
```

## Rotating the Passphrase

1. Choose a new passphrase at the meetup
2. Share it in person
3. Update the secret: `npx wrangler pages secret put PLC_PASSPHRASE`
4. Old messages stay. New posts need the new phrase.

## API

| Method | Path | Description |
|---|---|---|
| GET | `/api/board` | Board data (next/last meetup, reading) |
| GET | `/api/messages?limit=25&type=WIN` | Recent messages, optional type filter |
| GET | `/api/ledger` | Ledger entries (latest first) |
| POST | `/api/message` | Submit a signed message |
| POST | `/api/ledger` | Submit a signed ledger entry (facilitators) |
