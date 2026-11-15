'use client';
// Explained alerts: what changed, since when, possible cause and a suggested action.
import { Card } from '@/components/app/ui';
import { useBay } from '@/components/bay/BayContext';
import { findings, FIRST_POST, persistence, zOf } from '@/lib/bay/model';
import { useBayText } from '@/lib/bay/text';

/** NASA Human Research Program risk behind each body system */
const HRP: Record<string, [string, string]> = {
  defensas: ['respuesta inmune alterada', 'altered immune response'], inflamacion: ['respuesta inmune alterada', 'altered immune response'],
  vascular: ['adaptaciones cardiovasculares', 'cardiovascular adaptations'], sangre: ['gravedad alterada (anemia espacial)', 'altered gravity (space anemia)'],
  rinon: ['formación de cálculos renales', 'renal stone formation'], higado: ['ambiente cerrado y hostil', 'hostile closed environment'],
  metabolismo: ['pérdida ósea y metabolismo', 'bone loss and metabolism'],
};

export default function Alerts() {
  const { crew, tp } = useBay();
  const { L, fmtV, fmtP, num, sysName, mkLabel, action, crewLabel, tpName } = useBayText();
  const f = findings(crew, tp);
  const post = tp >= FIRST_POST;
  return (
    <Card id="alertas" title={L('Alertas explicadas', 'Explained alerts')}
      aside={<span className="meta">{f.length} {L(`señal${f.length === 1 ? '' : 'es'}`, `signal${f.length === 1 ? '' : 's'}`)} · {crewLabel(crew)} · {tpName(tp)}</span>}>
      <div className="alerts">
        {!f.length && (
          <article className="alert t-ok">
            <h3>{L('Sin alertas', 'No alerts')}</h3>
            <p>{L('Todos los marcadores están dentro de su rango clínico y dentro de su variación habitual antes del vuelo.', 'Every marker is within its clinical range and within its usual pre-flight variation.')}</p>
          </article>
        )}
        {f.slice(0, 5).map(({ k, m, p, l }) => {
          const per = post ? persistence(m, crew, tp) : 0;
          const base = m.data[crew].base; const zs = num(zOf(p, m), 1);
          const out = l === 3
            ? L(`fuera del rango clínico (${fmtV(p.lo ?? 0)}–${fmtV(p.hi ?? 0)} ${m.unit})`, `outside the clinical range (${fmtV(p.lo ?? 0)}–${fmtV(p.hi ?? 0)} ${m.unit})`)
            : L(`${fmtP(p.dev)} frente a su línea base (${fmtV(base)} ${m.unit}), ${zs} veces su variación habitual antes del vuelo`, `${fmtP(p.dev)} vs. their baseline (${fmtV(base)} ${m.unit}), ${zs}× their usual pre-flight variation`);
          return (
            <article key={m.code} className={`alert t-${l === 3 ? 'crit' : 'warn'}`}>
              <h3>{l === 3 ? L('CRÍTICO', 'CRITICAL') : L('ALERTA', 'ALERT')} · {mkLabel(m)} · {sysName(k)}</h3>
              <dl>
                <dt>{L('Qué cambió', 'What changed')}</dt><dd>{fmtV(p.v)} {m.unit}, {out}.</dd>
                {post ? (
                  <><dt>{L('Desde cuándo', 'Since when')}</dt><dd>{per > 1 ? L(`se repite en ${per} controles seguidos desde este momento`, `repeats in ${per} consecutive checks from this moment`) : L('sólo en este control', 'only at this check')}.</dd></>
                ) : (
                  <><dt>{L('Cuándo', 'When')}</dt><dd>{L('antes del vuelo; refleja su variación propia o estrés previo al lanzamiento.', 'before flight; reflects their own variation or pre-launch stress.')}</dd></>
                )}
                <dt>{L('Posible causa', 'Possible cause')}</dt>
                <dd>{post ? L('estrés del vuelo y readaptación a la gravedad; sin partículas solares en la misión (DONKI).', 'flight stress and readaptation to gravity; no solar particle events during the mission (DONKI).') : L('variación previa al vuelo.', 'pre-flight variation.')}</dd>
                <dt>{L('Acción sugerida', 'Suggested action')}</dt><dd>{action(k)}</dd>
              </dl>
              <p className="note">{m.src} · {L('Riesgo HRP', 'HRP risk')}: {L(...HRP[k])} · {L('señal de riesgo, no diagnóstico médico.', 'risk signal, not a medical diagnosis.')}</p>
            </article>
          );
        })}
        {f.length > 5 && <p className="note">+{f.length - 5} {L('señales más en el detalle por sistema.', 'more signals in the system detail.')}</p>}
      </div>
    </Card>
  );
}
