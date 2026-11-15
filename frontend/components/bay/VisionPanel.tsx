'use client';
// ASTRA Vision panel: camera / video / demo, fatigue and stress gauges, facial metrics and a plain-language explanation.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Badge, Card, Meter, toneOf } from '@/components/app/ui';
import { useBay } from '@/components/bay/BayContext';
import { lvlOfScore } from '@/lib/bay/model';
import { newId } from '@/lib/platform';
import { getStore } from '@/lib/store';
import { useBayText, type BayText } from '@/lib/bay/text';
import { VisionEngine, type Metrics, type Mode, type Snapshot, type VisionEvent } from '@/lib/vision/engine';

const STATES: Record<string, [string, string]> = {
  SafeDriving: ['Atento', 'Attentive'], SleepyDriving: ['Somnolencia', 'Drowsy'], Yawn: ['Bostezo', 'Yawning'], Distracted: ['Distraído', 'Distracted'],
  Drinking: ['Bebiendo', 'Drinking'], DangerousDriving: ['Conducta peligrosa', 'Dangerous behavior'], Uncertain: ['Sin certeza', 'Uncertain'],
};

function level(x: BayText, s: number) { return s < 20 ? 'NORMAL' : s < 40 ? x.L('LEVE', 'MILD') : s < 60 ? x.L('MODERADO', 'MODERATE') : x.L('ALTO', 'HIGH'); }

/** the explanation shown under the gauges, also passed to the Copilot */
function explain(x: BayText, m: Metrics) {
  const { L, num } = x; const fx: string[] = [], sx: string[] = [];
  if (m.per >= 0.075) fx.push(L(`ojos cerrados el ${num(m.per * 100, 1)} % del último minuto (umbral de somnolencia: 15 %)`, `eyes closed ${num(m.per * 100, 1)}% of the last minute (drowsiness threshold: 15%)`));
  if (m.md > 400) fx.push(L(`parpadeos lentos (${num(m.md, 0)} ms de media; lo normal es 100–400 ms)`, `slow blinks (${num(m.md, 0)} ms on average; normal is 100–400 ms)`));
  if (m.yawns) fx.push(L(`${m.yawns} bostezo${m.yawns > 1 ? 's' : ''}`, `${m.yawns} yawn${m.yawns > 1 ? 's' : ''}`));
  if (m.nods) fx.push(L(`${m.nods} cabeceo${m.nods > 1 ? 's' : ''}`, `${m.nods} head nod${m.nods > 1 ? 's' : ''}`));
  if (m.ys && m.ys.n >= 5 && m.ys.sleepy >= 0.1) fx.push(L(`el detector de conducta ve somnolencia en el ${num(m.ys.sleepy * 100, 0)} % de los fotogramas`, `the behavior detector sees drowsiness in ${num(m.ys.sleepy * 100, 0)}% of frames`));
  if (m.ys && m.ys.n >= 5 && m.ys.yawn >= 0.1) fx.push(L(`bostezos en el ${num(m.ys.yawn * 100, 0)} % de los fotogramas`, `yawning in ${num(m.ys.yawn * 100, 0)}% of frames`));
  if (m.longClose) fx.push(L(`${m.longClose} cierre${m.longClose > 1 ? 's' : ''} de ojos de más de medio segundo`, `${m.longClose} eye closure${m.longClose > 1 ? 's' : ''} longer than half a second`));
  if (m.ten > 0.08) sx.push(L(`tensión de cejas y labios ${num(m.ten, 2)} por encima de tu reposo`, `brow and lip tension ${num(m.ten, 2)} above your resting face`));
  if (m.rate > 21) sx.push(L(`parpadeo acelerado (${num(m.rate, 0)} por minuto)`, `fast blinking (${num(m.rate, 0)} per minute)`));
  if (m.mov > 0.012) sx.push(L('cabeza inquieta', 'restless head'));
  const cap = (s: string) => s[0] + s.slice(1).toLowerCase();
  let t = m.fatigue >= 40
    ? L(`Fatiga ${level(x, m.fatigue).toLowerCase()}: ${fx.join(', ')}. Conviene una pausa de 10–15 minutos y evitar tareas críticas hasta recuperarse. `, `${cap(level(x, m.fatigue))} fatigue: ${fx.join(', ')}. Take a 10–15 minute break and avoid critical tasks until recovered. `)
    : m.fatigue >= 20 ? L(`Fatiga leve: ${fx.join(', ') || 'señales iniciales'}. Vigilar en los próximos minutos. `, `Mild fatigue: ${fx.join(', ') || 'early signs'}. Keep watching over the next minutes. `)
      : L('Sin señales de fatiga. ', 'No signs of fatigue. ');
  t += m.stress >= 40
    ? L(`Estrés ${level(x, m.stress).toLowerCase()}: ${sx.join(', ')}. Prueba 2 minutos de respiración lenta y una pausa breve.`, `${cap(level(x, m.stress))} stress: ${sx.join(', ')}. Try 2 minutes of slow breathing and a short break.`)
    : m.stress >= 20 ? L(`Estrés leve: ${sx.join(', ') || 'señales iniciales'}.`, `Mild stress: ${sx.join(', ') || 'early signs'}.`) : L('Sin señales de estrés.', 'No signs of stress.');
  if (m.attention != null && m.attention >= 30) t += L(` Atención reducida: distracción o conducta de riesgo en el ${m.attention} % de los fotogramas.`, ` Reduced attention: distraction or risky behavior in ${m.attention}% of frames.`);
  return t;
}

