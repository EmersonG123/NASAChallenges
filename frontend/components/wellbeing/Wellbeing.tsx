'use client';
// Wellbeing & sleep module: behavioural health and recovery, day by day, against each person's own baseline.
// Views (sidebar): today (check-in + alerts) · trends · wearable.
import { Badge, Card, toneOf } from '@/components/app/ui';
import { BayProvider, useBay } from '@/components/bay/BayContext';
import CrewForm from '@/components/bay/CrewForm';
import { CrewPicker } from '@/components/bay/Overview';
import CheckIn from '@/components/wellbeing/CheckIn';
import Trends from '@/components/wellbeing/Trends';
import { useDaily } from '@/components/wellbeing/useDaily';
import WearableImport from '@/components/wellbeing/WearableImport';
import { lvlOfScore } from '@/lib/bay/model';
import { usePrefs } from '@/lib/prefs';
import { useView } from '@/lib/useHash';
import { useRemind } from '@/lib/settings';
import { useEffect, useState } from 'react';
import { val, type WAlert } from '@/lib/wellbeing/model';

export const WELL_VIEWS = ['hoy', 'tendencias', 'wearable'] as const;

function Summary({ score, days, base }: ReturnType<typeof useDaily>) {
  const { L } = usePrefs();
  const last = days[days.length - 1];
  const lastVal = (k: 'sleep' | 'mood' | 'hrv') => { for (let i = days.length - 1; i >= 0; i--) { const v = val(days[i], k); if (v != null) return v; } return null; };
  const sleep = lastVal('sleep'), mood = lastVal('mood'), hrv = lastVal('hrv');
  const hrvPct = hrv != null && base.hrv ? Math.round(((hrv - base.hrv) / base.hrv) * 100) : null;
  return (
    <div className="well-summary">
      <div className={`brief t-${toneOf(lvlOfScore(score))}`}>
        <div className="brief-score">{score ?? '–'}</div>
        <div>
          <p>{score == null ? L('Sin registros todavía. Haz el primer registro diario o importa el wearable.', 'No entries yet. Do the first daily check-in or import the wearable.')
            : score < 20 ? L('Bienestar estable frente a su propia base.', 'Wellbeing stable versus their own baseline.')
              : score < 40 ? L('Señales para vigilar en los últimos días.', 'Signals to watch over the last days.')
                : L('Varias señales a la vez: conviene actuar hoy.', 'Several signals at once: act today.')}</p>
          <small>{L('Riesgo de bienestar 0–100 · últimos 3 días frente a sus primeros 7 días · experimental', 'Wellbeing risk 0–100 · last 3 days vs. their first 7 days · experimental')}
            {last?.sim && <> <Badge tone="sim">{L('DATOS SIMULADOS', 'SIMULATED DATA')}</Badge></>}</small>
        </div>
      </div>
      <div className="tiles four">
        <div className={`tile${sleep != null && sleep < 6 ? ' t-warn' : ''}`}><b>{sleep != null ? `${sleep.toFixed(1)} h` : '—'}</b><span>{L('Último sueño', 'Last sleep')}</span></div>
        <div className={`tile${mood != null && mood <= 2 ? ' t-warn' : ''}`}><b>{mood != null ? `${mood}/5` : '—'}</b><span>{L('Último ánimo', 'Last mood')}</span></div>
        <div className={`tile${hrvPct != null && hrvPct <= -20 ? ' t-warn' : ''}`}><b>{hrvPct != null ? `${hrvPct > 0 ? '+' : ''}${hrvPct} %` : '—'}</b><span>{L('Variabilidad vs. su base', 'Variability vs. baseline')}</span></div>
        <div className="tile"><b>{days.length}</b><span>{L('días registrados', 'days recorded')}</span></div>
      </div>
    </div>
  );
}

function Alerts({ alerts }: { alerts: WAlert[] }) {
  const { L } = usePrefs();
  return (
    <Card title={L('Alertas de bienestar', 'Wellbeing alerts')} aside={<span className="meta">{alerts.length} {L('señales', 'signals')}</span>}>
      <div className="alerts">
        {!alerts.length && (
          <article className="alert t-ok"><h3>{L('Sin alertas', 'No alerts')}</h3><p>{L('Sueño, ánimo y recuperación dentro de lo habitual para esta persona.', 'Sleep, mood and recovery within what is usual for this person.')}</p></article>
        )}
        {alerts.map((a) => (
          <article key={a.key} className={`alert t-${a.tone}`}>
            <h3>{L(...a.title)}</h3>
            <dl>
              <dt>{L('Qué pasa', 'What is happening')}</dt><dd>{L(...a.detail)}</dd>
              <dt>{L('Qué hacer', 'What to do')}</dt><dd>{L(...a.action)}</dd>
            </dl>
            <p className="note">{L(...a.hrp)} · {L('señal de riesgo, no diagnóstico.', 'risk signal, not a diagnosis.')}</p>
          </article>
        ))}
      </div>
    </Card>
  );
}

function WellbeingInner() {
  const { L } = usePrefs();
  const { crew } = useBay();
  const view = useView(WELL_VIEWS);
  const data = useDaily(crew);
  const remind = useRemind();
  const [today, setToday] = useState('');
  // eslint-disable-next-line react-hooks/set-state-in-effect -- local date is read after mount (prerendered page)
  useEffect(() => { setToday(new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10)); }, []);
  const missing = remind && !!today && !data.days.some((d) => d.day === today && d.c);
  const TITLES = {
    hoy: [L('Bienestar y sueño', 'Wellbeing & sleep'), L('Salud conductual y recuperación, día a día, frente a la propia base de cada persona.', "Behavioural health and recovery, day by day, against each person's own baseline.")],
    tendencias: [L('Tendencias', 'Trends'), L('La evolución de cada métrica; la línea discontinua es su base personal.', 'How each metric evolves; the dashed line is the personal baseline.')],
    wearable: [L('Wearable', 'Wearable'), L('Pulso, variabilidad cardiaca, sueño y oxígeno desde un dispositivo vestible.', 'Pulse, heart rate variability, sleep and oxygen from a wearable device.')],
  } as const;
  return (
    <div className="page">
      <header className="page-head">
        <div><h1>{TITLES[view][0]}</h1><p>{TITLES[view][1]}</p></div>
        <CrewPicker />
      </header>
      {missing && view !== 'hoy' && <p className="inline-msg t-watch" role="status">{L('Hoy aún no hay registro diario.', 'No daily check-in yet today.')} <a href="#hoy">{L('Hacerlo ahora (menos de 1 minuto)', 'Do it now (under a minute)')}</a></p>}
      {missing && view === 'hoy' && <p className="inline-msg t-watch" role="status">{L('Recordatorio: hoy aún no hay registro diario. Complétalo abajo.', 'Reminder: no daily check-in yet today. Fill it in below.')}</p>}
      <Summary {...data} />
      {view === 'hoy' && (
        <div className="grid-2">
          <CheckIn crew={crew} days={data.days} />
          <Alerts alerts={data.alerts} />
        </div>
      )}
      {view === 'tendencias' && <Trends days={data.days} base={data.base} />}
      {view === 'wearable' && <WearableImport crew={crew} days={data.days} />}
    </div>
  );
}

export default function Wellbeing() {
  return (
    <BayProvider>
      <WellbeingInner />
      <CrewForm />
    </BayProvider>
  );
}
