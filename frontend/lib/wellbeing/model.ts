// Wellbeing & sleep: daily self check-in (behavioural health) + wearable days (heart, sleep, oxygen).
// Each person is compared with their own baseline (median of their first 7 days); alerts map to
// NASA Human Research Program (HRP) risks. Pure functions, no React.
import type { DailyRecord } from '@/lib/store/types';

export const SYMPTOMS = ['headache', 'congestion', 'vision', 'back_pain', 'nausea', 'insomnia', 'low_motivation', 'conflict'] as const;
export type Symptom = (typeof SYMPTOMS)[number];

export interface CheckIn {
  sleep_h?: number; sleep_q?: number; mood?: number; stress?: number; fatigue?: number; workload?: number; social?: number;
  symptoms?: Symptom[]; note?: string; sim?: boolean;
}
export interface Wearable { rhr?: number; hrv?: number; sleep_h?: number; spo2?: number; active_min?: number; skin_temp?: number; sim?: boolean }

/** one merged day: check-in and wearable values side by side */
export interface Day { day: string; c?: CheckIn; w?: Wearable; sim: boolean }

export const todayIso = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
export const dayMs = (day: string) => Date.parse(day + 'T12:00:00Z');

export function mergeDays(rows: DailyRecord[], crew: string): Day[] {
  const by = new Map<string, Day>();
  rows.filter((r) => r.crew_id === crew && !r.deleted).sort((a, b) => a.updated_at - b.updated_at).forEach((r) => {
    let m: CheckIn & Wearable = {};
    try { m = JSON.parse(r.metrics_json); } catch { return; }
    const d = by.get(r.day) ?? { day: r.day, sim: false };
    if (r.source === 'checkin') d.c = m as CheckIn; else d.w = m as Wearable;
    d.sim = d.sim || !!m.sim;
    by.set(r.day, d);
  });
  return [...by.values()].sort((a, b) => a.day.localeCompare(b.day));
}

/* ---------- personal baseline ---------- */
const median = (a: number[]) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
export type MetricKey = 'sleep' | 'sleep_q' | 'mood' | 'stress' | 'fatigue' | 'workload' | 'social' | 'rhr' | 'hrv' | 'spo2' | 'active_min';
/** sleep: wearable (measured) wins over the self-reported value */
export function val(d: Day, k: MetricKey): number | null {
  const v = k === 'sleep' ? d.w?.sleep_h ?? d.c?.sleep_h
    : k === 'rhr' || k === 'hrv' || k === 'spo2' || k === 'active_min' ? d.w?.[k] : d.c?.[k];
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}
export function baseline(days: Day[], k: MetricKey) {
  const first = days.slice(0, 7).map((d) => val(d, k)).filter((v): v is number => v != null);
  return median(first.length >= 3 ? first : days.map((d) => val(d, k)).filter((v): v is number => v != null));
}

/* ---------- alerts (HRP risks) ---------- */
export type Tone = 'ok' | 'watch' | 'warn' | 'crit';
export interface WAlert {
  key: string; tone: Tone;
  title: [string, string]; detail: [string, string]; action: [string, string];
  /** NASA HRP risk or hazard it relates to */
  hrp: [string, string];
}
const lastN = (days: Day[], n: number) => days.slice(-n);

