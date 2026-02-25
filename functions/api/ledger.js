import { canonicalJson, deriveKey, verifyHmac, validateLedgerPayload } from './_shared/crypto.js';

// GET /api/ledger — return ledger entries (latest first)
export async function onRequestGet(context) {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

  try {
    const kv = context.env.PLC_KV;
    if (!kv) {
      return new Response(JSON.stringify({ entries: [] }), { headers });
    }

    const index = await kv.get('ledger:index', 'json');
    if (!index || !Array.isArray(index) || index.length === 0) {
      return new Response(JSON.stringify({ entries: [] }), { headers });
    }

    const entries = [];
    for (const meetingId of index) {
      const entry = await kv.get(`ledger:${meetingId}`, 'json');
      if (entry) entries.push(entry);
    }

    return new Response(JSON.stringify({ entries }), { headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Failed to load ledger' }), { status: 500, headers });
  }
}

// POST /api/ledger — accept signed ledger entry, verify, store
export async function onRequestPost(context) {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

  try {
    const kv = context.env.PLC_KV;
    const passphrase = context.env.PLC_PASSPHRASE;

    if (!kv || !passphrase) {
      return new Response(JSON.stringify({ error: 'Server misconfigured' }), { status: 500, headers });
    }

    const body = await context.request.json();
    const { sig, ...payload } = body;

    if (!sig) {
      return new Response(JSON.stringify({ error: 'Missing signature' }), { status: 400, headers });
    }

    const errors = validateLedgerPayload(payload);
    if (errors.length > 0) {
      return new Response(JSON.stringify({ error: 'Validation failed', details: errors }), { status: 400, headers });
    }

    // Verify HMAC signature
    const canonical = canonicalJson(payload);
    const key = await deriveKey(passphrase, payload.meetingId);
    const valid = await verifyHmac(key, canonical, sig);

    if (!valid) {
      return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 403, headers });
    }

    // Store ledger entry
    await kv.put(`ledger:${payload.meetingId}`, JSON.stringify({ ...payload, sig }));

    // Update ledger index (newest first)
    let index = await kv.get('ledger:index', 'json') || [];
    if (!index.includes(payload.meetingId)) {
      index.unshift(payload.meetingId);
    }
    await kv.put('ledger:index', JSON.stringify(index));

    return new Response(JSON.stringify({
      ok: true,
      meetingId: payload.meetingId
    }), { status: 201, headers });

  } catch (e) {
    return new Response(JSON.stringify({ error: 'Failed to process ledger entry' }), { status: 500, headers });
  }
}

// Handle CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
