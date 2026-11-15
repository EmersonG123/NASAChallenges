// Online system only (web build): every /system page needs a valid session, otherwise -> /login.
// The desktop app is a static export without this file (see pageExtensions in next.config.ts).
// /api stays open on purpose: the desktop app syncs through it and the backend checks its own token.
import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySession } from '@/lib/auth/session';

export async function proxy(req: NextRequest) {
  const s = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (s) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.search = `?next=${encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search)}`;
  return NextResponse.redirect(url);
}

export const config = { matcher: ['/system', '/system/:path*'] };
