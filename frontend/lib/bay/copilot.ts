// ASTRA Copilot: answers in plain language using only the selected crew member's data. Rule-based, cites its source.
import { CREW, D, findings, FIRST_POST, globalScore, LAUNCH, lvlOfScore, ORDER, pointOf, SPLASH, sysScore, valLevel, type SysKey } from '@/lib/bay/model';
import type { BayText } from '@/lib/bay/text';
import type { VisionSummary } from '@/components/bay/BayContext';

export const ASKS = {
  es: ['¿Por qué empeoró mi estado?', '¿Qué está fuera de mi rango?', '¿Cuándo me recupero?', '¿Hubo radiación en la misión?', '¿Cómo estoy frente a la tripulación?', '¿Estoy cansado?'],
  en: ['Why did my status get worse?', 'What is outside my range?', 'When will I recover?', 'Was there radiation during the mission?', 'How do I compare with the crew?', 'Am I tired?'],
};

const SYS_WORDS: [string, SysKey][] = [
  ['immun', 'defensas'], ['defens', 'defensas'], ['inmun', 'defensas'], ['inflam', 'inflamacion'], ['heart', 'vascular'], ['kidney', 'rinon'],
  ['liver', 'higado'], ['glucose', 'metabolismo'], ['blood', 'sangre'], ['coraz', 'vascular'], ['vaso', 'vascular'], ['riñ', 'rinon'], ['rin', 'rinon'],
  ['hígado', 'higado'], ['higado', 'higado'], ['metab', 'metabolismo'], ['gluc', 'metabolismo'], ['sangre', 'sangre'], ['hemo', 'sangre'],
];
const TIRED = /cansad|fatiga|sueñ|sueno|dorm|estr[eé]s|tired|fatigue|sleep|stress/;

export interface Answer { t: string; s: string }

