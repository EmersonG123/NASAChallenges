'use client';
// Crew member status: global ASTRA risk ring, per-system list, and the lab markers of the selected system.
import { Badge, Card, Dot, Meter, toneOf } from '@/components/app/ui';
import { useBay } from '@/components/bay/BayContext';
import {
  D, FIRST_POST, globalScore, lvlOfScore, ORDER, pointOf, sysScore, TPS, valLevel, type Level, type Marker,
} from '@/lib/bay/model';
import { useBayText } from '@/lib/bay/text';
import { useEffect, useState } from 'react';
import { getStore, STORE_EVENT } from '@/lib/store';
import HRV from '@/data/hrv_reference.json';

/** heart rate / HRV row: the person's own wearable data when imported, otherwise a REAL public human reference
 *  (PhysioNet healthy adults, same sex). NASA publishes no heart rate or HRV for this crew. */
function HeartRow({ crew }: { crew: string }) {
  const { L } = useBayText();
  const [own, setOwn] = useState<{ rhr?: number; hrv?: number; day: string } | null>(null);
  useEffect(() => {
    let live = true;
    const load = async () => {
      const rows = (await getStore().list('daily')).filter((r) => r.crew_id === crew && r.source === 'wearable' && !r.deleted).sort((a, b) => b.day.localeCompare(a.day));
      for (const r of rows) {
        try { const m = JSON.parse(r.metrics_json) as { rhr?: number; hrv?: number }; if (m.rhr != null || m.hrv != null) { if (live) setOwn({ rhr: m.rhr, hrv: m.hrv, day: r.day }); return; } } catch { /* skip */ }
      }
      if (live) setOwn(null);
    };
    void load();
    const on = () => void load();
    window.addEventListener(STORE_EVENT, on);
    return () => { live = false; window.removeEventListener(STORE_EVENT, on); };
  }, [crew]);
  if (own) {
    return (
      <a className="sys" href="/system/wellbeing#tendencias" title={L(`Wearable de esta persona · ${own.day}`, `This person's wearable · ${own.day}`)}>
        <span className="nm"><Dot tone="real" />{L('Ritmo cardiaco / HRV', 'Heart rate / HRV')}</span>
        <span className="note">{own.rhr != null ? `${Math.round(own.rhr)} ${L('lpm', 'bpm')} · ` : ''}{own.hrv != null ? `RMSSD ${Math.round(own.hrv)} ms · ` : ''}{L('wearable', 'wearable')} {own.day.slice(5)}</span>
        <span className="sc" />
      </a>
    );
  }
  const ref = D.sex[crew] === 'F' ? HRV.F : HRV.M;
  return (
    <a className="sys hr-ref" href={HRV.doi} target="_blank" rel="noopener noreferrer"
      title={L(`Referencia REAL de ${ref.n} adultos sanos (${ref.ages[0]}–${ref.ages[1]} años, mismo sexo), Holter de 24 h · ${HRV.source} · no son datos de esta tripulación`,
        `REAL reference from ${ref.n} healthy adults (${ref.ages[0]}–${ref.ages[1]} y, same sex), 24 h Holter · ${HRV.source} · not this crew's data`)}>
      <span className="nm"><Dot tone="real" dashed />{L('Ritmo cardiaco / HRV', 'Heart rate / HRV')}</span>
      <span className="note">{Math.round(ref.hr)} {L('lpm', 'bpm')} · RMSSD {Math.round(ref.rmssd)} ms · {L('ref. real PhysioNet, no es la tripulación', 'real PhysioNet ref., not the crew')}</span>
      <span className="sc" />
    </a>
  );
}

const LEVEL_TONE = ['ok', 'watch', 'warn', 'crit'] as const;
const levelTone = (l: Level | null) => (l == null ? 'none' : LEVEL_TONE[l]);

function Ring({ value }: { value: number | null }) {
  const { L, lvlName } = useBayText();
  const r = 62, c = 2 * Math.PI * r, lvl = lvlOfScore(value);
  return (
    <div className={`ring t-${toneOf(lvl)}`}>
      <svg viewBox="0 0 150 150" aria-hidden="true">
        <circle className="ring-track" cx="75" cy="75" r={r} />
        <circle className="ring-val" cx="75" cy="75" r={r} strokeDasharray={`${(c * (value ?? 0)) / 100} ${c}`} transform="rotate(-90 75 75)" />
      </svg>
      <div className="ring-in">
        <span>{L('RIESGO ASTRA', 'ASTRA RISK')}</span>
        <b>{value ?? '–'}</b>
        <span>{lvlName(lvl)} · EXPERIMENTAL</span>
      </div>
    </div>
  );
}

