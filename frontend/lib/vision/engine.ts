// ASTRA Vision engine: fatigue and stress from facial signals, on the visitor's own device.
// - Face Landmarker (MediaPipe) is loaded lazily, only when the camera or a video is used, and cached for the session.
// - A behaviour classifier runs on the local backend (/api/vision/frame, proxied by Next) when it is available.
// The engine draws straight to canvases (60 fps) and reports a throttled snapshot to React (~6 per second).
import type { FaceLandmarker, FaceLandmarkerResult } from '@mediapipe/tasks-vision';
import { apiUrl } from '@/lib/platform';

export type Mode = 'camera' | 'file' | 'demo';
export type VisionEvent = 'loading' | 'camera' | 'file' | 'demo' | 'demoDone' | 'stopped' | 'fileDone' | 'noCamApi' | 'camBlocked' | 'modelFail';
export interface Shares { n: number; sleepy: number; yawn: number; distracted: number; danger: number; drinking: number }
export interface Metrics {
  fatigue: number; stress: number; attention: number | null;
  per: number; rate: number; md: number; yawns: number; nods: number; ten: number; longClose: number; mov: number; ys: Shares | null;
}
export interface Behavior { state: string; level?: string; confident?: boolean; top?: { confidence: number; box: [number, number, number, number] }; inference_ms?: number }
export interface Snapshot {
  mode: Mode | null;
  phase: 'idle' | 'calibrating' | 'noface' | 'live' | 'stopped';
  calibLeft: number;
  metrics: Metrics | null;
  behavior: { ok: boolean; cur: Behavior | null; ms: number | null };
}
interface Face { lm?: { x: number; y: number }[]; blink: number; jaw: number; ten: number; pitch: number; nx: number; ny: number }
interface Els { video: HTMLVideoElement; overlay: HTMLCanvasElement; strip: HTMLCanvasElement }
interface Handlers { snapshot: (s: Snapshot) => void; event: (e: VisionEvent, detail?: string) => void }

const WASM = { wasmLoaderPath: '/mediapipe/vision_wasm_internal.js', wasmBinaryPath: '/mediapipe/vision_wasm_internal.wasm' };
const MODEL = '/models/face_landmarker.task';
const CALIB_MS = 8000;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

let landmarkerP: Promise<FaceLandmarker> | null = null;
/** one Face Landmarker per tab: GPU first, CPU as fallback */
function loadLandmarker(): Promise<FaceLandmarker> {
  landmarkerP ??= (async () => {
    const { FaceLandmarker } = await import('@mediapipe/tasks-vision');
    let err: unknown;
    for (const delegate of ['GPU', 'CPU'] as const) {
      try {
        return await FaceLandmarker.createFromOptions(WASM, {
          baseOptions: { modelAssetPath: MODEL, delegate }, runningMode: 'VIDEO', numFaces: 1,
          outputFaceBlendshapes: true, outputFacialTransformationMatrixes: true,
        });
      } catch (e) { err = e; }
    }
    throw err;
  })().catch((e) => { landmarkerP = null; throw e; });
  return landmarkerP;
}

const EYES = [33, 160, 158, 133, 153, 144, 362, 385, 387, 263, 373, 380];
const LIPS = [61, 40, 37, 0, 267, 270, 291, 321, 314, 17, 84, 91];

