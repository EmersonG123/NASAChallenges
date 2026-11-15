'use client';
// Crew member data entry: a 3-step wizard (profile → lab results → review) used to add or edit a person.
// Lab results can be typed per body system or imported from CSV; ranges and out-of-range values show live.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Badge, toneOf } from '@/components/app/ui';
import { useBay } from '@/components/bay/BayContext';
import { exampleValues, parseCsv, templateCsv } from '@/lib/bay/csv';
import {
  crewName, crewProfile, crewSource, crewValues, D, FIRST_POST, lvlOfScore, ORDER, previewCrew, rangeOf, TPS,
  type CrewProfile, type CustomCrew,
} from '@/lib/bay/model';
import { useBayText } from '@/lib/bay/text';
import { newId } from '@/lib/platform';

export const CREW_FORM_EVENT = 'astra-crew-form';
/** open the wizard from anywhere: openCrewForm() to add, openCrewForm(id) to edit */
export const openCrewForm = (id?: string) => window.dispatchEvent(new CustomEvent(CREW_FORM_EVENT, { detail: { id } }));

type Raw = Record<string, string[]>;
const ROLES: [string, string][] = [['Comandante', 'Commander'], ['Piloto', 'Pilot'], ['Especialista de misión', 'Mission specialist'], ['Oficial médico', 'Medical officer'], ['Otro', 'Other']];
const DEFAULT_CPS = [true, true, true, true, false, false, false];

const parseNum = (s: string) => { const v = parseFloat(s.replace(',', '.')); return s.trim() === '' ? null : Number.isFinite(v) ? v : NaN; };
const toRaw = (values: CustomCrew['values']): Raw => Object.fromEntries(Object.entries(values).map(([k, row]) => [k, TPS.map((_, i) => (row[i] == null ? '' : String(row[i])))]));

