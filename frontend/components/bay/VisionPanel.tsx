'use client';
// ASTRA Vision panel: live monitoring of fatigue, stress and attention from the face.
// Source (camera / video / simulation) · viewport with HUD, calibration guide and signal quality ·
// score rings with trend · signal table with reference ranges · trend and eye/mouth charts · event log ·
// alerts (optional sound) · session report with CSV/JSON export. Images never leave the device.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Badge, Card, Meter, toneOf, type Tone } from '@/components/app/ui';
import { useBay } from '@/components/bay/BayContext';
import { lvlOfScore } from '@/lib/bay/model';
import { newId } from '@/lib/platform';
import { getStore } from '@/lib/store';
import { useBayText, type BayText } from '@/lib/bay/text';
import {
  VisionEngine, type AlertKind, type EventKind, type Metrics, type Mode, type QualityIssue, type Report, type Snapshot, type VisionEvent,
} from '@/lib/vision/engine';

const STATES: Record<string, [string, string]> = {
  SafeDriving: ['Atento', 'Attentive'], SleepyDriving: ['Somnolencia', 'Drowsy'], Yawn: ['Bostezo', 'Yawning'], Distracted: ['Distraído', 'Distracted'],
  Drinking: ['Bebiendo', 'Drinking'], DangerousDriving: ['Conducta peligrosa', 'Dangerous behavior'], Uncertain: ['Sin certeza', 'Uncertain'],
};
const EVENTS: Record<EventKind, [string, string]> = {
  microsleep: ['Microsueño', 'Microsleep'], longClose: ['Cierre largo de ojos', 'Long eye closure'], yawn: ['Bostezo', 'Yawn'],
  nod: ['Cabeceo', 'Head nod'], lookAway: ['Mirada fuera', 'Looking away'],
};
const EVENT_TONE: Record<EventKind, Tone> = { microsleep: 'crit', longClose: 'warn', yawn: 'watch', nod: 'warn', lookAway: 'watch' };
const ISSUES: Record<QualityIssue, [string, string]> = {
  noface: ['No se ve el rostro', 'No face in view'], far: ['Acércate a la cámara', 'Move closer to the camera'], close: ['Aléjate un poco', 'Move back a little'],
  dark: ['Poca luz: ilumina el rostro de frente', 'Low light: light your face from the front'], bright: ['Demasiada luz o contraluz', 'Too much light or backlight'],
  turned: ['Mira de frente a la cámara', 'Face the camera'], offcenter: ['Centra el rostro en el recuadro', 'Center your face in the frame'],
};
const EMPTY: Snapshot = {
  mode: null, phase: 'idle', calibLeft: 0, calibProgress: 0, metrics: null, behavior: { ok: false, cur: null, ms: null }, fps: 0,
  quality: { score: 0, issues: [] }, pose: null, eye: 0, mouth: 0, started: null, elapsed: 0, events: [],
  totals: { microsleep: 0, longClose: 0, yawn: 0, nod: 0, lookAway: 0 },
};
const SOUND_KEY = 'astra-vision-sound';

function level(x: BayText, s: number) { return s < 20 ? 'NORMAL' : s < 40 ? x.L('LEVE', 'MILD') : s < 60 ? x.L('MODERADO', 'MODERATE') : x.L('ALTO', 'HIGH'); }
const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

