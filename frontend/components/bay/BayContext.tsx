'use client';
// Selection shared by every bay panel: crew member, mission timepoint, body system,
// the people added by the user (local database, synced with the online system), and the latest ASTRA Vision reading.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { applyCustomCrew, type CustomCrew } from '@/lib/bay/model';
import { getStore, removeRow, STORE_EVENT } from '@/lib/store';
import type { CrewRecord } from '@/lib/store/types';

export interface VisionSummary { fatigue: number; stress: number; attention: number | null; text: string; src: string }

interface BayState {
  crew: string; tp: number; sys: string;
  setCrew: (c: string) => void; setTp: (i: number) => void; setSys: (k: string) => void;
  vision: VisionSummary | null; setVision: (v: VisionSummary | null) => void;
  custom: CustomCrew[];
  addCrew: (p: CustomCrew) => Promise<void>;
  removeCrew: (id: string) => Promise<void>;
  /** bumps whenever the crew list changes, so views recompute */
  rev: number;
}

const Ctx = createContext<BayState | null>(null);

const toCustom = (r: CrewRecord): CustomCrew | null => {
  try {
    const profile = r.profile_json ? (JSON.parse(r.profile_json) as CustomCrew['profile']) : undefined;
    return { id: r.id, name: r.name, sex: r.sex, source: r.source, profile, values: JSON.parse(r.values_json) as CustomCrew['values'] };
  }
  catch { return null; }
};

export function BayProvider({ children }: { children: ReactNode }) {
  const [crew, setCrew] = useState('C003');
  const [tp, setTp] = useState(3);
  const [sys, setSys] = useState('defensas');
  const [vision, setVision] = useState<VisionSummary | null>(null);
  const [custom, setCustom] = useState<CustomCrew[]>([]);
  const [rev, setRev] = useState(0);

  const reload = useCallback(async () => {
    const rows = await getStore().list('crew');
    const list = rows.map(toCustom).filter((p): p is CustomCrew => !!p).reverse(); // oldest first, like they were added
    applyCustomCrew(list);
    setCustom(list); setRev((r) => r + 1);
    setCrew((c) => (c.startsWith('C') || list.some((p) => p.id === c) ? c : 'C003'));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async read from the local database (state is set after await)
    void reload();
    const on = () => void reload(); // local edits and rows pulled by sync
    window.addEventListener(STORE_EVENT, on);
    return () => window.removeEventListener(STORE_EVENT, on);
  }, [reload]);

  const addCrew = useCallback(async (p: CustomCrew) => {
    await getStore().put('crew', { id: p.id, name: p.name, sex: p.sex, source: p.source, values_json: JSON.stringify(p.values), profile_json: p.profile ? JSON.stringify(p.profile) : null, updated_at: Date.now(), deleted: 0 });
    setCrew(p.id);
  }, []);
  const removeCrew = useCallback(async (id: string) => { await removeRow('crew', id); }, []);

  const value = useMemo(() => ({ crew, tp, sys, setCrew, setTp, setSys, vision, setVision, custom, addCrew, removeCrew, rev }),
    [crew, tp, sys, vision, custom, addCrew, removeCrew, rev]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBay(): BayState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useBay must be used inside <BayProvider>');
  return v;
}
