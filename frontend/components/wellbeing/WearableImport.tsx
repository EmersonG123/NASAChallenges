'use client';
// Wearable data: import a daily CSV export (smart garment, actigraphy watch) or load a SIMULATED example.
import { useState } from 'react';
import { Badge, Card } from '@/components/app/ui';
import { saveDay } from '@/components/wellbeing/useDaily';
import { usePrefs } from '@/lib/prefs';
import { exampleDays, parseWearableCsv, WEARABLE_TEMPLATE, type Day } from '@/lib/wellbeing/model';

export default function WearableImport({ crew, days }: { crew: string; days: Day[] }) {
  const { L } = usePrefs();
  const [msg, setMsg] = useState<{ tone: 'ok' | 'crit'; text: string } | null>(null);
  const withW = days.filter((d) => d.w).length;

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    const r = parseWearableCsv(await f.text());
    if (r.error) { setMsg({ tone: 'crit', text: L('No se pudo leer: hace falta una columna «date» (AAAA-MM-DD) y al menos una métrica. Usa la plantilla.', 'Could not read it: a "date" column (YYYY-MM-DD) and at least one metric are needed. Use the template.') }); return; }
    for (const d of r.days) await saveDay(crew, d.day, 'wearable', d.w);
    setMsg({ tone: 'ok', text: L(`Importados ${r.days.length} días de ${f.name}.`, `Imported ${r.days.length} days from ${f.name}.`) });
  };
  const loadExample = async () => {
    for (const d of exampleDays()) { await saveDay(crew, d.day, 'checkin', d.c); await saveDay(crew, d.day, 'wearable', d.w); }
    setMsg({ tone: 'ok', text: L('Cargados 16 días SIMULADOS (registro y wearable): 9 días estables y una última semana difícil.', 'Loaded 16 SIMULATED days (check-in and wearable): 9 stable days and a hard last week.') });
  };
  const template = () => {
    const url = URL.createObjectURL(new Blob([WEARABLE_TEMPLATE], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = 'astra-plantilla-wearable.csv'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="grid-2">
      <Card title={L('Importar datos del wearable', 'Import wearable data')} aside={<Badge tone={withW ? 'ok' : 'none'}>{withW} {L('días', 'days')}</Badge>}
        lead={L('Un CSV con una fila por día: pulso en reposo, variabilidad cardiaca, horas de sueño, oxígeno, minutos activos y temperatura de la piel. Las columnas que falten se ignoran.',
          'A CSV with one row per day: resting pulse, heart rate variability, sleep hours, oxygen, active minutes and skin temperature. Missing columns are ignored.')}>
        <div className="row-btns">
          <label className="btn-d primary">{L('Elegir archivo CSV', 'Choose CSV file')}
            <input type="file" accept=".csv,text/csv" hidden onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ''; }} />
          </label>
          <button type="button" className="btn-d" onClick={template}>{L('Descargar plantilla', 'Download template')}</button>
          <button type="button" className="btn-d" onClick={() => void loadExample()}>{L('Cargar ejemplo simulado', 'Load simulated example')}</button>
        </div>
        {msg && <p className={`inline-msg t-${msg.tone}`} role="status">{msg.text}</p>}
      </Card>
      <Card title={L('¿Funciona en órbita?', 'Does it work in orbit?')} aside={<Badge tone="real">CSA · NASA</Badge>}>
        <ul className="plain-list">
          <li>{L('La Agencia Espacial Canadiense usa en la ISS el Bio-Monitor, una prenda inteligente que registra pulso, respiración, presión, oxígeno, temperatura y actividad.', 'The Canadian Space Agency uses Bio-Monitor on the ISS, a smart garment that records pulse, breathing, blood pressure, oxygen, temperature and activity.')}</li>
          <li>{L('La NASA recoge a bordo cuestionarios breves de sueño y ánimo y pruebas cognitivas como parte de sus medidas estándar de vuelo.', 'NASA collects short sleep and mood questionnaires and cognitive tests on board as part of its spaceflight standard measures.')}</li>
          <li>{L('ASTRA solo necesita su exportación diaria: analiza en el propio equipo, sin internet, y sincroniza al volver la conexión.', 'ASTRA only needs their daily export: it analyses on the device, without internet, and syncs when the connection returns.')}</li>
          <li>{L('No hay datos públicos de wearables de una tripulación real; el ejemplo de esta página es SIMULADO.', 'There is no public wearable data from a real crew; the example on this page is SIMULATED.')}</li>
        </ul>
      </Card>
    </div>
  );
}