export function analyze(days: Day[]) {
  const alerts: WAlert[] = [];
  if (!days.length) return { alerts, score: null as number | null, base: {} as Partial<Record<MetricKey, number | null>> };
  const keys: MetricKey[] = ['sleep', 'mood', 'stress', 'fatigue', 'rhr', 'hrv', 'spo2'];
  const base = Object.fromEntries(keys.map((k) => [k, baseline(days, k)])) as Partial<Record<MetricKey, number | null>>;
  const recent = lastN(days, 3);
  const vals = (k: MetricKey) => recent.map((d) => val(d, k)).filter((v): v is number => v != null);
  const fmt = (v: number, d = 1) => (Math.round(v * 10 ** d) / 10 ** d).toString();
  let score = 0;

  // sleep loss
  const sl = vals('sleep');
  const short = sl.filter((v) => v < 6).length;
  if (sl.length >= 2 && short >= 2) {
    const avg = sl.reduce((a, b) => a + b, 0) / sl.length;
    alerts.push({ key: 'sleep', tone: avg < 5 ? 'crit' : 'warn',
      title: ['Pérdida de sueño', 'Sleep loss'],
      detail: [`${short} de las últimas ${sl.length} noches con menos de 6 h (media ${fmt(avg)} h; su base: ${fmt(base.sleep ?? avg)} h).`, `${short} of the last ${sl.length} nights under 6 h (mean ${fmt(avg)} h; baseline ${fmt(base.sleep ?? avg)} h).`],
      action: ['Proteger una ventana de 8 h de descanso, revisar el horario de trabajo y la luz de la cabina, evitar tareas críticas al final del turno.', 'Protect an 8 h rest window, review the work schedule and cabin lighting, avoid critical tasks late in the shift.'],
      hrp: ['Riesgo HRP: pérdida de sueño, desajuste circadiano y sobrecarga de trabajo', 'HRP risk: sleep loss, circadian desynchronization and work overload'] });
    score += avg < 5 ? 35 : 25;
  }
  // behavioural health
  const mood = vals('mood'), social = vals('social');
  const low = mood.filter((v) => v <= 2).length + social.filter((v) => v <= 2).length;
  if (low >= 2) {
    alerts.push({ key: 'mood', tone: low >= 4 ? 'crit' : 'warn',
      title: ['Ánimo bajo o aislamiento', 'Low mood or isolation'],
      detail: [`Ánimo o conexión con los demás en 1–2 de 5 en ${low} registros de los últimos 3 días.`, `Mood or connection with others at 1–2 of 5 in ${low} entries over the last 3 days.`],
      action: ['Conversación privada con el psicólogo de vuelo, tiempo de contacto con familia y tareas con sentido; repetir el registro mañana.', 'Private talk with the flight psychologist, family contact time and meaningful tasks; repeat the check-in tomorrow.'],
      hrp: ['Riesgo HRP: condiciones cognitivas o conductuales adversas (peligro: aislamiento y confinamiento)', 'HRP risk: adverse cognitive or behavioral conditions (hazard: isolation & confinement)'] });
    score += low >= 4 ? 30 : 20;
  }
  // workload & stress
  const stress = vals('stress'), wl = recent.map((d) => val(d, 'workload')).filter((v): v is number => v != null);
  if (stress.filter((v) => v >= 4).length >= 2 && wl.some((v) => v >= 4)) {
    alerts.push({ key: 'stress', tone: 'warn',
      title: ['Estrés con carga de trabajo alta', 'Stress with high workload'],
      detail: ['Estrés en 4–5 de 5 dos días o más, con carga de trabajo alta.', 'Stress at 4–5 of 5 on two or more days, with high workload.'],
      action: ['Repartir tareas, añadir pausas cortas y 2 minutos de respiración lenta; comprobar si coincide con fatiga en ASTRA Vision.', 'Rebalance tasks, add short breaks and 2 minutes of slow breathing; check whether it matches fatigue in ASTRA Vision.'],
      hrp: ['Riesgo HRP: sobrecarga de trabajo y rendimiento', 'HRP risk: work overload and performance'] });
    score += 15;
  }
  // autonomic strain from the wearable
  const hrv = vals('hrv'), rhr = vals('rhr');
  if (base.hrv && hrv.length >= 2) {
    const drop = hrv.filter((v) => v < base.hrv! * 0.8).length;
    const rise = base.rhr ? rhr.filter((v) => v > base.rhr! * 1.1).length : 0;
    if (drop >= 2) {
      const m = hrv.reduce((a, b) => a + b, 0) / hrv.length;
      alerts.push({ key: 'hrv', tone: rise >= 2 ? 'crit' : 'warn',
        title: ['Recuperación baja (variabilidad cardiaca)', 'Low recovery (heart rate variability)'],
        detail: [`Variabilidad ${fmt(((m - base.hrv) / base.hrv) * 100, 0)} % frente a su base${rise >= 2 ? ' y pulso en reposo más de 10 % por encima' : ''}.`, `Variability ${fmt(((m - base.hrv) / base.hrv) * 100, 0)}% vs. baseline${rise >= 2 ? ' and resting pulse more than 10% higher' : ''}.`],
        action: ['Reducir el ejercicio intenso 24–48 h, priorizar sueño e hidratación y vigilar síntomas de infección.', 'Cut intense exercise for 24–48 h, prioritise sleep and hydration and watch for signs of infection.'],
        hrp: ['Riesgo HRP: adaptaciones cardiovasculares (peligro: gravedad alterada)', 'HRP risk: cardiovascular adaptations (hazard: altered gravity)'] });
      score += rise >= 2 ? 25 : 15;
    }
  }
  // oxygen saturation
  const sp = vals('spo2');
  if (sp.some((v) => v < 94)) {
    alerts.push({ key: 'spo2', tone: 'crit',
      title: ['Saturación de oxígeno baja', 'Low oxygen saturation'],
      detail: [`Mínimo ${fmt(Math.min(...sp), 0)} % en los últimos 3 días (normal ≥ 95 %).`, `Minimum ${fmt(Math.min(...sp), 0)}% in the last 3 days (normal ≥ 95%).`],
      action: ['Repetir la medida en reposo; si se confirma, avisar al médico de vuelo y revisar la atmósfera de la cabina.', 'Repeat the measurement at rest; if confirmed, notify the flight surgeon and check the cabin atmosphere.'],
      hrp: ['Peligro HRP: ambiente cerrado y hostil', 'HRP hazard: hostile and closed environment'] });
    score += 30;
  }
  // symptom patterns linked to known spaceflight conditions
  const sym = new Set(recent.flatMap((d) => d.c?.symptoms ?? []));
  if (sym.has('vision')) {
    alerts.push({ key: 'vision', tone: 'warn',
      title: ['Cambios en la visión', 'Vision changes'],
      detail: ['Reportado en los últimos 3 días. En vuelo se asocia al síndrome neuro-ocular (SANS), ligado al desplazamiento de fluidos hacia la cabeza.', 'Reported in the last 3 days. In flight it is associated with the neuro-ocular syndrome (SANS), linked to fluid shifting toward the head.'],
      action: ['Programar una prueba de agudeza visual y fondo de ojo; anotar si empeora. Ver el análogo OSD-681 (presión intracraneal).', 'Schedule a visual acuity and fundus check; note if it worsens. See the OSD-681 analog (intracranial pressure).'],
      hrp: ['Riesgo HRP: síndrome neuro-ocular asociado al vuelo (SANS)', 'HRP risk: spaceflight associated neuro-ocular syndrome (SANS)'] });
    score += 15;
  }
  if (sym.has('headache') && sym.has('congestion')) {
    alerts.push({ key: 'co2', tone: 'watch',
      title: ['Dolor de cabeza con congestión', 'Headache with congestion'],
      detail: ['Esta combinación se ha relacionado con niveles altos de CO₂ en la cabina y con el desplazamiento de fluidos.', 'This combination has been linked to high cabin CO₂ and fluid shift.'],
      action: ['Revisar el CO₂ del módulo y la ventilación del área de descanso; hidratarse.', 'Check module CO₂ and sleep-area ventilation; hydrate.'],
      hrp: ['Peligro HRP: ambiente cerrado y hostil', 'HRP hazard: hostile and closed environment'] });
    score += 10;
  }
  return { alerts, score: Math.min(100, score), base };
}