export function answer(q: string, crew: string, ti: number, x: BayText, vision: VisionSummary | null): Answer {
  const { L, fmtV, fmtP, lvlName, sysName, mkLabel, action } = x;
  const tp = x.tpName(ti); const ql = q.toLowerCase();
  const src = L('Fuentes', 'Sources') + ': OSD-569, OSD-575, DONKI';

  if (TIRED.test(ql) && vision) {
    return {
      t: L(`ASTRA Vision (${vision.src}) mide ahora: fatiga ${vision.fatigue}/100 y estrés ${vision.stress}/100. ${vision.text}`,
        `ASTRA Vision (${vision.src}) currently measures: fatigue ${vision.fatigue}/100 and stress ${vision.stress}/100. ${vision.text}`),
      s: L('Fuente: ASTRA Vision, análisis facial en el dispositivo · experimental', 'Source: ASTRA Vision, on-device facial analysis · experimental'),
    };
  }
  if (TIRED.test(ql)) {
    return {
      t: L('La NASA no publica datos de sueño ni de estrés de esta tripulación. Activa ASTRA Vision (sección Fatiga y estrés) para medirlos con la cámara, o explora escenarios en el Simulador.',
        'NASA does not publish sleep or stress data for this crew. Turn on ASTRA Vision (Fatigue & stress section) to measure them with the camera, or explore scenarios in the Simulator.'),
      s: L('Sin fuente real todavía', 'No real source yet'),
    };
  }
  if (/ritmo|frecuencia|hrv|cerebro|ojo|heart rate|brain|eye/.test(ql)) {
    return {
      t: L('No tengo datos reales de sueño, estrés, ritmo cardiaco ni cerebro de la tripulación de Inspiration4: no son públicos en NASA OSDR. Puedes explorarlos en el Simulador de escenarios, marcado como SIMULADO.',
        'I have no real data on sleep, stress, heart rate or brain for the Inspiration4 crew: it is not public in NASA OSDR. You can explore them in the Scenario simulator, marked as SIMULATED.'),
      s: L('Sin fuente real', 'No real source'),
    };
  }
  if (/radia|sol|tormenta|donki|sep|cme|storm|flare/.test(ql)) {
    const fl = D.donki.flr.filter((e) => { const t = Date.parse(e.t); return t >= LAUNCH && t <= SPLASH + 864e5; });
    const cls = fl.map((e) => e.cls).join(', ');
    return {
      t: L(`Durante la misión (16–18 sep 2021) NASA DONKI registra 0 eventos de partículas solares (SEP) y 0 tormentas geomagnéticas. Solo hubo ${fl.length} fulguración (${cls}) y algunas eyecciones de masa coronal sin efecto registrado en la Tierra. El ambiente de radiación solar fue tranquilo, así que no explica tus cambios.`,
        `During the mission (Sep 16–18, 2021) NASA DONKI records 0 solar particle events (SEP) and 0 geomagnetic storms. There was only ${fl.length} flare (${cls}) and a few coronal mass ejections with no recorded effect on Earth. The solar radiation environment was quiet, so it does not explain your changes.`),
      s: L('Fuente', 'Source') + ': NASA DONKI (FLR, CME, SEP, GST)',
    };
  }
  const match = SYS_WORDS.find(([w]) => ql.includes(w));
  if (match) {
    const k = match[1]; const s = D.systems[k]; const sc = sysScore(k, crew, ti) ?? 0;
    const lines = s.markers.filter((m) => !m.excluded && pointOf(m, crew, ti)).map((m) => {
      const p = pointOf(m, crew, ti)!;
      return `• ${mkLabel(m)}: ${fmtV(p.v)} ${m.unit} (${fmtP(p.dev)} ${L('vs. tu base', 'vs. your baseline')})${valLevel(p, m) === 3 ? L(' — FUERA DE RANGO', ' — OUT OF RANGE') : ''}`;
    });
    return {
      t: `${sysName(k)} ${L('en', 'at')} ${tp}: ${L('puntuación', 'score')} ${sc}/100 (${lvlName(lvlOfScore(sc))}).\n${lines.join('\n')}\n${sc >= 40 ? L('Sugerencia: ', 'Suggestion: ') + action(k) : L('Sin acción especial; seguir el calendario de controles.', 'No special action; keep the check-up schedule.')}`,
      s: L('Fuente: ', 'Source: ') + [...new Set(s.markers.map((m) => m.src))].join(', '),
    };
  }
  if (/fuera|rango|anormal|outside|range|abnormal/.test(ql)) {
    const f = findings(crew, ti).filter((v) => v.l === 3);
    if (!f.length) {
      return {
        t: L(`En ${tp} ninguno de tus marcadores está fuera del rango clínico del laboratorio. Las señales que ves son cambios frente a tu propia línea base, que un laboratorio estándar no marcaría.`,
          `At ${tp} none of your markers is outside the lab's clinical range. The signals you see are changes from your own baseline, which a standard lab would not flag.`),
        s: src,
      };
    }
    return {
      t: L(`En ${tp} tienes ${f.length} valor${f.length > 1 ? 'es' : ''} fuera del rango clínico:\n`, `At ${tp} you have ${f.length} value${f.length > 1 ? 's' : ''} outside the clinical range:\n`)
        + f.map((v) => `• ${mkLabel(v.m)}: ${fmtV(v.p.v)} ${v.m.unit} (${L('rango', 'range')} ${fmtV(v.p.lo ?? 0)}–${fmtV(v.p.hi ?? 0)})`).join('\n')
        + L('\nConviene repetirlos y comentarlos con el médico de vuelo.', '\nRepeat them and discuss them with the flight surgeon.'),
      s: src,
    };
  }
  if (/recuper|cu[aá]ndo|tiempo|vuelv|recover|when/.test(ql)) {
    const rows = ORDER.map((k) => {
      const v = [3, 4, 5, 6].map((i) => sysScore(k, crew, i));
      const r = [4, 5, 6].find((_, j) => v[j + 1] != null && (v[j + 1] as number) < 20);
      return { k, v, r };
    }).filter((r) => r.v[0] != null && (r.v[0] as number) >= 20);
    if (!rows.length) {
      return { t: L('Tras el vuelo ningún sistema superó el umbral de vigilancia al día siguiente de volver. Tu recuperación fue inmediata.', 'After the flight no system crossed the watch threshold the day after returning. Your recovery was immediate.'), s: src };
    }
    return {
      t: L('Sistemas que cambiaron al volver y cuándo regresan a tu línea base:\n', 'Systems that changed after landing and when they return to your baseline:\n')
        + rows.map((r) => `• ${sysName(r.k)}: ${r.v[0]} ${L('al volver', 'on return')} → ${r.r != null ? L('estable desde ', 'stable from ') + x.tpName(r.r) : L('aún no se normaliza a los 6 meses (', 'not yet back to normal at 6 months (') + r.v[3] + ')'}`).join('\n'),
      s: src,
    };
  }
  if (/tripul|compar|otros|equipo|crew|others|team/.test(ql)) {
    const g = CREW.map((c) => ({ c, g: globalScore(c, ti) ?? 0 })).sort((a, b) => b.g - a.g);
    const pos = g.findIndex((o) => o.c === crew) + 1; const rank = g.map((o) => `${x.crewLabel(o.c)} ${o.g}`).join(' · ');
    return {
      t: L(`En ${tp}, ranking de riesgo ASTRA: ${rank}. Estás en la posición ${pos} de ${CREW.length}. Los 4 tripulantes de Inspiration4 comparten el patrón post-vuelo: PCR y glucosa al alza, leucocitos y neutrófilos a la baja.`,
        `At ${tp}, ASTRA risk ranking: ${rank}. You are number ${pos} of ${CREW.length}. All 4 Inspiration4 crew members share the post-flight pattern: CRP and glucose up, leukocytes and neutrophils down.`),
      s: src,
    };
  }
  // default: why the status changed
  const f = findings(crew, ti); const g = globalScore(crew, ti);
  const pre = [0, 1, 2].map((i) => globalScore(crew, i)).filter((v): v is number => v != null);
  const g0 = Math.round(pre.reduce((a, b) => a + b, 0) / Math.max(1, pre.length));
  if (!f.length) {
    return {
      t: L(`En ${tp} tu riesgo ASTRA es ${g}/100 (antes del vuelo, ${g0} de media). Ningún marcador sale de su rango clínico ni de su variación habitual.`,
        `At ${tp} your ASTRA risk is ${g}/100 (pre-flight average: ${g0}). No marker is outside its clinical range or its usual variation.`),
      s: src,
    };
  }
  return {
    t: L(`En ${tp} tu riesgo ASTRA es ${g}/100 (antes del vuelo, ${g0} de media). Lo que más pesa:\n`, `At ${tp} your ASTRA risk is ${g}/100 (pre-flight average: ${g0}). What weighs most:\n`)
      + f.slice(0, 4).map((v) => `• ${mkLabel(v.m)} (${sysName(v.k)}): ${fmtV(v.p.v)} ${v.m.unit}, ${v.l === 3 ? L('fuera del rango clínico', 'outside the clinical range') : fmtP(v.p.dev) + L(' vs. tu base', ' vs. your baseline')}`).join('\n')
      + `\n${ti >= FIRST_POST ? L('No hubo partículas solares durante la misión (DONKI), así que la causa más probable es el estrés del vuelo y la readaptación a la gravedad. ', 'There were no solar particle events during the mission (DONKI), so the most likely cause is flight stress and readaptation to gravity. ') : ''}${L('Sugerencia', 'Suggestion')}: ${action(f[0].k)}`,
    s: src,
  };
}
