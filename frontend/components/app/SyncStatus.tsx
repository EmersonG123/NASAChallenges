'use client';
// Connection pill in the top bar + a panel with storage, server address, manual sync and app updates.
import { useRef, useState } from 'react';
import { Badge, type Tone } from '@/components/app/ui';
import { useSync } from '@/components/app/SyncContext';
import { desktop, isDesktop, onlineBase, setOnlineBase, setSyncToken, syncToken } from '@/lib/platform';
import { usePrefs } from '@/lib/prefs';

function ago(ms: number, L: (es: string, en: string) => string) {
  const s = Math.round((Date.now() - ms) / 1000);
  if (s < 60) return L('hace un momento', 'just now');
  const m = Math.round(s / 60); if (m < 60) return L(`hace ${m} min`, `${m} min ago`);
  const h = Math.round(m / 60); if (h < 48) return L(`hace ${h} h`, `${h} h ago`);
  return L(`hace ${Math.round(h / 24)} días`, `${Math.round(h / 24)} days ago`);
}

export default function SyncStatus() {
  const { L } = usePrefs();
  const s = useSync();
  const dlg = useRef<HTMLDialogElement>(null);
  const [url, setUrl] = useState('');
  const [token, setToken] = useState('');

  const tone: Tone = s.conn === 'online' ? (s.pending ? 'watch' : 'ok') : s.conn === 'offline' ? 'warn' : 'none';
  const label = s.syncing ? L('Sincronizando…', 'Syncing…')
    : s.conn === 'checking' ? L('Comprobando conexión', 'Checking connection')
      : s.conn === 'offline' ? L('Sin conexión · modo local', 'Offline · local mode')
        : s.pending ? L(`${s.pending} cambios por subir`, `${s.pending} changes to upload`)
          : L('Sincronizado', 'Synced');

  const open = () => { setUrl(onlineBase()); setToken(syncToken()); dlg.current?.showModal(); };
  const saveUrl = () => { if (isDesktop()) setOnlineBase(url); setSyncToken(token); void s.run(); };

  return (
    <>
      <button type="button" className={`sync-pill t-${tone}`} onClick={open} aria-label={`${label}. ${L('Abrir ajustes de conexión', 'Open connection settings')}`}>
        <span className={`sync-dot${s.syncing ? ' spin' : ''}`} aria-hidden="true" />
        <span className="sync-label">{label}</span>
        {s.update && <Badge tone="info">{L('Actualización', 'Update')}</Badge>}
      </button>

      <dialog ref={dlg} className="dlg" aria-labelledby="sync-title" onClick={(e) => { if (e.target === dlg.current) dlg.current?.close(); }}>
        <div className="dlg-in">
          <div className="dlg-h">
            <h2 id="sync-title">{L('Conexión y datos', 'Connection & data')}</h2>
            <button type="button" className="icon-d" aria-label={L('Cerrar', 'Close')} onClick={() => dlg.current?.close()}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
          <p className="dcard-lead">{isDesktop()
            ? L('La app funciona sin internet: todo se guarda en una base de datos SQLite en este equipo. Cuando hay conexión, se sincroniza sola con el sistema online.',
              'The app works without internet: everything is stored in a SQLite database on this computer. When there is a connection, it syncs with the online system by itself.')
            : L('Versión online. Los datos se guardan en este navegador y se sincronizan con el servidor. Para monitorear sin internet, instala la app de escritorio.',
              'Online version. Data is kept in this browser and synced with the server. To monitor without internet, install the desktop app.')}</p>

          <table className="kv">
            <tbody>
              <tr><td>{L('Estado', 'Status')}</td><td><Badge tone={tone}>{label}</Badge></td></tr>
              <tr><td>{L('Última sincronización', 'Last sync')}</td><td>{s.lastSync ? ago(s.lastSync, L) : L('todavía no', 'not yet')}</td></tr>
              <tr><td>{L('Cambios por subir', 'Changes to upload')}</td><td className="num">{s.pending}</td></tr>
              <tr><td>{L('Base de datos local', 'Local database')}</td><td><b>{s.storage.kind === 'sqlite' ? 'SQLite' : L('Navegador', 'Browser')}</b><small className="path">{s.storage.location}</small></td></tr>
              {s.appVersion && <tr><td>{L('Versión de la app', 'App version')}</td><td className="num">{s.appVersion}</td></tr>}
            </tbody>
          </table>

          <div className="dlg-grid two">
            {isDesktop() && (
              <label className="field">{L('Dirección del sistema online', 'Online system address')}
                <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://astra.example.org" inputMode="url" spellCheck={false} />
              </label>
            )}
            <label className="field">{L('Token de acceso (si el servidor lo pide)', 'Access token (if the server requires it)')}
              <input type="password" value={token} onChange={(e) => setToken(e.target.value)} autoComplete="off" spellCheck={false} />
            </label>
          </div>
          <div className="row-btns"><button type="button" className="btn-d" onClick={saveUrl}>{L('Guardar conexión', 'Save connection')}</button></div>

          {s.update && (
            <div className="dlg-result t-info" role="status">
              <p><b>{L(`Nueva versión ${s.update.version} disponible`, `New version ${s.update.version} available`)}</b></p>
              {s.update.notes && <p>{s.update.notes}</p>}
              {s.update.url && <p><button type="button" className="btn-d sm primary" onClick={() => void desktop()?.openExternal(s.update!.url!)}>{L('Descargar instalador', 'Download installer')}</button></p>}
            </div>
          )}
          {s.error === 'token' && <p className="note">{L('El servidor rechazó el token de acceso. Revísalo arriba.', 'The server rejected the access token. Check it above.')}</p>}
          {s.conn === 'offline' && s.error && s.error !== 'token' && <p className="note">{L('El servidor no responde; los cambios quedan guardados y se subirán al volver la conexión.', 'The server is not responding; changes stay saved and will upload when the connection returns.')}</p>}

          <div className="dlg-f">
            <span className="note">{L('Sincroniza al abrir, al volver la conexión, tras cada cambio y cada minuto.', 'Syncs on start, when the connection returns, after each change and every minute.')}</span>
            <button type="button" className="btn-d primary" disabled={s.syncing} onClick={() => void s.run()}>{L('Sincronizar ahora', 'Sync now')}</button>
          </div>
        </div>
      </dialog>
    </>
  );
}