/* ---------- wearable CSV import (e.g. a smart-garment or actigraphy export) ---------- */
const COLS: Record<string, keyof Wearable> = {
  rhr: 'rhr', resting_hr: 'rhr', heart_rate: 'rhr', hr: 'rhr', hrv: 'hrv', rmssd: 'hrv', hrv_rmssd: 'hrv',
  sleep: 'sleep_h', sleep_h: 'sleep_h', sleep_hours: 'sleep_h', spo2: 'spo2', oxygen: 'spo2',
  active_min: 'active_min', activity: 'active_min', steps_min: 'active_min', skin_temp: 'skin_temp', temperature: 'skin_temp',
};
export function parseWearableCsv(text: string): { days: { day: string; w: Wearable }[]; error?: string } {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { days: [], error: 'empty' };
  const sep = (lines[0].match(/;/g)?.length ?? 0) > (lines[0].match(/,/g)?.length ?? 0) ? ';' : ',';
  const head = lines[0].split(sep).map((h) => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, ''));
  const di = head.findIndex((h) => h === 'date' || h === 'day' || h === 'fecha');
  if (di < 0) return { days: [], error: 'date' };
  const days: { day: string; w: Wearable }[] = [];
  for (const line of lines.slice(1)) {
    const c = line.split(sep).map((s) => s.trim());
    const day = (c[di] ?? '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;
    const w: Wearable = {};
    head.forEach((h, i) => { const k = COLS[h]; if (!k) return; const v = parseFloat((c[i] ?? '').replace(',', '.')); if (Number.isFinite(v)) (w as Record<string, number>)[k] = v; });
    if (Object.keys(w).length) days.push({ day, w });
  }
  return days.length ? { days } : { days: [], error: 'nodata' };
}
export const WEARABLE_TEMPLATE = 'date,resting_hr,hrv_rmssd,sleep_hours,spo2,active_min,skin_temp\n2026-11-01,58,62,7.4,98,45,33.8\n';

