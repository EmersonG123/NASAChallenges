'use client';
// Physiological & radiation monitoring. Real NASA data from backend/pipeline:
// DONKI (SEP, CME, Kp), PDS Curiosity RAD, OSDR OSD-681, NTRS, EPIC, NASA Image Library.
// Astronaut vitals (ASTR-1) are synthetic, calibrated on real DONKI events; daily dose is derived.
import { useMemo } from 'react';
import TimeChart from '@/components/charts/TimeChart';
import { usePrefs } from '@/lib/prefs';
import M from '@/data/monitor.json';

type Day = (typeof M.mission.days)[number] & { flag?: boolean; color?: string };
type VitalKey = 'heart_rate' | 'sleep_duration' | 'hrv_rmssd' | 'stress_score';
type Trig = [k: 'hr' | 'sl' | 'rd', v: number, z?: number];

const DAY = 864e5;
const ms = (s: string) => Date.parse(s.endsWith('Z') ? s : s + 'Z');

const TX = {
  en: {
    eyebrow: 'Radiation & vitals',
    title: 'Space weather, radiation dose and crew vitals on one timeline',
    lede: 'Real NASA space weather (DONKI) drives a 30-day mission scenario (Jan 1–30, 2026), next to real radiation measured by the Curiosity rover and real microgravity-analog biotelemetry. When a real solar particle event hits, ASTRA tracks how dose, heart rate, sleep and stress respond, and raises an explained alert.',
    tags: [['real', 'REAL', 'measured by NASA'], ['derived', 'DERIVED', 'calculated from real data'], ['sim', 'SYNTHETIC', 'calibrated scenario, not crew data']],
    k: ['Solar particle events', 'Coronal mass ejections', 'Max geomagnetic Kp', 'Curiosity tissue dose', 'Mission cumulative dose', 'Critical alerts'],
    ks: ['DONKI · Jan–Feb 2026', 'fastest', 'DONKI GST · storm ≥ 5', 'PDS RAD · detector E', 'ASTR-1 · 30 days', 'synergistic, days 18–23'],
    s1: 'Space weather', s1d: 'Every event below is a real NASA DONKI record. Red dashed lines mark solar particle events (SEP).',
    cme: 'Coronal mass ejection speed (km/s)', kp: 'Geomagnetic Kp index (storm ≥ 5)', sepList: 'Solar particle events', open: 'Open in DONKI',
    s2: 'Radiation', s2d: 'Top: real dose measured by the Curiosity rover on Mars. Bottom: the astronaut dose model, a low-orbit baseline of ~0.35 mGy/day (model assumption) plus spikes on the days with real DONKI solar particle events and geomagnetic storms.',
    rad: 'Curiosity RAD dose rate, tissue-equivalent detector (µGy/h)', dd: 'Astronaut daily dose (mGy)', cum: 'Astronaut cumulative dose (mGy)', sol: 'Sol',
    s3: 'Crew vitals · ASTR-1', s3d: 'Synthetic astronaut series calibrated with NASA literature and triggered by the real SEP events. Red bands: SEP and the 2 days after. Dashed line: personal baseline (median of days 1–10).',
    hr: 'Heart rate (bpm)', hrv: 'Heart rate variability, RMSSD (ms)', sleep: 'Sleep (hours)', stress: 'Stress (1–10)', base: 'baseline',
    s4: 'Microgravity analog · OSDR OSD-681', s4d: 'Real biotelemetry from 33 animals in head-down tilt, NASA’s model of fluid shift in microgravity. Line: mean; band: min–max across animals.',
    icp: 'Intracranial pressure (torr)', temp: 'Core body temperature (°C)', dayN: 'Day', animals: 'animals',
    s5: 'Explained alerts', s5d: 'Robust z-score against the first 10 mission days. An alert fires when 2 or more signals cross their thresholds on the same day.',
    critical: 'CRITICAL', high: 'HIGH', day: 'Day', rec: 'Watch vitals remotely, cut physical load, prioritize rest and check shielding during the SEP window.',
    trig: { hr: (v: string, z: string) => `Heart rate ${v} bpm (z ${z})`, sl: (v: string, z: string) => `Sleep ${v} h (z ${z})`, rd: (v: string) => `Radiation spike ${v} mGy/day` },
    evidence: 'NASA evidence', s6: 'Scientific evidence · NASA NTRS', s6d: 'Each alert threshold is backed by NASA technical reports.',
    topics: { 'ambulatory heart rate spaceflight': 'Heart rate', 'heart rate variability long duration spaceflight': 'HRV', 'sleep circadian International Space Station crew': 'Sleep', 'solar particle event astronaut radiation dose': 'Radiation', 'head-down tilt intracranial pressure': 'Intracranial pressure' },
    s7: 'Orbital context', s7d: 'Latest real image of Earth from NASA EPIC (DSCOVR, L1) and official NASA imagery for each alert type.',
    epic: 'Earth from EPIC', center: 'Centre', gal: { solar_storm_sdo: 'Solar storms', iss_astronaut_health: 'Crew health on the ISS', space_radiation: 'Radiation shielding', curiosity_mars_rad: 'Curiosity on Mars' },
    note: 'Limits: the vitals and the astronaut dose are a calibrated scenario, not measurements of a real crew. Curiosity measures on the surface of Mars, not in low Earth orbit. OSD-681 is an animal analog.',
    ofDays: 'of 30 days',
  },
  es: {
    eyebrow: 'Radiación y signos vitales',
    title: 'Clima espacial, dosis de radiación y signos vitales en una línea de tiempo',
    lede: 'El clima espacial real de la NASA (DONKI) impulsa un escenario de misión de 30 días (1–30 ene 2026), junto a la radiación real medida por el rover Curiosity y la biotelemetría real de un análogo de microgravedad. Cuando llega un evento real de partículas solares, ASTRA sigue cómo responden la dosis, la frecuencia cardiaca, el sueño y el estrés, y emite una alerta explicada.',
    tags: [['real', 'REAL', 'medido por la NASA'], ['derived', 'DERIVADO', 'calculado con datos reales'], ['sim', 'SINTÉTICO', 'escenario calibrado, no datos de tripulación']],
    k: ['Eventos de partículas solares', 'Eyecciones de masa coronal', 'Kp geomagnético máximo', 'Dosis en tejido (Curiosity)', 'Dosis acumulada de la misión', 'Alertas críticas'],
    ks: ['DONKI · ene–feb 2026', 'la más rápida', 'DONKI GST · tormenta ≥ 5', 'PDS RAD · detector E', 'ASTR-1 · 30 días', 'sinérgicas, días 18–23'],
    s1: 'Clima espacial', s1d: 'Cada evento es un registro real de NASA DONKI. Las líneas rojas discontinuas marcan eventos de partículas solares (SEP).',
    cme: 'Velocidad de eyecciones de masa coronal (km/s)', kp: 'Índice geomagnético Kp (tormenta ≥ 5)', sepList: 'Eventos de partículas solares', open: 'Abrir en DONKI',
    s2: 'Radiación', s2d: 'Arriba: dosis real medida por el rover Curiosity en Marte. Abajo: el modelo de dosis del astronauta, una base de órbita baja de ~0,35 mGy/día (supuesto del modelo) más los picos en los días con eventos reales de partículas solares y tormentas geomagnéticas de DONKI.',
    rad: 'Tasa de dosis de Curiosity RAD, detector equivalente a tejido (µGy/h)', dd: 'Dosis diaria del astronauta (mGy)', cum: 'Dosis acumulada del astronauta (mGy)', sol: 'Sol',
    s3: 'Signos vitales · ASTR-1', s3d: 'Serie sintética de astronauta calibrada con literatura NASA y disparada por los eventos SEP reales. Bandas rojas: el SEP y los 2 días siguientes. Línea discontinua: línea base personal (mediana de los días 1–10).',
    hr: 'Frecuencia cardiaca (lpm)', hrv: 'Variabilidad cardiaca, RMSSD (ms)', sleep: 'Sueño (horas)', stress: 'Estrés (1–10)', base: 'base',
    s4: 'Análogo de microgravedad · OSDR OSD-681', s4d: 'Biotelemetría real de 33 animales en inclinación cabeza abajo, el modelo de la NASA para el desplazamiento de fluidos en microgravedad. Línea: media; banda: mínimo–máximo entre animales.',
    icp: 'Presión intracraneal (torr)', temp: 'Temperatura corporal (°C)', dayN: 'Día', animals: 'animales',
    s5: 'Alertas explicadas', s5d: 'Z robusto frente a los 10 primeros días de misión. Se emite una alerta cuando 2 o más señales cruzan su umbral el mismo día.',
    critical: 'CRÍTICA', high: 'ALTA', day: 'Día', rec: 'Vigilar signos vitales a distancia, reducir la carga física, priorizar el descanso y revisar el blindaje durante la ventana del SEP.',
    trig: { hr: (v: string, z: string) => `Frecuencia cardiaca ${v} lpm (z ${z})`, sl: (v: string, z: string) => `Sueño ${v} h (z ${z})`, rd: (v: string) => `Pico de radiación ${v} mGy/día` },
    evidence: 'Evidencia NASA', s6: 'Evidencia científica · NASA NTRS', s6d: 'Cada umbral de alerta está respaldado por informes técnicos de la NASA.',
    topics: { 'ambulatory heart rate spaceflight': 'Frecuencia cardiaca', 'heart rate variability long duration spaceflight': 'HRV', 'sleep circadian International Space Station crew': 'Sueño', 'solar particle event astronaut radiation dose': 'Radiación', 'head-down tilt intracranial pressure': 'Presión intracraneal' },
    s7: 'Contexto orbital', s7d: 'Última imagen real de la Tierra desde NASA EPIC (DSCOVR, L1) e imágenes oficiales de la NASA para cada tipo de alerta.',
    epic: 'La Tierra desde EPIC', center: 'Centro', gal: { solar_storm_sdo: 'Tormentas solares', iss_astronaut_health: 'Salud de la tripulación en la ISS', space_radiation: 'Blindaje contra radiación', curiosity_mars_rad: 'Curiosity en Marte' },
    note: 'Límites: los signos vitales y la dosis del astronauta son un escenario calibrado, no mediciones de una tripulación real. Curiosity mide en la superficie de Marte, no en órbita baja. OSD-681 es un análogo animal.',
    ofDays: 'de 30 días',
  },
};

