// Local store: SQLite in the desktop app, browser storage on the web. Same API for both.
import { desktop } from '@/lib/platform';
import type { CrewRecord, DailyRecord, Local, Rows, SessionRecord, Store, StoreBridge, Table } from '@/lib/store/types';

export const STORE_EVENT = 'astra-store-change';
const KEY = 'astra-db';
const LEGACY_CREW_KEY = 'astra-crew';

type Shape = { crew: Record<string, Local<CrewRecord>>; sessions: Record<string, Local<SessionRecord>>; daily: Record<string, Local<DailyRecord>>; meta: Record<string, string> };

/** web fallback with the same semantics as the SQLite tables */
function browserBridge(): StoreBridge {
  const load = (): Shape => {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Shape | null;
      if (s) return { ...s, daily: s.daily ?? {} };
    } catch { /* corrupted or unavailable */ }
    const fresh: Shape = { crew: {}, sessions: {}, daily: {}, meta: {} };
    // migrate profiles saved by the first version (plain list in localStorage)
    try {
      const old = JSON.parse(localStorage.getItem(LEGACY_CREW_KEY) ?? '[]') as { id: string; name: string; sex: 'F' | 'M'; source: 'upload' | 'example'; values: unknown }[];
      const now = Date.now();
      old.forEach((p, i) => { fresh.crew[p.id] = { id: p.id, name: p.name, sex: p.sex, source: p.source, values_json: JSON.stringify(p.values), updated_at: now + i, deleted: 0, dirty: 1 }; });
      localStorage.removeItem(LEGACY_CREW_KEY);
    } catch { /* nothing to migrate */ }
    return fresh;
  };
  const save = (s: Shape) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* quota or private mode */ } };
  const tbl = <T extends Table>(s: Shape, t: T) => s[t] as unknown as Record<string, Local<Rows[T]>>;

  return {
    async list(table) {
      return Object.values(tbl(load(), table)).filter((r) => !r.deleted).sort((a, b) => b.updated_at - a.updated_at);
    },
    async put(table, row) {
      const s = load(); tbl(s, table)[row.id] = { ...row, dirty: 1 }; save(s);
    },
    async pending() {
      const s = load();
      const strip = <T extends { dirty: number }>(r: T) => { const { dirty, ...rest } = r; void dirty; return rest; };
      return {
        crew: Object.values(s.crew).filter((r) => r.dirty).map(strip),
        sessions: Object.values(s.sessions).filter((r) => r.dirty).map(strip),
        daily: Object.values(s.daily).filter((r) => r.dirty).map(strip),
      };
    },
    async applyRemote(table, rows) {
      const s = load(); const t = tbl(s, table); let n = 0;
      rows.forEach((r) => { const cur = t[r.id]; if (!cur || cur.updated_at < r.updated_at) { t[r.id] = { ...r, dirty: 0 }; n++; } });
      if (n) save(s); return n;
    },
    async markClean(table, rows) {
      const s = load(); const t = tbl(s, table);
      rows.forEach((r) => { const cur = t[r.id]; if (cur && cur.updated_at === r.updated_at) cur.dirty = 0; });
      save(s);
    },
    async getMeta(key) { return load().meta[key] ?? null; },
    async setMeta(key, value) { const s = load(); s.meta[key] = value; save(s); },
  };
}

let store: Store | null = null;

export function getStore(): Store {
  if (store) return store;
  const d = desktop();
  const base = d ? d.db : browserBridge();
  const notify = () => window.dispatchEvent(new Event(STORE_EVENT));
  store = {
    ...base,
    kind: d ? 'sqlite' : 'browser',
    location: d ? d.dbPath : 'localStorage',
    // writes announce themselves so panels and the sync engine react
    put: async (t, r) => { await base.put(t, r); notify(); },
    applyRemote: async (t, rows) => { const n = await base.applyRemote(t, rows); if (n) notify(); return n; },
  };
  return store;
}

/** soft delete: kept as a tombstone until the server has it */
export async function removeRow(table: Table, id: string) {
  const s = getStore();
  const row = (await s.list(table)).find((r) => r.id === id);
  if (!row) return;
  const { dirty, ...rest } = row; void dirty;
  await s.put(table, { ...rest, deleted: 1, updated_at: Date.now() } as Rows[typeof table]);
}
