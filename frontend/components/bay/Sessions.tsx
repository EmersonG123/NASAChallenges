'use client';
// Monitoring history: every ASTRA Vision session saved in the local database (works offline, syncs later).
import { useCallback, useEffect, useState } from 'react';
import { Badge, Card, toneOf } from '@/components/app/ui';
import { useBay } from '@/components/bay/BayContext';
import { lvlOfScore } from '@/lib/bay/model';
import { useBayText } from '@/lib/bay/text';
import { getStore, removeRow, STORE_EVENT } from '@/lib/store';
import type { Local, SessionRecord } from '@/lib/store/types';

export default function Sessions() {
  const { crew } = useBay();
  const { L, loc, crewLabel } = useBayText();
  const [rows, setRows] = useState<Local<SessionRecord>[]>([]);
  const [all, setAll] = useState(false);

  const load = useCallback(async () => { setRows(await getStore().list('sessions')); }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async read from the local database (state is set after await)
    void load();
    const on = () => void load();
    window.addEventListener(STORE_EVENT, on);
    return () => window.removeEventListener(STORE_EVENT, on);
  }, [load]);

  const shown = (all ? rows : rows.filter((r) => r.crew_id === crew)).slice(0, 12);
  const when = (ms: number) => new Date(ms).toLocaleString(loc, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  const dur = (a: number, b: number) => { const s = Math.max(1, Math.round((b - a) / 1000)); return s < 60 ? `${s} s` : `${Math.round(s / 60)} min`; };
  const MODE = { camera: L('Cámara', 'Camera'), file: L('Video', 'Video'), demo: L('Simulación', 'Simulation') };

  return (
    <Card id="historial" title={L('Historial de monitoreo', 'Monitoring history')}
      aside={(
        <div className="seg compact" role="group" aria-label={L('Filtro', 'Filter')}>
          <button type="button" aria-pressed={!all} onClick={() => setAll(false)}>{crewLabel(crew)}</button>
          <button type="button" aria-pressed={all} onClick={() => setAll(true)}>{L('Todos', 'Everyone')}</button>
        </div>
      )}
      lead={L('Cada sesión de ASTRA Vision se guarda en la base de datos local, también sin internet, y se sube al sistema online cuando hay conexión.',
        'Every ASTRA Vision session is saved in the local database, also offline, and uploaded to the online system when there is a connection.')}>
      {!shown.length ? (
        <p className="empty-state">{L('Todavía no hay sesiones. Activa la cámara, analiza un video o mira la simulación en «Fatiga y estrés»; al detenerla se guarda aquí.',
          'No sessions yet. Turn on the camera, analyze a video or watch the simulation in “Fatigue & stress”; when it stops it is saved here.')}</p>
      ) : (
        <div className="tablewrap">
          <table className="kv">
            <thead>
              <tr>
                <th>{L('Fecha', 'Date')}</th>{all && <th>{L('Persona', 'Person')}</th>}<th>{L('Fuente', 'Source')}</th>
                <th className="r">{L('Duración', 'Length')}</th><th className="r">{L('Fatiga', 'Fatigue')}</th><th className="r">{L('Estrés', 'Stress')}</th>
                <th className="r hide-s">{L('Picos', 'Peaks')}</th><th>{L('Estado', 'Status')}</th><th aria-label={L('Acciones', 'Actions')} />
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id}>
                  <td className="num">{when(r.started_at)}</td>
                  {all && <td>{crewLabel(r.crew_id)}</td>}
                  <td>{r.mode === 'demo' ? <Badge tone="sim">{MODE.demo}</Badge> : MODE[r.mode]}</td>
                  <td className="num">{dur(r.started_at, r.ended_at)}</td>
                  <td className="num"><Badge tone={toneOf(lvlOfScore(r.fatigue))}>{r.fatigue ?? '–'}</Badge></td>
                  <td className="num"><Badge tone={toneOf(lvlOfScore(r.stress))}>{r.stress ?? '–'}</Badge></td>
                  <td className="num hide-s">{r.peak_fatigue ?? '–'} / {r.peak_stress ?? '–'}</td>
                  <td>{r.dirty ? <Badge tone="watch">{L('POR SUBIR', 'TO UPLOAD')}</Badge> : <Badge tone="ok">{L('SINCRONIZADA', 'SYNCED')}</Badge>}</td>
                  <td>
                    <button type="button" className="icon-d sm" aria-label={L('Borrar sesión', 'Delete session')} onClick={() => void removeRow('sessions', r.id)}>
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
