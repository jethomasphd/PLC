// GET /api/board — serve board data from KV or fallback to static JSON
export async function onRequestGet(context) {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

  try {
    const kv = context.env.PLC_KV;
    if (kv) {
      const board = await kv.get('board:current', 'json');
      if (board) {
        return new Response(JSON.stringify(board), { headers });
      }
    }

    // Fallback: serve static board.json
    const url = new URL(context.request.url);
    const staticUrl = url.origin + '/data/board.json';
    const res = await fetch(staticUrl);
    const data = await res.json();
    return new Response(JSON.stringify(data), { headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Failed to load board' }), { status: 500, headers });
  }
}