export default function VisionPanel() {
  const x = useBayText(); const { L, num } = x;
  const { setVision, crew } = useBay();
  // the monitoring session being recorded (saved to the local database when it ends)
  const session = useRef<{ mode: Mode; started: number; crew: string; last: Metrics | null; peakF: number; peakS: number } | null>(null);
  const crewRef = useRef(crew);
  useEffect(() => { crewRef.current = crew; }, [crew]);
  const video = useRef<HTMLVideoElement>(null), overlay = useRef<HTMLCanvasElement>(null), strip = useRef<HTMLCanvasElement>(null);
  const engine = useRef<VisionEngine | null>(null);
  const [snap, setSnap] = useState<Snapshot>({ mode: null, phase: 'idle', calibLeft: 0, metrics: null, behavior: { ok: false, cur: null, ms: null } });
  const [msg, setMsg] = useState<{ e: VisionEvent | 'idle'; d?: string }>({ e: 'idle' });
  // latest localized text for the engine's once-per-second summary callback
  const xRef = useRef(x);
  useEffect(() => { xRef.current = x; }, [x]);

  const srcName = useCallback((mode: Mode, t: BayText) => (mode === 'demo' ? t.L('simulación', 'simulation') : mode === 'camera' ? t.L('cámara en vivo', 'live camera') : t.L('video analizado', 'analyzed video')), []);

  useEffect(() => {
    if (!video.current || !overlay.current || !strip.current) return;
    const eng = new VisionEngine({ video: video.current, overlay: overlay.current, strip: strip.current }, {
      snapshot: setSnap,
      event: (e, d) => {
        setMsg({ e, d });
        if (e === 'camera' || e === 'file' || e === 'demo') {
          session.current = { mode: e, started: Date.now(), crew: crewRef.current, last: null, peakF: 0, peakS: 0 };
        } else if ((e === 'stopped' || e === 'demoDone' || e === 'fileDone') && session.current?.last) {
          const s = session.current; session.current = null; const m = s.last!; const now = Date.now();
          void getStore().put('sessions', { id: newId('S'), crew_id: s.crew, mode: s.mode, started_at: s.started, ended_at: now, fatigue: m.fatigue, stress: m.stress,
            attention: m.attention, peak_fatigue: s.peakF, peak_stress: s.peakS, updated_at: now, deleted: 0 });
        }
      },
    });
    eng.onSummary = (m, mode) => {
      const s = session.current;
      if (s) { s.last = m; s.peakF = Math.max(s.peakF, m.fatigue); s.peakS = Math.max(s.peakS, m.stress); }
      setVision({ fatigue: m.fatigue, stress: m.stress, attention: m.attention, text: explain(xRef.current, m), src: srcName(mode, xRef.current) });
    };
    engine.current = eng;
    return () => { eng.destroy(); engine.current = null; };
  }, [setVision, srcName]);
  useEffect(() => {
    const e = engine.current; if (!e) return;
    e.labels = { now: L('ahora', 'now'), state: (s) => (STATES[s] ? L(...STATES[s]) : s) };
  }, [L]);

  const MSG: Record<VisionEvent | 'idle', string> = {
    idle: L('Los primeros 8 segundos calibran el rostro en reposo: mira a la cámara con normalidad.', 'The first 8 seconds calibrate your resting face: look at the camera normally.'),
    loading: L('Cargando el modelo de visión facial (unos 13 MB la primera vez)…', 'Loading the face vision model (about 13 MB the first time)…'),
    camera: L('Cámara activa. Calibrando 8 segundos: mira a la cámara con normalidad.', 'Camera on. Calibrating for 8 seconds: look at the camera normally.'),
    file: L(`Analizando el video: ${msg.d ?? ''}. Los primeros 8 segundos sirven de calibración.`, `Analyzing video: ${msg.d ?? ''}. The first 8 seconds are used for calibration.`),
    demo: L('Simulación a velocidad x2: turno alerta (0–20 s), cansancio (20–45 s) y estrés (45–70 s).', 'Simulation at 2x speed: alert shift (0–20 s), tiredness (20–45 s) and stress (45–70 s).'),
    demoDone: L('Simulación terminada. Así se ve un turno que empieza alerta y termina con fatiga y estrés.', 'Simulation finished. This is what a shift looks like that starts alert and ends with fatigue and stress.'),
    stopped: L('Análisis detenido. Los últimos valores quedan en pantalla.', 'Analysis stopped. The last values stay on screen.'),
    fileDone: L('Video analizado completo. Los resultados finales quedan en pantalla.', 'Video fully analyzed. The final results stay on screen.'),
    noCamApi: L('Este navegador no permite usar la cámara aquí. Usa «Analizar video» o «Ver simulación».', 'This browser does not allow the camera here. Use “Analyze video” or “Watch simulation”.'),
    camBlocked: L('No se pudo abrir la cámara: revisa el permiso del navegador. También puedes usar «Analizar video» o «Ver simulación».', 'The camera could not be opened: check the browser permission. You can also use “Analyze video” or “Watch simulation”.'),
    modelFail: L('No se pudo cargar el modelo de visión. Revisa la conexión y vuelve a intentarlo.', 'The vision model could not load. Check your connection and try again.'),
  };

  const m = snap.metrics; const running = snap.mode != null;
  const hudR = snap.phase === 'idle' ? L('EN ESPERA', 'STANDBY') : snap.phase === 'stopped' ? L('DETENIDO', 'STOPPED') : snap.phase === 'noface' ? L('SIN ROSTRO', 'NO FACE')
    : snap.phase === 'calibrating' ? `${L('CALIBRANDO', 'CALIBRATING')} ${snap.calibLeft} s` : m ? `${L('FATIGA', 'FATIGUE')} ${m.fatigue} · ${L('ESTRÉS', 'STRESS')} ${m.stress}` : '';
  const gaugeState = (v: number | undefined) => (v != null ? level(x, v) : snap.phase === 'calibrating' ? L('CALIBRANDO', 'CALIBRATING') : L('EN ESPERA', 'STANDBY'));
  const warnIf = (c: boolean) => (c ? ' t-warn' : '');
  const b = snap.behavior;

  return (
    <Card id="vision" className="vision-card" title={L('ASTRA Vision · Fatiga y estrés', 'ASTRA Vision · Fatigue & stress')}
      aside={<Badge tone={snap.mode === 'demo' ? 'sim' : 'derived'}>{snap.mode === 'demo' ? L('SIMULACIÓN', 'SIMULATION') : L('EN EL DISPOSITIVO', 'ON DEVICE')}</Badge>}
      lead={L('La cámara mide las señales que la ciencia del sueño usa para detectar cansancio: ojos cerrados (PERCLOS), parpadeos, bostezos y cabeceos. La tensión facial y la inquietud de la cabeza estiman el estrés. Las imágenes no salen de tu equipo.',
        'The camera reads the signals sleep science uses to detect tiredness: closed eyes (PERCLOS), blinks, yawns and head nods. Facial tension and head restlessness estimate stress. Images never leave your device.')}>
      <div className="visgrid">
        <div>
          <div className={`cam${snap.mode === 'camera' ? ' mirror' : ''}`}>
            <video ref={video} playsInline muted hidden={snap.mode === 'demo'} />
            <canvas ref={overlay} className="ov" />
            {!running && snap.phase !== 'stopped' && (
              <div className="cam-idle"><b>{L('Cámara apagada', 'Camera off')}</b><span>{L('Activa la cámara, sube un video de un rostro o mira la simulación.', 'Turn on the camera, upload a video of a face or watch the simulation.')}</span></div>
            )}
            <div className="cam-hud"><span>{snap.mode === 'demo' ? L('SIMULACIÓN', 'SIMULATION') : 'ASTRA VISION'}</span><span>{hudR}</span></div>
          </div>
          <div className="visbtns">
            <button type="button" className="btn-d primary" onClick={() => engine.current?.startCamera()}>{L('Activar cámara', 'Turn on camera')}</button>
            <label className="btn-d">{L('Analizar video', 'Analyze video')}
              <input type="file" accept="video/*" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void engine.current?.startFile(f); }} />
            </label>
            <button type="button" className="btn-d" onClick={() => engine.current?.startDemo()}>{L('Ver simulación', 'Watch simulation')}</button>
            <button type="button" className="btn-d" disabled={!running} onClick={() => engine.current?.stop()}>{L('Detener', 'Stop')}</button>
          </div>
          <p className="behavior">
            <Badge tone={b.ok ? 'derived' : 'none'}>{b.ok ? L('DETECTOR DE CONDUCTA ACTIVO', 'BEHAVIOR DETECTOR ON') : L('SOLO ANÁLISIS FACIAL', 'FACIAL ANALYSIS ONLY')}</Badge>
            {b.ok && b.cur && <span>{L('Estado', 'State')}: <b>{STATES[b.cur.state] ? L(...STATES[b.cur.state]) : b.cur.state}</b>{b.cur.top ? ` · ${Math.round(b.cur.top.confidence * 100)} %` : ''}{b.ms != null ? ` · ${b.ms} ms` : ''}</span>}
          </p>
          <p className="note">{MSG[msg.e]}</p>
        </div>
        <div>
          <div className="gauges">
            {([[L('Fatiga', 'Fatigue'), m?.fatigue, L('PERCLOS, duración del parpadeo, bostezos y cabeceos.', 'PERCLOS, blink duration, yawns and head nods.')],
              [L('Estrés', 'Stress'), m?.stress, L('Tensión facial, ritmo de parpadeo e inquietud de la cabeza.', 'Facial tension, blink rate and head restlessness.')]] as const).map(([name, v, d]) => {
              const tone = v != null ? toneOf(lvlOfScore(v)) : 'none';
              return (
                <div key={name} className={`gauge t-${tone}`}>
                  <div className="gauge-h"><span>{name}</span><span className="st">{gaugeState(v)}</span></div>
                  <b>{v ?? '—'}</b><Meter value={v ?? 0} tone={tone} big /><p>{d}</p>
                </div>
              );
            })}
          </div>
          <div className="vmetrics">
            <div className={`vm${m ? (m.per >= 0.15 ? ' t-crit' : warnIf(m.per >= 0.075)) : ''}`}><b>{m ? `${num(m.per * 100, 1)} %` : '—'}</b><span>{L('PERCLOS, último minuto', 'PERCLOS, last minute')}</span></div>
            <div className={`vm${m ? warnIf(m.rate > 21) : ''}`}><b>{m ? num(m.rate, 0) : '—'}</b><span>{L('Parpadeos por minuto', 'Blinks per minute')}</span></div>
            <div className={`vm${m ? warnIf(m.md > 400) : ''}`}><b>{m?.md ? `${num(m.md, 0)} ms` : '—'}</b><span>{L('Duración media del parpadeo', 'Average blink duration')}</span></div>
            <div className="vm"><b>{m ? m.yawns : '—'}</b><span>{L('Bostezos', 'Yawns')}</span></div>
            <div className="vm"><b>{m ? m.nods : '—'}</b><span>{L('Cabeceos', 'Head nods')}</span></div>
            <div className={`vm${m ? warnIf(m.ten > 0.12) : ''}`}><b>{m ? `${m.ten >= 0 ? '+' : ''}${num(m.ten, 2)}` : '—'}</b><span>{L('Tensión facial vs. reposo', 'Facial tension vs. rest')}</span></div>
            <div className={`vm${m?.attention != null ? warnIf(m.attention >= 30) : ''}`}><b>{m?.attention != null ? `${m.attention} %` : '—'}</b><span>{L('Distracción', 'Distraction')}</span></div>
          </div>
          <canvas ref={strip} className="vstrip" aria-label={L('Cierre de ojos y apertura de boca en los últimos 60 segundos', 'Eye closure and mouth opening over the last 60 seconds')} />
          <div className="note strip-key"><span><i className="k-eye" /> {L('cierre de ojos', 'eye closure')}</span><span><i className="k-mouth" /> {L('apertura de boca', 'mouth opening')}</span><span>── {L('umbral de ojo cerrado', 'closed-eye threshold')}</span></div>
          <div className="vexplain">{m ? explain(x, m) : L('Esperando señal. Cuando haya datos, ASTRA explicará aquí qué detecta y qué conviene hacer.', 'Waiting for a signal. Once there is data, ASTRA will explain here what it detects and what to do.')}</div>
        </div>
      </div>
      <p className="note">{L('Referencias: PERCLOS ≥ 15 % se asocia a somnolencia; parpadeo normal de 8 a 21 por minuto y de 100 a 400 ms. Indicador experimental, no diagnóstico médico.', 'References: PERCLOS ≥ 15% is linked to drowsiness; normal blinking is 8 to 21 per minute and 100 to 400 ms. Experimental indicator, not a medical diagnosis.')}</p>
    </Card>
  );
}