/** the explanation shown under the gauges, also passed to the Copilot */
function explain(x: BayText, m: Metrics) {
  const { L, num } = x; const fx: string[] = [], sx: string[] = [];
  if (m.microsleeps) fx.push(L(`${m.microsleeps} microsueño${m.microsleeps > 1 ? 's' : ''} (ojos cerrados más de 1 s)`, `${m.microsleeps} microsleep${m.microsleeps > 1 ? 's' : ''} (eyes closed over 1 s)`));
  if (m.per >= 0.075) fx.push(L(`ojos cerrados el ${num(m.per * 100, 1)} % del último minuto (umbral de somnolencia: 15 %)`, `eyes closed ${num(m.per * 100, 1)}% of the last minute (drowsiness threshold: 15%)`));
  if (m.md > 400) fx.push(L(`parpadeos lentos (${num(m.md, 0)} ms de media; lo normal es 100–400 ms)`, `slow blinks (${num(m.md, 0)} ms on average; normal is 100–400 ms)`));
  if (m.yawns) fx.push(L(`${m.yawns} bostezo${m.yawns > 1 ? 's' : ''}`, `${m.yawns} yawn${m.yawns > 1 ? 's' : ''}`));
  if (m.nods) fx.push(L(`${m.nods} cabeceo${m.nods > 1 ? 's' : ''}`, `${m.nods} head nod${m.nods > 1 ? 's' : ''}`));
  if (m.ys && m.ys.n >= 5 && m.ys.sleepy >= 0.1) fx.push(L(`el detector de conducta ve somnolencia en el ${num(m.ys.sleepy * 100, 0)} % de los fotogramas`, `the behavior detector sees drowsiness in ${num(m.ys.sleepy * 100, 0)}% of frames`));
  if (m.longClose) fx.push(L(`${m.longClose} cierre${m.longClose > 1 ? 's' : ''} de ojos de más de medio segundo`, `${m.longClose} eye closure${m.longClose > 1 ? 's' : ''} longer than half a second`));
  if (m.ten > 0.08) sx.push(L(`tensión de cejas y labios ${num(m.ten, 2)} por encima de tu reposo`, `brow and lip tension ${num(m.ten, 2)} above your resting face`));
  if (m.rate > 21) sx.push(L(`parpadeo acelerado (${num(m.rate, 0)} por minuto)`, `fast blinking (${num(m.rate, 0)} per minute)`));
  if (m.mov > 0.012) sx.push(L('cabeza inquieta', 'restless head'));
  const cap = (s: string) => s[0] + s.slice(1).toLowerCase();
  let t = m.fatigue >= 40
    ? L(`Fatiga ${level(x, m.fatigue).toLowerCase()}: ${fx.join(', ') || 'varias señales a la vez'}. Conviene una pausa de 10–15 minutos y evitar tareas críticas hasta recuperarse. `, `${cap(level(x, m.fatigue))} fatigue: ${fx.join(', ') || 'several signals at once'}. Take a 10–15 minute break and avoid critical tasks until recovered. `)
    : m.fatigue >= 20 ? L(`Fatiga leve: ${fx.join(', ') || 'señales iniciales'}. Vigilar en los próximos minutos. `, `Mild fatigue: ${fx.join(', ') || 'early signs'}. Keep watching over the next minutes. `)
      : L('Sin señales de fatiga. ', 'No signs of fatigue. ');
  t += m.stress >= 40
    ? L(`Estrés ${level(x, m.stress).toLowerCase()}: ${sx.join(', ') || 'varias señales a la vez'}. Prueba 2 minutos de respiración lenta y una pausa breve.`, `${cap(level(x, m.stress))} stress: ${sx.join(', ') || 'several signals at once'}. Try 2 minutes of slow breathing and a short break.`)
    : m.stress >= 20 ? L(`Estrés leve: ${sx.join(', ') || 'señales iniciales'}.`, `Mild stress: ${sx.join(', ') || 'early signs'}.`) : L('Sin señales de estrés.', 'No signs of stress.');
  if (m.attention != null && m.attention >= 30) t += L(` Atención reducida: mirada fuera o conducta de riesgo en el ${m.attention} % del último minuto.`, ` Reduced attention: looking away or risky behavior in ${m.attention}% of the last minute.`);
  return t;
}

/** short two-tone beep (no audio files) */
function beep(urgent: boolean) {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC(); const g = ctx.createGain(); g.connect(ctx.destination); g.gain.value = 0.08;
    (urgent ? [880, 660, 880] : [660]).forEach((f, i) => {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f; o.connect(g);
      o.start(ctx.currentTime + i * 0.22); o.stop(ctx.currentTime + i * 0.22 + 0.18);
    });
    setTimeout(() => void ctx.close(), 1200);
  } catch { /* audio not available */ }
}

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function ScoreRing({ name, value, state, delta, desc }: { name: string; value: number | null | undefined; state: string; delta: number | null; desc: string }) {
  const tone: Tone = value != null ? toneOf(lvlOfScore(value)) : 'none';
  const C = 2 * Math.PI * 42;
  return (
    <div className={`vring t-${tone}`}>
      <div className="vring-g">
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <circle className="ring-track" cx="50" cy="50" r="42" />
          <circle className="ring-val" cx="50" cy="50" r="42" strokeDasharray={`${((value ?? 0) / 100) * C} ${C}`} transform="rotate(-90 50 50)" />
        </svg>
        <div className="vring-in"><b>{value ?? '—'}</b><span>/100</span></div>
      </div>
      <div className="vring-t">
        <span className="vring-n">{name}</span>
        <span className="vring-s">{state}</span>
        {delta != null && Math.abs(delta) >= 3 && <span className={`vring-d ${delta > 0 ? 'up' : 'down'}`}>{delta > 0 ? '▲' : '▼'} {Math.abs(delta)}</span>}
        <p>{desc}</p>
      </div>
    </div>
  );
}

