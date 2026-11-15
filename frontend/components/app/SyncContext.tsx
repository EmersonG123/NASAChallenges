'use client';
// Connection and sync state for the whole app. Syncs on start, when the network comes back,
// shortly after every local change, and every minute; the app keeps working offline in between.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { desktop } from '@/lib/platform';
import { getStore, STORE_EVENT } from '@/lib/store';
import { checkUpdate, pendingCount, syncNow, type AppUpdate } from '@/lib/store/sync';

export type Conn = 'checking' | 'online' | 'offline';

interface SyncState {
  conn: Conn;
  syncing: boolean;
  lastSync: number | null;
  pending: number;
  error: string | null;
  update: AppUpdate | null;
  storage: { kind: 'sqlite' | 'browser'; location: string };
  appVersion: string | null;
  run: () => Promise<void>;
}

const Ctx = createContext<SyncState | null>(null);

export function SyncProvider({ children }: { children: ReactNode }) {
  const [conn, setConn] = useState<Conn>('checking');
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [pending, setPending] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [update, setUpdate] = useState<AppUpdate | null>(null);
  const [storage, setStorage] = useState<SyncState['storage']>({ kind: 'browser', location: 'localStorage' });
  const busy = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshPending = useCallback(async () => { setPending(await pendingCount()); }, []);

  const run = useCallback(async () => {
    if (busy.current) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) { setConn('offline'); await refreshPending(); return; }
    busy.current = true; setSyncing(true);
    try {
      const r = await syncNow();
      setConn('online'); setLastSync(r.at); setError(null);
    } catch (e) {
      setConn('offline'); setError(e instanceof Error ? e.message : String(e));
    } finally {
      busy.current = false; setSyncing(false); await refreshPending();
    }
  }, [refreshPending]);

  useEffect(() => {
    const s = getStore();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read once from the platform after mount
    setStorage({ kind: s.kind, location: s.location });
    void s.getMeta('last_sync').then((v) => v && setLastSync(Number(v)));
    void run();
    const d = desktop();
    if (d) void checkUpdate(d.version).then(setUpdate).catch(() => {});

    const onChange = () => {
      void refreshPending();
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void run(), 3000); // batch rapid edits
    };
    const onOnline = () => void run();
    const onOffline = () => setConn('offline');
    window.addEventListener(STORE_EVENT, onChange);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    const every = setInterval(() => void run(), 60000);
    return () => {
      window.removeEventListener(STORE_EVENT, onChange);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      clearInterval(every); if (timer.current) clearTimeout(timer.current);
    };
  }, [run, refreshPending]);

  const value = useMemo<SyncState>(() => ({
    conn, syncing, lastSync, pending, error, update, storage, appVersion: desktop()?.version ?? null, run,
  }), [conn, syncing, lastSync, pending, error, update, storage, run]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSync(): SyncState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSync must be used inside <SyncProvider>');
  return v;
}