const median = (a: number[]) => { const s = [...a].sort((p, q) => p - q); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const mad = (a: number[]) => { const m = median(a); return median(a.map((v) => Math.abs(v - m))) || 1e-6; };
const zr = (v: number, base: number[]) => (v - median(base)) / (1.4826 * mad(base));

export default function Monitor() {
  const { lang } = usePrefs();
  const t = TX[lang];
  const loc = lang === 'en' ? 'en-US' : 'es-ES';
  const nf = (v: number | null | undefined, d = 1) => (v == null ? '—' : v.toLocaleString(loc, { maximumFractionDigits: d, minimumFractionDigits: 0 }));
  const dfmt = (v: number, long?: boolean) => new Date(v).toLocaleDateString(loc, long ? { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' } : { day: 'numeric', month: 'short', timeZone: 'UTC' });

  const D = useMemo(() => {
    const days: Day[] = M.mission.days;
    const start = ms(M.mission.start + 'T00:00:00Z');
    const sepT = M.donki.sep.map((s) => ms(s.t));
    const sepDays = new Set(M.donki.sep.map((s) => s.t.slice(0, 10)));
    const inWin = (date: string) => [0, 1, 2].some((k) => sepDays.has(new Date(ms(date + 'T00:00:00Z') - k * DAY).toISOString().slice(0, 10)));
    const windows = days.filter((d) => inWin(d.date)).map((d) => ({ from: d.day - 0.5, to: d.day + 0.5 }));
    const base = (k: VitalKey) => days.filter((d) => d.day <= 10).map((d) => d[k]);
    const B: Record<VitalKey, number[]> = { heart_rate: base('heart_rate'), sleep_duration: base('sleep_duration'), hrv_rmssd: base('hrv_rmssd'), stress_score: base('stress_score') };
    const alerts: { day: number; date: string; level: 'critical' | 'high'; tr: Trig[] }[] = [];
    days.forEach((d) => {
      const zh = zr(d.heart_rate, B.heart_rate), zs = zr(d.sleep_duration, B.sleep_duration);
      const tr: Trig[] = [];
      if (zh > 2.5) tr.push(['hr', d.heart_rate, zh]);
      if (zs < -2 || d.sleep_duration < 6) tr.push(['sl', d.sleep_duration, zs]);
      if (d.radiation_daily_dose > 0.6) tr.push(['rd', d.radiation_daily_dose]);
      if (tr.length >= 2) alerts.push({ day: d.day, date: d.date, level: tr.length === 3 ? 'critical' : 'high', tr });
    });
    const sepInMission = M.donki.sep.filter((s) => { const x = ms(s.t); return x >= start && x < start + 30 * DAY; })
      .map((s) => ({ x: (ms(s.t) - start) / DAY + 1, label: 'SEP' }));
    const kpMax = Math.max(...M.donki.kp.map((k) => k.v));
    const cmeMax = Math.max(...M.donki.cme.map((c) => c.v));
    const radMean = M.rad.daily.reduce((a, b) => a + b.v, 0) / M.rad.daily.length;
    const daysFlag = days.map((d) => ({ ...d, flag: alerts.some((a) => a.day === d.day) }));
    return { days: daysFlag, start, sepT, windows, B, alerts, sepInMission, kpMax, cmeMax, radMean };
  }, []);

  const last = D.days[D.days.length - 1];
  const kpis: [string | number, string, string?][] = [
    [M.donki.sep.length, 'real'], [M.donki.cme.length, 'real', `${nf(D.cmeMax, 0)} km/s`], [nf(D.kpMax, 2), 'real'],
    [`${nf(D.radMean, 3)} mGy/${lang === 'en' ? 'day' : 'día'}`, 'derived'], [`${nf(last.radiation_cum_dose, 1)} mGy`, 'derived'], [D.alerts.length, 'derived'],
  ];
  const janStart = ms('2026-01-01T00:00:00Z'), febEnd = ms('2026-02-28T23:59:59Z');
  const monthTicks = [ms('2026-01-01T00:00:00Z'), ms('2026-01-15T00:00:00Z'), ms('2026-02-01T00:00:00Z'), ms('2026-02-15T00:00:00Z'), ms('2026-02-28T00:00:00Z')];
  const sepEvents = D.sepT.map((x) => ({ x }));
  const dayTicks = [1, 5, 10, 15, 20, 25, 30];
  const vital = (k: VitalKey, label: string, color: string, unit: string) => (
    <TimeChart data={D.days} x={(d) => d.day} y={(d) => d[k]} type="line" color={color} label={label} unit={unit}
      windows={D.windows} refLine={{ y: median(D.B[k]), label: t.base }} xTicks={dayTicks}
      fmtX={(v, long) => (long ? `${t.day} ${v} · ${dfmt(D.start + (v - 1) * DAY, true)}` : `${t.day} ${v}`)} fmtY={(v) => nf(v, 1)} height={190} />
  );
  const byTopic = M.ntrs.reduce<Record<string, (typeof M.ntrs)[number][]>>((acc, r) => { (acc[r.topic] = acc[r.topic] || []).push(r); return acc; }, {});
  const epic = M.epic[0];

  return (
      <main className="mon">
        <header className="mon-head">
          <span className="eyebrow">{t.eyebrow}</span>
          <h1>{t.title}</h1>
          <p>{t.lede}</p>
          <div className="mon-tags">{t.tags.map(([c, l, d]) => <span key={c}><span className={`tag ${c === 'sim' ? 'sim' : c}`}>{l}</span> {d}</span>)}</div>
        </header>

        <section className="kpis" aria-label="Key figures">
          {kpis.map(([v, tag, extra], i) => (
            <div className="kpi" key={i}>
              <span className={`tag ${tag}`}>{tag === 'real' ? 'REAL' : lang === 'en' ? 'DERIVED' : 'DERIVADO'}</span>
              <b>{v}</b><span>{t.k[i]}</span><small>{extra ? `${t.ks[i]} ${extra}` : t.ks[i]}</small>
            </div>
          ))}
        </section>

        <section className="mon-sec" id="weather">
          <div className="mon-sh"><h2>{t.s1}</h2><span className="tag real">REAL · NASA DONKI</span></div>
          <p className="mon-d">{t.s1d}</p>
          <div className="mon-grid2">
            <div className="mon-card">
              <TimeChart data={M.donki.cme.map((c) => ({ x: ms(c.t), y: c.v, color: c.v >= 1000 ? 'var(--nasa-red)' : c.v >= 500 ? 'var(--warn)' : 'var(--nasa-blue-2)' }))}
                x={(d) => d.x} y={(d) => d.y} type="dots" label={t.cme} unit="km/s" events={sepEvents} xTicks={monthTicks} xDomain={[janStart, febEnd]}
                fmtX={(v, long) => dfmt(v, long)} fmtY={(v) => nf(v, 0)} />
            </div>
            <div className="mon-card">
              <TimeChart data={M.donki.kp.map((k) => ({ x: ms(k.t), y: k.v, color: k.v >= 7 ? 'var(--nasa-red)' : k.v >= 5 ? 'var(--warn)' : 'var(--nasa-blue-2)' }))}
                x={(d) => d.x} y={(d) => d.y} type="bars" label={t.kp} unit="Kp" events={sepEvents} xTicks={monthTicks} yDomain={[0, 9]} xDomain={[janStart, febEnd]} barWidth={5}
                refLine={{ y: 5, label: 'G1' }} fmtX={(v, long) => dfmt(v, long)} fmtY={(v) => nf(v, 1)} />
            </div>
          </div>
          <div className="sep-list">
            <span className="eyebrow">{t.sepList}</span>
            <div>{M.donki.sep.map((s) => (
              <a key={s.t} href={s.ref} target="_blank" rel="noopener noreferrer" className="sep-chip" title={t.open}>
                <i />{dfmt(ms(s.t), true)} · {new Date(ms(s.t)).toISOString().slice(11, 16)} UTC ↗
              </a>
            ))}</div>
          </div>
        </section>

        <section className="mon-sec" id="radiation">
          <div className="mon-sh"><h2>{t.s2}</h2><span className="tag real">REAL · PDS CURIOSITY RAD</span><span className="tag derived">{lang === 'en' ? 'DERIVED' : 'DERIVADO'}</span></div>
          <p className="mon-d">{t.s2d}</p>
          <div className="mon-card">
            <TimeChart data={M.rad.series.map((r) => ({ x: ms(r.t), y: r.e, sol: r.sol }))} x={(d) => d.x} y={(d) => d.y} type="line" color="var(--nasa-blue-2)"
              label={t.rad} unit="µGy/h" fmtX={(v, long) => (long ? new Date(v).toISOString().slice(0, 16).replace('T', ' ') + ' UTC' : dfmt(v))} fmtY={(v) => nf(v, 2)}
              tipExtra={(d) => <span>{t.sol} {d.sol}</span>} height={220} width={1280} />
          </div>
          <div className="mon-grid2">
            <div className="mon-card">
              <TimeChart data={D.days.map((d) => ({ ...d, color: d.radiation_daily_dose > 0.6 ? 'var(--nasa-red)' : 'var(--nasa-blue-2)' }))} x={(d) => d.day} y={(d) => d.radiation_daily_dose}
                type="bars" label={t.dd} unit="mGy" windows={D.windows} refLine={{ y: 0.6, label: '0.6 mGy' }} xTicks={dayTicks}
                fmtX={(v, long) => (long ? `${t.day} ${v} · ${dfmt(D.start + (v - 1) * DAY, true)}` : `${t.day} ${v}`)} fmtY={(v) => nf(v, 2)} />
            </div>
            <div className="mon-card">
              <TimeChart data={D.days} x={(d) => d.day} y={(d) => d.radiation_cum_dose} type="line" color="var(--nasa-red)" label={t.cum} unit="mGy"
                windows={D.windows} xTicks={dayTicks} fmtX={(v, long) => (long ? `${t.day} ${v} · ${dfmt(D.start + (v - 1) * DAY, true)}` : `${t.day} ${v}`)} fmtY={(v) => nf(v, 1)} />
            </div>
          </div>
        </section>

        <section className="mon-sec" id="vitals">
          <div className="mon-sh"><h2>{t.s3}</h2><span className="tag sim">{lang === 'en' ? 'SYNTHETIC' : 'SINTÉTICO'}</span></div>
          <p className="mon-d">{t.s3d}</p>
          <div className="mon-grid2">
            <div className="mon-card">{vital('heart_rate', t.hr, 'var(--nasa-red)', lang === 'en' ? 'bpm' : 'lpm')}</div>
            <div className="mon-card">{vital('hrv_rmssd', t.hrv, 'var(--nasa-blue-2)', 'ms')}</div>
            <div className="mon-card">{vital('sleep_duration', t.sleep, 'var(--derived)', 'h')}</div>
            <div className="mon-card">{vital('stress_score', t.stress, 'var(--warn)', '/10')}</div>
          </div>
        </section>

        <section className="mon-sec" id="analog">
          <div className="mon-sh"><h2>{t.s4}</h2><span className="tag real">REAL · NASA OSDR</span></div>
          <p className="mon-d">{t.s4d}</p>
          <div className="mon-grid2">
            {([['intracranial_pressure', t.icp, 'torr', 'var(--nasa-blue-2)'], ['body_temperature', t.temp, '°C', 'var(--nasa-red)']] as const).map(([k, lab, u, c]) => (
              <div className="mon-card" key={k}>
                <TimeChart data={M.osdr681[k].filter((d) => d.day >= 0)} x={(d) => d.day} y={(d) => d.mean} band={(d) => [d.min, d.max]} type="line" color={c}
                  label={lab} unit={u} xTicks={[0, 30, 60, 90, 120, 150, 180]} fmtX={(v) => `${t.dayN} ${v}`} fmtY={(v) => nf(v, 2)}
                  tipExtra={(d) => <span>{nf(d.min, 2)}–{nf(d.max, 2)} · {d.n} {t.animals}</span>} />
              </div>
            ))}
          </div>
        </section>

        <section className="mon-sec" id="m-alerts">
          <div className="mon-sh"><h2>{t.s5}</h2><span className="tag derived">{lang === 'en' ? 'DERIVED' : 'DERIVADO'}</span></div>
          <p className="mon-d">{t.s5d}</p>
          <div className="alert-grid">
            {D.alerts.map((a) => (
              <article className={`m-alert ${a.level}`} key={a.day}>
                <header><span className="lvl">{a.level === 'critical' ? t.critical : t.high}</span><b>{t.day} {a.day} · {dfmt(ms(a.date + 'T00:00:00Z'), true)}</b></header>
                <ul>{a.tr.map(([k, v, z]) => <li key={k}>{(t.trig[k] as (v: string, z: string) => string)(nf(v, k === 'rd' ? 2 : 1), z != null ? (z > 0 ? '+' : '') + nf(z, 1) : '')}</li>)}</ul>
                <p>{t.rec}</p>
                <a href="https://ntrs.nasa.gov/citations/20040089526" target="_blank" rel="noopener noreferrer">{t.evidence}: NTRS 20040089526 ↗</a>
              </article>
            ))}
          </div>
        </section>

        <section className="mon-sec" id="evidence">
          <div className="mon-sh"><h2>{t.s6}</h2><span className="tag real">REAL · NASA NTRS</span></div>
          <p className="mon-d">{t.s6d}</p>
          <div className="ntrs-grid">
            {Object.entries(byTopic).map(([topic, refs]) => (
              <div className="mon-card ntrs" key={topic}>
                <span className="eyebrow">{(t.topics as Record<string, string>)[topic] || topic}</span>
                <ul>{refs.slice(0, 4).map((r) => (
                  <li key={r.id}><a href={r.url} target="_blank" rel="noopener noreferrer">{r.title}</a><small>{r.year}{r.authors ? ` · ${r.authors.split(';')[0]}` : ''}</small></li>
                ))}</ul>
              </div>
            ))}
          </div>
        </section>

        <section className="mon-sec" id="context">
          <div className="mon-sh"><h2>{t.s7}</h2><span className="tag real">REAL · NASA EPIC</span></div>
          <p className="mon-d">{t.s7d}</p>
          <div className="ctx">
            {epic && (
              <figure className="epic">
                {/* eslint-disable-next-line @next/next/no-img-element -- remote NASA image, already a small thumbnail */}
                <img src={epic.image_jpg_thumb} alt={t.epic} width="320" height="320" loading="lazy" />
                <figcaption><b>{t.epic}</b><span>{epic.timestamp_utc.replace('T', ' ').replace('Z', ' UTC')}</span>
                  <span>{t.center}: {nf(epic.centroid_lat, 2)}°, {nf(epic.centroid_lon, 2)}°</span></figcaption>
              </figure>
            )}
            <div className="gallery">
              {Object.entries(M.gallery).map(([k, list]) => list[0] && (
                <figure key={k}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- remote NASA image library */}
                  <img src={list[0].image_url} alt={list[0].title} loading="lazy" />
                  <figcaption><b>{(t.gal as Record<string, string>)[k] || k}</b><span>{list[0].title} · {list[0].center} {list[0].date_created?.slice(0, 4)}</span></figcaption>
                </figure>
              ))}
            </div>
          </div>
          <p className="mon-note">{t.note}</p>
        </section>
      </main>
  );
}