export class VisionEngine {
  /** localized strings used on the canvases */
  labels = { now: 'now', state: (s: string) => s };
  private lm: FaceLandmarker | null = null;
  private mode: Mode | null = null;
  private stream: MediaStream | null = null;
  private raf = 0;
  private lastVT = -1;
  private demoStart = 0;
  private lastSnap = 0;
  private lastSummary = 0;
  private phase: Snapshot['phase'] = 'idle';
  private metrics: Metrics | null = null;
  private calibLeft = 0;
  private S = this.fresh();
  private B = { ok: false, busy: false, last: 0, hist: [] as { t: number; state: string }[], cur: null as Behavior | null, ms: null as number | null };
  private grab: HTMLCanvasElement | null = null;
  private healthTimer: ReturnType<typeof setInterval> | null = null;
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
        B.hist.push({ t, state: j.state }); while (B.hist.length && t - B.hist[0].t > 60000) B.hist.shift();
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
      t0: null as number | null, calib: { n: 0, ten: 0, pitch: 0, open: 0 }, ready: false,
      frames: [] as { t: number; blink: number; jaw: number; closed: boolean }[], blinks: [] as { t: number; d: number }[],
      closedSince: null as number | null, yawnSince: null as number | null, yawns: 0, nodSince: null as number | null, nods: 0, longClose: 0,
      tenS: null as number | null, pos: [] as { t: number; x: number; y: number }[],
    };
  }
  private threshold() { return clamp(this.S.calib.open + 0.35, 0.45, 0.7); }
  private feed(t: number, f: Face | null) {
    const S = this.S; if (S.t0 == null) S.t0 = t;
    const el = t - S.t0;
    if (!f) { this.phase = 'noface'; this.emit(); return; }
    if (el < CALIB_MS) {
      const c = S.calib; c.n++;
      c.ten += (f.ten - c.ten) / c.n; c.pitch += (f.pitch - c.pitch) / c.n; c.open += (Math.min(f.blink, 0.5) - c.open) / c.n;
      this.phase = 'calibrating'; this.calibLeft = Math.ceil((CALIB_MS - el) / 1000);
    } else { S.ready = true; this.phase = 'live'; }
    const thr = this.threshold();
    S.frames.push({ t, blink: f.blink, jaw: f.jaw, closed: f.blink >= thr }); while (S.frames.length && t - S.frames[0].t > 60000) S.frames.shift();
    if (f.blink >= thr && S.closedSince == null) S.closedSince = t;
    if (f.blink < thr && S.closedSince != null) { const d = t - S.closedSince; if (d >= 50) { S.blinks.push({ t, d }); if (d > 500) S.longClose++; } S.closedSince = null; }
    while (S.blinks.length && t - S.blinks[0].t > 60000) S.blinks.shift();
    if (f.jaw > 0.5 && S.yawnSince == null) S.yawnSince = t;
    if (f.jaw < 0.35 && S.yawnSince != null) { if (t - S.yawnSince > 1200) S.yawns++; S.yawnSince = null; }
    const dp = Math.abs(f.pitch - S.calib.pitch);
    if (S.ready && dp > 14 && S.nodSince == null) S.nodSince = t;
    if (dp < 8 && S.nodSince != null) { if (t - S.nodSince > 700) S.nods++; S.nodSince = null; }
    S.tenS = S.tenS == null ? f.ten : S.tenS * 0.92 + f.ten * 0.08;
    S.pos.push({ t, x: f.nx, y: f.ny }); while (S.pos.length && t - S.pos[0].t > 10000) S.pos.shift();
    if (S.ready) this.score(t);
    this.emit();
  }
  private score(t: number) {
    const S = this.S; const win = Math.min(60000, t - (S.t0 ?? t));
    const per = S.frames.filter((x) => x.closed).length / Math.max(1, S.frames.length);
    const rate = S.blinks.filter((b) => b.d <= 500).length / (win / 60000);
    const durs = S.blinks.map((b) => b.d); const md = durs.length ? durs.reduce((a, b) => a + b, 0) / durs.length : 0;
    const ten = (S.tenS ?? 0) - S.calib.ten;
    const sd = (a: number[]) => { if (a.length < 2) return 0; const m = a.reduce((x, y) => x + y, 0) / a.length; return Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / a.length); };
    const mov = Math.hypot(sd(S.pos.map((p) => p.x)), sd(S.pos.map((p) => p.y)));
    const faceFatigue = Math.round(clamp(Math.min(per / 0.15, 1.5) * 45 + clamp((md - 180) / 220, 0, 1) * 20 + Math.min(S.yawns, 3) * 8 + Math.min(S.nods, 3) * 10 + Math.min(S.longClose, 3) * 7, 0, 100));
    let stress = Math.round(clamp(clamp(ten / 0.2, 0, 1.2) * 45 + clamp((rate - 20) / 15, 0, 1) * 25 + clamp((mov - 0.006) / 0.02, 0, 1) * 30, 0, 100));
    const ys = this.mode !== 'demo' ? this.shares() : null;
    let fatigue = faceFatigue, attention: number | null = null;
    if (ys && ys.n >= 5) {
      const yFat = clamp(ys.sleepy * 100 + ys.yawn * 60, 0, 100);
      fatigue = Math.round(Math.max(faceFatigue, 0.5 * faceFatigue + 0.5 * yFat));
      attention = Math.round(clamp((ys.distracted + ys.danger) * 100 + ys.drinking * 40, 0, 100));
      stress = Math.round(Math.max(stress, 0.7 * stress + 0.3 * ys.danger * 100));
    }
    this.metrics = { fatigue, stress, attention, per, rate, md, yawns: S.yawns, nods: S.nods, ten, longClose: S.longClose, mov, ys };
    if (t - this.lastSummary > 1000 && this.mode) { this.lastSummary = t; this.onSummary?.(this.metrics, this.mode); }
  }
  private emit(force = false) {
    const now = performance.now();
    if (!force && now - this.lastSnap < 160) return;
    this.lastSnap = now;
    this.on.snapshot({
      mode: this.mode, phase: this.phase, calibLeft: this.calibLeft, metrics: this.metrics,
      behavior: { ok: this.B.ok, cur: this.B.cur, ms: this.B.ms },
    });
  }

  /* ---------- drawing (colours come from the dashboard tokens) ---------- */
  private tok(name: string) { return getComputedStyle(this.els.strip).getPropertyValue(name).trim(); }
  private drawStrip() {
    const c = this.els.strip; const dpr = devicePixelRatio || 1; const W = c.clientWidth, H = c.clientHeight; if (!W) return;
    if (c.width !== Math.round(W * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
    const g = c.getContext('2d'); if (!g) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    const F = this.S.frames; if (!F.length) return;
    const tN = F[F.length - 1].t, x = (t: number) => W - ((tN - t) / 60000) * W, y = (v: number) => H - 6 - v * (H - 12);
    const muted = this.tok('--muted');
    g.strokeStyle = muted; g.setLineDash([4, 4]); g.lineWidth = 1; g.beginPath(); g.moveTo(0, y(this.threshold())); g.lineTo(W, y(this.threshold())); g.stroke(); g.setLineDash([]);
    g.fillStyle = this.tok('--crit'); g.globalAlpha = 0.18; F.forEach((f) => { if (f.closed) g.fillRect(x(f.t) - 1, 0, 2, H); }); g.globalAlpha = 1;
    ([['blink', this.tok('--primary')], ['jaw', this.tok('--watch')]] as const).forEach(([k, col]) => {
      g.strokeStyle = col; g.lineWidth = 1.5; g.beginPath();
      F.forEach((f, i) => { const X = x(f.t), Y = y(f[k]); if (i) g.lineTo(X, Y); else g.moveTo(X, Y); }); g.stroke();
    });
    g.fillStyle = muted; g.font = `10px ${this.tok('--f-mono') || 'monospace'}`; g.fillText('−60 s', 4, 12); g.fillText(this.labels.now, W - 34, 12);
  }
  private drawFace(f: Face | null) {
    const v = this.els.video, o = this.els.overlay;
    const W = (o.width = v.videoWidth || 640), H = (o.height = v.videoHeight || 480);
    const g = o.getContext('2d'); if (!g) return; g.clearRect(0, 0, W, H);
    if (!f?.lm) return; const lm = f.lm;
    g.fillStyle = this.tok('--primary-soft-ink'); lm.forEach((p, i) => { if (i % 3 === 0) g.fillRect(p.x * W - 1, p.y * H - 1, 2, 2); });
    g.fillStyle = f.blink > 0.5 ? this.tok('--crit') : this.tok('--derived');
    EYES.forEach((i) => { g.beginPath(); g.arc(lm[i].x * W, lm[i].y * H, 3, 0, 7); g.fill(); });
    g.fillStyle = f.jaw > 0.5 ? this.tok('--watch') : this.tok('--primary');
    LIPS.forEach((i) => { g.beginPath(); g.arc(lm[i].x * W, lm[i].y * H, 2.5, 0, 7); g.fill(); });
  }
  private drawBehaviorBox() {
    const cur = this.B.cur; if (!cur?.confident || !cur.top) return;
    const o = this.els.overlay; const g = o.getContext('2d'); if (!g) return;
    const W = o.width, H = o.height; const [x1, y1, x2, y2] = cur.top.box;
    const col = this.tok(cur.level === 'ok' ? '--ok' : cur.level === 'crit' ? '--crit' : '--warn');
    g.strokeStyle = col; g.lineWidth = 3; g.strokeRect(x1 * W, y1 * H, (x2 - x1) * W, (y2 - y1) * H);
    const label = `${this.labels.state(cur.state)} ${Math.round(cur.top.confidence * 100)} %`;
    const mirror = this.mode === 'camera';
    g.save(); if (mirror) { g.translate(W, 0); g.scale(-1, 1); }
    const lx = mirror ? W - x2 * W : x1 * W;
    g.font = `600 16px ${this.tok('--f-mono') || 'monospace'}`; const tw = g.measureText(label).width;
    g.fillStyle = col; g.fillRect(lx, Math.max(0, y1 * H - 24), tw + 12, 22);
    g.fillStyle = '#03070D'; g.fillText(label, lx + 6, Math.max(16, y1 * H - 8)); g.restore();
  }

  /* ---------- frame sources ---------- */
  private fromResult(r: FaceLandmarkerResult): Face | null {
    if (!r.faceLandmarks?.length) return null;
    const lm = r.faceLandmarks[0]; const cats = r.faceBlendshapes?.[0]?.categories ?? [];
    const bs = (n: string) => cats.find((c) => c.categoryName === n)?.score ?? 0;
    const m = r.facialTransformationMatrixes?.[0]?.data;
    const pitch = m ? (Math.atan2(m[6], m[10]) * 180) / Math.PI : 0;
    const faceW = Math.hypot(lm[454].x - lm[234].x, lm[454].y - lm[234].y) || 1;
    return {
      lm, blink: (bs('eyeBlinkLeft') + bs('eyeBlinkRight')) / 2, jaw: bs('jawOpen'),
      ten: (bs('browDownLeft') + bs('browDownRight')) / 2 + (0.5 * (bs('mouthPressLeft') + bs('mouthPressRight'))) / 2 + (0.3 * (bs('eyeSquintLeft') + bs('eyeSquintRight'))) / 2,
      pitch, nx: (lm[1].x / faceW) * 0.1, ny: (lm[1].y / faceW) * 0.1,
    };
  }
  private loopVideo = () => {
    if (this.mode !== 'camera' && this.mode !== 'file') return;
    const v = this.els.video;
    if (v.readyState >= 2 && v.currentTime !== this.lastVT && this.lm) {
      this.lastVT = v.currentTime;
      const t = this.mode === 'file' ? v.currentTime * 1000 : performance.now();
      let f: Face | null = null;
      try { f = this.fromResult(this.lm.detectForVideo(v, performance.now())); } catch { /* skipped frame */ }
      this.drawFace(f); this.drawBehaviorBox(); this.feed(t, f); this.drawStrip(); this.behaviorTick(performance.now());
    }
    this.raf = requestAnimationFrame(this.loopVideo);
  };
  /** demo: a scripted 70-second shift played at 2x (SIMULATED) */
  private demoFrame(s: number): Face {
    const rnd = (k: number) => { const x = Math.sin(k * 12.9898 + s * 0.37) * 43758.5453; return x - Math.floor(x); };
    const phase = s < 20 ? 0 : s < 45 ? 1 : 2;
    const period = [3.6, 2.2, 1.8][phase], dur = [0.15, 0.45, 0.38][phase];
    let blink = 0.08 + rnd(1) * 0.04; if (s % period < dur) blink = 0.85;
    if (phase === 1 && s > 38 && s < 39.4) blink = 0.9;
    let jaw = 0.05 + rnd(2) * 0.03; if ((s > 27 && s < 29.4) || (s > 41 && s < 43.2)) jaw = 0.75;
    const pitch = s > 33 && s < 34.4 ? 22 : 0;
    const j = phase === 2 ? 0.025 : 0.002;
    return { blink, jaw, ten: [0.12, 0.15, 0.42][phase] + rnd(3) * 0.03, pitch, nx: 0.5 + (rnd(4) - 0.5) * j, ny: 0.5 + (rnd(5) - 0.5) * j };
  }
  private drawDemo(f: Face) {
    const o = this.els.overlay; const W = (o.width = 640), H = (o.height = 480);
    const g = o.getContext('2d'); if (!g) return; g.clearRect(0, 0, W, H);
    g.save(); g.translate(W / 2 + (f.nx - 0.5) * 400, H / 2 + f.pitch * 2.5);
    g.strokeStyle = this.tok('--primary-soft-ink'); g.lineWidth = 2; g.beginPath(); g.ellipse(0, 0, 120, 155, 0, 0, 7); g.stroke();
    const eh = Math.max(1, 14 * (1 - f.blink)); g.fillStyle = f.blink > 0.5 ? this.tok('--crit') : this.tok('--derived');
    [-45, 45].forEach((x) => { g.beginPath(); g.ellipse(x, -30, 24, eh, 0, 0, 7); g.fill(); });
    g.strokeStyle = this.tok('--primary'); g.lineWidth = 3; const br = f.ten * 30;
    [-45, 45].forEach((x) => { g.beginPath(); g.moveTo(x - 26, -62 + br * (x < 0 ? 0.6 : 1)); g.lineTo(x + 26, -62 + br * (x < 0 ? 1 : 0.6)); g.stroke(); });
    g.fillStyle = f.jaw > 0.5 ? this.tok('--watch') : this.tok('--primary');
    g.beginPath(); g.ellipse(0, 70, 40, 4 + f.jaw * 40, 0, 0, 7); g.fill(); g.restore();
  }
  private loopDemo = () => {
    if (this.mode !== 'demo') return;
    const s = ((performance.now() - this.demoStart) / 1000) * 2;
    if (s > 70) { this.stop(true); this.on.event('demoDone'); return; }
    const f = this.demoFrame(s); this.drawDemo(f); this.feed(s * 1000, f); this.drawStrip();
    this.raf = requestAnimationFrame(this.loopDemo);
  };

  /* ---------- controls ---------- */
  private begin(m: Mode) {
    this.stop(false); this.mode = m; this.S = this.fresh(); this.metrics = null; this.phase = 'calibrating'; this.calibLeft = 8;
    this.B.hist = []; this.B.cur = null; this.lastVT = -1; this.emit(true);
  }
  stop(user = true) {
    cancelAnimationFrame(this.raf); this.raf = 0; const was = this.mode; this.mode = null;
    this.stream?.getTracks().forEach((t) => t.stop()); this.stream = null;
    const v = this.els.video; v.pause(); v.srcObject = null;
    if (v.src) { URL.revokeObjectURL(v.src); v.removeAttribute('src'); v.load(); }
    if (was) { this.phase = 'stopped'; this.emit(true); if (user) this.on.event('stopped'); }
  }
  startDemo() { this.begin('demo'); this.demoStart = performance.now(); this.on.event('demo'); this.loopDemo(); }
  async startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) { this.on.event('noCamApi'); return; }
    let s: MediaStream;
    try { s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false }); }
    catch { this.on.event('camBlocked'); return; }
    try { this.on.event('loading'); this.lm = await loadLandmarker(); }
    catch { s.getTracks().forEach((t) => t.stop()); this.on.event('modelFail'); return; }
    this.begin('camera'); this.stream = s; const v = this.els.video; v.srcObject = s; await v.play().catch(() => {});
    this.on.event('camera'); this.loopVideo();
  }
  async startFile(file: File) {
    try { this.on.event('loading'); this.lm = await loadLandmarker(); } catch { this.on.event('modelFail'); return; }
    this.begin('file'); const v = this.els.video; v.src = URL.createObjectURL(file); v.loop = false;
    v.onended = () => { if (this.mode === 'file') { this.stop(false); this.on.event('fileDone'); } };
    await v.play().catch(() => {}); this.on.event('file', file.name); this.loopVideo();
  }
}
