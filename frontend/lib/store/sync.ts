// Offline-first sync with the online system: push local changes, pull everything newer, newest write wins.
import { apiUrl, fetchT, newId, syncToken } from '@/lib/platform';
import { getStore } from '@/lib/store';
import type { CrewRecord, DailyRecord, SessionRecord } from '@/lib/store/types';

export interface SyncResult { pushed: number; pulled: number; at: number }

async function clientId() {
  const s = getStore();
  let id = await s.getMeta('client_id');
  if (!id) { id = newId('D'); await s.setMeta('client_id', id); }
  return id;
}

/** throws when the server is unreachable or answers with an error; local data is never lost */
export async function syncNow(): Promise<SyncResult> {
  const s = getStore();
  const pending = await s.pending();
  const since = Number(await s.getMeta('cursor') ?? 0);
  const res = await fetchT(apiUrl('/api/sync'), {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(syncToken() ? { 'X-Astra-Token': syncToken() } : {}) },
    body: JSON.stringify({ client_id: await clientId(), since, changes: pending }),
  });
  if (res.status === 401) throw new Error('token');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const j = (await res.json()) as { cursor: number; changes: { crew: CrewRecord[]; sessions: SessionRecord[]; daily?: DailyRecord[] } };
  await s.markClean('crew', pending.crew);
  await s.markClean('sessions', pending.sessions);
  await s.markClean('daily', pending.daily);
  const pulled = (await s.applyRemote('crew', j.changes.crew)) + (await s.applyRemote('sessions', j.changes.sessions))
    + (await s.applyRemote('daily', j.changes.daily ?? []));
  const at = Date.now();
  await s.setMeta('cursor', String(j.cursor));
  await s.setMeta('last_sync', String(at));
  return { pushed: pending.crew.length + pending.sessions.length + pending.daily.length, pulled, at };
}

export async function pendingCount() {
  const p = await getStore().pending();
  return p.crew.length + p.sessions.length + p.daily.length;
}

export interface AppUpdate { version: string; url: string | null; notes: string }

/** compares dotted versions: 1.10.0 > 1.9.2 */
export const newer = (a: string, b: string) => {
  const pa = a.split('.').map(Number), pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) { const d = (pa[i] ?? 0) - (pb[i] ?? 0); if (d) return d > 0; }
  return false;
};

export async function checkUpdate(current: string): Promise<AppUpdate | null> {
  const res = await fetchT(apiUrl('/api/app/version'), {}, 5000);
  if (!res.ok) return null;
  const j = (await res.json()) as AppUpdate;
  if (!j.version || !newer(j.version, current)) return null;
  // relative download links point at the online system
  return { ...j, url: j.url && j.url.startsWith('/') ? apiUrl(j.url) : j.url };
}
