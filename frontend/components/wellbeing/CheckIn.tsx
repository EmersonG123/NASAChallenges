'use client';
// Daily check-in (under a minute): sleep, how the person feels, workload, connection with others and symptoms.
import { useEffect, useState } from 'react';
import { Badge, Card } from '@/components/app/ui';
import { saveDay } from '@/components/wellbeing/useDaily';
import { usePrefs } from '@/lib/prefs';
import { SYMPTOMS, todayIso, type CheckIn as CI, type Day, type Symptom } from '@/lib/wellbeing/model';

type Scale = 'sleep_q' | 'mood' | 'stress' | 'fatigue' | 'workload' | 'social';
const SCALES: { k: Scale; es: string; en: string; lo: [string, string]; hi: [string, string]; invert?: boolean }[] = [
  { k: 'sleep_q', es: 'Calidad del sueño', en: 'Sleep quality', lo: ['Muy mala', 'Very poor'], hi: ['Excelente', 'Excellent'] },
  { k: 'mood', es: 'Ánimo', en: 'Mood', lo: ['Muy bajo', 'Very low'], hi: ['Muy bueno', 'Very good'] },
  { k: 'stress', es: 'Estrés', en: 'Stress', lo: ['Nada', 'None'], hi: ['Muy alto', 'Very high'], invert: true },
  { k: 'fatigue', es: 'Cansancio', en: 'Tiredness', lo: ['Nada', 'None'], hi: ['Agotado', 'Exhausted'], invert: true },
  { k: 'workload', es: 'Carga de trabajo', en: 'Workload', lo: ['Ligera', 'Light'], hi: ['Excesiva', 'Excessive'], invert: true },
  { k: 'social', es: 'Conexión con los demás', en: 'Connection with others', lo: ['Aislado', 'Isolated'], hi: ['Muy conectado', 'Very connected'] },
];
const SYM_LABEL: Record<Symptom, [string, string]> = {
  headache: ['Dolor de cabeza', 'Headache'], congestion: ['Congestión nasal', 'Nasal congestion'], vision: ['Cambios en la visión', 'Vision changes'],
  back_pain: ['Dolor de espalda', 'Back pain'], nausea: ['Náuseas', 'Nausea'], insomnia: ['Insomnio', 'Insomnia'],
  low_motivation: ['Poca motivación', 'Low motivation'], conflict: ['Tensión con el equipo', 'Tension with the team'],
};

export default function CheckIn({ crew, days }: { crew: string; days: Day[] }) {
  const { L } = usePrefs();
  // the date is read in the browser (prerendered pages must not depend on the build time)
  const [day, setDay] = useState('');
  const [today, setToday] = useState('');
  // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of the local date after mount
  useEffect(() => { const t = todayIso(); setToday(t); setDay(t); }, []);
  const existing = days.find((d) => d.day === day)?.c;
  const [form, setForm] = useState<CI>({});
  const [saved, setSaved] = useState(false);

  // load what was already recorded for that person and day
  // eslint-disable-next-line react-hooks/set-state-in-effect -- reset the form when the person or day changes
  useEffect(() => { setForm(existing ? { ...existing } : { sleep_h: 7, symptoms: [] }); setSaved(false); }, [crew, day, existing]);

  const set = (patch: Partial<CI>) => { setForm((f) => ({ ...f, ...patch })); setSaved(false); };
  const toggle = (s: Symptom) => set({ symptoms: (form.symptoms ?? []).includes(s) ? (form.symptoms ?? []).filter((x) => x !== s) : [...(form.symptoms ?? []), s] });
  const complete = !!day && SCALES.every((s) => form[s.k] != null) && form.sleep_h != null;
  const save = async () => { await saveDay(crew, day, 'checkin', { ...form, sim: undefined }); setSaved(true); };

  return (
    <Card title={L('Registro diario', 'Daily check-in')}
      aside={<label className="date-pick">{L('Día', 'Day')} <input type="date" value={day} max={today || undefined} onChange={(e) => e.target.value && setDay(e.target.value)} /></label>}
      lead={L('Menos de un minuto, sin conexión. ASTRA lo compara con tus propios primeros días.', 'Under a minute, works offline. ASTRA compares it with your own first days.')}>
      <form className="checkin" onSubmit={(e) => { e.preventDefault(); if (complete) void save(); }}>
        <label className="field sleep-field">{L('Horas de sueño', 'Hours of sleep')}
          <span className="row-btns">
            <input type="range" min={0} max={12} step={0.5} value={form.sleep_h ?? 7} onChange={(e) => set({ sleep_h: +e.target.value })} />
            <output>{(form.sleep_h ?? 7).toFixed(1)} h</output>
          </span>
        </label>
        <div className="scales">
          {SCALES.map((s) => (
            <fieldset key={s.k} className="scale">
              <legend>{L(s.es, s.en)}</legend>
              <div className="scale-btns" role="radiogroup" aria-label={L(s.es, s.en)}>
                {[1, 2, 3, 4, 5].map((v) => {
                  const bad = s.invert ? v >= 4 : v <= 2;
                  return (
                    <button key={v} type="button" role="radio" aria-checked={form[s.k] === v} className={bad ? 'is-bad' : ''} onClick={() => set({ [s.k]: v } as Partial<CI>)}>{v}</button>
                  );
                })}
              </div>
              <span className="scale-ends"><small>{L(...s.lo)}</small><small>{L(...s.hi)}</small></span>
            </fieldset>
          ))}
        </div>
        <fieldset className="field">
          <legend>{L('Síntomas hoy', 'Symptoms today')}</legend>
          <div className="sym-chips">
            {SYMPTOMS.map((s) => <button key={s} type="button" aria-pressed={(form.symptoms ?? []).includes(s)} onClick={() => toggle(s)}>{L(...SYM_LABEL[s])}</button>)}
          </div>
        </fieldset>
        <label className="field">{L('Nota (opcional)', 'Note (optional)')}
          <textarea rows={2} maxLength={300} value={form.note ?? ''} onChange={(e) => set({ note: e.target.value })} />
        </label>
        <div className="checkin-f">
          {existing?.sim && <Badge tone="sim">{L('DÍA SIMULADO', 'SIMULATED DAY')}</Badge>}
          {saved ? <Badge tone="ok">{L('GUARDADO', 'SAVED')}</Badge> : !complete && <span className="note">{L('Responde todas las escalas para guardar.', 'Answer every scale to save.')}</span>}
          <button type="submit" className="btn-d primary" disabled={!complete}>{existing ? L('Actualizar registro', 'Update check-in') : L('Guardar registro', 'Save check-in')}</button>
        </div>
      </form>
    </Card>
  );
}
