// Localized formatting for the medical bay (numbers, dates, level names, system and marker names).
import { useMemo } from 'react';
import { usePrefs, type Lang } from '@/lib/prefs';
import { ACTIONS, crewName, D, MK_EN, SYS_EN, TPS, type LevelKey, type Marker, type SysKey } from '@/lib/bay/model';

const LVL: Record<LevelKey, [string, string]> = { ok: ['ESTABLE', 'STABLE'], watch: ['VIGILAR', 'WATCH'], warn: ['ALERTA', 'ALERT'], crit: ['CRÍTICO', 'CRITICAL'] };

export function bayText(lang: Lang) {
  const en = lang === 'en';
  const L = (es: string, e: string) => (en ? e : es);
  const loc = en ? 'en-US' : 'es-ES';
  const num = (v: number, d: number) => v.toLocaleString(loc, { maximumFractionDigits: d });
  return {
    lang, L, loc, num,
    fmtV: (v: number) => (Math.abs(v) >= 10000 ? num(v / 1000, 0) + L(' mil', 'k') : num(v, Math.abs(v) < 10 ? 2 : Math.abs(v) < 100 ? 1 : 0)),
    fmtP: (d: number) => (d > 0 ? '+' : '') + num(d, 1) + L(' %', '%'),
    fmtD: (d: Date) => d.toLocaleDateString(loc, { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }),
    lvlName: (k: LevelKey | null) => (k ? L(...LVL[k]) : ''),
    sysName: (k: string) => (en ? SYS_EN[k] ?? D.systems[k]?.name ?? k : D.systems[k]?.name ?? k),
    mkLabel: (m: Marker) => (en ? MK_EN[m.code] ?? m.label : m.label),
    action: (k: SysKey) => L(...ACTIONS[k]),
    /** "3 months before flight" instead of NASA's L-92 */
    tpName: (i: number) => {
      const t = TPS[i]; const n = Math.abs(parseInt(t.slice(1), 10)); const before = t[0] === 'L';
      const span = n < 14 ? L(`${n} día${n === 1 ? '' : 's'}`, `${n} day${n === 1 ? '' : 's'}`)
        : n < 60 ? L(`${Math.round(n / 7)} semanas`, `${Math.round(n / 7)} weeks`)
          : L(`${Math.round(n / 30)} meses`, `${Math.round(n / 30)} months`);
      return before ? L(`${span} antes del vuelo`, `${span} before flight`) : L(`${span} después del vuelo`, `${span} after flight`);
    },
    /** tooltip that decodes the NASA code */
    tpCode: (i: number) => {
      const t = TPS[i];
      return t[0] === 'L'
        ? L(`Código NASA ${t}: ${t.slice(2)} días antes del lanzamiento`, `NASA code ${t}: ${t.slice(2)} days before launch`)
        : L(`Código NASA ${t}: ${t.slice(2)} días después del regreso`, `NASA code ${t}: ${t.slice(2)} days after return`);
    },
    crewLabel: (c: string) => crewName(c),
    sexName: (c: string) => (D.sex[c] === 'F' ? L('mujer', 'woman') : L('hombre', 'man')),
  };
}
export type BayText = ReturnType<typeof bayText>;

export function useBayText(): BayText {
  const { lang } = usePrefs();
  return useMemo(() => bayText(lang), [lang]);
}