/** SIMULATED 16 days: 9 stable days (the baseline) and a hard last week (short sleep, low mood, lower HRV) up to today */
export function exampleDays(end = todayIso()): { day: string; c: CheckIn; w: Wearable }[] {
  const out: { day: string; c: CheckIn; w: Wearable }[] = [];
  let s = 7;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 15; i >= 0; i--) {
    const day = new Date(dayMs(end) - i * 864e5).toISOString().slice(0, 10);
    const n = 15 - i; const hard = n >= 9; const rec = false;
    const j = (a: number) => (rnd() - 0.5) * a;
    const sleep = +(hard ? 5.4 + j(0.8) : rec ? 6.6 + j(0.6) : 7.3 + j(0.6)).toFixed(1);
    const lik = (base: number) => Math.max(1, Math.min(5, Math.round(base + j(1.2))));
    out.push({
      day,
      c: { sleep_h: sleep, sleep_q: lik(hard ? 2 : 4), mood: lik(hard ? 2 : rec ? 3 : 4), stress: lik(hard ? 4.2 : 2), fatigue: lik(hard ? 4 : 2),
        workload: lik(hard ? 4.5 : 3), social: lik(hard ? 2.2 : 4), symptoms: hard && n % 3 === 0 ? ['headache', 'congestion'] : hard && n === 13 ? ['insomnia'] : [], sim: true },
      w: { rhr: Math.round(hard ? 66 + j(4) : 58 + j(3)), hrv: Math.round(hard ? 44 + j(6) : rec ? 55 + j(6) : 62 + j(6)), sleep_h: sleep,
        spo2: Math.round(97 + j(2)), active_min: Math.round(hard ? 25 + j(10) : 45 + j(12)), skin_temp: +(33.6 + j(0.6)).toFixed(1), sim: true },
    });
  }
  return out;
}
