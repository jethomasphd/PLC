# Seed.md — Porch Light Council: The Porch Board (Anti‑Flood Web Platform)

## The Spirit
Porch Light Council (PLC) is an in‑person fatherhood town hall: show up, tell the truth, leave with one concrete step, come back stronger.
This platform is not a feed. Not a debate arena. Not therapy. Not politics. Not performance.

It is a porch light: steady, local, calm, home‑facing.

Design mantra: Anti‑Flood by construction.
No infinite scroll. No engagement metrics. No algorithm. No notifications.

---

## The Product
Build a browser-only communications surface for PLC that can be deployed as a simple Cloudflare Pages site with a minimal backend (Cloudflare Pages Functions or a Worker). The backend persists an append-only, hash-addressed log of signed entries.

No profiles. No personal data. No emails. No usernames.
People can post only if they possess the current council passphrase (shared in person).

The experience is a single screen with three calm sections:

1) The Board (bulletin board, top)
- Next meetup: date/time/location + short “bring / note” line
- Last meetup: topics list + one shared takeaway
- Open reading: one shared reading prompt for next meetup

2) The Town Line (minimal forum, below)
- Flat list of recent messages (no nested replies)
- Strong structure to prevent sludge: message types + character caps
- Signed commits + optional lightweight proof-of-work to prevent spam

3) The Ledger
- Rolling record of meetups: date → topics → takeaway → next actions
- The record is updated via signed entries (no admin dashboard required for MVP)

---

## Pages / Routes
- / — The Board (next/last/open reading + links)
- /town-line — Messages (view + compose)
- /ledger — Rolling record (meetups and takeaways)
- /covenant — “What this is / is not” + posting rules + how to get the passphrase (in person)

---

## Anti‑Flood Constraints (Non‑Negotiables)
1) No feed mechanics
- No infinite scroll
- No likes, reactions, upvotes, view counts
- No “hot”, “trending”, or ranking beyond “most recent”

2) Small, structured messages
- Message types (enum):
  - WIN — one win
  - STRUGGLE — one pressure point
  - ASK — one question
  - OFFER — one offer of help/resources
  - READING — one quote + why it matters
  - LEDGER — ledger update entry (used by facilitators)
- Body hard cap: 500 chars (recommend 280–500)
- Optional ref field to reference a prior message hash (no threading UI)

3) Posting friction (choose at least one)
- Option A (recommended): Lightweight client-side proof-of-work (Hashcash style) targeting ~1–3 seconds on a normal laptop
- Option B: Posting window (e.g., posts accepted only 6pm–10pm local)
- Option C: Soft cap: one post per browser per day (cookie/localStorage gate; not security, just friction)

4) Covenant gate
- Before composing, user must check:
  - “Not politics. Not therapy. Not a feed.”
  - “Be brief. Be real. Be useful.”
  - “Assume goodwill.”

---

## Backend (Cloudflare)
Use Cloudflare Pages + Functions (or Worker) with KV (recommended) or D1.

### Storage Option 1 (KV, recommended)
- Store each message as its own key:
  - msg:<ts>:<id> → JSON payload
- Maintain a small rolling index:
  - index:latest → list of message keys (max 25–50)
- Ledger entries:
  - ledger:<meetingId> → JSON entry
  - ledger:index → ordered list of meetingIds

### Storage Option 2 (D1)
Tables:
- messages(id TEXT PRIMARY KEY, ts INTEGER, meetingId TEXT, type TEXT, body TEXT, prev TEXT, pow TEXT, sig TEXT)
- ledger(meetingId TEXT PRIMARY KEY, date TEXT, topics TEXT, takeaway TEXT, nextActions TEXT, updatedTs INTEGER)

---

## Signature Model (No Accounts)
Posting requires a shared council passphrase (rotated regularly, distributed in person).
The goal is “in‑group authenticity” without identity.

### Canonical payload
A message payload (without sig) must be canonicalized (stable JSON string):
{
  "v": 1,
  "ts": 1730000000,
  "meetingId": "2026-03-03",
  "type": "ASK",
  "body": "How do you limit screen time without constant fights?",
  "prev": "optional-previous-message-hash",
  "pow": "optional-proof-of-work-nonce-or-structure"
}

### Key derivation + signature
- Derive a signing key from passphrase + meetingId:
  - key = HKDF(passphrase, salt=meetingId, info="PLC_SIGNING_V1")
  - If HKDF is heavy, use SHA-based KDF:
    - key = SHA256(passphrase + ":" + meetingId + ":PLC_SIGNING_V1")
