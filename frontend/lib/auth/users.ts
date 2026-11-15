// Users of the online system (server only).
// - Source of truth: a JSON file on the Next server (ASTRA_USERS_FILE, default frontend/.data/users.json)
//   with scrypt password hashes. It is created the first time someone changes their credentials.
// - Until then, users come from ASTRA_USERS ("user:password:role,…") or the initial admin / admin.
// - On Vercel the file system is read-only/ephemeral, so changing credentials is disabled there.
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';
import type { Role } from '@/lib/auth/session';

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;
const ROLES: Role[] = ['admin', 'operador', 'lector'];
// turbopackIgnore: the path is only known at runtime; without it the whole project would be traced into the server bundle
const FILE = process.env.ASTRA_USERS_FILE || join(/* turbopackIgnore: true */ process.cwd(), '.data', 'users.json');

interface StoredUser { username: string; role: Role; salt: string; hash: string; updatedAt: number }
interface EnvUser { username: string; password: string; role: Role }

function envUsers(): EnvUser[] {
  const raw = process.env.ASTRA_USERS?.trim();
  if (!raw) return [{ username: 'admin', password: 'admin', role: 'admin' }];
  return raw.split(',').map((e) => e.trim()).filter(Boolean).flatMap((e) => {
    const [username, password, role] = e.split(':');
    if (!username || !password) return [];
    return [{ username: username.trim(), password, role: ROLES.includes(role as Role) ? (role as Role) : 'lector' }];
  });
}

async function readStore(): Promise<StoredUser[] | null> {
  try {
    const list = JSON.parse(await readFile(FILE, 'utf8')) as StoredUser[];
    return Array.isArray(list) && list.length ? list : null;
  } catch { return null; }
}
async function writeStore(list: StoredUser[]) {
  await mkdir(dirname(FILE), { recursive: true });
  const tmp = `${FILE}.${process.pid}.tmp`; // write then rename: a crash never leaves a half-written file
  await writeFile(tmp, JSON.stringify(list, null, 2), { encoding: 'utf8', mode: 0o600 });
  await rename(tmp, FILE);
}

const hashPw = async (pw: string, salt = randomBytes(16)) => ({ salt: salt.toString('hex'), hash: (await scrypt(pw, salt, 64)).toString('hex') });
/** constant-time comparisons so response time does not reveal how much matched */
const sameBuf = (a: Buffer, b: Buffer) => a.length === b.length && timingSafeEqual(a, b);
const verifyStored = async (u: StoredUser, pw: string) => sameBuf(await scrypt(pw, Buffer.from(u.salt, 'hex'), 64), Buffer.from(u.hash, 'hex'));
const sameStr = (a: string, b: string) => sameBuf(Buffer.from(a), Buffer.from(b));
const norm = (s: string) => s.trim().toLowerCase();

export async function checkLogin(username: string, password: string): Promise<{ username: string; role: Role } | null> {
  const store = await readStore();
  if (store) {
    const u = store.find((x) => norm(x.username) === norm(username));
    return u && (await verifyStored(u, password)) ? { username: u.username, role: u.role } : null;
  }
  const u = envUsers().find((x) => norm(x.username) === norm(username));
  return u && sameStr(u.password, password) ? { username: u.username, role: u.role } : null;
}

/** credentials can only be changed where the server can keep a file (intranet / own server, not Vercel) */
export const canChangeCredentials = () => process.env.VERCEL !== '1' && process.env.ASTRA_READONLY_USERS !== '1';

export type ChangeResult = { ok: true; username: string; role: Role } | { ok: false; error: 'readonly' | 'current' | 'taken' | 'invalid' | 'io' };

/** change the username and/or password of `who`, after checking their current password */
export async function changeCredentials(who: string, current: string, next: { username?: string; password?: string }): Promise<ChangeResult> {
  if (!canChangeCredentials()) return { ok: false, error: 'readonly' };
  const newName = next.username?.trim();
  if (newName !== undefined && !/^[A-Za-z0-9._-]{3,32}$/.test(newName)) return { ok: false, error: 'invalid' };
  if (next.password !== undefined && (next.password.length < 6 || next.password.length > 128)) return { ok: false, error: 'invalid' };
  if (!(await checkLogin(who, current))) return { ok: false, error: 'current' };

  // first change: copy the current users (env or default) into the file, hashed
  let store = await readStore();
  store ??= await Promise.all(envUsers().map(async (u) => ({ username: u.username, role: u.role, ...(await hashPw(u.password)), updatedAt: Date.now() })));
  const i = store.findIndex((x) => norm(x.username) === norm(who));
  if (i < 0) return { ok: false, error: 'current' };
  if (newName && norm(newName) !== norm(who) && store.some((x) => norm(x.username) === norm(newName))) return { ok: false, error: 'taken' };

  const u = { ...store[i] };
  if (newName) u.username = newName;
  if (next.password) Object.assign(u, await hashPw(next.password));
  u.updatedAt = Date.now();
  store[i] = u;
  try { await writeStore(store); } catch { return { ok: false, error: 'io' }; }
  return { ok: true, username: u.username, role: u.role };
}
