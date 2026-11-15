'use client';
// Whole-crew heatmap (score per system) and the space weather of September 2021 (NASA DONKI).
import { Badge, Card, toneOf } from '@/components/app/ui';
import { useBay } from '@/components/bay/BayContext';
import { CREW, D, globalScore, inMission, LAUNCH, lvlOfScore, ORDER, SPLASH, sysScore } from '@/lib/bay/model';
import { useBayText } from '@/lib/bay/text';

export function CrewHeat() {
  const { crew, tp, sys, setCrew, setSys } = useBay();
  const { L, sysName, crewLabel, tpName } = useBayText();
  const pick = (c: string, k?: string) => { setCrew(c); if (k) setSys(k); };
  return (
    <Card id="tripulacion" title={L('Tripulación completa', 'Whole crew')} aside={<span className="meta">{tpName(tp)}</span>}>
      <div className="tablewrap">
        <table className="heat">
          <thead><tr><th className="l">{L('Sistema', 'System')}</th>{CREW.map((c) => <th key={c} title={crewLabel(c)}>{crewLabel(c).length > 10 ? crewLabel(c).slice(0, 9) + '…' : crewLabel(c)}</th>)}</tr></thead>
          <tbody>
            {ORDER.map((k) => (
              <tr key={k}>
                <th className="l">{sysName(k)}</th>
                {CREW.map((c) => {
                  const s = sysScore(k, c, tp);
                  return (
                    <td key={c} className={`t-${toneOf(lvlOfScore(s))}${c === crew && k === sys ? ' sel' : ''}`}>
                      <button type="button" onClick={() => pick(c, k)} aria-label={`${crewLabel(c)} · ${sysName(k)}: ${s ?? '–'}`}>{s ?? '–'}</button>
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="total">
              <th className="l">{L('Riesgo global', 'Global risk')}</th>
              {CREW.map((c) => {
                const g = globalScore(c, tp);
                return <td key={c} className={`t-${toneOf(lvlOfScore(g))}`}><button type="button" onClick={() => pick(c)}>{g ?? '–'}</button></td>;
              })}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="note">{L('Puntuación 0–100 por sistema: cuánto se aleja cada persona de su línea base, medido contra la variación habitual de cada marcador. Toca una celda para abrirla.', "Score 0–100 per system: how far each person is from their baseline, measured against each marker's usual variation. Tap a cell to open it.")}</p>
    </Card>
  );
}

const W = 560, H = 170, PL = 44, PR = 10, PT = 12, PB = 28;
const T0 = Date.UTC(2021, 8, 1), T1 = Date.UTC(2021, 9, 1);
const xOf = (t: number) => PL + ((t - T0) / (T1 - T0)) * (W - PL - PR);
const clsVal = (c: string) => ({ A: 1, B: 2, C: 3, M: 4, X: 5 }[c[0]] ?? 1) + (parseFloat(c.slice(1)) || 1) / 10;
const yOf = (v: number) => H - PB - ((v - 1) / (5.2 - 1)) * (H - PB - PT);
const flareTone = (c: string) => (c[0] === 'M' ? 'warn' : c[0] === 'C' ? 'watch' : 'info');

export function SpaceWeather() {
  const { L } = useBayText();
  const { flr, cme, sep, gst } = D.donki;
  const stats: [string | number, string, boolean][] = [
    [sep, L('Partículas solares (SEP)', 'Solar particle events (SEP)'), true],
    [gst, L('Tormentas geomagnéticas', 'Geomagnetic storms'), true],
    [`${flr.filter((e) => inMission(e.t)).length} / ${flr.length}`, L('Fulguraciones (misión / mes)', 'Flares (mission / month)'), false],
    [`${cme.filter((e) => inMission(e.t)).length} / ${cme.length}`, L('CME (misión / mes)', 'CMEs (mission / month)'), false],
  ];
  return (
    <Card id="clima" title={L('Clima espacial · Sep 2021', 'Space weather · Sep 2021')} aside={<Badge tone="real">NASA DONKI</Badge>}>
      <div className="tiles">
        {stats.map(([v, l, good]) => <div key={l} className={`tile${good ? ' t-ok' : ''}`}><b>{v}</b><span>{l}</span></div>)}
      </div>
      <div className="tablewrap">
        <svg className="swchart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={L('Fulguraciones solares y CME en septiembre de 2021', 'Solar flares and CMEs in September 2021')}>
          <rect className="sw-flight" x={xOf(LAUNCH)} y={PT} width={xOf(SPLASH) - xOf(LAUNCH)} height={H - PB - PT} />
          {['B', 'C', 'M', 'X'].map((k, i) => (
            <g key={k}>
              <line className="sw-grid" x1={PL} x2={W - PR} y1={yOf(i + 2)} y2={yOf(i + 2)} />
              <text className="sw-axis" x={PL - 8} y={yOf(i + 2) + 4} textAnchor="end">{k}</text>
            </g>
          ))}
          {[1, 8, 16, 23, 30].map((d) => <text key={d} className="sw-axis" x={xOf(Date.UTC(2021, 8, d))} y={H - 8} textAnchor="middle">{L(`${d} sep`, `Sep ${d}`)}</text>)}
          {cme.map((e) => { const x = xOf(Date.parse(e.t)); return <line key={e.t} className="sw-cme" x1={x} x2={x} y1={H - PB} y2={H - PB - 8} />; })}
          {flr.map((e) => {
            const x = xOf(Date.parse(e.t)), y = yOf(clsVal(e.cls));
            return (
              <g key={e.t} className={`sw-flare t-${flareTone(e.cls)}`}>
                <line x1={x} x2={x} y1={H - PB} y2={y} /><circle cx={x} cy={y} r="3.5" />
                {e.cls[0] !== 'B' && <text x={x + 5} y={y - 5}>{e.cls}</text>}
              </g>
            );
          })}
          <text className="sw-axis sw-flight-label" x={xOf(LAUNCH) + 3} y={PT + 12}>{L('VUELO', 'FLIGHT')}</text>
          <text className="sw-axis" x={PL + 4} y={H - PB - 12}>│ CME</text>
        </svg>
      </div>
      <p className="note">{L('La franja marca los 3 días de vuelo. Sin partículas solares ni tormentas geomagnéticas: la radiación solar no explica los cambios observados.', 'The band marks the 3 days of flight. No solar particle events and no geomagnetic storms: solar radiation does not explain the observed changes.')}</p>
    </Card>
  );
}
