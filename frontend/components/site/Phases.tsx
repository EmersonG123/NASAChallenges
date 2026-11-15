'use client';
import { useState, type ReactNode } from 'react';
import GlyphIcon from '@/components/site/GlyphIcon';

export interface Phase { id: string; name: string; when: string; text: ReactNode; mods: string[][] }

/** before / during / after flight tabs: each phase lists the modules it uses */
export default function Phases({ phases }: { phases: Phase[] }) {
  const [i, setI] = useState(0);
  const p = phases[i];
  return (
    <div>
      <div className="phases" role="tablist">
        {phases.map((ph, k) => (
          <button key={ph.id} type="button" className="phase-btn" role="tab" aria-selected={k === i} aria-controls="phase-panel" id={`tab-${ph.id}`} onClick={() => setI(k)}>
            <b>{ph.name}</b>
            <span>{ph.when}</span>
          </button>
        ))}
      </div>
      <div className="phase-body" role="tabpanel" id="phase-panel" aria-labelledby={`tab-${p.id}`}>
        <p>{p.text}</p>
        <ul className="mod-list">
          {p.mods.map(([ic, name, desc]) => (
            <li key={name}>
              <span aria-hidden="true"><GlyphIcon k={ic} /></span>
              <div><b>{name}</b><span>{desc}</span></div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
