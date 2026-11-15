// ASTRA Vision engine: fatigue, stress and attention from facial signals, on the visitor's own device.
// - Face Landmarker (MediaPipe) is loaded lazily, only when the camera or a video is used, and cached for the session.
// - Eye closure fuses two independent estimates (blendshape + eye aspect ratio from landmarks) normalised to the
//   person's own open eyes, measured during calibration. Blinks use hysteresis so noise does not create fake blinks.
// - Signal quality (face found, distance, light, head turned) gates the scores: bad frames never count as fatigue.
// - A behaviour classifier runs on the local backend (/api/vision/frame, proxied by Next) when it is available.
// The engine draws straight to canvases (60 fps) and reports a throttled snapshot to React (~6 per second).
import type { FaceLandmarker, FaceLandmarkerResult } from '@mediapipe/tasks-vision';
import { apiUrl } from '@/lib/platform';

export type Mode = 'camera' | 'file' | 'demo';
export type VisionEvent = 'loading' | 'camera' | 'file' | 'demo' | 'demoDone' | 'stopped' | 'fileDone' | 'noCamApi' | 'camBlocked' | 'camLost' | 'modelFail' | 'recalibrate';
export type QualityIssue = 'noface' | 'far' | 'close' | 'dark' | 'bright' | 'turned' | 'offcenter';
export type EventKind = 'microsleep' | 'longClose' | 'yawn' | 'nod' | 'lookAway';
export type AlertKind = 'microsleep' | 'fatigue' | 'stress' | 'attention';
export interface Shares { n: number; sleepy: number; yawn: number; distracted: number; danger: number; drinking: number }
export interface Metrics {
  fatigue: number; stress: number; attention: number | null;
  /** PERCLOS (share of the last minute with the eyes closed), blinks per minute, mean blink duration (ms) */
  per: number; rate: number; md: number;
  /** events in the last 5 minutes (they drive the score) */
  yawns: number; nods: number; longClose: number; microsleeps: number; lookAways: number;
  /** facial tension above the resting face, head movement, share of the last minute looking away */
  ten: number; mov: number; away: number;
  ys: Shares | null;
}
export interface VEvent { t: number; kind: EventKind; dur: number }
export interface Point { t: number; fatigue: number; stress: number; attention: number | null; quality: number }
export interface Behavior { state: string; level?: string; confident?: boolean; top?: { confidence: number; box: [number, number, number, number] }; inference_ms?: number }
export interface Quality { score: number; issues: QualityIssue[] }
export interface Pose { yaw: number; pitch: number; roll: number }
export interface Snapshot {
  mode: Mode | null;
  phase: 'idle' | 'calibrating' | 'noface' | 'lowq' | 'live' | 'stopped';
  calibLeft: number;
  /** 0–1 */
  calibProgress: number;
  metrics: Metrics | null;
  behavior: { ok: boolean; cur: Behavior | null; ms: number | null };
  fps: number;
  quality: Quality;
  pose: Pose | null;
  /** current eye closure and mouth opening, 0–1 */
  eye: number; mouth: number;
  /** wall-clock start of the session and seconds elapsed */
  started: number | null; elapsed: number;
  events: VEvent[];
  totals: Record<EventKind, number>;
}
export interface Report {
  mode: Mode; started: number; ended: number; seconds: number;
  fatigue: number | null; stress: number | null; attention: number | null;
  avgFatigue: number | null; avgStress: number | null; peakFatigue: number; peakStress: number;
  maxPer: number; totals: Record<EventKind, number>; trend: Point[]; events: VEvent[];
}
interface Face {
  lm?: { x: number; y: number }[];
  /** blendshape blink and eye aspect ratio (both eyes averaged) */
  bs: number; ear: number;
  jaw: number; ten: number; pitch: number; yaw: number; roll: number; nx: number; ny: number;
  box?: [number, number, number, number];
}
interface Els { video: HTMLVideoElement; overlay: HTMLCanvasElement; strip: HTMLCanvasElement; trend?: HTMLCanvasElement | null }
interface Handlers { snapshot: (s: Snapshot) => void; event: (e: VisionEvent, detail?: string) => void; alert?: (k: AlertKind, detail: number) => void }

const WASM = { wasmLoaderPath: '/mediapipe/vision_wasm_internal.js', wasmBinaryPath: '/mediapipe/vision_wasm_internal.wasm' };
const MODEL = '/models/face_landmarker.task';
const CALIB_MS = 8000;
const WIN = 60000; // PERCLOS and blink window
const EV_WIN = 300000; // events that drive the score
const TREND_MS = 600000; // trend kept for 10 minutes
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const zeroTotals = (): Record<EventKind, number> => ({ microsleep: 0, longClose: 0, yawn: 0, nod: 0, lookAway: 0 });

/** the vision runtime prints its informational logs through console.error ("INFO: Created TensorFlow Lite XNNPACK
 *  delegate…", "W1115 …gl_context.cc…"); they are not errors, so they are filtered out once, before the model loads */
let logsFiltered = false;
function filterRuntimeLogs() {
  if (logsFiltered || typeof console === 'undefined') return;
  logsFiltered = true;
  const noise = /^(INFO:|[IW]\d{4} |.*XNNPACK delegate)/;
  for (const k of ['error', 'warn', 'info', 'log'] as const) {
    const orig = console[k].bind(console);
    console[k] = (...args: unknown[]) => { if (typeof args[0] === 'string' && noise.test(args[0])) return; orig(...args); };
  }
}

