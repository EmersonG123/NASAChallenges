'use client';
// Body scanner: the X-ray twin with one hotspot per body system, coloured by this person's score.
import { useState, type KeyboardEvent } from 'react';
import XrayFigure from '@/components/twin/XrayFigure';
import { Card, toneOf } from '@/components/app/ui';
import { useBay } from '@/components/bay/BayContext';
import { D, lvlOfScore, NODES, sysScore } from '@/lib/bay/model';
import { useBayText } from '@/lib/bay/text';

export default function Scanner() {
  const { crew, tp, sys, setSys, vision } = useBay();
  const { L, crewLabel, tpName } = useBayText();
  const [all, setAll] = useState(false);

  const open = (k: string) => {
    // same-page hash change: views listen to hashchange, which the Next router does not emit
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    if (k === 'cerebro') { window.location.assign('#fatiga'); return; }
    setSys(k);
  };
  const key = (k: string) => (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(k); } };

  return (
    <Card id="scanner" title={L('Escáner corporal', 'Body scanner')} aside={<span className="meta">{crewLabel(crew)} · {tpName(tp)}</span>}
      lead={L('Cada punto es un sistema del cuerpo. El color dice cuánto se aleja de lo normal para esta persona.', 'Each point is a body system. Its color shows how far it is from normal for this person.')}>
      <div className="scanner">
        <XrayFigure uid="bay" all={all} padX={40} label={L('Gemelo digital del cuerpo', 'Digital twin of the body')}>
          {Object.entries(NODES).map(([k, [x, y, es, en]]) => {
            const hasData = !!D.systems[k];
            const isVision = k === 'cerebro' && !!vision;
            const s = isVision ? Math.max(vision.fatigue, vision.stress) : hasData ? sysScore(k, crew, tp) : null;
            const live = hasData || isVision;
            const left = x < 256 || k === 'defensas';
            const lx = k === 'cerebro' ? x + 44 : left ? x - 18 : x + 18;
            const value = isVision ? ` · ${s}` : !hasData ? L(' · S/D', ' · N/A') : s != null ? ` ${s}` : '';
            return (
              <g key={k} className={`node t-${live ? toneOf(lvlOfScore(s)) : 'none'}${sys === k ? ' sel' : ''}${live ? '' : ' nodata'}`}
                tabIndex={live || k === 'cerebro' ? 0 : -1} role="button" aria-label={L(es, en)}
                onClick={() => (live || k === 'cerebro') && open(k)} onKeyDown={key(k)}>
                <defs>
                  <radialGradient id={`glow-${k}`}><stop offset="0" stopOpacity=".55" /><stop offset="1" stopOpacity="0" /></radialGradient>
                </defs>
                {live && <circle cx={x} cy={y} r="30" fill={`url(#glow-${k})`} />}
                {live && s != null && s >= 40 && <circle className="npulse" cx={x} cy={y} r="10" />}
                <circle className="core" cx={x} cy={y} r="10" />
                <text className="nodelabel" x={lx} y={y + 5} textAnchor={k === 'cerebro' || !left ? 'start' : 'end'}>{L(es, en)}{value}</text>
              </g>
            );
          })}
        </XrayFigure>
      </div>
      <div className="scan-ctl">
        <span>{L('Pasa el cursor sobre el cuerpo para ver los órganos.', 'Move your cursor over the body to see the organs.')}</span>
        <button type="button" className="btn-d sm" aria-pressed={all} onClick={() => setAll((v) => !v)}>
          {all ? L('Volver a la foto', 'Back to the photo') : L('Rayos X: ver todos los órganos', 'X-ray: show all organs')}
        </button>
      </div>
      <p className="note">{L('Toca un sistema para ver sus marcadores. Gris: sin datos públicos de la tripulación.', 'Tap a system to see its markers. Grey: no public crew data.')}</p>
    </Card>
  );
}
