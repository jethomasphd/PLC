// GET /api/messages?limit=25&type=ASK — fetch recent messages
export async function onRequestGet(context) {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
  const url = new URL(context.request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '25', 10), 50);
  const typeFilter = url.searchParams.get('type') || null;

  try {
    const kv = context.env.PLC_KV;
    if (!kv) {
      return new Response(JSON.stringify({ messages: [] }), { headers });
    }

    // Get rolling index of latest message keys
    const index = await kv.get('index:latest', 'json');
    if (!index || !Array.isArray(index) || index.length === 0) {
      return new Response(JSON.stringify({ messages: [] }), { headers });
    }

    const messages = [];
    for (const key of index) {
      if (messages.length >= limit) break;

      const msg = await kv.get(key, 'json');
      if (!msg) continue;

      if (typeFilter && msg.type !== typeFilter) continue;
      messages.push(msg);
    }

    return new Response(JSON.stringify({ messages }), { headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Failed to load messages' }), { status: 500, headers });
  }
}