let landmarkerP: Promise<FaceLandmarker> | null = null;
/** one Face Landmarker per tab: GPU first, CPU as fallback */
function loadLandmarker(): Promise<FaceLandmarker> {
  filterRuntimeLogs();
  landmarkerP ??= (async () => {
    const { FaceLandmarker } = await import('@mediapipe/tasks-vision');
    let err: unknown;
    for (const delegate of ['GPU', 'CPU'] as const) {
      try {
        return await FaceLandmarker.createFromOptions(WASM, {
          baseOptions: { modelAssetPath: MODEL, delegate }, runningMode: 'VIDEO', numFaces: 1,
          minFaceDetectionConfidence: 0.5, minFacePresenceConfidence: 0.5, minTrackingConfidence: 0.5,
          outputFaceBlendshapes: true, outputFacialTransformationMatrixes: true,
        });
      } catch (e) { err = e; }
    }
    throw err;
  })().catch((e) => { landmarkerP = null; throw e; });
  return landmarkerP;
}

/* landmark indices (MediaPipe face mesh, 478 points) */
const L_EYE = [33, 160, 158, 133, 153, 144]; // p1..p6 for the eye aspect ratio
const R_EYE = [362, 385, 387, 263, 373, 380];
const L_EYE_RING = [33, 246, 161, 160, 159, 158, 157, 173, 133, 155, 154, 153, 145, 144, 163, 7];
const R_EYE_RING = [362, 398, 384, 385, 386, 387, 388, 466, 263, 249, 390, 373, 374, 380, 381, 382];
const LIPS_RING = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146];
const BROWS = [[70, 63, 105, 66, 107], [336, 296, 334, 293, 300]];

type P = { x: number; y: number };
const dist = (a: P, b: P) => Math.hypot(a.x - b.x, a.y - b.y);
function ear(lm: P[], i: number[]) {
  const w = dist(lm[i[0]], lm[i[3]]) || 1e-6;
  return (dist(lm[i[1]], lm[i[5]]) + dist(lm[i[2]], lm[i[4]])) / (2 * w);
}

export class VisionEngine {
  /** localized strings used on the canvases */
  labels = { now: 'now', state: (s: string) => s, fatigue: 'fatigue', stress: 'stress' };
  private lm: FaceLandmarker | null = null;
  private mode: Mode | null = null;
  private stream: MediaStream | null = null;
  private raf = 0;
  private lastVT = -1;
  private demoStart = 0;
  private lastSnap = 0;
  private lastSummary = 0;
  private lastFrameT = 0;
  private fps = 0;
  private phase: Snapshot['phase'] = 'idle';
  private metrics: Metrics | null = null;
  private calibLeft = 0;
  private started: number | null = null;
  private face: Face | null = null;
  private quality: Quality = { score: 0, issues: [] };
  private light = { t: 0, v: 128 };
  private lightCanvas: HTMLCanvasElement | null = null;
  private S = this.fresh();
  private B = { ok: false, busy: false, last: 0, hist: [] as { t: number; state: string }[], cur: null as Behavior | null, ms: null as number | null };
  private grab: HTMLCanvasElement | null = null;
  private healthTimer: ReturnType<typeof setInterval> | null = null;
  private alertAt: Record<AlertKind, number> = { microsleep: 0, fatigue: 0, stress: 0, attention: 0 };
  private over = { fatigue: 0, stress: 0, attention: 0 };
  /** called once per second with the latest scores */
  onSummary: ((m: Metrics, mode: Mode) => void) | null = null;

  constructor(private els: Els, private on: Handlers) {
    void this.health();
    this.healthTimer = setInterval(() => { if (!this.B.ok) void this.health(); }, 15000);
  }

  destroy() { this.stop(false); if (this.healthTimer) clearInterval(this.healthTimer); }

