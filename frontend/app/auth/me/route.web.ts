// GET /auth/me -> the signed-in user, or 401. Web build only.
import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySession } from '@/lib/auth/session';

export async function GET(req: NextRequest) {
  const s = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!s) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({ user: s.u, role: s.r, exp: s.exp });
}
