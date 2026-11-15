'use client';
// Scenario simulator (SIMULATED): starts from the crew's real average R+1 response and projects it with illustrative rules.
import { useMemo, useState } from 'react';
import { Badge, Card, Meter, toneOf } from '@/components/app/ui';
import { lvlOfScore, simulate } from '@/lib/bay/model';
import { useBayText } from '@/lib/bay/text';

export default function Simulator() {
  const { L, num, sysName, lvlName } = useBayText();
  const [days, setDays] = useState(3);
  const [sleep, setSleep] = useState(7);
  const [sep, setSep] = useState(0);
  const r = useMemo(() => simulate(days, sleep, sep), [days, sleep, sep]);
  const storms = [L('Ninguna (como Inspiration4)', 'None (like Inspiration4)'), L('S1 menor', 'S1 minor'), L('S2 moderada', 'S2 moderate'), L('S3 fuerte', 'S3 strong'), L('S4 severa', 'S4 severe')];
  const gTone = toneOf(lvlOfScore(r.global));

  return (
    <Card id="simulador" className="sim-card" title={L('Simulador de escenarios', 'Scenario simulator')} aside={<Badge tone="sim">{L('SIMULADO · NO SON DATOS REALES', 'SIMULATED · NOT REAL DATA')}</Badge>}>
      <div className="simgrid">
        <div className="ctl">
          <label>{L('Duración de la misión', 'Mission length')} <output>{days}{L(' días', ' days')}</output>
            <input type="range" min={3} max={180} step={1} value={days} onChange={(e) => setDays(+e.target.value)} />
          </label>
          <label>{L('Sueño promedio', 'Average sleep')} <output>{num(sleep, 1)} h</output>
            <input type="range" min={4} max={8} step={0.5} value={sleep} onChange={(e) => setSleep(+e.target.value)} />
          </label>
          <label>{L('Tormenta solar durante el vuelo', 'Solar storm during flight')}
            <select value={sep} onChange={(e) => setSep(+e.target.value)}>{storms.map((s, i) => <option key={i} value={i}>{s}</option>)}</select>
          </label>
          <p className="note">{L('Parte de la respuesta media real de la tripulación 1 día después del vuelo y la proyecta con reglas ilustrativas. Sirve para explorar escenarios, no para predecir.', "It starts from the crew's real average response 1 day after flight and projects it with illustrative rules. It is for exploring scenarios, not for prediction.")}</p>
        </div>
        <div className="simout">
          <div className="simout-h">
            <span className="kicker">{L('Riesgo proyectado por sistema', 'Projected risk by system')}</span>
            <span className={`simglobal t-${gTone}`}>{L('RIESGO PROYECTADO', 'PROJECTED RISK')} <b>{r.global}</b></span>
          </div>
          {r.rows.map((row) => {
            const tone = toneOf(lvlOfScore(row.v));
            return (
              <div key={row.k} className="simrow">
                <span>{row.k === 'radiacion' ? L('Exposición a radiación', 'Radiation exposure') : sysName(row.k)}</span>
                <Meter value={row.v} tone={tone} /><span className="mono">{row.v} · {lvlName(lvlOfScore(row.v))}</span>
              </div>
            );
          })}
          <div className="tiles three">
            {[[`${r.hr}${L(' lpm', ' bpm')}`, L('Frecuencia cardiaca en reposo', 'Resting heart rate')], [`${num(r.dose, 1)} mGy`, L('Dosis acumulada estimada', 'Estimated cumulative dose')], [`${num(r.sleepTotal, 0)} h`, L('Sueño total en misión', 'Total sleep in mission')]]
              .map(([v, l]) => <div key={l} className="tile t-sim"><b>{v}</b><span>{l} · {L('simulado', 'simulated')}</span></div>)}
          </div>
        </div>
      </div>
    </Card>
  );
}
