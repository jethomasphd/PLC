// Shared crypto utilities for PLC backend

const SIGNING_INFO = 'PLC_SIGNING_V1';

function canonicalJson(obj) {
  const keys = Object.keys(obj).sort();
  const sorted = {};
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) {
      sorted[k] = obj[k];
    }
  }
  return JSON.stringify(sorted);
}

async function deriveKey(passphrase, meetingId) {
  const encoder = new TextEncoder();
  const material = encoder.encode(passphrase + ':' + meetingId + ':' + SIGNING_INFO);
  const hash = await crypto.subtle.digest('SHA-256', material);
  return await crypto.subtle.importKey('raw', hash, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

async function computeHmac(key, data) {
  const encoder = new TextEncoder();
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return arrayBufferToHex(sig);
}

async function verifyHmac(key, data, signature) {
  const expected = await computeHmac(key, data);
  return expected === signature;
}

async function sha256Hex(data) {
  const encoder = new TextEncoder();
  const hash = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  return arrayBufferToHex(hash);
}

function arrayBufferToHex(buffer) {
  return [...new Uint8Array(buffer)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyPow(canonicalPayload, pow, requiredBits = 18) {
  if (!pow || !pow.nonce) return false;
  const bits = pow.bits || requiredBits;
  if (bits < requiredBits) return false;
  const data = canonicalPayload + ':' + pow.nonce;
  const hash = await sha256Hex(data);
  const binaryPrefix = hexToBinaryPrefix(hash, bits);
  return binaryPrefix === '0'.repeat(bits);
}

function hexToBinaryPrefix(hex, bits) {
  const nibbles = Math.ceil(bits / 4);
  let binary = '';
  for (let i = 0; i < nibbles && i < hex.length; i++) {
    binary += parseInt(hex[i], 16).toString(2).padStart(4, '0');
  }
  return binary.substring(0, bits);
}

function validateMessagePayload(payload) {
  const validTypes = ['WIN', 'STRUGGLE', 'ASK', 'OFFER', 'READING', 'LEDGER'];
  const errors = [];

  if (payload.v !== 1) errors.push('Invalid version');
  if (!payload.ts || typeof payload.ts !== 'number') errors.push('Missing or invalid timestamp');
  if (!payload.meetingId || typeof payload.meetingId !== 'string') errors.push('Missing meetingId');
  if (!validTypes.includes(payload.type)) errors.push('Invalid message type');
  if (!payload.body || typeof payload.body !== 'string') errors.push('Missing body');
  if (payload.body && payload.body.length > 500) errors.push('Body exceeds 500 characters');
  if (payload.body && payload.body.trim().length === 0) errors.push('Body cannot be empty');

  return errors;
}

function validateLedgerPayload(payload) {
  const errors = [];

  if (!payload.meetingId) errors.push('Missing meetingId');
  if (!payload.date) errors.push('Missing date');
  if (!Array.isArray(payload.topics) || payload.topics.length === 0) errors.push('Missing or empty topics');
  if (!payload.takeaway) errors.push('Missing takeaway');
  if (!payload.updatedTs) errors.push('Missing updatedTs');

  return errors;
}

export {
  canonicalJson,
  deriveKey,
  computeHmac,
  verifyHmac,
  sha256Hex,
  verifyPow,
  validateMessagePayload,
  validateLedgerPayload
};
