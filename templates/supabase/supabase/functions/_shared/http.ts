// CORS, JSON replies and plain-words errors for every function (from Crew Clock).
export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// Set APP_ORIGIN to the app's address. '*' is only for local development.
export const cors = {
  'Access-Control-Allow-Origin': Deno.env.get('APP_ORIGIN') || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

export function env(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing secret ${name}`);
  return v;
}

// Wraps a handler with CORS, JSON parsing and plain-words errors. Never sends a stack trace.
export function serve(handler: (req: Request, body: Record<string, unknown>) => Promise<unknown>) {
  Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
    try {
      const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
      return json(Object.assign({ ok: true }, await handler(req, body)));
    } catch (e) {
      if (e instanceof HttpError) return json({ ok: false, error: e.message }, e.status);
      console.error(e);
      return json({ ok: false, error: 'Server error' }, 500);
    }
  });
}
