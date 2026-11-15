'use client';
// Crew member status: global ASTRA risk ring, per-system list, and the lab markers of the selected system.
import { Badge, Card, Dot, Meter, toneOf } from '@/components/app/ui';
import { useBay } from '@/components/bay/BayContext';
import {
  D, FIRST_POST, globalScore, lvlOfScore, NOSYS, ORDER, pointOf, sysScore, TPS, valLevel, type Level, type Marker,
} from '@/lib/bay/model';
import { useBayText } from '@/lib/bay/text';

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
  const { crew, tp, sys, setSys, vision } = useBay();
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
          {NOSYS.map((n) => {
            if (n.k === 'sueno' && vision) {
              const v = Math.max(vision.fatigue, vision.stress); const tone = toneOf(lvlOfScore(v));
              return (
                <a key={n.k} className="sys" href="#fatiga" title={`ASTRA Vision (${vision.src})`}>
                  <span className="nm"><Dot tone={tone} />{L('Fatiga y estrés', 'Fatigue & stress')}</span><Meter value={v} tone={tone} /><span className="sc">{v}</span>
                </a>
              );
            }
            return (
              <div key={n.k} className="sys nodata">
                <span className="nm"><Dot tone="none" dashed />{L(n.es, n.en)}</span>
                <span className="note">{L('sin datos públicos · ver simulador', 'no public data · see simulator')}</span><span className="sc">–</span>
              </div>
            );
          })}
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