export default function CrewForm() {
  const x = useBayText(); const { L, mkLabel, sysName, tpName, num } = x;
  const { addCrew, custom } = useBay();
  const dlg = useRef<HTMLDialogElement>(null);

  const [editId, setEditId] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [sex, setSex] = useState<'F' | 'M'>('F');
  const [profile, setProfile] = useState<CrewProfile>({});
  const [cps, setCps] = useState<boolean[]>(DEFAULT_CPS);
  const [raw, setRaw] = useState<Raw>({});
  const [source, setSource] = useState<CustomCrew['source']>('manual');
  const [openSys, setOpenSys] = useState<string>(ORDER[0]);
  const [importMsg, setImportMsg] = useState<{ tone: 'ok' | 'crit'; text: string } | null>(null);

  const open = useCallback((id?: string) => {
    if (dlg.current?.open) return;
    const values = id ? crewValues(id) : null;
    setEditId(id ?? null); setStep(0); setImportMsg(null); setOpenSys(ORDER[0]);
    setName(id ? crewName(id) : L(`Tripulante ${custom.length + 5}`, `Crew member ${custom.length + 5}`));
    setSex(id ? (D.sex[id] === 'M' ? 'M' : 'F') : 'F');
    setProfile(id ? crewProfile(id) ?? {} : {});
    setRaw(values ? toRaw(values) : {});
    setSource(id ? crewSource(id) ?? 'manual' : 'manual');
    setCps(values ? TPS.map((_, i) => Object.values(values).some((r) => r[i] != null)) : DEFAULT_CPS);
    dlg.current?.showModal();
  }, [L, custom.length]);
  const close = () => { dlg.current?.close(); if (location.hash === '#add-crew') history.replaceState(null, '', location.pathname + location.search); };

  useEffect(() => {
    const onEvent = (e: Event) => open((e as CustomEvent<{ id?: string }>).detail?.id);
    const onHash = () => { if (location.hash === '#add-crew') open(); };
    onHash();
    window.addEventListener(CREW_FORM_EVENT, onEvent); window.addEventListener('hashchange', onHash);
    return () => { window.removeEventListener(CREW_FORM_EVENT, onEvent); window.removeEventListener('hashchange', onHash); };
  }, [open]);

  /* ---------- derived data ---------- */
  const markersBySys = useMemo(() => ORDER.map((k) => ({ k, markers: D.systems[k].markers })), []);
  const values = useMemo<CustomCrew['values']>(() => {
    const out: CustomCrew['values'] = {};
    Object.entries(raw).forEach(([code, row]) => {
      const nums = TPS.map((_, i) => (cps[i] ? parseNum(row[i] ?? '') : null));
      if (nums.some((v) => v != null && !Number.isNaN(v))) out[code] = nums.map((v) => (v == null || Number.isNaN(v) ? null : v));
    });
    return out;
  }, [raw, cps]);
  const invalid = useMemo(() => Object.entries(raw).flatMap(([code, row]) => row.map((s, i) => (cps[i] && Number.isNaN(parseNum(s)) ? `${code}:${i}` : null)).filter(Boolean)), [raw, cps]);
  const filled = Object.keys(values).length;
  const totalMarkers = markersBySys.reduce((a, s) => a + s.markers.length, 0);
  const preCount = TPS.slice(0, FIRST_POST).filter((_, i) => cps[i] && Object.values(values).some((r) => r[i] != null)).length;

  const draft: CustomCrew = { id: editId ?? 'DRAFT', name: name.trim() || 'ASTRA', sex, source, profile, values };
  const preview = useMemo(() => (step === 2 && filled ? previewCrew(draft, custom) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recompute only when reaching the review step or the data changes
    [step, values, sex, custom]);

  /* ---------- actions ---------- */
  const setCell = (code: string, i: number, v: string) => setRaw((r) => ({ ...r, [code]: TPS.map((_, j) => (j === i ? v : r[code]?.[j] ?? '')) }));
  const loadValues = (vals: CustomCrew['values'], src: CustomCrew['source']) => {
    setRaw(toRaw(vals)); setSource(src);
    setCps(TPS.map((_, i) => Object.values(vals).some((r) => r[i] != null)));
  };
  const onFile = async (f: File | undefined) => {
    if (!f) return;
    const p = parseCsv(await f.text());
    if (p.error) { setImportMsg({ tone: 'crit', text: L('No se pudo leer el archivo. Usa la plantilla CSV.', 'The file could not be read. Use the CSV template.') }); return; }
    loadValues(p.values, 'upload');
    setImportMsg({ tone: 'ok', text: L(`Importados ${p.markers} marcadores en ${p.checkpoints} controles. Revísalos abajo.`, `Imported ${p.markers} markers across ${p.checkpoints} checks. Review them below.`)
      + (p.unknown.length ? ` ${L('Ignorados', 'Ignored')}: ${p.unknown.slice(0, 4).join(', ')}` : '') });
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([templateCsv()], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = 'astra-plantilla-tripulante.csv'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const save = () => {
    const id = editId ?? newId('N');
    const clean: CrewProfile = { ...profile, role: profile.role || undefined, mission: profile.mission?.trim() || undefined, notes: profile.notes?.trim() || undefined };
    void addCrew({ ...draft, id, name: name.trim() || id, profile: clean });
    close();
  };

  const canNext = step === 0 ? name.trim().length > 0 : step === 1 ? filled > 0 && invalid.length === 0 : true;
  const STEPS = [L('Perfil', 'Profile'), L('Análisis de sangre', 'Blood tests'), L('Revisión', 'Review')];

  return (
    <dialog ref={dlg} className="dlg dlg-wide" aria-labelledby="crewform-title" onClick={(e) => { if (e.target === dlg.current) close(); }}>
      <form className="dlg-in" onSubmit={(e) => { e.preventDefault(); if (step < 2) { if (canNext) setStep(step + 1); } else save(); }}>
        <div className="dlg-h">
          <h2 id="crewform-title">{editId ? L('Editar tripulante', 'Edit crew member') : L('Nuevo tripulante', 'New crew member')}</h2>
          <button type="button" className="icon-d" aria-label={L('Cerrar', 'Close')} onClick={close}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        <ol className="stepper" aria-label={L('Pasos', 'Steps')}>
          {STEPS.map((s, i) => (
            <li key={s} className={i === step ? 'on' : i < step ? 'done' : ''} aria-current={i === step ? 'step' : undefined}>
              <button type="button" disabled={i > step && !canNext} onClick={() => (i <= step || canNext) && setStep(i)}><b>{i + 1}</b>{s}</button>
            </li>
          ))}
        </ol>

        {step === 0 && (
          <div className="form-grid">
            <label className="field span2">{L('Nombre o código', 'Name or code')}
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} required autoFocus />
            </label>
            <fieldset className="field">
              <legend>{L('Sexo', 'Sex')}</legend>
              <div className="seg">{(['F', 'M'] as const).map((s) => <button key={s} type="button" aria-pressed={sex === s} onClick={() => setSex(s)}>{s === 'F' ? L('Mujer', 'Woman') : L('Hombre', 'Man')}</button>)}</div>
            </fieldset>
            <label className="field">{L('Edad', 'Age')}
              <input type="number" min={18} max={90} value={profile.age ?? ''} onChange={(e) => setProfile({ ...profile, age: e.target.value ? Number(e.target.value) : null })} />
            </label>
            <label className="field">{L('Rol en la misión', 'Mission role')}
              <select value={profile.role ?? ''} onChange={(e) => setProfile({ ...profile, role: e.target.value })}>
                <option value="">{L('Sin indicar', 'Not set')}</option>
                {ROLES.map(([es, en]) => <option key={es} value={es}>{L(es, en)}</option>)}
              </select>
            </label>
            <label className="field">{L('Misión', 'Mission')}
              <input value={profile.mission ?? ''} onChange={(e) => setProfile({ ...profile, mission: e.target.value })} maxLength={60} placeholder={L('p. ej. Órbita baja · 6 meses', 'e.g. Low orbit · 6 months')} />
            </label>
            <label className="field span2">{L('Notas clínicas (opcional)', 'Clinical notes (optional)')}
              <textarea rows={2} value={profile.notes ?? ''} onChange={(e) => setProfile({ ...profile, notes: e.target.value })} maxLength={400} />
            </label>
            <p className="note span2">{L('ASTRA compara a cada persona consigo misma. Con 2 o más análisis antes del vuelo crea su línea base personal.', 'ASTRA compares each person with themselves. With 2 or more tests before flight it builds their personal baseline.')}</p>
          </div>
        )}

        {step === 1 && (
          <div className="labs">
            <div className="labs-top">
              <div>
                <span className="field-label">{L('¿Qué controles tiene?', 'Which checks do they have?')}</span>
                <div className="cp-toggles">
                  {TPS.map((_, i) => (
                    <button key={i} type="button" aria-pressed={cps[i]} onClick={() => setCps((c) => c.map((v, j) => (j === i ? !v : v)))}>
                      <small>{i < FIRST_POST ? L('ANTES', 'BEFORE') : L('DESPUÉS', 'AFTER')}</small>{tpName(i).replace(/ (antes|después) del vuelo| (before|after) flight/, '')}
                    </button>
                  ))}
                </div>
              </div>
              <div className="labs-import">
                <span className="field-label">{L('¿Ya los tienes en una hoja de cálculo?', 'Already in a spreadsheet?')}</span>
                <div className="row-btns">
                  <label className="btn-d sm">{L('Importar CSV', 'Import CSV')}
                    <input type="file" accept=".csv,text/csv" hidden onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ''; }} />
                  </label>
                  <button type="button" className="btn-d sm" onClick={download}>{L('Plantilla', 'Template')}</button>
                  <button type="button" className="btn-d sm" onClick={() => { loadValues(exampleValues(), 'example'); setImportMsg({ tone: 'ok', text: L('Cargado un ejemplo SIMULADO para probar.', 'Loaded a SIMULATED example to try.') }); }}>{L('Ejemplo', 'Example')}</button>
                </div>
              </div>
            </div>
            {importMsg && <p className={`inline-msg t-${importMsg.tone}`} role="status">{importMsg.text}</p>}

            <div className="sys-acc">
              {markersBySys.map(({ k, markers }) => {
                const done = markers.filter((m) => values[m.code]).length;
                const outs = markers.reduce((a, m) => { const r = rangeOf(m); return a + (values[m.code] ?? []).filter((v) => v != null && r.lo != null && r.hi != null && (v < r.lo || v > r.hi)).length; }, 0);
                const isOpen = openSys === k;
                return (
                  <div key={k} className={`acc${isOpen ? ' open' : ''}`}>
                    <button type="button" className="acc-h" aria-expanded={isOpen} onClick={() => setOpenSys(isOpen ? '' : k)}>
                      <b>{sysName(k)}</b>
                      <span className="acc-meta">{done}/{markers.length} {L('con datos', 'filled')}{outs > 0 && <Badge tone="crit">{outs} {L('fuera de rango', 'out of range')}</Badge>}</span>
                      <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                    </button>
                    {isOpen && (
                      <div className="tablewrap">
                        <table className="lab-grid">
                          <thead>
                            <tr><th>{L('Marcador', 'Marker')}</th><th>{L('Normal', 'Normal')}</th>{TPS.map((_, i) => cps[i] && <th key={i} className="r">{tpName(i).replace(/ del vuelo| flight/, '')}</th>)}</tr>
                          </thead>
                          <tbody>
                            {markers.map((m) => {
                              const r = rangeOf(m);
                              return (
                                <tr key={m.code}>
                                  <td><b>{mkLabel(m)}</b><small>{m.unit}</small></td>
                                  <td className="num muted">{r.lo != null && r.hi != null ? `${num(r.lo, 2)}–${num(r.hi, 2)}` : '—'}</td>
                                  {TPS.map((_, i) => {
                                    if (!cps[i]) return null;
                                    const s = raw[m.code]?.[i] ?? ''; const v = parseNum(s);
                                    const bad = Number.isNaN(v); const out = v != null && !bad && r.lo != null && r.hi != null && (v < r.lo || v > r.hi);
                                    return (
                                      <td key={i} className="r">
                                        <input className={bad ? 'is-bad' : out ? 'is-out' : ''} inputMode="decimal" value={s} onChange={(e) => setCell(m.code, i, e.target.value)}
                                          aria-label={`${mkLabel(m)} · ${tpName(i)}`} aria-invalid={bad || undefined} title={bad ? L('Número no válido', 'Not a valid number') : out ? L('Fuera del rango normal', 'Outside the normal range') : undefined} />
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="note">
              {L(`${filled} de ${totalMarkers} marcadores con datos.`, `${filled} of ${totalMarkers} markers filled.`)}{' '}
              {invalid.length > 0 ? <b className="txt-crit">{L(`${invalid.length} valores no son números: corrígelos para continuar.`, `${invalid.length} values are not numbers: fix them to continue.`)}</b>
                : L('Los valores en naranja están fuera del rango normal del laboratorio.', 'Values in orange are outside the lab normal range.')}
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="review">
            <div className="review-cards">
              <div className="tile"><span>{L('Persona', 'Person')}</span><b>{name}</b><small>{sex === 'F' ? L('Mujer', 'Woman') : L('Hombre', 'Man')}{profile.age ? ` · ${profile.age} ${L('años', 'y/o')}` : ''}{profile.role ? ` · ${profile.role}` : ''}</small></div>
              <div className="tile"><span>{L('Análisis', 'Tests')}</span><b>{filled}</b><small>{L(`marcadores · ${cps.filter(Boolean).length} controles`, `markers · ${cps.filter(Boolean).length} checks`)}</small></div>
              <div className={`tile t-${preview?.outOfRange ? 'warn' : 'ok'}`}><span>{L('Fuera de rango', 'Out of range')}</span><b>{preview?.outOfRange ?? 0}</b><small>{L('valores', 'values')}</small></div>
              <div className={`tile t-${preCount >= 2 ? 'ok' : 'watch'}`}><span>{L('Línea base', 'Baseline')}</span><b>{preCount >= 2 ? L('Personal', 'Personal') : L('Provisional', 'Provisional')}</b>
                <small>{preCount >= 2 ? L(`${preCount} controles antes del vuelo`, `${preCount} checks before flight`) : L('se usa la referencia de la tripulación', 'crew reference is used')}</small></div>
            </div>
            {preview && (
              <>
                <span className="field-label">{L('Riesgo ASTRA estimado en cada control', 'Estimated ASTRA risk at each check')}</span>
                <div className="review-tl">
                  {preview.scores.map((g, i) => (
                    <div key={i} className={`rv t-${toneOf(lvlOfScore(g))}${g == null ? ' empty' : ''}`}>
                      <small>{i < FIRST_POST ? L('ANTES', 'BEFORE') : L('DESPUÉS', 'AFTER')}</small>
                      <span>{tpName(i).replace(/ (antes|después) del vuelo| (before|after) flight/, '')}</span>
                      <b>{g ?? '—'}</b>
                    </div>
                  ))}
                </div>
              </>
            )}
            {source === 'example' && <p className="note"><Badge tone="sim">{L('EJEMPLO SIMULADO', 'SIMULATED EXAMPLE')}</Badge> {L('Estos valores son de prueba, no de una persona real.', 'These values are for testing, not from a real person.')}</p>}
          </div>
        )}

        <div className="dlg-f">
          <span className="note">{L('Se guarda en la base de datos local y se sincroniza con el sistema online.', 'Saved in the local database and synced with the online system.')}</span>
          <div className="row-btns">
            {step > 0 ? <button type="button" className="btn-d" onClick={() => setStep(step - 1)}>{L('Atrás', 'Back')}</button>
              : <button type="button" className="btn-d" onClick={close}>{L('Cancelar', 'Cancel')}</button>}
            <button type="submit" className="btn-d primary" disabled={!canNext}>
              {step < 2 ? L('Siguiente', 'Next') : editId ? L('Guardar cambios', 'Save changes') : L('Añadir tripulante', 'Add crew member')}
            </button>
          </div>
        </div>
      </form>
    </dialog>
  );
}
