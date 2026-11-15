'use client';
// Every recorded day of the selected person: check-in, wearable and camera fatigue side by side; edit, delete or export.
import { useState } from 'react';
import { Badge, Card, toneOf } from '@/components/app/ui';
import { removeDay } from '@/components/wellbeing/useDaily';
import { lvlOfScore } from '@/lib/bay/model';
import { usePrefs } from '@/lib/prefs';
import { dayMs, val, type Day, type VisionDay } from '@/lib/wellbeing/model';

const IconBtn = ({ label, d, onClick }: { label: string; d: string; onClick: () => void }) => (
  <button type="button" className="icon-d sm" aria-label={label} title={label} onClick={onClick}>
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
  </button>
);

export default function History({ crew, days, vision, onEdit }: { crew: string; days: Day[]; vision: VisionDay[]; onEdit: (day: string) => void }) {
  const { L, locale } = usePrefs();
  const [confirm, setConfirm] = useState<string | null>(null);
  const [all, setAll] = useState(false);
  const vis = new Map(vision.map((v) => [v.day, v]));
  const dayList = [...new Set([...days.map((d) => d.day), ...vision.map((v) => v.day)])].sort().reverse();
  const shown = all ? dayList : dayList.slice(0, 10);
  const byDay = new Map(days.map((d) => [d.day, d]));
  const fmt = (day: string) => new Date(dayMs(day)).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
  const n = (v: number | null | undefined, digits = 0, unit = '') => (v == null ? '—' : `${v.toFixed(digits)}${unit}`);

  const exportCsv = () => {
    const head = 'date,bed,wake,sleep_h,sleep_quality,mood,stress,tiredness,workload,connection,symptoms,resting_hr,hrv_rmssd,spo2,active_min,camera_fatigue_peak,simulated,note';
    const lines = [...dayList].reverse().map((day) => {
      const d = byDay.get(day); const c = d?.c; const w = d?.w; const v = vis.get(day);
      const cells = [day, c?.bed ?? '', c?.wake ?? '', d ? val(d, 'sleep') ?? '' : '', c?.sleep_q ?? '', c?.mood ?? '', c?.stress ?? '', c?.fatigue ?? '', c?.workload ?? '', c?.social ?? '',
        (c?.symptoms ?? []).join('|'), w?.rhr ?? '', w?.hrv ?? '', w?.spo2 ?? '', w?.active_min ?? '', v?.peak ?? '', d?.sim ? 'yes' : '', `"${(c?.note ?? '').replace(/"/g, '""')}"`];
      return cells.join(',');
    });
    const url = URL.createObjectURL(new Blob([`${head}\n${lines.join('\n')}\n`], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = `astra-bienestar-${crew}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <Card title={L('Historial de días', 'Day history')}
      aside={dayList.length ? <button type="button" className="btn-d sm" onClick={exportCsv}>{L('Exportar CSV', 'Export CSV')}</button> : undefined}
      lead={L('Cada día registrado de esta persona. Pulsa el lápiz para corregir un día en el registro diario.', 'Every recorded day of this person. Press the pencil to correct a day in the daily check-in.')}>
      {!dayList.length ? (
        <p className="empty-state">{L('Todavía no hay días registrados.', 'No days recorded yet.')}</p>
      ) : (
        <>
          <div className="tablewrap">
            <table className="kv">
              <thead>
                <tr>
                  <th>{L('Día', 'Day')}</th><th className="r">{L('Sueño', 'Sleep')}</th><th className="r">{L('Ánimo', 'Mood')}</th><th className="r">{L('Estrés', 'Stress')}</th>
                  <th className="r hide-s">{L('Variabilidad', 'HRV')}</th><th className="r hide-s">{L('Pulso', 'Pulse')}</th><th className="r">{L('Cámara', 'Camera')}</th>
                  <th className="hide-s">{L('Síntomas', 'Symptoms')}</th><th aria-label={L('Acciones', 'Actions')} />
                </tr>
              </thead>
              <tbody>
                {shown.map((day) => {
                  const d = byDay.get(day); const s = d ? val(d, 'sleep') : null; const v = vis.get(day);
                  const syms = d?.c?.symptoms?.length ?? 0;
                  return (
                    <tr key={day}>
                      <td><b>{fmt(day)}</b>{d?.sim && <small>{L('simulado', 'simulated')}</small>}{d?.c?.bed && d.c.wake && <small className="mono">{d.c.bed} → {d.c.wake}</small>}</td>
                      <td className={`num${s != null && s < 6 ? ' out' : ''}`}>{n(s, 1, ' h')}</td>
                      <td className={`num${d?.c?.mood != null && d.c.mood <= 2 ? ' out' : ''}`}>{n(d?.c?.mood, 0, '/5')}</td>
                      <td className={`num${d?.c?.stress != null && d.c.stress >= 4 ? ' out' : ''}`}>{n(d?.c?.stress, 0, '/5')}</td>
                      <td className="num hide-s">{n(d?.w?.hrv, 0, ' ms')}</td>
                      <td className="num hide-s">{n(d?.w?.rhr, 0)}</td>
                      <td className="num">{v?.peak != null ? <Badge tone={toneOf(lvlOfScore(v.peak))}>{v.peak}</Badge> : '—'}</td>
                      <td className="hide-s">{syms ? <Badge tone="watch">{syms}</Badge> : <span className="meta">—</span>}</td>
                      <td>
                        <span className="row-acts">
                          {confirm === day ? (
                            <>
                              <button type="button" className="btn-d sm danger" onClick={() => { void removeDay(crew, day); setConfirm(null); }}>{L('Borrar', 'Delete')}</button>
                              <button type="button" className="btn-d sm" onClick={() => setConfirm(null)}>{L('No', 'No')}</button>
                            </>
                          ) : (
                            <>
                              <IconBtn label={L('Editar este día', 'Edit this day')} d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4" onClick={() => onEdit(day)} />
                              {d && <IconBtn label={L('Borrar este día', 'Delete this day')} d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" onClick={() => setConfirm(day)} />}
                            </>
                          )}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {dayList.length > 10 && (
            <button type="button" className="btn-d sm hist-more" onClick={() => setAll((a) => !a)}>{all ? L('Ver menos', 'Show less') : L(`Ver los ${dayList.length} días`, `Show all ${dayList.length} days`)}</button>
          )}
        </>
      )}
    </Card>
  );
}
