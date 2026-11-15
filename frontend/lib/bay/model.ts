// Medical bay data model: real NASA OSDR crew data (OSD-569, OSD-575) and DONKI space weather,
// plus the ASTRA risk score. Pure functions, no React: easy to test and reuse.
import raw from '@/data/bay.json';

export interface Point { v: number; lo?: number | null; hi?: number | null; dev: number }
export interface Series { base: number; vals: (Point | null)[] }
export interface Marker { code: string; label: string; unit: string; src: string; excluded?: boolean; data: Record<string, Series> }
export interface System { name: string; markers: Marker[] }
export interface BayData {
  tps: string[];
  crew: string[];
  sex: Record<string, string>;
  systems: Record<string, System>;
  donki: { flr: { t: string; cls: string }[]; cme: { t: string; v: number }[]; sep: number; gst: number };
}

export const D = raw as unknown as BayData;
export const TPS = D.tps;
export const CREW = D.crew;
export const LAUNCH = Date.UTC(2021, 8, 16);
export const SPLASH = Date.UTC(2021, 8, 18);
/** index of the first post-flight timepoint (R+1) */
export const FIRST_POST = 3;

export type SysKey = 'defensas' | 'inflamacion' | 'vascular' | 'sangre' | 'rinon' | 'higado' | 'metabolismo';
export const ORDER: SysKey[] = ['defensas', 'inflamacion', 'vascular', 'sangre', 'rinon', 'higado', 'metabolismo'];
export const NOSYS = [
  { k: 'cerebro', es: 'Cerebro y ojos', en: 'Brain & eyes' },
  { k: 'sueno', es: 'Sueño y estrés', en: 'Sleep & stress' },
  { k: 'ritmo', es: 'Ritmo cardiaco / HRV', en: 'Heart rate / HRV' },
];

export const SYS_EN: Record<string, string> = {
  defensas: 'Immune defenses', sangre: 'Red cells & platelets', inflamacion: 'Inflammation', vascular: 'Heart & vessels',
  rinon: 'Kidney', higado: 'Liver', metabolismo: 'Metabolism & bone',
};
export const MK_EN: Record<string, string> = {
  'WHITE BLOOD CELL COUNT': 'Leukocytes', 'ABSOLUTE LYMPHOCYTES': 'Lymphocytes', 'ABSOLUTE NEUTROPHILS': 'Neutrophils', MONOCYTES: 'Monocytes %',
  'ABSOLUTE EOSINOPHILS': 'Eosinophils', HEMOGLOBIN: 'Hemoglobin', 'RED BLOOD CELL COUNT': 'Red blood cells', HEMATOCRIT: 'Hematocrit', MCV: 'MCV',
  'PLATELET COUNT': 'Platelets', CRP: 'C-reactive protein', Fibrinogen: 'Fibrinogen', AGP: 'AGP', SAP: 'SAP', Haptoglobin: 'Haptoglobin',
  PF4: 'PF4', 'a-2 Macroglobulin': 'α-2 macroglobulin', 'L-Selectin': 'L-selectin', 'Fetuin A36': 'Fetuin A', CREATININE: 'Creatinine',
  'UREA NITROGEN (BUN)': 'Urea (BUN)', 'eGFR NON-AFR. AMERICAN': 'eGFR filtration', POTASSIUM: 'Potassium', SODIUM: 'Sodium',
  AST: 'AST', ALT: 'ALT', 'BILIRUBIN; TOTAL': 'Bilirubin', 'ALKALINE PHOSPHATASE': 'Alkaline phosphatase', ALBUMIN: 'Albumin',
  GLUCOSE: 'Glucose', CALCIUM: 'Calcium', 'CARBON DIOXIDE': 'Bicarbonate (CO₂)', 'PROTEIN; TOTAL': 'Total protein',
};
export const ACTIONS: Record<SysKey, [string, string]> = {
  defensas: ['Vigilar fiebre o infecciones; valorar prueba de reactivación viral (EBV/VZV); aplazar vacunas o cirugías no urgentes.', 'Watch for fever or infections; consider a viral reactivation test (EBV/VZV); postpone non-urgent vaccines or surgery.'],
  inflamacion: ['Repetir PCR en 1–2 semanas; descartar infección o lesión; hidratación y descanso.', 'Repeat CRP in 1–2 weeks; rule out infection or injury; hydration and rest.'],
  vascular: ['Seguimiento cardiovascular y de coagulación; repetir marcadores en el próximo control.', 'Cardiovascular and clotting follow-up; repeat markers at the next check.'],
  sangre: ['Repetir hemograma; revisar hierro y vitamina B12 si persiste.', 'Repeat the blood count; check iron and vitamin B12 if it persists.'],
  rinon: ['Repetir electrolitos y función renal; revisar hidratación y dieta.', 'Repeat electrolytes and kidney function; review hydration and diet.'],
  higado: ['Repetir enzimas hepáticas; revisar medicación y ejercicio intenso reciente.', 'Repeat liver enzymes; review medication and recent intense exercise.'],
  metabolismo: ['Repetir glucosa y electrolitos en ayunas; revisar dieta y estrés.', 'Repeat fasting glucose and electrolytes; review diet and stress.'],
};