- Signature:
  - sig = HMAC_SHA256(key, canonical_json(payload))
- Message id:
  - id = SHA256(canonical_json(payload) + ":" + sig)
  (Or id = SHA256(canonical_json(payload)) if you prefer id independent of sig.)

### Server verification
- Server holds the current passphrase in env var (e.g., PLC_PASSPHRASE)
- Server recomputes key + verifies HMAC
- If valid and anti-flood checks pass → store as append-only log entry

### Privacy promise
- Do not store IPs, user agents, or any identifiers.
- No cookies required except optional local anti-spam friction (client-side only).

---

## Proof‑of‑Work (If Used)
Goal: spam resistance without accounts.

One simple approach:
- Client finds a nonce such that:
  - SHA256(canonical_json(payload_without_pow) + ":" + nonce) has N leading zero bits
- Store pow = { "nonce": "...", "bits": N }
- Server verifies quickly.

Target:
- ~1–3 seconds average on commodity hardware (tune N).

---

## API Endpoints
Implement as Pages Functions or Worker routes.

### Read
- GET /api/board → returns board JSON (next/last/open reading)
- GET /api/messages?limit=25&type=ASK → returns newest messages
- GET /api/ledger → returns ledger index + entries (latest first)

### Write
- POST /api/message → accept signed message payload, verify, store
- POST /api/ledger → accept signed ledger update payload, verify, store

Note: For MVP, the Board can be a static JSON file served from /data/board.json and edited manually.

---

## UI Requirements
- Calm layout: single column, generous whitespace
- Typography: readable, not “tech”
- No bright badges or attention traps
- Limit visible content:
  - Board: always visible, short
  - Town Line: last 25 only
  - Ledger: list by meetup, short summaries

### Lantern Receipt
After posting, show:
- message hash/id (copy button)
- timestamp
- type
This is the user’s proof of posting without identity.

---

## Data Objects

### Board
{
  "nextMeetup": {
    "date": "2026-03-03",
    "time": "6:00 PM",
    "location": "Santa Rita Ranch — (exact spot as text)",
    "note": "Bring a chair. Coffee welcome."
  },
  "lastMeetup": {
    "date": "2026-02-24",
    "topics": [
      "Homeschool vs public school",
      "Daycare vs nanny",
      "The weight of being a dad",
      "Job market brokenness",
      "AI: potential and woes",
      "Screen time and exercise"
    ],
    "takeaway": "We draw our own line: show up for our homes first."
  },
  "openReading": {
    "title": "Short essay / excerpt (rotates)",
    "prompt": "Bring one quote and one question for next time."
  }
}

### Message
{
  "v": 1,
  "id": "sha256...",
  "ts": 1730000000,
  "meetingId": "2026-03-03",
  "type": "WIN",
  "body": "Did a 20-minute floor-time session, no phone. Kid lit up.",
  "prev": "optional",
  "pow": { "nonce": "...", "bits": 18 },
  "sig": "hmac..."
}

### Ledger Entry
{
  "meetingId": "2026-02-24",
  "date": "2026-02-24",
  "topics": ["..."],
  "takeaway": "...",
  "nextActions": ["..."],
  "updatedTs": 1730000000,
  "sig": "hmac..."
}

---

## Deliverables (What the Agent Must Produce)
1) A working Cloudflare Pages project:
- Static front-end routes for /, /town-line, /ledger, /covenant
- Clean UI with the anti-flood constraints baked in

2) Backend:
- Functions/Worker implementing:
  - GET /api/board
  - GET /api/messages
  - POST /api/message
  - GET /api/ledger
  - POST /api/ledger
- Storage using KV (preferred) or D1

3) Security + constraints:
- HMAC verification with passphrase in env vars
- Optional PoW verification
- Rate-limiting strategy (PoW and/or posting window)

4) Documentation:
- README with:
  - deployment steps
  - passphrase rotation guidance
  - anti-flood rules and why they exist
  - how to update the board + ledger

---

## Done Definition
- A newcomer can open /, learn the next meetup, see last topics and the open reading, and understand the covenant in under 30 seconds.
- A council member with the passphrase can post a structured message in under 20 seconds.
- The system remains calm and useful even if many people try to post: the anti-flood constraints prevent it from becoming sludge.
