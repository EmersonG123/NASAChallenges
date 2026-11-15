// Crew lab panels as CSV: one row per marker, one column per checkpoint.
// The template lists every marker ASTRA scores, with its unit and a friendly column name for each checkpoint.
import { BASE_CREW, D, MK_EN, TPS, type CustomCrew } from '@/lib/bay/model';

/** friendly, language-neutral column names (the NASA codes are accepted too) */
export const COLS = ['before_3m', 'before_6w', 'before_3d', 'after_1d', 'after_6w', 'after_3m', 'after_6m'];

const markers = () => Object.values(D.systems).flatMap((s) => s.markers);

export function templateCsv(): string {
  const head = ['marker', 'name', 'unit', ...COLS].join(',');
  const rows = markers().map((m) => [m.code, MK_EN[m.code] ?? m.label, m.unit, ...COLS.map(() => '')].map(cell).join(','));
  return [head, ...rows].join('\n');
}
const cell = (s: string) => (/[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

function split(line: string, sep: string) {
  const out: string[] = []; let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) { if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; }
    else if (ch === '"') q = true; else if (ch === sep) { out.push(cur); cur = ''; } else cur += ch;
  }
  out.push(cur); return out.map((s) => s.trim());
}
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9+-]/g, '');

export interface ParseResult { values: CustomCrew['values']; markers: number; checkpoints: number; preFlight: number; unknown: string[]; error?: string }

/** accepts comma or semicolon, decimal comma, marker codes or names (EN/ES), friendly or NASA column names */
export function parseCsv(text: string): ParseResult {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
  const empty: ParseResult = { values: {}, markers: 0, checkpoints: 0, preFlight: 0, unknown: [] };
  if (lines.length < 2) return { ...empty, error: 'empty' };
  const sep = (lines[0].match(/;/g)?.length ?? 0) > (lines[0].match(/,/g)?.length ?? 0) ? ';' : ',';
  const head = split(lines[0], sep).map(norm);
  const colIdx = TPS.map((t, i) => head.findIndex((h) => h === norm(COLS[i]) || h === norm(t)));
  if (colIdx.every((c) => c < 0)) return { ...empty, error: 'columns' };
  const byKey = new Map<string, string>();
  markers().forEach((m) => { [m.code, m.label, MK_EN[m.code] ?? ''].filter(Boolean).forEach((k) => byKey.set(norm(k), m.code)); });

  const values: CustomCrew['values'] = {}; const unknown: string[] = []; const used = new Set<number>();
  for (const line of lines.slice(1)) {
    const c = split(line, sep);
    const code = byKey.get(norm(c[0] ?? '')) ?? byKey.get(norm(c[1] ?? ''));
    if (!code) { if (c[0]) unknown.push(c[0]); continue; }
    const row = colIdx.map((ci) => {
      if (ci < 0) return null;
      const v = parseFloat((c[ci] ?? '').replace(',', '.'));
      return Number.isFinite(v) ? v : null;
    });
    if (row.some((v) => v != null)) { values[code] = row; row.forEach((v, i) => { if (v != null) used.add(i); }); }
  }
  const n = Object.keys(values).length;
  if (!n) return { ...empty, unknown, error: 'nodata' };
  return { values, markers: n, checkpoints: used.size, preFlight: [...used].filter((i) => i < 3).length, unknown };
}

/** a realistic SIMULATED profile: the real crew's average trajectory plus individual noise */
export function exampleValues(seed = Date.now()): CustomCrew['values'] {
  let s = seed % 2147483647;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const out: CustomCrew['values'] = {};
  markers().forEach((m) => {
    out[m.code] = TPS.map((_, i) => {
      const vs = BASE_CREW.map((c) => m.data[c]?.vals[i]?.v).filter((v): v is number => v != null);
      if (!vs.length) return null;
      const mean = vs.reduce((a, b) => a + b, 0) / vs.length;
      const v = mean * (1 + (rnd() - 0.5) * 0.06);
      const d = v >= 100 ? 0 : v >= 10 ? 1 : 2; // realistic lab precision
      return Math.round(v * 10 ** d) / 10 ** d;
    });
  });
  return out;
}
