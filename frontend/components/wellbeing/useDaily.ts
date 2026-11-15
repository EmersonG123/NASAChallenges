'use client';
// Daily wellbeing entries of the selected crew member, merged per day and analysed (live: local edits and sync).
// ASTRA Vision sessions of the same person are folded in as objective fatigue per day.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getStore, removeRow, STORE_EVENT } from '@/lib/store';
import type { DailyRecord, SessionRecord } from '@/lib/store/types';
import { analyze, mergeDays, sleepStats, type CheckIn, type VisionDay, type Wearable } from '@/lib/wellbeing/model';

const isoDay = (ms: number) => { const d = new Date(ms); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };

export function useDaily(crew: string) {
  const [rows, setRows] = useState<DailyRecord[]>([]);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const load = useCallback(async () => {
    const s = getStore();
    const [d, v] = await Promise.all([s.list('daily'), s.list('sessions')]);
    setRows(d); setSessions(v);
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async read from the local database (state is set after await)
    void load();
    const on = () => void load();
    window.addEventListener(STORE_EVENT, on);
    return () => window.removeEventListener(STORE_EVENT, on);
  }, [load]);
  const days = useMemo(() => mergeDays(rows, crew), [rows, crew]);
  /** one value per day: the highest camera fatigue of that day */
  const vision = useMemo(() => {
    const by = new Map<string, VisionDay>();
    sessions.filter((s) => s.crew_id === crew && !s.deleted).forEach((s) => {
      const day = isoDay(s.started_at); const v = by.get(day) ?? { day, fatigue: null, peak: null };
      v.fatigue = Math.max(v.fatigue ?? 0, s.fatigue ?? 0); v.peak = Math.max(v.peak ?? 0, s.peak_fatigue ?? s.fatigue ?? 0);
      by.set(day, v);
    });
    return [...by.values()].sort((a, b) => a.day.localeCompare(b.day));
  }, [sessions, crew]);
  const result = useMemo(() => analyze(days, vision), [days, vision]);
  const sleep = useMemo(() => sleepStats(days), [days]);
  return { days, vision, sleep, ...result };
}

const rowId = (crew: string, day: string, source: 'checkin' | 'wearable') => `${crew}-${day}-${source === 'checkin' ? 'c' : 'w'}`;

/** one entry per person, day and source: the id is deterministic, so editing a day replaces it */
export async function saveDay(crew: string, day: string, source: 'checkin' | 'wearable', metrics: CheckIn | Wearable) {
  await getStore().put('daily', {
    id: rowId(crew, day, source), crew_id: crew, day, source,
    metrics_json: JSON.stringify(metrics), updated_at: Date.now(), deleted: 0,
  });
}

/** removes both entries (check-in and wearable) of one day */
export async function removeDay(crew: string, day: string) {
  await removeRow('daily', rowId(crew, day, 'checkin'));
  await removeRow('daily', rowId(crew, day, 'wearable'));
}
