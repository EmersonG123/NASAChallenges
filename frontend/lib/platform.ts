// Where the app is running and which server it talks to.
// - Desktop app: the static site runs inside the installer; data lives in a local SQLite file and
//   syncs with the online system whose address is configurable (default from NEXT_PUBLIC_ASTRA_ONLINE_URL).
// - Web: same-origin /api (proxied to the backend by Next).
import type { StoreBridge } from '@/lib/store/types';

export interface DesktopBridge {
  version: string;
  dbPath: string;
  db: StoreBridge;
  openExternal: (url: string) => Promise<void>;
  /** closes the desktop app */
  quit: () => Promise<void>;
}

declare global {
  interface Window { astraDesktop?: DesktopBridge }
}

const SERVER_KEY = 'astra-server';
const DEFAULT_ONLINE = process.env.NEXT_PUBLIC_ASTRA_ONLINE_URL || 'http://localhost:8000';

export const desktop = (): DesktopBridge | null => (typeof window !== 'undefined' && window.astraDesktop ? window.astraDesktop : null);
export const isDesktop = () => !!desktop();

/** base URL of the online system ('' = same origin) */
export function onlineBase(): string {
  if (!isDesktop()) return '';
  try { return (localStorage.getItem(SERVER_KEY) || DEFAULT_ONLINE).replace(/\/+$/, ''); } catch { return DEFAULT_ONLINE; }
}
export function setOnlineBase(url: string) {
  try { localStorage.setItem(SERVER_KEY, url.trim().replace(/\/+$/, '')); } catch { /* private mode */ }
}
export const apiUrl = (path: string) => `${onlineBase()}${path}`;

const TOKEN_KEY = 'astra-token';
/** optional access token required by servers that set ASTRA_SYNC_TOKEN */
export const syncToken = () => { try { return localStorage.getItem(TOKEN_KEY) ?? ''; } catch { return ''; } };
export const setSyncToken = (t: string) => { try { if (t.trim()) localStorage.setItem(TOKEN_KEY, t.trim()); else localStorage.removeItem(TOKEN_KEY); } catch { /* private mode */ } };

/** fetch with a timeout, so an unreachable server never blocks offline work */
export async function fetchT(input: string, init: RequestInit = {}, ms = 8000): Promise<Response> {
  const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), ms);
  try { return await fetch(input, { ...init, signal: ctl.signal }); } finally { clearTimeout(to); }
}

export function newId(prefix: string) {
  const r = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  return prefix + r.replace(/-/g, '').slice(0, 10).toUpperCase();
}
