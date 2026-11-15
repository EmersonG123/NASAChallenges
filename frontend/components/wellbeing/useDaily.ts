'use client';
// Daily wellbeing entries of the selected crew member, merged per day and analysed (live: local edits and sync).
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getStore, STORE_EVENT } from '@/lib/store';
import type { DailyRecord } from '@/lib/store/types';
import { analyze, mergeDays, type CheckIn, type Wearable } from '@/lib/wellbeing/model';

export function useDaily(crew: string) {
  const [rows, setRows] = useState<DailyRecord[]>([]);
  const load = useCallback(async () => { setRows(await getStore().list('daily')); }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async read from the local database (state is set after await)
    void load();
    const on = () => void load();
    window.addEventListener(STORE_EVENT, on);
    return () => window.removeEventListener(STORE_EVENT, on);
  }, [load]);
  const days = useMemo(() => mergeDays(rows, crew), [rows, crew]);
  const result = useMemo(() => analyze(days), [days]);
  return { days, ...result };
}

/** one entry per person, day and source: the id is deterministic, so editing a day replaces it */
export async function saveDay(crew: string, day: string, source: 'checkin' | 'wearable', metrics: CheckIn | Wearable) {
  await getStore().put('daily', {
    id: `${crew}-${day}-${source === 'checkin' ? 'c' : 'w'}`, crew_id: crew, day, source,
    metrics_json: JSON.stringify(metrics), updated_at: Date.now(), deleted: 0,
  });
}
