'use client';
// Bay header (title per view + crew picker), mission timeline in plain language, one-line brief and a collapsible legend.
import { useBay } from '@/components/bay/BayContext';
import { openCrewForm } from '@/components/bay/CrewForm';
import { Badge, Dot, toneOf } from '@/components/app/ui';
import { baselineMode, CREW, crewProfile, crewSource, findings, FIRST_POST, globalScore, isBaseCrew, lvlOfScore, tpDate, TPS } from '@/lib/bay/model';
import { useBayText } from '@/lib/bay/text';
import type { BayView } from '@/components/bay/Bay';

const Icon = ({ d, size = 14 }: { d: string; size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
);

export function BayHeader({ view }: { view: BayView }) {
  const { L } = useBayText();
  const TITLES: Record<BayView, [string, string, string, string]> = {
    resumen: ['Bahía médica', 'Medical bay', 'Estado de cada persona frente a su propio promedio antes del vuelo.', "Each person's state versus their own pre-flight average."],
    alertas: ['Alertas y Copilot', 'Alerts & Copilot', 'Qué cambió, por qué importa y qué hacer. Pregunta en lenguaje normal.', 'What changed, why it matters and what to do. Ask in plain language.'],
    tripulacion: ['Tripulación', 'Crew', 'Toda la tripulación de un vistazo y el clima espacial de la misión.', 'The whole crew at a glance and the space weather of the mission.'],
    fatiga: ['Fatiga y estrés', 'Fatigue & stress', 'Monitoreo con la cámara durante el turno; cada sesión queda registrada.', 'Camera monitoring during the shift; every session is recorded.'],
    simulador: ['Simulador', 'Simulator', 'Explora escenarios de misión. Son proyecciones, no datos reales.', 'Explore mission scenarios. These are projections, not real data.'],
  };
  const [tEs, tEn, sEs, sEn] = TITLES[view];
  return (
    <header className="page-head">
      <div>
        <h1>{L(tEs, tEn)}</h1>
        <p>{L(sEs, sEn)}</p>
      </div>
      {view !== 'simulador' && <CrewPicker />}
    </header>
  );
}

/** crew selector shared by every module: real crew + people added by the user (edit / remove / new) */
export function CrewPicker() {
  const { crew, tp, setCrew, removeCrew } = useBay();
  const { L, crewLabel, sexName } = useBayText();
  const profile = crewProfile(crew);
  return (
    <div className="seg crew-seg" role="group" aria-label={L('Tripulante', 'Crew member')}>
      {CREW.map((c) => (
        <span key={c} className="crew-chip">
          <button type="button" aria-pressed={c === crew} onClick={() => setCrew(c)} title={`${crewLabel(c)} · ${sexName(c)}${c === crew && profile?.role ? ` · ${profile.role}` : ''}`}>
            <Dot tone={toneOf(lvlOfScore(globalScore(c, tp)))} />{crewLabel(c)}<small>{sexName(c)}</small>
          </button>
          {!isBaseCrew(c) && (
            <>
              <button type="button" className="chip-x chip-edit" aria-label={L(`Editar a ${crewLabel(c)}`, `Edit ${crewLabel(c)}`)} onClick={() => openCrewForm(c)}>
                <Icon d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4" />
              </button>
              <button type="button" className="chip-x" aria-label={L(`Quitar a ${crewLabel(c)}`, `Remove ${crewLabel(c)}`)}
                onClick={() => { if (window.confirm(L(`¿Quitar a ${crewLabel(c)}? Se borrará también en el sistema online.`, `Remove ${crewLabel(c)}? It will also be deleted in the online system.`))) void removeCrew(c); }}>
                <Icon d="M7 7l10 10M17 7L7 17" />
              </button>
            </>
          )}
        </span>
      ))}
      <button type="button" className="seg-add" onClick={() => openCrewForm()}><Icon d="M12 5v14M5 12h14" size={16} />{L('Nuevo tripulante', 'New crew member')}</button>
    </div>
  );
}

export function Timeline() {
  const { crew, tp, setTp } = useBay();
  const { L, fmtD, tpName, tpCode } = useBayText();
  return (
    <nav className="timeline" aria-label={L('Momento de la misión: 3 análisis antes del vuelo y 4 después', 'Mission moment: 3 tests before flight and 4 after')}>
      {TPS.map((t, i) => {
        const g = globalScore(crew, i);
        return (
          <div key={t} className="tl-slot">
            {i === FIRST_POST && (
              <div className="tl-flight"><b>{L('EN ÓRBITA', 'IN ORBIT')}</b><span>{L('16–18 sep 2021', 'Sep 16–18, 2021')}</span></div>
            )}
            <button type="button" className={`tl t-${toneOf(lvlOfScore(g))}${g == null ? ' empty' : ''}`} aria-pressed={i === tp} onClick={() => setTp(i)} title={tpCode(i)}>
              <small>{i < FIRST_POST ? L('ANTES', 'BEFORE') : L('DESPUÉS', 'AFTER')}</small>
              <b>{tpName(i).replace(/ (antes|después) del vuelo| (before|after) flight/, '')}</b>
              <span>{isBaseCrew(crew) ? fmtD(tpDate(t)) : g == null ? L('sin datos', 'no data') : L('con datos', 'with data')}</span><i />
            </button>
          </div>
        );
      })}
    </nav>
  );
}

export function Brief() {
  const { crew, tp } = useBay();
  const { L, lvlName, mkLabel, crewLabel, tpName } = useBayText();
  const g = globalScore(crew, tp); const lvl = lvlOfScore(g);
  const top = [...new Set(findings(crew, tp).map((f) => mkLabel(f.m)))].slice(0, 3);
  const custom = !isBaseCrew(crew); const mode = baselineMode(crew);
  return (
    <div className={`brief t-${toneOf(lvl)}`} aria-live="polite">
      <div className="brief-score">{g ?? '–'}</div>
      <div>
        {g == null ? (
          <p><b>{crewLabel(crew)}</b>, {tpName(tp)}: {L('no hay análisis para este momento. Elige otro en la línea de tiempo.', 'no tests for this moment. Pick another one on the timeline.')}</p>
        ) : (
          <p><b>{crewLabel(crew)}</b>, {tpName(tp)}: {L('riesgo', 'risk')} <b className="tone-text">{lvlName(lvl).toLowerCase()}</b>.{' '}
            {top.length ? <>{L('Lo que más pesa', 'What weighs most')}: <b>{top.join(', ')}</b>.</> : L('Ningún marcador fuera de lo normal para esta persona.', 'No marker outside normal for this person.')}</p>
        )}
        <small>
          {custom && (
            <>
              <Badge tone={mode === 'personal' ? 'ok' : 'watch'}>{mode === 'personal' ? L('LÍNEA BASE PERSONAL', 'PERSONAL BASELINE') : L('LÍNEA BASE PROVISIONAL', 'PROVISIONAL BASELINE')}</Badge>{' '}
              {crewSource(crew) === 'example' && <><Badge tone="sim">{L('EJEMPLO SIMULADO', 'SIMULATED EXAMPLE')}</Badge>{' '}</>}
            </>
          )}
          {custom
            ? (mode === 'personal'
              ? L('Puntuación 0–100 frente a su propio promedio antes del vuelo.', 'Score 0–100 vs. their own pre-flight average.')
              : L('Puntuación 0–100 frente a la referencia de la tripulación de Inspiration4, hasta tener 2 análisis suyos antes del vuelo.', 'Score 0–100 vs. the Inspiration4 crew reference, until they have 2 tests of their own before flight.'))
            : L('Puntuación 0–100 frente a su propio promedio antes del vuelo · datos reales NASA OSDR', 'Score 0–100 vs. their own pre-flight average · real NASA OSDR data')}
        </small>
      </div>
    </div>
  );
}

/** colour and label key, folded away until needed */
export function Legend() {
  const { L } = useBayText();
  return (
    <details className="legend-d">
      <summary>{L('Cómo leer los colores y etiquetas', 'How to read the colours and labels')}</summary>
      <div className="legend">
        <span><Dot tone="ok" />{L('Estable · 0–19', 'Stable · 0–19')}</span>
        <span><Dot tone="watch" />{L('Vigilar · 20–39', 'Watch · 20–39')}</span>
        <span><Dot tone="warn" />{L('Alerta · 40–59', 'Alert · 40–59')}</span>
        <span><Dot tone="crit" />{L('Crítico · 60–100 o fuera de rango clínico', 'Critical · 60–100 or outside the clinical range')}</span>
        <span><Badge tone="real">REAL</Badge>{L('medido por la NASA', 'measured by NASA')}</span>
        <span><Badge tone="derived">{L('DERIVADO', 'DERIVED')}</Badge>{L('calculado por ASTRA', 'calculated by ASTRA')}</span>
        <span><Badge tone="sim">{L('SIMULADO', 'SIMULATED')}</Badge>{L('escenario hipotético', 'hypothetical scenario')}</span>
      </div>
    </details>
  );
}