/** hotspots on the anatomy image (512 x 768 px): [x, y, label es, label en] */
export const NODES: Record<string, [number, number, string, string]> = {
  cerebro: [256, 48, 'CEREBRO', 'BRAIN'], defensas: [256, 150, 'DEFENSAS', 'IMMUNE'], vascular: [264, 196, 'CORAZÓN', 'HEART'],
  higado: [234, 242, 'HÍGADO', 'LIVER'], metabolismo: [272, 262, 'METABOLISMO', 'METABOLISM'], rinon: [222, 296, 'RIÑÓN', 'KIDNEY'],
  sangre: [140, 330, 'SANGRE', 'BLOOD'], inflamacion: [296, 530, 'INFLAMACIÓN', 'INFLAMMATION'],
};

/* ---------- each marker's own pre-flight noise: median coefficient of variation across crew (min 2 %) ---------- */
const median = (a: number[]) => { const s = [...a].sort((p, q) => p - q); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const CV = new WeakMap<Marker, number>();
Object.values(D.systems).forEach((s) => s.markers.forEach((m) => {
  const cvs = Object.values(m.data).map((d) => {
    const v = d.vals.slice(0, FIRST_POST).filter((p): p is Point => !!p).map((p) => p.v);
    if (v.length < 2) return null;
    const mu = v.reduce((a, b) => a + b, 0) / v.length; if (mu <= 0) return null;
    const sd = Math.sqrt(v.reduce((a, b) => a + (b - mu) ** 2, 0) / (v.length - 1));
    return (sd / mu) * 100;
  }).filter((x): x is number => x != null);
  CV.set(m, Math.max(cvs.length ? median(cvs) : 10, 2));
}));

export type Level = 0 | 1 | 2 | 3;
export type LevelKey = 'ok' | 'watch' | 'warn' | 'crit';

export const pointOf = (m: Marker, crew: string, ti: number) => m.data[crew]?.vals[ti] ?? null;
export const zOf = (p: Point, m: Marker) => Math.abs(p.dev) / (CV.get(m) ?? 10);

export function valLevel(p: Point | null, m: Marker): Level | null {
  if (!p) return null;
  if (p.lo != null && p.hi != null && (p.v < p.lo || p.v > p.hi)) return 3;
  const a = Math.abs(p.dev), z = zOf(p, m);
  return z >= 2 && a >= 10 ? 2 : z >= 1.25 && a >= 5 ? 1 : 0;
}
function valScore(p: Point | null, m: Marker) {
  if (!p) return null;
  if (valLevel(p, m) === 3) return 90;
  const z = Math.min(zOf(p, m), 3);
  return Math.abs(p.dev) >= 5 ? (z / 3) * 80 : (z / 3) * 30;
}
/** system score 0–100: mean of its two most-deviating markers */
export function sysScore(k: string, crew: string, ti: number): number | null {
  const s = D.systems[k]; if (!s) return null;
  const sc = s.markers.filter((m) => !m.excluded).map((m) => valScore(pointOf(m, crew, ti), m)).filter((v): v is number => v != null);
  if (!sc.length) return null;
  const top = sc.sort((a, b) => b - a).slice(0, 2);
  return Math.round(top.reduce((a, b) => a + b, 0) / top.length);
}
/** global ASTRA risk: mean of systems, +10 when 3 or more systems are at alert level together */
export function globalScore(crew: string, ti: number): number | null {
  const s = ORDER.map((k) => sysScore(k, crew, ti)).filter((v): v is number => v != null);
  if (!s.length) return null;
  let g = s.reduce((a, b) => a + b, 0) / s.length;
  if (s.filter((v) => v >= 40).length >= 3) g += 10;
  return Math.min(100, Math.round(g));
}

export const lvlOfScore = (s: number | null | undefined): LevelKey | null => (s == null ? null : s < 20 ? 'ok' : s < 40 ? 'watch' : s < 60 ? 'warn' : 'crit');
const C: Record<LevelKey, string> = { ok: 'var(--ok)', watch: 'var(--watch)', warn: 'var(--warn)', crit: 'var(--crit)' };
export const colOfScore = (s: number | null | undefined) => { const l = lvlOfScore(s); return l ? C[l] : 'var(--line2)'; };
export const colOfLevel = (l: Level | null) => (l == null ? 'var(--muted)' : [C.ok, C.watch, C.warn, C.crit][l]);

export interface Finding { k: SysKey; m: Marker; p: Point; l: Level }
export function findings(crew: string, ti: number): Finding[] {
  const f: Finding[] = [];
  ORDER.forEach((k) => D.systems[k].markers.forEach((m) => {
    if (m.excluded) return;
    const p = pointOf(m, crew, ti); const l = valLevel(p, m);
    if (p && l != null && l >= 2) f.push({ k, m, p, l });
  }));
  return f.sort((a, b) => b.l - a.l || Math.abs(b.p.dev) - Math.abs(a.p.dev));
}
/** consecutive post-flight checks where the same marker stays at alert level in the same direction */
export function persistence(m: Marker, crew: string, ti: number) {
  const v = m.data[crew].vals; const ref = v[ti]; let n = 0;
  if (!ref) return 0;
  for (let i = Math.max(ti, FIRST_POST); i < v.length; i++) {
    const p = v[i]; const l = valLevel(p, m);
    if (p && l != null && l >= 2 && Math.sign(p.dev) === Math.sign(ref.dev)) n++; else break;
  }
  return n;
}

/* ---------- crew registry: the 4 Inspiration4 members plus people added by the user ---------- */
/** the real NASA crew; the population reference (marker noise, provisional baselines) comes only from them */
export const BASE_CREW = [...D.crew];
export const isBaseCrew = (c: string) => BASE_CREW.includes(c);

export interface CustomCrew {
  id: string;
  name: string;
  sex: 'F' | 'M';
  source: 'upload' | 'example' | 'manual';
  profile?: CrewProfile;
  /** marker code -> one value per timepoint (TPS order), null when not measured */
  values: Record<string, (number | null)[]>;
}
export interface CrewProfile { age?: number | null; role?: string; mission?: string; notes?: string }
export type BaselineMode = 'personal' | 'provisional';
const MODE: Record<string, BaselineMode> = {};
const NAMES: Record<string, string> = {};
const SOURCE: Record<string, CustomCrew['source']> = {};
const PROFILE: Record<string, CrewProfile> = {};
const VALUES: Record<string, CustomCrew['values']> = {};
export const baselineMode = (c: string): BaselineMode => MODE[c] ?? 'personal';
export const crewName = (c: string) => NAMES[c] ?? c;
export const crewSource = (c: string) => SOURCE[c] ?? null;
export const crewProfile = (c: string): CrewProfile | null => PROFILE[c] ?? null;
/** the raw values a user-added person was saved with (for editing) */
export const crewValues = (c: string) => VALUES[c] ?? null;

/** clinical range for a marker, taken from the lab ranges reported for the real crew */
export function rangeOf(m: Marker) {
  for (const c of BASE_CREW) for (const p of m.data[c]?.vals ?? []) if (p && p.lo != null && p.hi != null) return { lo: p.lo, hi: p.hi };
  return { lo: null, hi: null };
}
/** population reference baseline: mean of the real crew's own baselines */
const popBase = (m: Marker) => {
  const b = BASE_CREW.map((c) => m.data[c]?.base).filter((v): v is number => v != null);
  return b.length ? b.reduce((a, x) => a + x, 0) / b.length : null;
};

/**
 * Replace the user-added crew with `list`. Each person gets a series for every marker:
 * baseline = mean of their own pre-flight values when they have 2 or more (personal),
 * otherwise the crew reference (provisional, labelled DERIVED in the UI).
 */
export function applyCustomCrew(list: CustomCrew[]) {
  // remove previous custom entries
  for (const c of [...D.crew]) if (!isBaseCrew(c)) {
    D.crew.splice(D.crew.indexOf(c), 1);
    Object.values(D.systems).forEach((s) => s.markers.forEach((m) => { delete m.data[c]; }));
    delete D.sex[c]; delete MODE[c]; delete NAMES[c]; delete SOURCE[c]; delete PROFILE[c]; delete VALUES[c];
  }
  for (const p of list) {
    if (D.crew.includes(p.id)) continue;
    D.crew.push(p.id); D.sex[p.id] = p.sex; NAMES[p.id] = p.name; SOURCE[p.id] = p.source;
    if (p.profile) PROFILE[p.id] = p.profile;
    VALUES[p.id] = p.values;
    let personal = 0, measured = 0;
    Object.values(D.systems).forEach((s) => s.markers.forEach((m) => {
      const raw = p.values[m.code] ?? [];
      const vals = TPS.map((_, i) => (Number.isFinite(raw[i]) ? (raw[i] as number) : null));
      if (vals.every((v) => v == null)) { m.data[p.id] = { base: popBase(m) ?? 0, vals: TPS.map(() => null) }; return; }
      measured++;
      const pre = vals.slice(0, FIRST_POST).filter((v): v is number => v != null);
      const own = pre.length >= 2;
      if (own) personal++;
      const base = own ? pre.reduce((a, b) => a + b, 0) / pre.length : popBase(m) ?? pre[0] ?? 0;
      const { lo, hi } = rangeOf(m);
      m.data[p.id] = {
        base,
        vals: vals.map((v) => (v == null ? null : { v, lo, hi, dev: base ? Math.round(((v - base) / base) * 1000) / 10 : 0 })),
      };
    }));
    MODE[p.id] = measured && personal / measured >= 0.8 ? 'personal' : 'provisional';
  }
}

export const tpDate = (t: string) => {
  const n = Math.abs(parseInt(t.slice(1), 10));
  return new Date(t[0] === 'L' ? LAUNCH - n * 864e5 : SPLASH + n * 864e5);
};
export const sexOf = (c: string) => (D.sex[c] === 'F' ? 'F' : 'M');
export const inMission = (t: string) => { const x = Date.parse(t); return x >= LAUNCH && x < SPLASH + 864e5; };

/* ---------- scenario simulator (SIMULATED, illustrative rules) ---------- */
export function simulate(days: number, sleep: number, sep: number) {
  const dur = 1 + 0.18 * Math.log2(days / 3); const deficit = Math.max(0, 7 - sleep);
  const extra: Record<SysKey, number> = {
    defensas: 6 * deficit + 8 * sep, inflamacion: 5 * deficit + 5 * sep, vascular: 3 * deficit + 3 * sep,
    sangre: days > 30 ? 12 * Math.log2(days / 30) : 0, rinon: 2 * deficit, higado: 1 * deficit, metabolismo: 5 * deficit + 2 * sep,
  };
  const base = (k: SysKey) => BASE_CREW.map((c) => sysScore(k, c, FIRST_POST) ?? 0).reduce((a, b) => a + b, 0) / BASE_CREW.length;
  const sepDose = [0, 2, 8, 25, 60][sep];
  const rows: { k: SysKey | 'radiacion'; v: number }[] = ORDER.map((k) => ({ k, v: Math.min(100, Math.round(base(k) * dur + extra[k])) }));
  rows.push({ k: 'radiacion', v: Math.min(100, Math.round(((days * 0.5 + sepDose) / (0.5 * 180 + 60)) * 100 * 1.6)) });
  const global = Math.min(100, Math.round(rows.reduce((a, b) => a + b.v, 0) / rows.length + (rows.filter((r) => r.v >= 40).length >= 3 ? 10 : 0)));
  return {
    rows, global,
    hr: Math.round(64 + 3 * deficit + 2 * sep + 4 * Math.log2(days / 3)),
    dose: days * 0.5 + sepDose,
    sleepTotal: sleep * days,
  };
}

/**
 * Scores a draft person without touching what the UI shows: registers the draft next to `current`,
 * reads the global risk per checkpoint and the baseline mode, then restores `current`.
 */
export function previewCrew(draft: CustomCrew, current: CustomCrew[]) {
  applyCustomCrew([...current.filter((c) => c.id !== draft.id), draft]);
  const scores = TPS.map((_, i) => globalScore(draft.id, i));
  const mode = baselineMode(draft.id);
  const out = findingsCount(draft.id);
  applyCustomCrew(current);
  return { scores, mode, outOfRange: out };
}
function findingsCount(c: string) {
  let n = 0;
  Object.values(D.systems).forEach((s) => s.markers.forEach((m) => (m.data[c]?.vals ?? []).forEach((p) => { if (valLevel(p, m) === 3) n++; })));
  return n;
}