'use client';
// Landing twin: hotspots coloured by the crew's real R+1 state over the X-ray figure.
import { useState } from 'react';
import XrayFigure from '@/components/twin/XrayFigure';

const SPOTS = [
  { k: 'brain', x: 256, y: 48, c: 'var(--derived)', v: '', side: 'r' },
  { k: 'immune', x: 256, y: 150, c: 'var(--warn)', v: '−14%', side: 'l' },
  { k: 'heart', x: 264, y: 196, c: 'var(--watch)', v: '+13%', side: 'r' },
  { k: 'liver', x: 234, y: 242, c: 'var(--watch)', v: '', side: 'l' },
  { k: 'metab', x: 272, y: 262, c: 'var(--warn)', v: '+24%', side: 'r' },
  { k: 'kidney', x: 222, y: 296, c: 'var(--watch)', v: '+11%', side: 'l' },
  { k: 'blood', x: 140, y: 330, c: 'var(--warn)', v: '−20%', side: 'l' },
  { k: 'inflam', x: 296, y: 530, c: 'var(--crit)', v: '+48%', side: 'r' },
] as const;

export interface TwinCopy { title: string; hint: string; show: string; hide: string; spots: Record<string, string> }

export default function Twin({ t, labels = true, uid = 'tw' }: { t: TwinCopy; labels?: boolean; uid?: string }) {
  const [all, setAll] = useState(false);
  return (
    <div className="twin-fig">
      <XrayFigure uid={uid} all={all} padX={100} label={t.title}>
        <defs>
          {SPOTS.map((s) => (
            <radialGradient key={s.k} id={`${uid}-tg-${s.k}`}>
              <stop offset="0" stopColor={s.c} stopOpacity=".6" />
              <stop offset="1" stopColor={s.c} stopOpacity="0" />
            </radialGradient>
          ))}
        </defs>
        {SPOTS.map((s) => (
          <g key={s.k}>
            <circle cx={s.x} cy={s.y} r="30" fill={`url(#${uid}-tg-${s.k})`} />
            {s.c !== 'var(--derived)' && <circle className="pulse" cx={s.x} cy={s.y} r="9" fill={s.c} />}
            <circle cx={s.x} cy={s.y} r="9" fill={s.c} stroke="#fff" strokeWidth="2" />
            {labels && (
              <text x={s.side === 'l' ? s.x - 18 : s.x + 18} y={s.y + 5} textAnchor={s.side === 'l' ? 'end' : 'start'} className="twin-label">
                {t.spots[s.k]}{s.v ? ` ${s.v}` : ''}
              </text>
            )}
          </g>
        ))}
      </XrayFigure>
      <div className="twin-ctl">
        <span>{t.hint}</span>
        <button type="button" className="btn sm" aria-pressed={all} onClick={() => setAll((v) => !v)}>
          {all ? t.hide : t.show}
        </button>
      </div>
    </div>
  );
}