/** marker trend over the 7 checkpoints, with the personal baseline dotted and the flight shaded */
function Spark({ m, crew, tp }: { m: Marker; crew: string; tp: number }) {
  const s = m.data[crew]; const W = 170, H = 40, P = 5;
  const xs = TPS.map((_, i) => P + ((i < FIRST_POST ? i : i + 0.8) * (W - 2 * P)) / 6.8);
  const nums = s.vals.filter(Boolean).map((p) => p!.v).concat([s.base]);
  let lo = Math.min(...nums), hi = Math.max(...nums); if (hi === lo) { hi += 1; lo -= 1; }
  const y = (v: number) => H - P - ((v - lo) / (hi - lo)) * (H - 2 * P);
  const pts = s.vals.map((p, i) => (p ? { i, x: xs[i], y: y(p.v), l: valLevel(p, m) } : null)).filter((p): p is NonNullable<typeof p> => !!p);
  const fx = (xs[FIRST_POST - 1] + xs[FIRST_POST]) / 2;
  return (
    <svg className="spark" viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden="true">
      <rect className="spark-flight" x={fx - 6} y="0" width="12" height={H} />
      <line className="spark-base" x1={P} x2={W - P} y1={y(s.base)} y2={y(s.base)} />
      <polyline className="spark-line" points={pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')} />
      {pts.map((p) => <circle key={p.i} className={`spark-dot t-${levelTone(p.l)}${p.i === tp ? ' cur' : ''}`} cx={p.x} cy={p.y} r={p.i === tp ? 3.6 : 2.2} />)}
    </svg>
  );
}

export default function Status() {
  const { crew, tp, sys, setSys } = useBay();
  const { L, fmtV, fmtP, sysName, mkLabel, crewLabel, tpName } = useBayText();
  const s = D.systems[sys];
  return (
    <Card title={`${crewLabel(crew)} · ${tpName(tp)}`} aside={<Badge tone="derived">{L('RIESGO DERIVADO', 'DERIVED RISK')}</Badge>}
      lead={L('La puntuación global resume todos los sistemas. Toca un sistema para ver sus análisis abajo.', 'The global score sums up every system. Tap a system to see its lab results below.')}>
      <div className="console">
        <Ring value={globalScore(crew, tp)} />
        <div className="syslist">
          {ORDER.map((k) => {
            const v = sysScore(k, crew, tp); const tone = toneOf(lvlOfScore(v));
            return (
              <button key={k} type="button" className="sys" aria-pressed={k === sys} onClick={() => setSys(k)}>
                <span className="nm"><Dot tone={tone} />{sysName(k)}</span><Meter value={v} tone={tone} /><span className="sc">{v ?? '–'}</span>
              </button>
            );
          })}
          {/* rows without public data (brain & eyes, sleep & stress) are not shown; heart rate uses real data */}
          <HeartRow crew={crew} />
        </div>
      </div>

      <header className="sub-h">
        <h3>{sysName(sys)}</h3>
        <Badge tone="real">{[...new Set(s.markers.map((m) => m.src))].join(' + ')}</Badge>
      </header>
      <p className="dcard-lead">{L('Valor medido, rango normal del laboratorio y cambio frente a su propio promedio antes del vuelo (línea punteada).', "Measured value, the lab's normal range, and the change from the person's own pre-flight average (dotted line).")}</p>
      <div className="tablewrap">
        <table className="kv">
          <thead>
            <tr>
              <th>{L('Marcador', 'Marker')}</th><th className="r">{L('Valor', 'Value')}</th>
              <th className="r hide-s">{L('Rango clínico', 'Clinical range')}</th><th className="r">{L('vs. su base', 'vs. baseline')}</th>
              <th className="hide-s">{L('Evolución: antes → después', 'Trend: before → after')}</th>
            </tr>
          </thead>
          <tbody>
            {s.markers.map((m) => {
              const p = pointOf(m, crew, tp); const l = valLevel(p, m);
              return (
                <tr key={m.code} className={m.excluded ? 'excl' : ''}>
                  <td><b>{mkLabel(m)}</b>{m.excluded && <> <Badge tone="none">{L('ATÍPICO · FUERA DEL SCORE', 'OUTLIER · NOT SCORED')}</Badge></>}<small>{m.unit}</small></td>
                  <td className="num">{p ? fmtV(p.v) : '—'}{l === 3 && <span className="out" title={L('Fuera de rango', 'Out of range')}> ●</span>}</td>
                  <td className="num hide-s">{p?.lo != null && p.hi != null ? `${fmtV(p.lo)}–${fmtV(p.hi)}` : '—'}</td>
                  <td className="num">{p ? <Badge tone={levelTone(l)}>{fmtP(p.dev)}</Badge> : '—'}</td>
                  <td className="hide-s">{m.data[crew] ? <Spark m={m} crew={crew} tp={tp} /> : null}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