export default function VisionPanel() {
  const x = useBayText(); const { L, num, loc } = x;
  const { setVision, crew } = useBay();
  // the monitoring session being recorded (saved to the local database when it ends)
  const session = useRef<{ mode: Mode; started: number; crew: string; last: Metrics | null; peakF: number; peakS: number } | null>(null);
  const crewRef = useRef(crew);
  useEffect(() => { crewRef.current = crew; }, [crew]);
  const video = useRef<HTMLVideoElement>(null), overlay = useRef<HTMLCanvasElement>(null), strip = useRef<HTMLCanvasElement>(null), trend = useRef<HTMLCanvasElement>(null);
  const camBox = useRef<HTMLDivElement>(null);
  const engine = useRef<VisionEngine | null>(null);
  const [snap, setSnap] = useState<Snapshot>(EMPTY);
  const [msg, setMsg] = useState<{ e: VisionEvent | 'idle'; d?: string }>({ e: 'idle' });
  const [alert, setAlert] = useState<{ k: AlertKind; v: number; at: number } | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [cams, setCams] = useState<{ id: string; label: string }[]>([]);
  const [camId, setCamId] = useState('');
  const [sound, setSound] = useState(false);
  const soundRef = useRef(false);
  const hist = useRef<{ t: number; f: number; s: number }[]>([]);
  const [delta, setDelta] = useState<{ f: number | null; s: number | null }>({ f: null, s: null });
  // latest localized text for the engine's once-per-second summary callback
  const xRef = useRef(x);
  useEffect(() => { xRef.current = x; }, [x]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- per-device preference read after mount
  useEffect(() => { try { setSound(localStorage.getItem(SOUND_KEY) === '1'); } catch { /* private mode */ } }, []);
  useEffect(() => { soundRef.current = sound; try { localStorage.setItem(SOUND_KEY, sound ? '1' : '0'); } catch { /* private mode */ } }, [sound]);

  const srcName = useCallback((mode: Mode, t: BayText) => (mode === 'demo' ? t.L('simulación', 'simulation') : mode === 'camera' ? t.L('cámara en vivo', 'live camera') : t.L('video analizado', 'analyzed video')), []);

  useEffect(() => {
    if (!video.current || !overlay.current || !strip.current) return;
    const finish = (eng: VisionEngine) => {
      const r = eng.report(); setReport(r);
      const s = session.current; session.current = null;
      if (s?.last) {
        const m = s.last; const now = Date.now();
        void getStore().put('sessions', { id: newId('S'), crew_id: s.crew, mode: s.mode, started_at: s.started, ended_at: now, fatigue: m.fatigue, stress: m.stress,
          attention: m.attention, peak_fatigue: Math.max(s.peakF, r?.peakFatigue ?? 0), peak_stress: Math.max(s.peakS, r?.peakStress ?? 0), updated_at: now, deleted: 0 });
      }
    };
    const eng: VisionEngine = new VisionEngine({ video: video.current, overlay: overlay.current, strip: strip.current, trend: trend.current }, {
      snapshot: setSnap,
      event: (e, d) => {
        if (e === 'recalibrate' && d === 'done') { setMsg({ e: 'recalibrate', d }); return; }
        setMsg({ e, d });
        if (e === 'camera' || e === 'file' || e === 'demo') {
          session.current = { mode: e, started: Date.now(), crew: crewRef.current, last: null, peakF: 0, peakS: 0 };
          hist.current = []; setReport(null); setAlert(null); setDelta({ f: null, s: null });
          if (e === 'camera') void VisionEngine.cameras().then((list) => { setCams(list); });
        } else if (e === 'stopped' || e === 'demoDone' || e === 'fileDone' || e === 'camLost') finish(eng);
      },
      alert: (k, v) => {
        setAlert({ k, v, at: Date.now() });
        if (soundRef.current) beep(k === 'microsleep' || v >= 75);
      },
    });
    eng.onSummary = (m, mode) => {
      const s = session.current;
      if (s) { s.last = m; s.peakF = Math.max(s.peakF, m.fatigue); s.peakS = Math.max(s.peakS, m.stress); }
      // change over the last 30 seconds
      const now = Date.now(); const h = hist.current; h.push({ t: now, f: m.fatigue, s: m.stress });
      while (h.length && now - h[0].t > 30000) h.shift();
      setDelta(h.length > 5 ? { f: m.fatigue - h[0].f, s: m.stress - h[0].s } : { f: null, s: null });
      setVision({ fatigue: m.fatigue, stress: m.stress, attention: m.attention, text: explain(xRef.current, m), src: srcName(mode, xRef.current) });
    };
    engine.current = eng;
    void VisionEngine.cameras().then(setCams);
    return () => { eng.destroy(); engine.current = null; };
  }, [setVision, srcName]);
  useEffect(() => {
    const e = engine.current; if (!e) return;
    e.labels = { now: L('ahora', 'now'), state: (s) => (STATES[s] ? L(...STATES[s]) : s), fatigue: L('fatiga', 'fatigue'), stress: L('estrés', 'stress') };
  }, [L]);
  // alerts stay 10 s on screen
  useEffect(() => {
    if (!alert) return;
    const id = setTimeout(() => setAlert((a) => (a && a.at === alert.at ? null : a)), 10000);
    return () => clearTimeout(id);
  }, [alert]);

  const start = (m: Mode) => {
    if (m === 'camera') void engine.current?.startCamera(camId || undefined);
    if (m === 'demo') engine.current?.startDemo();
  };
  const fullscreen = () => {
    const el = camBox.current; if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen(); else void el.requestFullscreen?.().catch(() => {});
  };

  const MSG: Record<VisionEvent | 'idle', string> = {
    idle: L('Elige una fuente. Los primeros 8 segundos calibran tu rostro en reposo: mira a la cámara con normalidad, con la cara centrada y bien iluminada.', 'Pick a source. The first 8 seconds calibrate your resting face: look at the camera normally, face centered and well lit.'),
    loading: L('Preparando el análisis facial (unos 13 MB la primera vez)…', 'Preparing face analysis (about 13 MB the first time)…'),
    camera: L(`Cámara activa${msg.d ? ` (${msg.d})` : ''}. Calibrando: mira a la cámara con normalidad.`, `Camera on${msg.d ? ` (${msg.d})` : ''}. Calibrating: look at the camera normally.`),
    file: L(`Analizando el video: ${msg.d ?? ''}. Los primeros 8 segundos con rostro sirven de calibración.`, `Analyzing video: ${msg.d ?? ''}. The first 8 seconds with a face are used for calibration.`),
    demo: L('Simulación a velocidad x2: turno alerta (0–20 s), cansancio con un microsueño (20–50 s) y estrés con distracción (50–80 s).', 'Simulation at 2x speed: alert shift (0–20 s), tiredness with a microsleep (20–50 s) and stress with distraction (50–80 s).'),
    demoDone: L('Simulación terminada. Abajo tienes el resumen de la sesión.', 'Simulation finished. The session summary is below.'),
    stopped: L('Análisis detenido. Abajo tienes el resumen de la sesión; ya está guardada en el historial.', 'Analysis stopped. The session summary is below; it is already saved in the history.'),
    fileDone: L('Video analizado completo. Abajo tienes el resumen.', 'Video fully analyzed. The summary is below.'),
    camLost: L('Se perdió la cámara (desconectada o en uso por otra aplicación). La sesión se guardó hasta ese momento.', 'The camera was lost (unplugged or taken by another app). The session was saved up to that point.'),
    recalibrate: msg.d === 'done' ? L('Calibración lista: desde ahora todo se mide frente a tu rostro en reposo.', 'Calibration done: everything is now measured against your resting face.')
      : L('Recalibrando: mira a la cámara con normalidad 8 segundos.', 'Recalibrating: look at the camera normally for 8 seconds.'),
    noCamApi: L('Este navegador no permite usar la cámara aquí (hace falta HTTPS o localhost). Usa «Video» o «Simulación».', 'This browser does not allow the camera here (HTTPS or localhost is needed). Use “Video” or “Simulation”.'),
    camBlocked: L('No se pudo abrir la cámara: revisa el permiso del navegador o si otra aplicación la está usando.', 'The camera could not be opened: check the browser permission or whether another app is using it.'),
    modelFail: L('No se pudo preparar el análisis facial. Revisa la conexión y vuelve a intentarlo.', 'Face analysis could not be prepared. Check your connection and try again.'),
  };
  const ALERTS: Record<AlertKind, (v: number) => [string, string]> = {
    microsleep: (v) => [L(`Microsueño detectado (${num(v / 1000, 1)} s con los ojos cerrados)`, `Microsleep detected (${num(v / 1000, 1)} s with eyes closed)`), L('Detén la tarea crítica y haz una pausa activa ahora.', 'Stop the critical task and take an active break now.')],
    fatigue: (v) => [L(`Fatiga alta sostenida (${v}/100)`, `Sustained high fatigue (${v}/100)`), L('Pausa de 10–15 minutos; evita tareas críticas hasta recuperarte.', 'Take a 10–15 minute break; avoid critical tasks until recovered.')],
    stress: (v) => [L(`Estrés alto sostenido (${v}/100)`, `Sustained high stress (${v}/100)`), L('2 minutos de respiración lenta (4 s inhalar, 6 s exhalar).', '2 minutes of slow breathing (4 s in, 6 s out).')],
    attention: (v) => [L(`Atención reducida (${v} % del último minuto mirando fuera)`, `Reduced attention (${v}% of the last minute looking away)`), L('Vuelve la vista a la tarea; si se repite, rota la actividad.', 'Bring your eyes back to the task; if it repeats, rotate the activity.')],
  };

  const m = snap.metrics; const running = snap.mode != null; const calibrating = snap.phase === 'calibrating';
  const stateLabel = snap.phase === 'idle' ? L('EN ESPERA', 'STANDBY') : snap.phase === 'stopped' ? L('DETENIDO', 'STOPPED') : snap.phase === 'noface' ? L('SIN ROSTRO', 'NO FACE')
    : calibrating ? `${L('CALIBRANDO', 'CALIBRATING')} ${snap.calibLeft} s` : snap.phase === 'lowq' ? L('SEÑAL BAJA', 'LOW SIGNAL') : L('MIDIENDO', 'MEASURING');
  const gaugeState = (v: number | undefined) => (v != null ? level(x, v) : calibrating ? L('CALIBRANDO', 'CALIBRATING') : L('EN ESPERA', 'STANDBY'));
  const q = snap.quality; const qTone: Tone = !running || snap.mode === 'demo' ? 'none' : q.score >= 70 ? 'ok' : q.score >= 45 ? 'watch' : 'crit';
  const b = snap.behavior;
  const enough = snap.elapsed >= 30;

  // signal table: value, reference range and status
  type Row = [label: string, value: string, ref: string, tone: Tone];
  const rows: Row[] = m ? [
    [L('PERCLOS (último minuto)', 'PERCLOS (last minute)'), `${num(m.per * 100, 1)} %`, L('< 7,5 % normal · ≥ 15 % somnolencia', '< 7.5% normal · ≥ 15% drowsy'), m.per >= 0.15 ? 'crit' : m.per >= 0.075 ? 'warn' : 'ok'],
    [L('Parpadeos por minuto', 'Blinks per minute'), num(m.rate, 0), '8–21', enough && (m.rate > 21 || m.rate < 6) ? 'warn' : 'ok'],
    [L('Duración media del parpadeo', 'Mean blink duration'), m.md ? `${num(m.md, 0)} ms` : '—', '100–400 ms', m.md > 400 ? 'warn' : 'ok'],
    [L('Microsueños (5 min)', 'Microsleeps (5 min)'), String(m.microsleeps), '0', m.microsleeps ? 'crit' : 'ok'],
    [L('Cierres largos > 0,5 s (5 min)', 'Long closures > 0.5 s (5 min)'), String(m.longClose), '0–1', m.longClose >= 2 ? 'warn' : 'ok'],
    [L('Bostezos (5 min)', 'Yawns (5 min)'), String(m.yawns), '0–1', m.yawns >= 2 ? 'warn' : m.yawns ? 'watch' : 'ok'],
    [L('Cabeceos (5 min)', 'Head nods (5 min)'), String(m.nods), '0', m.nods ? 'warn' : 'ok'],
    [L('Mirada fuera (último minuto)', 'Looking away (last minute)'), `${num(m.away * 100, 0)} %`, '< 10 %', m.away >= 0.2 ? 'warn' : m.away >= 0.1 ? 'watch' : 'ok'],
    [L('Tensión facial vs. reposo', 'Facial tension vs. rest'), `${m.ten >= 0 ? '+' : ''}${num(m.ten, 2)}`, '< +0,08', m.ten > 0.12 ? 'warn' : m.ten > 0.08 ? 'watch' : 'ok'],
    [L('Movimiento de cabeza', 'Head movement'), m.mov > 0.012 ? L('alto', 'high') : m.mov > 0.006 ? L('medio', 'medium') : L('bajo', 'low'), L('bajo', 'low'), m.mov > 0.012 ? 'warn' : 'ok'],
  ] : [];
  const statusTxt = (t: Tone) => (t === 'ok' ? L('normal', 'normal') : t === 'watch' ? L('vigilar', 'watch') : t === 'warn' ? L('alto', 'high') : L('crítico', 'critical'));
  const when = (ms: number) => new Date(ms).toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const exportCsv = (r: Report) => {
    const head = 'time,fatigue,stress,attention,signal_quality';
    const lines = r.trend.map((p) => `${new Date(p.t).toISOString()},${p.fatigue},${p.stress},${p.attention ?? ''},${p.quality}`);
    const ev = r.events.map((e) => `${new Date(e.t).toISOString()},${e.kind},${e.dur}`);
    download(`astra-vision-${crew}-${new Date(r.started).toISOString().slice(0, 16).replace(/[:T]/g, '')}.csv`,
      `${head}\n${lines.join('\n')}\n\nevent_time,event,duration_ms\n${ev.join('\n')}\n`, 'text/csv;charset=utf-8');
  };
  const exportJson = (r: Report) => download(`astra-vision-${crew}-${r.started}.json`, JSON.stringify({ crew, ...r }, null, 2), 'application/json');

  return (
    <Card id="vision" className="vision-card" title={L('ASTRA Vision · Fatiga, estrés y atención', 'ASTRA Vision · Fatigue, stress & attention')}
      aside={(
        <>
          <Badge tone={snap.mode === 'demo' ? 'sim' : 'derived'}>{snap.mode === 'demo' ? L('SIMULACIÓN', 'SIMULATION') : L('EN EL DISPOSITIVO', 'ON DEVICE')}</Badge>
          <Badge tone={b.ok ? 'derived' : 'none'} title={L('Clasificador de conducta del servidor local', 'Behavior classifier on the local server')}>{b.ok ? L('+ CONDUCTA', '+ BEHAVIOR') : L('SOLO ROSTRO', 'FACE ONLY')}</Badge>
        </>
      )}
      lead={L('Mide las señales que la ciencia del sueño usa para detectar cansancio (PERCLOS, parpadeos, microsueños, bostezos y cabeceos), la tensión facial y la inquietud para el estrés, y hacia dónde mira la cabeza para la atención. Todo se compara con tu propio rostro en reposo y las imágenes no salen del equipo.',
        'Reads the signals sleep science uses to detect tiredness (PERCLOS, blinks, microsleeps, yawns and nods), facial tension and restlessness for stress, and where the head points for attention. Everything is compared with your own resting face and images never leave the device.')}>

      {alert && (
        <div className={`valert t-${alert.k === 'microsleep' || alert.v >= 75 ? 'crit' : 'warn'}`} role="alert">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l9 16H3zM12 10v4M12 17v.5" /></svg>
          <div><b>{ALERTS[alert.k](alert.v)[0]}</b><span>{ALERTS[alert.k](alert.v)[1]}</span></div>
          <button type="button" className="icon-d sm" aria-label={L('Cerrar alerta', 'Dismiss alert')} onClick={() => setAlert(null)}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
      )}

      <div className="visgrid">
        <div className="vis-left">
          <div className="vis-tool">
            <div className="seg compact" role="group" aria-label={L('Fuente', 'Source')}>
              <button type="button" aria-pressed={snap.mode === 'camera'} onClick={() => start('camera')}>{L('Cámara', 'Camera')}</button>
              <label className={`seg-file${snap.mode === 'file' ? ' on' : ''}`}>{L('Video', 'Video')}
                <input type="file" accept="video/*" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void engine.current?.startFile(f); }} />
              </label>
              <button type="button" aria-pressed={snap.mode === 'demo'} onClick={() => start('demo')}>{L('Simulación', 'Simulation')}</button>
            </div>
            {cams.length > 1 && (
              <label className="cam-pick"><span className="sr-only">{L('Cámara', 'Camera')}</span>
                <select value={camId} onChange={(e) => { setCamId(e.target.value); if (snap.mode === 'camera') void engine.current?.startCamera(e.target.value || undefined); }}>
                  <option value="">{L('Cámara predeterminada', 'Default camera')}</option>
                  {cams.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </label>
            )}
          </div>

          <div ref={camBox} className={`cam${snap.mode === 'camera' ? ' mirror' : ''}${calibrating ? ' calib' : ''}`}>
            <video ref={video} playsInline muted hidden={snap.mode === 'demo'} />
            <canvas ref={overlay} className="ov" />
            {!running && snap.phase !== 'stopped' && (
              <div className="cam-idle">
                <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 7h3l2-3h8l2 3h3v13H3zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" /></svg>
                <b>{L('Monitor en espera', 'Monitor on standby')}</b>
                <span>{L('Elige Cámara, Video o Simulación arriba.', 'Pick Camera, Video or Simulation above.')}</span>
              </div>
            )}
            {running && (calibrating || snap.phase === 'noface') && snap.mode !== 'demo' && <div className="cam-guide" aria-hidden="true" />}
            {running && calibrating && (
              <div className="cam-calib">
                <b>{L('Calibrando tu rostro en reposo', 'Calibrating your resting face')}</b>
                <span>{L('Mira a la cámara con normalidad, sin hablar', 'Look at the camera normally, without talking')}</span>
                <span className="cal-bar"><i style={{ width: `${Math.round(snap.calibProgress * 100)}%` }} /></span>
              </div>
            )}
            <div className="cam-hud top">
              <span>{!running ? 'ASTRA VISION' : snap.mode === 'demo' ? L('SIMULACIÓN', 'SIMULATION') : snap.mode === 'file' ? 'VIDEO' : L('CÁMARA', 'CAMERA')}{running && snap.fps ? ` · ${snap.fps} FPS` : ''}</span>
              <span className={`hud-st t-${snap.phase === 'live' && m ? toneOf(lvlOfScore(m.fatigue)) : snap.phase === 'lowq' || snap.phase === 'noface' ? 'warn' : 'none'}`}>{stateLabel}</span>
            </div>
            {running && (
              <div className="cam-hud bottom">
                <span>{L('OJOS', 'EYES')} {Math.round(snap.eye * 100)} % · {L('BOCA', 'MOUTH')} {Math.round(snap.mouth * 100)} %{snap.pose ? ` · ${L('GIRO', 'YAW')} ${Math.round(snap.pose.yaw)}° · ${L('INCL.', 'PITCH')} ${Math.round(snap.pose.pitch)}°` : ''}</span>
                <span>{mmss(snap.elapsed)}</span>
              </div>
            )}
            <button type="button" className="cam-fs" onClick={fullscreen} aria-label={L('Pantalla completa', 'Full screen')}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>
            </button>
          </div>

          <div className="visbtns">
            <button type="button" className="btn-d primary" disabled={snap.mode === 'camera'} onClick={() => start('camera')}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 7h3l2-3h8l2 3h3v13H3zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" /></svg>
              {L('Iniciar cámara', 'Start camera')}
            </button>
            <button type="button" className="btn-d danger" disabled={!running} onClick={() => engine.current?.stop()}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
              {L('Detener', 'Stop')}
            </button>
            <button type="button" className="btn-d" disabled={!running || snap.mode === 'demo'} onClick={() => engine.current?.recalibrate()}>{L('Recalibrar', 'Recalibrate')}</button>
            <button type="button" className="btn-d" aria-pressed={sound} onClick={() => { setSound((s) => !s); if (!sound) beep(false); }}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={sound ? 'M4 9h4l5-4v14l-5-4H4zM16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11' : 'M4 9h4l5-4v14l-5-4H4zM17 9l5 6M22 9l-5 6'} /></svg>
              {L('Alerta sonora', 'Sound alert')}
            </button>
          </div>

          <div className={`vquality t-${qTone}`}>
            <div className="vq-h"><span>{L('Calidad de señal', 'Signal quality')}</span><b>{running ? (snap.mode === 'demo' ? '—' : `${q.score} %`) : '—'}</b></div>
            <Meter value={running && snap.mode !== 'demo' ? q.score : 0} tone={qTone} />
            <p>{!running ? L('Se evalúa rostro visible, distancia, luz y orientación. Con señal baja las puntuaciones se congelan para no dar falsas alarmas.', 'Checks visible face, distance, light and orientation. With low signal the scores freeze to avoid false alarms.')
              : snap.mode === 'demo' ? L('Simulación: sin cámara real.', 'Simulation: no real camera.')
                : q.issues.length ? q.issues.map((i) => L(...ISSUES[i])).join(' · ') : L('Buena: rostro centrado, distancia y luz correctas.', 'Good: face centered, distance and light correct.')}</p>
          </div>
          {b.ok && b.cur && (
            <p className="behavior">{L('Detector de conducta', 'Behavior detector')}: <b>{STATES[b.cur.state] ? L(...STATES[b.cur.state]) : b.cur.state}</b>{b.cur.top ? ` · ${Math.round(b.cur.top.confidence * 100)} %` : ''}{b.ms != null ? ` · ${b.ms} ms` : ''}</p>
          )}
          <p className="note" role="status">{MSG[msg.e]}</p>
        </div>

        <div className="vis-right">
          <div className="vrings">
            <ScoreRing name={L('Fatiga', 'Fatigue')} value={m?.fatigue} state={gaugeState(m?.fatigue)} delta={delta.f}
              desc={L('PERCLOS, parpadeo, microsueños, bostezos y cabeceos.', 'PERCLOS, blinks, microsleeps, yawns and nods.')} />
            <ScoreRing name={L('Estrés', 'Stress')} value={m?.stress} state={gaugeState(m?.stress)} delta={delta.s}
              desc={L('Tensión facial, ritmo de parpadeo e inquietud.', 'Facial tension, blink rate and restlessness.')} />
          </div>
          <div className={`vattn t-${m?.attention != null ? (m.attention >= 30 ? 'warn' : m.attention >= 15 ? 'watch' : 'ok') : 'none'}`}>
            <span>{L('Atención', 'Attention')}</span>
            <Meter value={m?.attention != null ? 100 - m.attention : 0} tone={m?.attention != null ? (m.attention >= 30 ? 'warn' : m.attention >= 15 ? 'watch' : 'ok') : 'none'} />
            <b>{m?.attention != null ? `${100 - m.attention} %` : '—'}</b>
          </div>

          <div className="vchart">
            <div className="vchart-h"><b>{L('Tendencia de la sesión', 'Session trend')}</b>
              <span className="strip-key"><span><i className="k-eye" /> {L('fatiga', 'fatigue')}</span><span><i className="k-stress" /> {L('estrés', 'stress')}</span><span><i className="k-ev" /> {L('microsueño / cabeceo', 'microsleep / nod')}</span></span>
            </div>
            <canvas ref={trend} className="vtrend" aria-label={L('Fatiga y estrés a lo largo de la sesión', 'Fatigue and stress over the session')} />
          </div>
          <div className="vchart">
            <div className="vchart-h"><b>{L('Ojos y boca, último minuto', 'Eyes and mouth, last minute')}</b>
              <span className="strip-key"><span><i className="k-eye" /> {L('cierre de ojos', 'eye closure')}</span><span><i className="k-mouth" /> {L('apertura de boca', 'mouth opening')}</span><span>┄ {L('umbral', 'threshold')}</span></span>
            </div>
            <canvas ref={strip} className="vstrip" aria-label={L('Cierre de ojos y apertura de boca en los últimos 60 segundos', 'Eye closure and mouth opening over the last 60 seconds')} />
          </div>
          <div className="vexplain">{m ? explain(x, m) : L('Esperando señal. Cuando haya datos, ASTRA explicará aquí qué detecta y qué conviene hacer.', 'Waiting for a signal. Once there is data, ASTRA will explain here what it detects and what to do.')}</div>
        </div>
      </div>

      <div className="vis-lower">
        <div>
          <h3 className="vsub">{L('Señales medidas', 'Measured signals')}</h3>
          {rows.length ? (
            <div className="tablewrap">
              <table className="kv compact vsig">
                <thead><tr><th>{L('Señal', 'Signal')}</th><th className="r">{L('Valor', 'Value')}</th><th className="hide-s">{L('Referencia', 'Reference')}</th><th>{L('Estado', 'Status')}</th></tr></thead>
                <tbody>
                  {rows.map(([lab, v, ref, tone]) => (
                    <tr key={lab}><td>{lab}</td><td className="num">{v}</td><td className="hide-s ref">{ref}</td><td><span className={`vstat t-${tone}`}>{statusTxt(tone)}</span></td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="empty-state">{L('Las señales aparecen tras la calibración.', 'Signals appear after calibration.')}</p>}
        </div>
        <div>
          <h3 className="vsub">{L('Eventos de la sesión', 'Session events')}
            <span className="vtotals">{(Object.keys(EVENTS) as EventKind[]).map((k) => snap.totals[k] ? <Badge key={k} tone={EVENT_TONE[k]}>{L(...EVENTS[k])} · {snap.totals[k]}</Badge> : null)}</span>
          </h3>
          {snap.events.length ? (
            <ol className="vevents">
              {snap.events.map((e, i) => (
                <li key={`${e.t}-${i}`} className={`t-${EVENT_TONE[e.kind]}`}>
                  <time className="mono">{when(e.t)}</time><b>{L(...EVENTS[e.kind])}</b><span className="mono">{num(e.dur / 1000, 1)} s</span>
                </li>
              ))}
            </ol>
          ) : <p className="empty-state">{L('Sin eventos todavía: microsueños, bostezos, cabeceos y miradas fuera aparecerán aquí con su hora.', 'No events yet: microsleeps, yawns, nods and looking away will show here with their time.')}</p>}
        </div>
      </div>

      {report && (
        <div className="vreport">
          <div className="vreport-h">
            <h3>{L('Resumen de la sesión', 'Session summary')} <small>{new Date(report.started).toLocaleString(loc, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })} · {mmss(report.seconds)} · {srcName(report.mode, x)}</small></h3>
            <div className="row-btns">
              <button type="button" className="btn-d sm" onClick={() => exportCsv(report)}>{L('Exportar CSV', 'Export CSV')}</button>
              <button type="button" className="btn-d sm" onClick={() => exportJson(report)}>JSON</button>
              <button type="button" className="btn-d sm" onClick={() => setReport(null)}>{L('Cerrar', 'Close')}</button>
            </div>
          </div>
          <div className="tiles four">
            <div className={`tile t-${toneOf(lvlOfScore(report.avgFatigue))}`}><b>{report.avgFatigue ?? '—'} <small>/ {report.peakFatigue}</small></b><span>{L('Fatiga media / pico', 'Fatigue mean / peak')}</span></div>
            <div className={`tile t-${toneOf(lvlOfScore(report.avgStress))}`}><b>{report.avgStress ?? '—'} <small>/ {report.peakStress}</small></b><span>{L('Estrés medio / pico', 'Stress mean / peak')}</span></div>
            <div className={`tile${report.maxPer >= 0.15 ? ' t-crit' : report.maxPer >= 0.075 ? ' t-warn' : ''}`}><b>{num(report.maxPer * 100, 1)} %</b><span>{L('PERCLOS máximo', 'Max PERCLOS')}</span></div>
            <div className={`tile${report.totals.microsleep ? ' t-crit' : ''}`}><b>{report.totals.microsleep} · {report.totals.yawn} · {report.totals.nod}</b><span>{L('Microsueños · bostezos · cabeceos', 'Microsleeps · yawns · nods')}</span></div>
          </div>
          <p className="note">{report.peakFatigue >= 60 || report.totals.microsleep
            ? L('Recomendación: no asignar tareas críticas a esta persona hasta un descanso; repetir la medida después.', 'Recommendation: do not assign critical tasks to this person until after rest; repeat the measurement afterwards.')
            : report.peakStress >= 60 ? L('Recomendación: pausa breve con respiración lenta y revisar la carga de trabajo.', 'Recommendation: short break with slow breathing and review the workload.')
              : L('Sin hallazgos que limiten la actividad en esta sesión.', 'No findings that limit activity in this session.')}</p>
        </div>
      )}

      <p className="note">{L('Referencias: PERCLOS ≥ 15 % se asocia a somnolencia; parpadeo normal de 8 a 21 por minuto y de 100 a 400 ms; un cierre de ojos de más de 1 s cuenta como microsueño. Indicador experimental, no diagnóstico médico.', 'References: PERCLOS ≥ 15% is linked to drowsiness; normal blinking is 8 to 21 per minute and 100 to 400 ms; an eye closure longer than 1 s counts as a microsleep. Experimental indicator, not a medical diagnosis.')}</p>
    </Card>
  );
}
