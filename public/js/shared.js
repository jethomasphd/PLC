// Shared utilities for Porch Board frontend

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

async function sha256Hex(data) {
  const encoder = new TextEncoder();
  const hash = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  return arrayBufferToHex(hash);
}

function arrayBufferToHex(buffer) {
  return [...new Uint8Array(buffer)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function deriveKey(passphrase, meetingId) {
  const encoder = new TextEncoder();
  const material = encoder.encode(passphrase + ':' + meetingId + ':' + SIGNING_INFO);
  const hash = await crypto.subtle.digest('SHA-256', material);
  return await crypto.subtle.importKey('raw', hash, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}

async function signPayload(passphrase, meetingId, payload) {
  const canonical = canonicalJson(payload);
  const key = await deriveKey(passphrase, meetingId);
  const encoder = new TextEncoder();
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(canonical));
  return arrayBufferToHex(sig);
}

// Proof-of-work: find nonce where SHA256(canonical + ":" + nonce) has N leading zero bits
async function solvePoW(canonicalPayloadNoPow, targetBits = 18, onProgress) {
  let nonce = 0;
  const startTime = Date.now();

  while (true) {
    const data = canonicalPayloadNoPow + ':' + nonce;
    const hash = await sha256Hex(data);
    if (hasLeadingZeroBits(hash, targetBits)) {
      return { nonce: String(nonce), bits: targetBits };
    }
    nonce++;
    if (nonce % 5000 === 0 && onProgress) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      onProgress(nonce, elapsed);
      // Yield to UI thread
      await new Promise(r => setTimeout(r, 0));
    }
  }
}

function hasLeadingZeroBits(hexHash, bits) {
  const nibbles = Math.ceil(bits / 4);
  let binary = '';
  for (let i = 0; i < nibbles && i < hexHash.length; i++) {
    binary += parseInt(hexHash[i], 16).toString(2).padStart(4, '0');
  }
  for (let i = 0; i < bits; i++) {
    if (binary[i] !== '0') return false;
  }
  return true;
}

function formatTimestamp(ts) {
  const d = new Date(ts * 1000);
  return d.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit'
  });
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  });
}

async function copyToClipboard(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
    const orig = btn.textContent;
    btn.textContent = 'Copied';
    setTimeout(() => btn.textContent = orig, 1500);
  } catch (e) {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
}
