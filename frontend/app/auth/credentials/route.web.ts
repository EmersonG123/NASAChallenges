// GET  /auth/credentials -> whether this server can change credentials (Vercel cannot keep files).
// POST /auth/credentials {current, username?, password?} -> changes the signed-in user's credentials
// and renews the session cookie with the new username. Web build only.
import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, SESSION_HOURS, signSession, verifySession } from '@/lib/auth/session';
import { canChangeCredentials, changeCredentials } from '@/lib/auth/users';

export async function GET(req: NextRequest) {
  const s = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!s) return NextResponse.json({ error: 'auth' }, { status: 401 });
  return NextResponse.json({ user: s.u, role: s.r, writable: canChangeCredentials() });
}

export async function POST(req: NextRequest) {
  const s = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!s) return NextResponse.json({ error: 'auth' }, { status: 401 });
  let body: { current?: unknown; username?: unknown; password?: unknown } = {};
  try { body = await req.json(); } catch { /* empty body */ }
  const current = typeof body.current === 'string' ? body.current.slice(0, 128) : '';
  const username = typeof body.username === 'string' && body.username.trim() ? body.username : undefined;
  const password = typeof body.password === 'string' && body.password ? body.password : undefined;
  if (!current || (!username && !password)) return NextResponse.json({ error: 'invalid' }, { status: 400 });

  await new Promise((r) => setTimeout(r, 300)); // slows down guessing the current password
  const r = await changeCredentials(s.u, current, { username, password });
  if (!r.ok) {
    const status = { readonly: 403, current: 401, taken: 409, invalid: 400, io: 500 }[r.error];
    return NextResponse.json({ error: r.error }, { status });
  }
  const res = NextResponse.json({ ok: true, user: r.username, role: r.role });
  res.cookies.set(SESSION_COOKIE, await signSession({ u: r.username, r: r.role }), {
    httpOnly: true, sameSite: 'lax', path: '/', maxAge: SESSION_HOURS * 3600, secure: req.nextUrl.protocol === 'https:',
  });
  return res;
}