  /* ---------- behaviour classifier on the local backend ---------- */
  private async health() {
    try {
      const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 1500);
      const r = await fetch(apiUrl('/api/health'), { signal: ctl.signal }); clearTimeout(to);
      this.B.ok = r.ok;
    } catch { this.B.ok = false; }
    this.emit(true);
  }
  private behaviorTick(t: number) {
    const v = this.els.video; const B = this.B;
    if (!B.ok || B.busy || t - B.last < 350 || !v.videoWidth) return;
    B.busy = true; B.last = t;
    const g = (this.grab ??= document.createElement('canvas'));
    g.width = 640; g.height = Math.round((v.videoHeight * 640) / v.videoWidth);
    g.getContext('2d')?.drawImage(v, 0, 0, g.width, g.height);
    g.toBlob(async (b) => {
      try {
        if (!b) throw new Error('frame');
        const fd = new FormData(); fd.append('file', b, 'frame.jpg');
        const r = await fetch(apiUrl('/api/vision/frame'), { method: 'POST', body: fd }); if (!r.ok) throw new Error(String(r.status));
        const j = (await r.json()) as Behavior;
        B.cur = j; B.ms = j.inference_ms ?? null;
        B.hist.push({ t, state: j.state }); while (B.hist.length && t - B.hist[0].t > WIN) B.hist.shift();
      } catch { B.ok = false; B.cur = null; }
      B.busy = false;
    }, 'image/jpeg', 0.75);
  }
  private shares(): Shares | null {
    const h = this.B.hist; const n = h.length; if (!n) return null;
    const sh = (k: string) => h.filter((x) => x.state === k).length / n;
    return { n, sleepy: sh('SleepyDriving'), yawn: sh('Yawn'), distracted: sh('Distracted'), danger: sh('DangerousDriving'), drinking: sh('Drinking') };
  }

  /* ---------- signal analysis ---------- */
  private fresh() {
    return {
      t0: null as number | null, lastT: null as number | null,
      calib: { ms: 0, n: 0, ten: 0, pitch: 0, yaw: 0, bs: 0, earOpen: 0, earN: 0 }, ready: false,
      frames: [] as { t: number; dt: number; c: number; jaw: number; closed: boolean; away: boolean; ok: boolean }[],
      blinks: [] as { t: number; d: number }[],
      closed: false, closedSince: null as number | null,
      yawnSince: null as number | null, nodSince: null as number | null, awaySince: null as number | null,
      events: [] as VEvent[], totals: zeroTotals(),
      tenS: null as number | null, pos: [] as { t: number; x: number; y: number }[],
      fat: null as number | null, str: null as number | null,
      trend: [] as Point[], lastTrend: 0, maxPer: 0,
    };
  }
  /** eye closure 0–1: blendshape and eye aspect ratio, both relative to the person's open eyes */
  private closure(f: Face) {
    const c = this.S.calib;
    const bsN = clamp((f.bs - c.bs) / Math.max(0.25, 1 - c.bs), 0, 1);
    if (!c.earN || !f.ear) return bsN;
    const earN = clamp(1 - f.ear / c.earOpen, 0, 1) / 0.75; // ~75 % lower EAR = fully closed
    return clamp(0.55 * bsN + 0.45 * Math.min(1, earN), 0, 1);
  }
  private readonly ON = 0.55; // eye counted closed (≈ P70–P80 of the open aperture)
  private readonly OFF = 0.4;
  private assessQuality(f: Face | null): Quality {
    if (this.mode === 'demo') return { score: 100, issues: [] };
    const issues: QualityIssue[] = [];
    if (!f) return { score: 0, issues: ['noface'] };
    let s = 100;
    const w = f.box ? f.box[2] - f.box[0] : 0.3;
    if (w < 0.16) { issues.push('far'); s -= w < 0.1 ? 45 : 25; }
    if (w > 0.75) { issues.push('close'); s -= 25; }
    if (f.box) { const cx = (f.box[0] + f.box[2]) / 2, cy = (f.box[1] + f.box[3]) / 2; if (Math.abs(cx - 0.5) > 0.3 || Math.abs(cy - 0.5) > 0.32) { issues.push('offcenter'); s -= 15; } }
    const L = this.light.v;
    if (L < 45) { issues.push('dark'); s -= L < 25 ? 45 : 25; }
    if (L > 215) { issues.push('bright'); s -= 25; }
    if (Math.abs(f.yaw - this.S.calib.yaw) > 35 || Math.abs(f.pitch - this.S.calib.pitch) > 30) { issues.push('turned'); s -= 30; }
    return { score: clamp(Math.round(s), 0, 100), issues };
  }
  private sampleLight(t: number) {
    if (this.mode === 'demo' || t - this.light.t < 500) return;
    const v = this.els.video; if (!v.videoWidth) return;
    const c = (this.lightCanvas ??= document.createElement('canvas')); c.width = 32; c.height = 24;
    const g = c.getContext('2d', { willReadFrequently: true }); if (!g) return;
    g.drawImage(v, 0, 0, 32, 24);
    const d = g.getImageData(0, 0, 32, 24).data; let sum = 0;
    for (let i = 0; i < d.length; i += 4) sum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    this.light = { t, v: sum / (d.length / 4) };
  }
  private addEvent(t: number, kind: EventKind, dur: number) {
    const S = this.S; const wall = this.wall(t);
    S.events.push({ t: wall, kind, dur: Math.round(dur) }); S.totals[kind]++;
    while (S.events.length > 200) S.events.shift();
    if (kind === 'microsleep') this.raise('microsleep', Math.round(dur));
  }
  private raise(k: AlertKind, detail: number) {
    const now = performance.now();
    if (now - this.alertAt[k] < (k === 'microsleep' ? 8000 : 60000)) return;
    this.alertAt[k] = now; this.on.alert?.(k, detail);
  }
  private feed(t: number, f: Face | null) {
    const S = this.S; if (S.t0 == null) S.t0 = t;
    const dt = S.lastT == null ? 33 : clamp(t - S.lastT, 1, 200); S.lastT = t;
    this.face = f;
    this.quality = this.assessQuality(f);
    if (!f) { this.phase = 'noface'; this.trendTick(t); this.emit(); return; }
    // calibration: only frames with a usable face count
    if (!S.ready) {
      const c = S.calib; c.n++; c.ms += dt;
      c.ten += (f.ten - c.ten) / c.n; c.pitch += (f.pitch - c.pitch) / c.n; c.yaw += (f.yaw - c.yaw) / c.n;
      c.bs += (Math.min(f.bs, 0.5) - c.bs) / c.n;
      if (f.bs < 0.35 && f.ear > 0) { c.earN++; c.earOpen += (f.ear - c.earOpen) / c.earN; }
      this.phase = 'calibrating'; this.calibLeft = Math.max(0, Math.ceil((CALIB_MS - c.ms) / 1000));
      if (c.ms >= CALIB_MS) { S.ready = true; this.on.event('recalibrate', 'done'); }
      this.emit(); return;
    }
    const ok = this.quality.score >= 45;
    this.phase = ok ? 'live' : 'lowq';
    const c = this.closure(f);
    // blink state with hysteresis
    const wasClosed = S.closed;
    if (!S.closed && c >= this.ON) { S.closed = true; S.closedSince = t; }
    else if (S.closed && c < this.OFF) {
      S.closed = false;
      const d = t - (S.closedSince ?? t); S.closedSince = null;
      if (ok && d >= 50) {
        S.blinks.push({ t, d: Math.min(d, 2000) });
        if (d >= 1000) this.addEvent(t, 'microsleep', d); else if (d > 500) this.addEvent(t, 'longClose', d);
      }
    }
    // a long closure is announced while it is still happening
    if (wasClosed && S.closed && S.closedSince != null && t - S.closedSince > 1500) this.raise('microsleep', Math.round(t - S.closedSince));
    const dYaw = Math.abs(f.yaw - S.calib.yaw), dPitch = f.pitch - S.calib.pitch;
    const away = dYaw > 25 || Math.abs(dPitch) > 22;
    S.frames.push({ t, dt, c, jaw: f.jaw, closed: S.closed, away, ok }); while (S.frames.length && t - S.frames[0].t > WIN) S.frames.shift();
    while (S.blinks.length && t - S.blinks[0].t > WIN) S.blinks.shift();
    // yawn: mouth wide open for more than 1.2 s
    if (f.jaw > 0.5 && S.yawnSince == null) S.yawnSince = t;
    if (f.jaw < 0.35 && S.yawnSince != null) { const d = t - S.yawnSince; if (d > 1200 && d < 8000) this.addEvent(t, 'yawn', d); S.yawnSince = null; }
    // nod: head drops forward and comes back
    if (Math.abs(dPitch) > 14 && S.nodSince == null) S.nodSince = t;
    if (Math.abs(dPitch) < 8 && S.nodSince != null) { const d = t - S.nodSince; if (d > 500 && d < 4000) this.addEvent(t, 'nod', d); S.nodSince = null; }
    // looking away for more than 2 s
    if (away && S.awaySince == null) S.awaySince = t;
    if (!away && S.awaySince != null) { const d = t - S.awaySince; if (d > 2000) this.addEvent(t, 'lookAway', d); S.awaySince = null; }
    S.tenS = S.tenS == null ? f.ten : S.tenS * 0.92 + f.ten * 0.08;
    S.pos.push({ t, x: f.nx, y: f.ny }); while (S.pos.length && t - S.pos[0].t > 10000) S.pos.shift();
    this.score(t);
    this.trendTick(t);
    this.emit();
  }
  private score(t: number) {
    const S = this.S;
    const good = S.frames.filter((x) => x.ok);
    const tw = good.reduce((a, x) => a + x.dt, 0);
    if (tw < 3000) return; // not enough usable signal yet
    const per = good.filter((x) => x.closed).reduce((a, x) => a + x.dt, 0) / tw;
    const away = good.filter((x) => x.away).reduce((a, x) => a + x.dt, 0) / tw;
    const win = Math.min(WIN, tw);
    const short = S.blinks.filter((b) => b.d <= 500);
    const rate = short.length / (win / 60000);
    const md = short.length ? short.reduce((a, b) => a + b.d, 0) / short.length : 0;
    const ten = (S.tenS ?? 0) - S.calib.ten;
    const sd = (a: number[]) => { if (a.length < 2) return 0; const m = a.reduce((x, y) => x + y, 0) / a.length; return Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / a.length); };
    const mov = Math.hypot(sd(S.pos.map((p) => p.x)), sd(S.pos.map((p) => p.y)));
    const recent = S.events.filter((e) => e.t >= this.wall(t) - EV_WIN / this.speed);
    const cnt = (k: EventKind) => recent.filter((e) => e.kind === k).length;
    const yawns = cnt('yawn'), nods = cnt('nod'), longClose = cnt('longClose'), microsleeps = cnt('microsleep'), lookAways = cnt('lookAway');
    const rawF = clamp(
      Math.min(per / 0.15, 1.5) * 42 + clamp((md - 200) / 200, 0, 1) * 16 + Math.min(yawns, 3) * 7 + Math.min(nods, 3) * 9
      + Math.min(longClose, 3) * 6 + Math.min(microsleeps, 2) * 22, 0, 100);
    let rawS = clamp(clamp(ten / 0.2, 0, 1.2) * 45 + clamp((rate - 20) / 15, 0, 1) * 25 + clamp((mov - 0.006) / 0.02, 0, 1) * 30, 0, 100);
    let attention: number | null = Math.round(clamp(away * 100 + Math.min(lookAways, 4) * 6, 0, 100));
    const ys = this.mode !== 'demo' ? this.shares() : null;
    let fatF = rawF;
    if (ys && ys.n >= 5) {
      const yFat = clamp(ys.sleepy * 100 + ys.yawn * 60, 0, 100);
      fatF = Math.max(rawF, 0.5 * rawF + 0.5 * yFat);
      attention = Math.round(Math.max(attention, clamp((ys.distracted + ys.danger) * 100 + ys.drinking * 40, 0, 100)));
      rawS = Math.max(rawS, 0.7 * rawS + 0.3 * ys.danger * 100);
    }
    // smooth the scores (time constant ~3 s) so one frame never makes the number jump; microsleeps bypass it
    const a = 1 - Math.exp(-(S.frames.at(-1)?.dt ?? 33) / 3000);
    S.fat = S.fat == null ? fatF : S.fat + (fatF - S.fat) * a;
    if (microsleeps && S.fat < fatF) S.fat = fatF;
    S.str = S.str == null ? rawS : S.str + (rawS - S.str) * a;
    S.maxPer = Math.max(S.maxPer, per);
    const fatigue = Math.round(S.fat), stress = Math.round(S.str);
    this.metrics = { fatigue, stress, attention, per, rate, md, yawns, nods, longClose, microsleeps, lookAways, ten, mov, away, ys };
    // sustained high levels raise an alert (5 s fatigue / attention, 10 s stress)
    const sustain = (k: 'fatigue' | 'stress' | 'attention', v: number | null, need: number) => {
      this.over[k] = v != null && v >= 60 ? this.over[k] + (S.frames.at(-1)?.dt ?? 33) : 0;
      if (this.over[k] >= need && v != null) this.raise(k, v);
    };
    sustain('fatigue', fatigue, 5000); sustain('stress', stress, 10000); sustain('attention', attention, 5000);
    if (t - this.lastSummary > 1000 && this.mode) { this.lastSummary = t; this.onSummary?.(this.metrics, this.mode); }
  }
  private trendTick(t: number) {
    const S = this.S; if (t - S.lastTrend < 1000 || !S.ready) return; S.lastTrend = t;
    const m = this.metrics; if (!m) return;
    S.trend.push({ t: this.wall(t), fatigue: m.fatigue, stress: m.stress, attention: m.attention, quality: this.quality.score });
    while (S.trend.length && S.trend.at(-1)!.t - S.trend[0].t > TREND_MS) S.trend.shift();
    this.drawTrend();
  }
  private emit(force = false) {
    const now = performance.now();
    if (!force && now - this.lastSnap < 160) return;
    this.lastSnap = now;
    this.on.snapshot(this.snapshot());
  }
  snapshot(): Snapshot {
    const S = this.S; const f = this.face;
    return {
      mode: this.mode, phase: this.phase, calibLeft: this.calibLeft, calibProgress: S.ready ? 1 : clamp(S.calib.ms / CALIB_MS, 0, 1),
      metrics: this.metrics, behavior: { ok: this.B.ok, cur: this.B.cur, ms: this.B.ms },
      fps: Math.round(this.fps), quality: this.quality,
      pose: f ? { yaw: f.yaw - S.calib.yaw, pitch: f.pitch - S.calib.pitch, roll: f.roll } : null,
      eye: f ? this.closure(f) : 0, mouth: f?.jaw ?? 0,
      started: this.started, elapsed: S.t0 != null && S.lastT != null ? Math.round((S.lastT - S.t0) / 1000 / this.speed) : 0,
      events: S.events.slice(-12).reverse(), totals: { ...S.totals },
    };
  }
  /** summary of the session so far (or the one that just ended) */
  report(): Report | null {
    const S = this.S; const mode = this.mode ?? this.lastMode; if (!mode || this.started == null || !S.trend.length) return null;
    const avg = (k: 'fatigue' | 'stress') => Math.round(S.trend.reduce((a, p) => a + p[k], 0) / S.trend.length);
    const m = this.metrics;
    return {
      mode, started: this.started, ended: this.wall(S.lastT ?? 0), seconds: Math.round(((S.lastT ?? 0) - (S.t0 ?? 0)) / 1000 / this.speed),
      fatigue: m?.fatigue ?? null, stress: m?.stress ?? null, attention: m?.attention ?? null,
      avgFatigue: avg('fatigue'), avgStress: avg('stress'),
      peakFatigue: Math.max(...S.trend.map((p) => p.fatigue)), peakStress: Math.max(...S.trend.map((p) => p.stress)),
      maxPer: S.maxPer, totals: { ...S.totals }, trend: [...S.trend], events: [...S.events],
    };
  }
  private lastMode: Mode | null = null;
  /** the simulation plays at 2x: signal time runs faster than the clock */
  private speed = 1;
  private wall(t: number) { return (this.started ?? Date.now()) + (t - (this.S.t0 ?? t)) / this.speed; }

  /* ---------- drawing (colours come from the dashboard tokens) ---------- */
  private tok(name: string) { return getComputedStyle(this.els.strip).getPropertyValue(name).trim(); }
  private fit(c: HTMLCanvasElement) {
    const dpr = devicePixelRatio || 1; const W = c.clientWidth, H = c.clientHeight; if (!W) return null;
    if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
    const g = c.getContext('2d'); if (!g) return null;
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    return { g, W, H };
  }
  private drawStrip() {
    const k = this.fit(this.els.strip); if (!k) return; const { g, W, H } = k;
    const F = this.S.frames; if (!F.length) return;
    const tN = F[F.length - 1].t, x = (t: number) => W - ((tN - t) / WIN) * W, y = (v: number) => H - 6 - v * (H - 18);
    const muted = this.tok('--muted');
    g.strokeStyle = muted; g.globalAlpha = 0.6; g.setLineDash([4, 4]); g.lineWidth = 1; g.beginPath(); g.moveTo(0, y(this.ON)); g.lineTo(W, y(this.ON)); g.stroke(); g.setLineDash([]); g.globalAlpha = 1;
    g.fillStyle = this.tok('--crit'); g.globalAlpha = 0.16; F.forEach((f) => { if (f.closed) g.fillRect(x(f.t) - 1, 0, 2, H); }); g.globalAlpha = 1;
    g.fillStyle = muted; g.globalAlpha = 0.12; F.forEach((f) => { if (!f.ok) g.fillRect(x(f.t) - 1, 0, 2, H); }); g.globalAlpha = 1;
    ([['c', this.tok('--primary')], ['jaw', this.tok('--watch')]] as const).forEach(([key, col]) => {
      g.strokeStyle = col; g.lineWidth = 1.5; g.beginPath();
      F.forEach((f, i) => { const X = x(f.t), Y = y(f[key]); if (i) g.lineTo(X, Y); else g.moveTo(X, Y); }); g.stroke();
    });
    g.fillStyle = muted; g.font = `10px ${this.tok('--f-mono') || 'monospace'}`; g.fillText('−60 s', 6, 12);
    const nw = g.measureText(this.labels.now).width; g.fillText(this.labels.now, W - nw - 6, 12);
  }
  private drawTrend() {
    const c = this.els.trend; if (!c) return;
    const k = this.fit(c); if (!k) return; const { g, W, H } = k;
    const P = this.S.trend; const muted = this.tok('--muted'); const mono = this.tok('--f-mono') || 'monospace';
    const padL = 26, padB = 16, padT = 8; const ih = H - padB - padT;
    const y = (v: number) => padT + ih - (v / 100) * ih;
    // level bands and grid
    ([[20, '--ok'], [40, '--watch'], [60, '--warn'], [100, '--crit']] as const).reduce((lo, [hi, tk]) => {
      g.fillStyle = this.tok(tk); g.globalAlpha = 0.06; g.fillRect(padL, y(hi), W - padL, y(lo) - y(hi)); g.globalAlpha = 1; return hi;
    }, 0);
    g.strokeStyle = muted; g.globalAlpha = 0.25; g.lineWidth = 1;
    [0, 20, 40, 60, 80, 100].forEach((v) => { g.beginPath(); g.moveTo(padL, y(v)); g.lineTo(W, y(v)); g.stroke(); });
    g.globalAlpha = 1; g.fillStyle = muted; g.font = `10px ${mono}`;
    [0, 40, 60, 100].forEach((v) => g.fillText(String(v), 2, y(v) + 3));
    if (P.length < 2) return;
    const span = Math.max(60000, P.at(-1)!.t - P[0].t); const t0 = P.at(-1)!.t - span;
    const x = (t: number) => padL + ((t - t0) / span) * (W - padL - 4);
    ([['stress', this.tok('--warn')], ['fatigue', this.tok('--primary')]] as const).forEach(([key, col]) => {
      g.strokeStyle = col; g.lineWidth = 2; g.lineJoin = 'round'; g.beginPath();
      P.forEach((p, i) => { const X = x(p.t), Y = y(p[key]); if (i) g.lineTo(X, Y); else g.moveTo(X, Y); }); g.stroke();
    });
    // event marks
    g.fillStyle = this.tok('--crit');
    this.S.events.forEach((e) => { if (e.t >= t0 && (e.kind === 'microsleep' || e.kind === 'nod')) { g.beginPath(); g.arc(x(e.t), padT + 4, 3, 0, 7); g.fill(); } });
    g.fillStyle = muted;
    const mins = Math.round(span / 60000);
    g.fillText(`−${mins} min`, padL + 2, H - 3);
    const nw = g.measureText(this.labels.now).width; g.fillText(this.labels.now, W - nw - 4, H - 3);
  }
  private ring(g: CanvasRenderingContext2D, lm: P[], idx: number[], W: number, H: number) {
    g.beginPath(); idx.forEach((i, k) => { const X = lm[i].x * W, Y = lm[i].y * H; if (k) g.lineTo(X, Y); else g.moveTo(X, Y); }); g.closePath();
  }
  private brackets(g: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, col: string) {
    const L = Math.min(x2 - x1, y2 - y1) * 0.18;
    g.strokeStyle = col; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath();
    g.moveTo(x1, y1 + L); g.lineTo(x1, y1); g.lineTo(x1 + L, y1);
    g.moveTo(x2 - L, y1); g.lineTo(x2, y1); g.lineTo(x2, y1 + L);
    g.moveTo(x2, y2 - L); g.lineTo(x2, y2); g.lineTo(x2 - L, y2);
    g.moveTo(x1 + L, y2); g.lineTo(x1, y2); g.lineTo(x1, y2 - L); g.stroke();
  }
  private levelTok(v: number | undefined) { return v == null ? '--primary' : v < 20 ? '--ok' : v < 40 ? '--watch' : v < 60 ? '--warn' : '--crit'; }
  private drawFace(f: Face | null) {
    const v = this.els.video, o = this.els.overlay;
    const W = v.videoWidth || 640, H = v.videoHeight || 480;
    if (o.width !== W || o.height !== H) { o.width = W; o.height = H; }
    const g = o.getContext('2d'); if (!g) return; g.clearRect(0, 0, W, H);
    if (!f?.lm) return; const lm = f.lm;
    const s = W / 640;
    // face frame coloured by the current fatigue level
    if (f.box) {
      const pad = 0.04; const [x1, y1, x2, y2] = f.box;
      this.brackets(g, (x1 - pad) * W, (y1 - pad * 1.5) * H, (x2 + pad) * W, (y2 + pad) * H, this.tok(this.levelTok(this.metrics?.fatigue)));
    }
    // sparse mesh
    g.fillStyle = this.tok('--primary-soft-ink'); g.globalAlpha = 0.55; lm.forEach((p, i) => { if (i % 4 === 0) g.fillRect(p.x * W - s, p.y * H - s, 2 * s, 2 * s); }); g.globalAlpha = 1;
    // eyes and brows
    const closed = this.S.closed;
    g.lineWidth = 2 * s; g.strokeStyle = this.tok(closed ? '--crit' : '--derived');
    [L_EYE_RING, R_EYE_RING].forEach((r) => { this.ring(g, lm, r, W, H); g.stroke(); });
    g.strokeStyle = this.tok('--primary'); g.lineWidth = 2 * s;
    BROWS.forEach((b) => { g.beginPath(); b.forEach((i, k) => { const X = lm[i].x * W, Y = lm[i].y * H; if (k) g.lineTo(X, Y); else g.moveTo(X, Y); }); g.stroke(); });
    // mouth
    g.strokeStyle = this.tok(f.jaw > 0.5 ? '--watch' : '--primary'); g.lineWidth = 2 * s;
    this.ring(g, lm, LIPS_RING, W, H); g.stroke();
    // head direction: a short line from the nose tip
    const n = lm[1]; const dx = Math.sin((f.yaw * Math.PI) / 180) * 70 * s, dy = -Math.sin((f.pitch * Math.PI) / 180) * 70 * s;
    g.strokeStyle = this.tok('--accent'); g.lineWidth = 2.5 * s; g.beginPath(); g.moveTo(n.x * W, n.y * H); g.lineTo(n.x * W + dx, n.y * H + dy); g.stroke();
    g.fillStyle = this.tok('--accent'); g.beginPath(); g.arc(n.x * W, n.y * H, 3.5 * s, 0, 7); g.fill();
  }
  private drawBehaviorBox() {
    const cur = this.B.cur; if (!cur?.confident || !cur.top) return;
    const o = this.els.overlay; const g = o.getContext('2d'); if (!g) return;
    const W = o.width, H = o.height; const [x1, y1, x2, y2] = cur.top.box;
    const col = this.tok(cur.level === 'ok' ? '--ok' : cur.level === 'crit' ? '--crit' : '--warn');
    g.strokeStyle = col; g.lineWidth = 2; g.setLineDash([8, 6]); g.strokeRect(x1 * W, y1 * H, (x2 - x1) * W, (y2 - y1) * H); g.setLineDash([]);
    const label = `${this.labels.state(cur.state)} ${Math.round(cur.top.confidence * 100)} %`;
    const mirror = this.mode === 'camera';
    g.save(); if (mirror) { g.translate(W, 0); g.scale(-1, 1); }
    const lx = mirror ? W - x2 * W : x1 * W;
    g.font = `600 15px ${this.tok('--f-mono') || 'monospace'}`; const tw = g.measureText(label).width;
    g.fillStyle = col; g.fillRect(lx, Math.max(0, y1 * H - 24), tw + 12, 22);
    g.fillStyle = this.tok('--screen'); g.fillText(label, lx + 6, Math.max(16, y1 * H - 8)); g.restore();
  }

  /* ---------- frame sources ---------- */
  private fromResult(r: FaceLandmarkerResult): Face | null {
    if (!r.faceLandmarks?.length) return null;
    const lm = r.faceLandmarks[0]; const cats = r.faceBlendshapes?.[0]?.categories ?? [];
    const bs = (n: string) => cats.find((c) => c.categoryName === n)?.score ?? 0;
    const m = r.facialTransformationMatrixes?.[0]?.data;
    // rotation from the column-major 4×4 transform: R(row, col) = m[col * 4 + row]
    const deg = 180 / Math.PI;
    const pitch = m ? Math.atan2(m[6], m[10]) * deg : 0;
    const yaw = m ? Math.atan2(-m[2], Math.hypot(m[6], m[10])) * deg : 0;
    const roll = m ? Math.atan2(m[1], m[0]) * deg : 0;
    const faceW = Math.hypot(lm[454].x - lm[234].x, lm[454].y - lm[234].y) || 1;
    let x1 = 1, y1 = 1, x2 = 0, y2 = 0;
    for (const p of lm) { if (p.x < x1) x1 = p.x; if (p.x > x2) x2 = p.x; if (p.y < y1) y1 = p.y; if (p.y > y2) y2 = p.y; }
    return {
      lm, bs: (bs('eyeBlinkLeft') + bs('eyeBlinkRight')) / 2, ear: (ear(lm, L_EYE) + ear(lm, R_EYE)) / 2, jaw: bs('jawOpen'),
      ten: (bs('browDownLeft') + bs('browDownRight')) / 2 + (0.5 * (bs('mouthPressLeft') + bs('mouthPressRight'))) / 2 + (0.3 * (bs('eyeSquintLeft') + bs('eyeSquintRight'))) / 2,
      pitch, yaw, roll, nx: (lm[1].x / faceW) * 0.1, ny: (lm[1].y / faceW) * 0.1, box: [x1, y1, x2, y2],
    };
  }
  private tickFps(now: number) {
    if (this.lastFrameT) { const inst = 1000 / Math.max(1, now - this.lastFrameT); this.fps = this.fps ? this.fps * 0.9 + inst * 0.1 : inst; }
    this.lastFrameT = now;
  }
  private loopVideo = () => {
    if (this.mode !== 'camera' && this.mode !== 'file') return;
    const v = this.els.video;
    if (v.readyState >= 2 && v.currentTime !== this.lastVT && this.lm) {
      this.lastVT = v.currentTime;
      const now = performance.now(); this.tickFps(now);
      const t = this.mode === 'file' ? v.currentTime * 1000 : now;
      let f: Face | null = null;
      try { f = this.fromResult(this.lm.detectForVideo(v, now)); } catch { /* skipped frame */ }
      this.sampleLight(now);
      this.drawFace(f); this.drawBehaviorBox(); this.feed(t, f); this.drawStrip(); this.behaviorTick(now);
    }
    this.raf = requestAnimationFrame(this.loopVideo);
  };
  /** demo: a scripted 80-second shift played at 2x (SIMULATED) */
  private demoFrame(s: number): Face {
    const rnd = (k: number) => { const x = Math.sin(k * 12.9898 + s * 0.37) * 43758.5453; return x - Math.floor(x); };
    const phase = s < 20 ? 0 : s < 50 ? 1 : 2;
    const period = [3.6, 2.2, 1.6][phase], dur = [0.15, 0.45, 0.3][phase];
    let blink = 0.06 + rnd(1) * 0.04; if (s % period < dur) blink = 0.9;
    if (phase === 1 && s > 38 && s < 39.4) blink = 0.95; // microsleep
    if (phase === 1 && s > 45 && s < 45.8) blink = 0.92;
    let jaw = 0.05 + rnd(2) * 0.03; if ((s > 27 && s < 29.4) || (s > 41 && s < 43.2)) jaw = 0.75;
    const pitch = s > 33 && s < 34.4 ? 22 : 0;
    const yaw = s > 62 && s < 65 ? 32 : (rnd(6) - 0.5) * 3;
    const j = phase === 2 ? 0.025 : 0.002;
    return { bs: blink, ear: 0.3 * (1 - blink * 0.85), jaw, ten: [0.12, 0.15, 0.42][phase] + rnd(3) * 0.03, pitch, yaw, roll: 0, nx: 0.5 + (rnd(4) - 0.5) * j, ny: 0.5 + (rnd(5) - 0.5) * j };
  }
  private drawDemo(f: Face) {
    const o = this.els.overlay; if (o.width !== 640) { o.width = 640; o.height = 480; }
    const W = 640, H = 480;
    const g = o.getContext('2d'); if (!g) return; g.clearRect(0, 0, W, H);
    const cx = W / 2 + (f.nx - 0.5) * 400 + f.yaw * 2, cy = H / 2 + f.pitch * 2.5;
    this.brackets(g, cx - 150, cy - 185, cx + 150, cy + 185, this.tok(this.levelTok(this.metrics?.fatigue)));
    g.save(); g.translate(cx, cy);
    g.strokeStyle = this.tok('--primary-soft-ink'); g.lineWidth = 2; g.beginPath(); g.ellipse(0, 0, 120, 155, 0, 0, 7); g.stroke();
    const eh = Math.max(1, 14 * (1 - f.bs)); g.strokeStyle = this.S.closed ? this.tok('--crit') : this.tok('--derived'); g.lineWidth = 2.5;
    [-45, 45].forEach((x) => { g.beginPath(); g.ellipse(x, -30, 24, eh, 0, 0, 7); g.stroke(); });
    g.strokeStyle = this.tok('--primary'); g.lineWidth = 3; const br = f.ten * 30;
    [-45, 45].forEach((x) => { g.beginPath(); g.moveTo(x - 26, -62 + br * (x < 0 ? 0.6 : 1)); g.lineTo(x + 26, -62 + br * (x < 0 ? 1 : 0.6)); g.stroke(); });
    g.strokeStyle = f.jaw > 0.5 ? this.tok('--watch') : this.tok('--primary'); g.lineWidth = 2.5;
    g.beginPath(); g.ellipse(0, 70, 40, 4 + f.jaw * 40, 0, 0, 7); g.stroke(); g.restore();
  }
  private loopDemo = () => {
    if (this.mode !== 'demo') return;
    const now = performance.now(); this.tickFps(now);
    const s = Math.min(80, ((now - this.demoStart) / 1000) * 2);
    // fixed step (30 simulated frames per second): the result is the same whether the screen gives 60 fps
    // or the window is covered and the browser slows the animation down
    const STEP = 1 / 30;
    let f: Face | null = null;
    while (this.demoS + STEP <= s) { this.demoS += STEP; f = this.demoFrame(this.demoS); this.feed(this.demoS * 1000, f); }
    if (f) { this.drawDemo(f); this.drawStrip(); }
    if (s >= 80) { this.stop(false); this.on.event('demoDone'); return; }
    this.raf = requestAnimationFrame(this.loopDemo);
  };
  private demoS = 0;

  /* ---------- controls ---------- */
  private begin(m: Mode) {
    this.stop(false); this.mode = m; this.lastMode = m; this.speed = m === 'demo' ? 2 : 1; this.S = this.fresh(); this.metrics = null; this.phase = 'calibrating'; this.calibLeft = 8;
    this.started = Date.now(); this.face = null; this.fps = 0; this.lastFrameT = 0; this.over = { fatigue: 0, stress: 0, attention: 0 };
    this.alertAt = { microsleep: 0, fatigue: 0, stress: 0, attention: 0 };
    this.B.hist = []; this.B.cur = null; this.lastVT = -1; this.emit(true);
  }
  /** start a new resting-face calibration without stopping the source */
  recalibrate() {
    if (!this.mode) return;
    const keep = { events: this.S.events, totals: this.S.totals, trend: this.S.trend, maxPer: this.S.maxPer };
    this.S = { ...this.fresh(), ...keep }; this.metrics = null; this.phase = 'calibrating'; this.calibLeft = 8;
    this.on.event('recalibrate'); this.emit(true);
  }
  stop(user = true) {
    cancelAnimationFrame(this.raf); this.raf = 0; const was = this.mode; this.mode = null;
    this.stream?.getTracks().forEach((t) => { t.onended = null; t.stop(); }); this.stream = null;
    const v = this.els.video; v.pause(); v.srcObject = null; v.onended = null;
    if (v.src) { URL.revokeObjectURL(v.src); v.removeAttribute('src'); v.load(); }
    if (was) { this.phase = 'stopped'; this.emit(true); if (user) this.on.event('stopped'); }
  }
  startDemo() { this.begin('demo'); this.demoStart = performance.now(); this.demoS = 0; this.on.event('demo'); this.loopDemo(); }
  /** cameras available (labels appear once permission was granted) */
  static async cameras(): Promise<{ id: string; label: string }[]> {
    if (!navigator.mediaDevices?.enumerateDevices) return [];
    try { return (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput').map((d, i) => ({ id: d.deviceId, label: d.label || `#${i + 1}` })); }
    catch { return []; }
  }
  async startCamera(deviceId?: string) {
    if (!navigator.mediaDevices?.getUserMedia) { this.on.event('noCamApi'); return; }
    let s: MediaStream;
    const video: MediaTrackConstraints = { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 }, ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: 'user' }) };
    try { s = await navigator.mediaDevices.getUserMedia({ video, audio: false }); }
    catch { this.on.event('camBlocked'); return; }
    try { this.on.event('loading'); this.lm = await loadLandmarker(); }
    catch { s.getTracks().forEach((t) => t.stop()); this.on.event('modelFail'); return; }
    this.begin('camera'); this.stream = s; const v = this.els.video; v.srcObject = s; await v.play().catch(() => {});
    // the camera was unplugged or taken by another app
    s.getVideoTracks().forEach((t) => { t.onended = () => { if (this.mode === 'camera') { this.stop(false); this.on.event('camLost'); } }; });
    this.on.event('camera', s.getVideoTracks()[0]?.label); this.loopVideo();
  }
  async startFile(file: File) {
    try { this.on.event('loading'); this.lm = await loadLandmarker(); } catch { this.on.event('modelFail'); return; }
    this.begin('file'); const v = this.els.video; v.src = URL.createObjectURL(file); v.loop = false;
    v.onended = () => { if (this.mode === 'file') { this.stop(false); this.on.event('fileDone'); } };
    await v.play().catch(() => {}); this.on.event('file', file.name); this.loopVideo();
  }
}
