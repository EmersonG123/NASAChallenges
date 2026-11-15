'use client';
// Sleep over the last 7 nights: hours per night against the 8 h target, sleep debt, regularity and a suggested bedtime.
import { Badge, Card, type Tone } from '@/components/app/ui';
import { usePrefs } from '@/lib/prefs';
import { SLEEP_TARGET, dayMs, type SleepStats } from '@/lib/wellbeing/model';

export default function SleepCard({ sleep }: { sleep: SleepStats }) {
  const { L, locale } = usePrefs();
  const { nights, avg, debt, short, spread, bed, wake, recBed } = sleep;
  const recorded = nights.filter((n) => n.h != null).length;
  const debtTone: Tone = debt >= 7 ? 'crit' : debt >= 4 ? 'warn' : debt >= 2 ? 'watch' : 'ok';
  const nightTone = (h: number) => (h < 5 ? 'crit' : h < 6 ? 'warn' : h < 7 ? 'watch' : 'ok');
  const MAX = 10;
  return (
    <Card title={L('Sueño · últimas 7 noches', 'Sleep · last 7 nights')}
      aside={recorded ? <Badge tone={debtTone}>{L('Deuda', 'Debt')} {debt.toFixed(1)} h</Badge> : undefined}
      lead={L(`Objetivo: ${SLEEP_TARGET} h por noche. La deuda suma lo que faltó cada noche; se recupera poco a poco, no en un solo día.`, `Target: ${SLEEP_TARGET} h a night. The debt adds up what was missing each night; it is recovered gradually, not in one day.`)}>
      {!recorded ? (
        <p className="empty-state">{L('Sin noches registradas. Anota a qué hora te acostaste y te levantaste en el registro diario, o importa el wearable.', 'No nights recorded. Log when you went to bed and got up in the daily check-in, or import the wearable.')}</p>
      ) : (
        <>
          <div className="sleep-bars" role="img" aria-label={L('Horas de sueño por noche', 'Hours of sleep per night')}>
            <span className="sleep-target" style={{ bottom: `calc(19px + (100% - 25px) * ${SLEEP_TARGET / MAX})` }}><i>{SLEEP_TARGET} h</i></span>
            {nights.map((n) => (
              <div key={n.day} className="sleep-bar">
                <div className="sleep-col">
                  {n.h != null
                    ? <span className={`t-${nightTone(n.h)}`} style={{ height: `${(Math.min(n.h, MAX) / MAX) * 100}%` }} title={`${n.h} h`}><b>{n.h.toFixed(1)}</b></span>
                    : <em>—</em>}
                </div>
                <small>{new Date(dayMs(n.day)).toLocaleDateString(locale, { weekday: 'short', timeZone: 'UTC' })}</small>
              </div>
            ))}
          </div>
          <table className="kv compact">
            <tbody>
              <tr><td>{L('Media', 'Average')}</td><td className="num">{avg != null ? `${avg.toFixed(1)} h` : '—'}</td></tr>
              <tr><td>{L('Noches de menos de 6 h', 'Nights under 6 h')}</td><td className={`num${short >= 2 ? ' out' : ''}`}>{short} / {recorded}</td></tr>
              <tr><td>{L('Horario habitual', 'Usual schedule')}</td><td className="num">{bed && wake ? `${bed} → ${wake}` : '—'}</td></tr>
              <tr><td>{L('Regularidad (hora de acostarse)', 'Regularity (bedtime)')}</td><td className={`num${spread != null && spread > 90 ? ' out' : ''}`}>{spread != null ? `± ${spread} min` : '—'}</td></tr>
            </tbody>
          </table>
          <p className={`inline-msg t-${debtTone === 'ok' ? 'ok' : debtTone}`}>
            {debt >= 2
              ? L(`Para recuperar: acostarse sobre las ${recBed ?? '22:00'}${wake ? ` (te levantas a las ${wake})` : ''} y sumar 30–60 min por noche hasta saldar ${debt.toFixed(1)} h. Una siesta corta (≤ 30 min) antes de una tarea crítica ayuda.`,
                `To recover: go to bed around ${recBed ?? '22:00'}${wake ? ` (you get up at ${wake})` : ''} and add 30–60 min a night until the ${debt.toFixed(1)} h are paid back. A short nap (≤ 30 min) before a critical task helps.`)
              : L(`Sueño suficiente esta semana.${recBed ? ` Mantén la hora de acostarte sobre las ${recBed}.` : ''}`, `Enough sleep this week.${recBed ? ` Keep your bedtime around ${recBed}.` : ''}`)}
          </p>
        </>
      )}
    </Card>
  );
}
