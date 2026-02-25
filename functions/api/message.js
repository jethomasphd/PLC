import { canonicalJson, deriveKey, verifyHmac, sha256Hex, verifyPow, validateMessagePayload } from './_shared/crypto.js';

// POST /api/message — accept signed message, verify, store
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

    // Validate payload structure
    const errors = validateMessagePayload(payload);
    if (errors.length > 0) {
      return new Response(JSON.stringify({ error: 'Validation failed', details: errors }), { status: 400, headers });
    }

    // Verify timestamp is recent (within 10 minutes)
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - payload.ts) > 600) {
      return new Response(JSON.stringify({ error: 'Timestamp too far from server time' }), { status: 400, headers });
    }

    // Verify proof-of-work
    const payloadWithoutPow = { ...payload };
    delete payloadWithoutPow.pow;
    const canonicalNoPow = canonicalJson(payloadWithoutPow);

    if (payload.pow) {
      const powValid = await verifyPow(canonicalNoPow, payload.pow, 18);
      if (!powValid) {
        return new Response(JSON.stringify({ error: 'Invalid proof-of-work' }), { status: 400, headers });
      }
    }

    // Verify HMAC signature
    const canonical = canonicalJson(payload);
    const key = await deriveKey(passphrase, payload.meetingId);
    const valid = await verifyHmac(key, canonical, sig);

    if (!valid) {
      return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 403, headers });
    }

    // Compute message ID
    const id = await sha256Hex(canonical + ':' + sig);

    // Store message
    const message = { ...payload, id, sig };
    const kvKey = `msg:${payload.ts}:${id.substring(0, 16)}`;
    await kv.put(kvKey, JSON.stringify(message));

    // Update rolling index (newest first, max 50)
    let index = await kv.get('index:latest', 'json') || [];
    index.unshift(kvKey);
    if (index.length > 50) index = index.slice(0, 50);
    await kv.put('index:latest', JSON.stringify(index));

    return new Response(JSON.stringify({
      ok: true,
      id: id,
      ts: payload.ts,
      type: payload.type,
      key: kvKey
    }), { status: 201, headers });

  } catch (e) {
    return new Response(JSON.stringify({ error: 'Failed to process message' }), { status: 500, headers });
  }
}

// Handle CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
