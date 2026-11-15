// POST /auth/login {username, password} -> sets the signed session cookie. Web build only.
import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, SESSION_HOURS, signSession } from '@/lib/auth/session';
import { checkLogin } from '@/lib/auth/users';

// a small delay on every attempt makes guessing passwords slow
const pause = () => new Promise((r) => setTimeout(r, 400));

export async function POST(req: NextRequest) {
  let body: { username?: unknown; password?: unknown } = {};
  try { body = await req.json(); } catch { /* empty body */ }
  const username = typeof body.username === 'string' ? body.username.slice(0, 64) : '';
  const password = typeof body.password === 'string' ? body.password.slice(0, 128) : '';
  await pause();
  const user = username && password ? await checkLogin(username, password) : null;
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const res = NextResponse.json({ ok: true, user: user.username, role: user.role });
  res.cookies.set(SESSION_COOKIE, await signSession({ u: user.username, r: user.role }), {
    httpOnly: true, sameSite: 'lax', path: '/', maxAge: SESSION_HOURS * 3600,
    // Secure only over HTTPS: an intranet served on plain http must still be able to log in
    secure: req.nextUrl.protocol === 'https:',
  });
  return res;
}
