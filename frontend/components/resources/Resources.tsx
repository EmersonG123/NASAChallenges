'use client';
// Data & resources: every real NASA dataset ASTRA works with — what it is, how many records, source link and
// a CSV download — plus an export of the user's own data, a glossary and the limits of the analysis.
import { Badge, Card } from '@/components/app/ui';
import { BASE_CREW, D, MK_EN, TPS } from '@/lib/bay/model';
import { useBayText } from '@/lib/bay/text';
import { getStore } from '@/lib/store';
import M from '@/data/monitor.json';

type Row = (string | number | null | undefined)[];
const cell = (v: Row[number]) => { const s = v == null ? '' : String(v); return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
function downloadCsv(name: string, head: string[], rows: Row[]) {
  const csv = [head, ...rows].map((r) => r.map(cell).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** lab values of the real crew for one OSDR study */
function labRows(study: string): Row[] {
  const out: Row[] = [];
  Object.values(D.systems).forEach((s) => s.markers.filter((m) => m.src === study).forEach((m) => BASE_CREW.forEach((c) => {
    const d = m.data[c]; if (!d) return;
    d.vals.forEach((p, i) => { if (p) out.push([c, TPS[i], m.code, MK_EN[m.code] ?? m.label, m.unit, p.v, p.lo, p.hi, d.base, p.dev]); });
  })));
  return out;
}
const LAB_HEAD = ['crew', 'checkpoint', 'marker_code', 'marker', 'unit', 'value', 'ref_low', 'ref_high', 'preflight_baseline', 'pct_vs_baseline'];
const count = (study: string) => labRows(study).length;

/** official resources of the challenge and how each one is used */
const HRP_RES: [[string, string], [string, string], string][] = [
  [['5 peligros del vuelo espacial (NASA HRP)', '5 Hazards of Human Spaceflight (NASA HRP)'],
    ['Radiación (clima espacial y dosis), aislamiento y confinamiento (Sueño y bienestar), distancia a la Tierra (app sin conexión), gravedad alterada (sangre, corazón, riñón) y ambiente cerrado (CO₂, oxígeno).',
      'Radiation (space weather and dose), isolation & confinement (Sleep & wellbeep), distance from Earth (offline app), altered gravity (blood, heart, kidney) and closed environment (CO₂, oxygen).'], 'https://www.nasa.gov/hrp/hazards'],
  [['Riesgos del vuelo espacial (NASA HRP)', 'Risks of Human Spaceflight (NASA HRP)'],
    ['Cada alerta indica el riesgo HRP al que se refiere: inmune, cardiovascular, cálculos renales, sueño y sobrecarga, conducta y cognición, síndrome neuro-ocular.',
      'Every alert names the HRP risk it relates to: immune, cardiovascular, renal stones, sleep and overload, behaviour and cognition, neuro-ocular syndrome.'], 'https://humanresearchroadmap.nasa.gov/risks/'],
  [['Investigación HRP en curso', 'Ongoing HRP research in space'],
    ['Respaldo de umbrales y acciones, junto con los informes técnicos de NTRS.', 'Backs thresholds and actions, together with the NTRS technical reports.'], 'https://www.nasa.gov/hrp/'],
  [['CSA: monitoreo de radiación para la salud', 'CSA: monitoring radiation for astronaut health'],
    ['Módulo Radiación y signos vitales: dosis diaria y acumulada y eventos de partículas solares que disparan alertas.', 'Radiation & vitals module: daily and cumulative dose and solar particle events that trigger alerts.'], 'https://www.asc-csa.gc.ca/eng/'],
  [['CSA: por qué hacemos ciencia en el espacio', 'CSA: why we do science in space'],
    ['Del espacio a la Tierra: el mismo método protege a mineros de altura en Ayacucho y a trabajadores por turnos.', 'From space to Earth: the same method protects high-altitude miners in Ayacucho and shift workers.'], 'https://www.asc-csa.gc.ca/eng/'],
];

export default function Resources() {
  const x = useBayText(); const { L, num } = x;

  const sets = [
    {
      id: 'osd569', title: 'NASA OSDR · OSD-569', what: L('Hemograma completo de los 4 tripulantes de Inspiration4: defensas, glóbulos rojos y plaquetas.', 'Complete blood count of the 4 Inspiration4 crew members: immune cells, red cells and platelets.'),
      records: count('OSD-569'), unit: L('valores de laboratorio', 'lab values'), period: L('jun 2021 – mar 2022 · 7 controles', 'Jun 2021 – Mar 2022 · 7 checks'),
      used: L('Escáner, alertas, Copilot', 'Scanner, alerts, Copilot'), href: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-569',
      dl: () => downloadCsv('astra-osd569-cbc.csv', LAB_HEAD, labRows('OSD-569')),
    },
    {
      id: 'osd575', title: 'NASA OSDR · OSD-575', what: L('Panel metabólico y marcadores cardiovasculares e inflamatorios de la misma tripulación.', 'Metabolic panel plus cardiovascular and inflammation markers of the same crew.'),
      records: count('OSD-575'), unit: L('valores de laboratorio', 'lab values'), period: L('jun 2021 – mar 2022 · 7 controles', 'Jun 2021 – Mar 2022 · 7 checks'),
      used: L('Escáner, alertas, Copilot', 'Scanner, alerts, Copilot'), href: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-575',
      dl: () => downloadCsv('astra-osd575-cmp-cardio.csv', LAB_HEAD, labRows('OSD-575')),
    },
    {
      id: 'donki21', title: 'NASA DONKI · ' + L('septiembre 2021', 'September 2021'), what: L('Fulguraciones solares y eyecciones de masa coronal durante el mes de la misión Inspiration4.', 'Solar flares and coronal mass ejections during the Inspiration4 mission month.'),
      records: D.donki.flr.length + D.donki.cme.length, unit: L('eventos', 'events'), period: L('1–30 sep 2021', 'Sep 1–30, 2021'),
      used: L('Clima espacial de la tripulación', 'Crew space weather'), href: 'https://ccmc.gsfc.nasa.gov/tools/DONKI/',
      dl: () => downloadCsv('astra-donki-2021-09.csv', ['type', 'time_utc', 'class_or_speed'], [...D.donki.flr.map((e) => ['FLR', e.t, e.cls]), ...D.donki.cme.map((e) => ['CME', e.t, e.v])]),
    },
    {
      id: 'donki26', title: 'NASA DONKI · ' + L('ene–feb 2026', 'Jan–Feb 2026'), what: L('Partículas solares (SEP), eyecciones de masa coronal y tormentas geomagnéticas (Kp) que impulsan el escenario de 30 días.', 'Solar particle events, coronal mass ejections and geomagnetic storms (Kp) that drive the 30-day scenario.'),
      records: M.donki.sep.length + M.donki.cme.length + M.donki.kp.length, unit: L('eventos', 'events'), period: L('ene – feb 2026', 'Jan – Feb 2026'),
      used: L('Radiación y signos vitales', 'Radiation & vitals'), href: 'https://ccmc.gsfc.nasa.gov/tools/DONKI/',
      dl: () => downloadCsv('astra-donki-2026.csv', ['type', 'time_utc', 'value'], [...M.donki.sep.map((e) => ['SEP', e.t, '']), ...M.donki.cme.map((e) => ['CME', e.t, e.v]), ...M.donki.kp.map((e) => ['GST_Kp', e.t, e.v])]),
    },
    {
      id: 'rad', title: 'NASA PDS · Curiosity RAD', what: L('Dosis de radiación medida por el rover Curiosity en la superficie de Marte (detector equivalente a tejido).', 'Radiation dose measured by the Curiosity rover on the surface of Mars (tissue-equivalent detector).'),
      records: M.rad.series.length, unit: L('lecturas', 'readings'), period: `${M.rad.series[0].t.slice(0, 10)} – ${M.rad.series[M.rad.series.length - 1].t.slice(0, 10)}`,
      used: L('Radiación y signos vitales', 'Radiation & vitals'), href: 'https://pds-ppi.igpp.ucla.edu/',
      dl: () => downloadCsv('astra-curiosity-rad.csv', ['time_utc', 'sol', 'dose_rate_E_uGy_h', 'dose_rate_B_uGy_h'], M.rad.series.map((r) => [r.t, r.sol, r.e, r.b])),
    },
    {
      id: 'osd681', title: 'NASA OSDR · OSD-681', what: L('Biotelemetría de 33 animales en inclinación cabeza abajo, el modelo de la NASA para el desplazamiento de fluidos en microgravedad.', 'Biotelemetry from 33 animals in head-down tilt, NASA’s model of fluid shift in microgravity.'),
      records: M.osdr681.intracranial_pressure.length + M.osdr681.body_temperature.length, unit: L('puntos diarios agregados', 'aggregated daily points'), period: L('180 días', '180 days'),
      used: L('Análogo de microgravedad', 'Microgravity analog'), href: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-681',
      dl: () => downloadCsv('astra-osd681.csv', ['signal', 'day', 'mean', 'min', 'max', 'animals'],
        (['intracranial_pressure', 'body_temperature'] as const).flatMap((k) => M.osdr681[k].map((d) => [k, d.day, d.mean, d.min, d.max, d.n]))),
    },
    {
      id: 'ntrs', title: 'NASA NTRS', what: L('Informes técnicos de la NASA que respaldan los umbrales de alerta: frecuencia cardiaca, sueño, radiación y presión intracraneal.', 'NASA technical reports behind the alert thresholds: heart rate, sleep, radiation and intracranial pressure.'),
      records: M.ntrs.length, unit: L('referencias', 'references'), period: L('1997 – 2024', '1997 – 2024'),
      used: L('Evidencia de las alertas', 'Alert evidence'), href: 'https://ntrs.nasa.gov/',
      dl: () => downloadCsv('astra-ntrs-references.csv', ['id', 'year', 'title', 'authors', 'topic', 'url'], M.ntrs.map((r) => [r.id, r.year, r.title, r.authors, r.topic, r.url])),
    },
  ];
  const total = sets.reduce((a, s) => a + s.records, 0);

  const exportMine = async () => {
    const s = getStore();
    const [crew, sessions] = await Promise.all([s.list('crew'), s.list('sessions')]);
    const rows: Row[] = [];
    crew.forEach((c) => {
      const vals = JSON.parse(c.values_json) as Record<string, (number | null)[]>;
      Object.entries(vals).forEach(([code, row]) => row.forEach((v, i) => { if (v != null) rows.push(['lab', c.id, c.name, TPS[i], code, v, '', '']); }));
    });
    sessions.forEach((r) => rows.push(['session', r.crew_id, '', new Date(r.started_at).toISOString(), r.mode, r.fatigue, r.stress, Math.round((r.ended_at - r.started_at) / 1000)]));
    (await s.list('daily')).forEach((d) => rows.push(['daily_' + d.source, d.crew_id, '', d.day, '', d.metrics_json, '', '']));
    downloadCsv('astra-mis-datos.csv', ['kind', 'crew_id', 'name', 'when', 'marker_or_mode', 'value_or_fatigue', 'stress', 'duration_s'], rows);
  };

  const GLOSSARY: [string, string, string, string][] = [
    ['Línea base personal', 'Personal baseline', 'Promedio de los análisis de una persona antes del vuelo. ASTRA compara cada control con ella, no con un rango general.', "Average of a person's tests before flight. ASTRA compares every check with it, not with a general range."],
    ['Riesgo ASTRA (0–100)', 'ASTRA risk (0–100)', 'Cuánto se aleja cada sistema de la línea base, medido contra la variación habitual de cada marcador. Es experimental.', 'How far each system is from baseline, measured against each marker’s usual variation. Experimental.'],
    ['Rango clínico', 'Clinical range', 'Valores normales que informa el laboratorio. Salir de él es la señal más fuerte (crítico).', 'Normal values reported by the lab. Leaving it is the strongest signal (critical).'],
    ['Códigos NASA L-92 / R+1', 'NASA codes L-92 / R+1', 'L = días antes del lanzamiento; R = días después del regreso. En ASTRA se muestran como «3 meses antes», «1 día después».', 'L = days before launch; R = days after return. ASTRA shows them as “3 months before”, “1 day after”.'],
    ['PERCLOS', 'PERCLOS', 'Porcentaje de tiempo con los ojos cerrados en el último minuto. 15 % o más se asocia a somnolencia.', 'Share of time with eyes closed over the last minute. 15% or more is linked to drowsiness.'],
    ['REAL · DERIVADO · SIMULADO', 'REAL · DERIVED · SIMULATED', 'Medido por la NASA · calculado por ASTRA a partir de datos reales · escenario hipotético.', 'Measured by NASA · computed by ASTRA from real data · hypothetical scenario.'],
  ];

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>{L('Datos NASA', 'NASA data')}</h1>
          <p>{L('Las fuentes reales de la NASA con las que trabaja ASTRA. Cada conjunto se puede consultar en su origen y descargar en CSV.', 'The real NASA sources ASTRA works with. Every dataset links to its origin and can be downloaded as CSV.')}</p>
        </div>
      </header>

      <div className="tiles four">
        <div className="tile"><b>{sets.length}</b><span>{L('conjuntos de datos NASA', 'NASA datasets')}</span></div>
        <div className="tile"><b>{num(total, 0)}</b><span>{L('registros reales', 'real records')}</span></div>
        <div className="tile"><b>{BASE_CREW.length}</b><span>{L('tripulantes reales (Inspiration4)', 'real crew members (Inspiration4)')}</span></div>
        <div className="tile"><b>{Object.values(D.systems).reduce((a, s) => a + s.markers.length, 0)}</b><span>{L('marcadores de laboratorio', 'lab markers')}</span></div>
      </div>

      <div className="res-grid">
        {sets.map((s) => (
          <Card key={s.id} className="res-card" title={s.title} aside={<Badge tone="real">REAL</Badge>}>
            <p className="res-what">{s.what}</p>
            <table className="kv compact">
              <tbody>
                <tr><td>{L('Registros', 'Records')}</td><td><b>{num(s.records, 0)}</b> {s.unit}</td></tr>
                <tr><td>{L('Periodo', 'Period')}</td><td>{s.period}</td></tr>
                <tr><td>{L('Se usa en', 'Used in')}</td><td>{s.used}</td></tr>
              </tbody>
            </table>
            <div className="row-btns">
              <button type="button" className="btn-d sm primary" onClick={s.dl}>{L('Descargar CSV', 'Download CSV')}</button>
              <a className="btn-d sm" href={s.href} target="_blank" rel="noopener noreferrer">{L('Ver fuente', 'View source')} ↗</a>
            </div>
          </Card>
        ))}
        <Card className="res-card" title={L('Tus datos', 'Your data')} aside={<Badge tone="derived">ASTRA</Badge>}>
          <p className="res-what">{L('Tripulantes añadidos, sesiones de monitoreo y registros diarios de bienestar guardados en la base de datos local de este equipo.', 'Crew members you added, monitoring sessions and daily wellbeing entries saved in this device’s local database.')}</p>
          <div className="row-btns"><button type="button" className="btn-d sm primary" onClick={() => void exportMine()}>{L('Exportar mis datos (CSV)', 'Export my data (CSV)')}</button></div>
        </Card>
      </div>

      <Card title={L('Marco oficial del reto: NASA HRP y CSA', 'Official challenge framework: NASA HRP & CSA')} aside={<Badge tone="real">NASA · CSA</Badge>}
        lead={L('Cómo ASTRA cubre los recursos del reto «Health Monitoring Software for Astronauts».', 'How ASTRA covers the resources of the “Health Monitoring Software for Astronauts” challenge.')}>
        <div className="tablewrap">
          <table className="kv">
            <thead><tr><th>{L('Recurso', 'Resource')}</th><th>{L('Dónde lo aplica ASTRA', 'Where ASTRA applies it')}</th><th /></tr></thead>
            <tbody>
              {HRP_RES.map(([name, use, href]) => (
                <tr key={name[0]}><td><b>{L(...name)}</b></td><td>{L(...use)}</td><td><a className="btn-d sm" href={href} target="_blank" rel="noopener noreferrer">{L('Abrir', 'Open')} ↗</a></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid-2">
        <Card title={L('Glosario', 'Glossary')}>
          <dl className="glossary">
            {GLOSSARY.map(([tEs, tEn, dEs, dEn]) => <div key={tEs}><dt>{L(tEs, tEn)}</dt><dd>{L(dEs, dEn)}</dd></div>)}
          </dl>
        </Card>
        <Card title={L('Límites y cómo citar', 'Limits & how to cite')}>
          <ul className="plain-list">
            <li>{L('4 personas y sin grupo control: resultados exploratorios.', '4 people and no control group: exploratory results.')}</li>
            <li>{L('Se excluyó la muestra C003 / L-92 (columnas desplazadas). La haptoglobina no cuenta en la puntuación (valores atípicos).', 'Sample C003 / L-92 was excluded (shifted columns). Haptoglobin does not count toward the score (outliers).')}</li>
            <li>{L('Curiosity mide en Marte, no en órbita baja; OSD-681 es un análogo animal. Los signos vitales del escenario de 30 días son sintéticos.', 'Curiosity measures on Mars, not in low orbit; OSD-681 is an animal analog. The vitals of the 30-day scenario are synthetic.')}</li>
            <li>{L('La puntuación es experimental. Las alertas son señales de riesgo, no diagnósticos.', 'The score is experimental. Alerts are risk signals, not diagnoses.')}</li>
          </ul>
          <p className="cite">NASA Open Science Data Repository (OSDR): OSD-569, OSD-575, OSD-681 · NASA CCMC DONKI · NASA PDS Curiosity RAD · NASA Technical Reports Server.</p>
        </Card>
      </div>
    </div>
  );
}
