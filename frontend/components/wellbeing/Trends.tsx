'use client';
// Trends against the personal baseline (dashed line): sleep, heart rate variability, resting pulse, mood and stress.
import TimeChart from '@/components/charts/TimeChart';
import { Card } from '@/components/app/ui';
import { usePrefs } from '@/lib/prefs';
import { dayMs, val, type Day, type MetricKey } from '@/lib/wellbeing/model';

export default function Trends({ days, base }: { days: Day[]; base: Partial<Record<MetricKey, number | null>> }) {
  const { L, locale } = usePrefs();
  const fmtX = (v: number, long?: boolean) => new Date(v).toLocaleDateString(locale, long ? { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' } : { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const chart = (k: MetricKey, label: string, unit: string, color: string, digits = 1) => {
    const data = days.map((d) => ({ x: dayMs(d.day), y: val(d, k) })).filter((p) => p.y != null);
    if (data.length < 2) return <p className="empty-state">{L('Aún no hay suficientes días para esta gráfica.', 'Not enough days for this chart yet.')}</p>;
    const b = base[k];
    return (
      <TimeChart data={data} x={(p) => p.x} y={(p) => p.y} type="line" color={color} label={label} unit={unit} height={180}
        refLine={b != null ? { y: b, label: L('su base', 'baseline') } : undefined} fmtX={fmtX} fmtY={(v) => v.toFixed(digits)} />
    );
  };
  return (
    <div className="grid-2">
      <Card title={L('Sueño', 'Sleep')} lead={L('Horas por noche (medidas por el wearable si las hay; si no, las del registro).', 'Hours per night (measured by the wearable when available, otherwise self-reported).')}>
        {chart('sleep', L('Horas de sueño', 'Hours of sleep'), 'h', 'var(--primary)')}
      </Card>
      <Card title={L('Recuperación', 'Recovery')} lead={L('Variabilidad cardiaca (RMSSD): si baja respecto a su base, el cuerpo se recupera peor.', 'Heart rate variability (RMSSD): when it falls below baseline, the body recovers worse.')}>
        {chart('hrv', L('Variabilidad cardiaca', 'Heart rate variability'), 'ms', 'var(--derived)', 0)}
      </Card>
      <Card title={L('Pulso en reposo', 'Resting pulse')}>
        {chart('rhr', L('Latidos por minuto en reposo', 'Resting beats per minute'), L('lpm', 'bpm'), 'var(--crit)', 0)}
      </Card>
      <Card title={L('Ánimo y estrés', 'Mood & stress')} lead={L('Escala 1–5 del registro diario.', 'Daily check-in scale 1–5.')}>
        {chart('mood', L('Ánimo (5 = muy bueno)', 'Mood (5 = very good)'), '/5', 'var(--ok)', 0)}
        {chart('stress', L('Estrés (5 = muy alto)', 'Stress (5 = very high)'), '/5', 'var(--warn)', 0)}
      </Card>
    </div>
  );
}
