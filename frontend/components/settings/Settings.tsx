'use client';
// Settings: appearance, monitoring, connection & sync, data & privacy, about, and exit.
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Badge, Card, type Tone } from '@/components/app/ui';
import Account from '@/components/settings/Account';
import { useSync } from '@/components/app/SyncContext';
import { desktop, isDesktop, onlineBase, setOnlineBase, setSyncToken, syncToken } from '@/lib/platform';
import { usePrefs } from '@/lib/prefs';
import { setRemind, setTextSize, useRemind, useTextSize } from '@/lib/settings';

/** leave the system: closes the desktop app, or returns to the landing on the web */
export function exitSystem() {
  const d = desktop();
  // a full page load on purpose: leaving the system resets every module's state
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  if (d) void d.quit(); else window.location.assign('/');
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="set-row">
      <div><b>{label}</b>{hint && <small>{hint}</small>}</div>
      <div className="set-ctl">{children}</div>
    </div>
  );
}

export default function Settings() {
  const { L, lang, theme, toggleLang, toggleTheme } = usePrefs();
  const s = useSync();
  const text = useTextSize();
  const remind = useRemind();
  const [url, setUrl] = useState('');
  const [token, setToken] = useState('');
  // stored values are read in the browser after mount (the page is prerendered)
  // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read from browser storage
  useEffect(() => { setUrl(onlineBase()); setToken(syncToken()); }, []);
  const [saved, setSaved] = useState(false);

  const tone: Tone = s.conn === 'online' ? (s.pending ? 'watch' : 'ok') : s.conn === 'offline' ? 'warn' : 'none';
  const status = s.syncing ? L('Sincronizando…', 'Syncing…') : s.conn === 'offline' ? L('Sin conexión · modo local', 'Offline · local mode')
    : s.conn === 'checking' ? L('Comprobando', 'Checking') : s.pending ? L(`${s.pending} cambios por subir`, `${s.pending} changes to upload`) : L('Sincronizado', 'Synced');
  const saveConn = () => { if (isDesktop()) setOnlineBase(url); setSyncToken(token); setSaved(true); void s.run(); };

  return (
    <div className="page settings">
      <header className="page-head">
        <div>
          <h1>{L('Ajustes', 'Settings')}</h1>
          <p>{L('Preferencias de este equipo, conexión con el sistema online y datos.', 'Preferences for this device, connection to the online system and data.')}</p>
        </div>
      </header>

      <div className="grid-2">
        <Account />
        <Card title={L('Apariencia', 'Appearance')}>
          <Row label={L('Idioma', 'Language')}>
            <div className="seg compact" role="group" aria-label={L('Idioma', 'Language')}>
              <button type="button" aria-pressed={lang === 'es'} onClick={() => lang !== 'es' && toggleLang()}>Español</button>
              <button type="button" aria-pressed={lang === 'en'} onClick={() => lang !== 'en' && toggleLang()}>English</button>
            </div>
          </Row>
          <Row label={L('Tema', 'Theme')}>
            <div className="seg compact" role="group" aria-label={L('Tema', 'Theme')}>
              <button type="button" aria-pressed={theme === 'light'} onClick={() => theme !== 'light' && toggleTheme()}>{L('Claro', 'Light')}</button>
              <button type="button" aria-pressed={theme === 'dark'} onClick={() => theme !== 'dark' && toggleTheme()}>{L('Oscuro', 'Dark')}</button>
            </div>
          </Row>
          <Row label={L('Tamaño del texto', 'Text size')} hint={L('Más grande para leer en movimiento o con poca luz.', 'Larger for reading on the move or in low light.')}>
            <div className="seg compact" role="group" aria-label={L('Tamaño del texto', 'Text size')}>
              <button type="button" aria-pressed={text === 'normal'} onClick={() => setTextSize('normal')}>{L('Normal', 'Normal')}</button>
              <button type="button" aria-pressed={text === 'large'} onClick={() => setTextSize('large')}>{L('Grande', 'Large')}</button>
            </div>
          </Row>
        </Card>

        <Card title={L('Monitoreo', 'Monitoring')}>
          <Row label={L('Recordatorio del registro diario', 'Daily check-in reminder')} hint={L('Aviso en «Bienestar y sueño» si hoy aún no hay registro.', 'Notice in “Wellbeing & sleep” when there is no check-in yet today.')}>
            <button type="button" className={`switch${remind ? ' on' : ''}`} role="switch" aria-checked={remind} onClick={() => setRemind(!remind)}><i /></button>
          </Row>
          <Row label={L('Cámara', 'Camera')} hint={L('Las imágenes de ASTRA Vision se analizan en este equipo y nunca se envían ni se guardan.', 'ASTRA Vision images are analysed on this device and are never sent or stored.')}>
            <Badge tone="ok">{L('EN EL DISPOSITIVO', 'ON DEVICE')}</Badge>
          </Row>
        </Card>

        <Card title={L('Conexión y sincronización', 'Connection & sync')} aside={<Badge tone={tone}>{status}</Badge>}>
          <p className="dcard-lead">{isDesktop()
            ? L('La app funciona sin internet y sincroniza sola al volver la conexión.', 'The app works offline and syncs by itself when the connection returns.')
            : L('Versión online: se sincroniza con el servidor de este sitio.', 'Online version: syncs with this site’s server.')}</p>
          <div className="form-grid">
            {isDesktop() && (
              <label className="field span2">{L('Dirección del sistema online', 'Online system address')}
                <input value={url} onChange={(e) => { setUrl(e.target.value); setSaved(false); }} placeholder="https://astra.example.org" inputMode="url" spellCheck={false} />
              </label>
            )}
            <label className="field span2">{L('Token de acceso (si el servidor lo pide)', 'Access token (if the server requires it)')}
              <input type="password" value={token} onChange={(e) => { setToken(e.target.value); setSaved(false); }} autoComplete="off" spellCheck={false} />
            </label>
          </div>
          <div className="row-btns set-actions">
            <button type="button" className="btn-d" onClick={saveConn}>{saved ? L('Guardado ✓', 'Saved ✓') : L('Guardar conexión', 'Save connection')}</button>
            <button type="button" className="btn-d primary" disabled={s.syncing} onClick={() => void s.run()}>{L('Sincronizar ahora', 'Sync now')}</button>
          </div>
          {s.error === 'token' && <p className="inline-msg t-crit">{L('El servidor rechazó el token de acceso.', 'The server rejected the access token.')}</p>}
        </Card>

        <Card title={L('Datos y privacidad', 'Data & privacy')}>
          <Row label={L('Base de datos local', 'Local database')} hint={s.storage.location}>
            <Badge tone="info">{s.storage.kind === 'sqlite' ? 'SQLite' : L('Navegador', 'Browser')}</Badge>
          </Row>
          <Row label={L('Cambios por subir', 'Changes to upload')}><b className="mono">{s.pending}</b></Row>
          <Row label={L('Exportar mis datos', 'Export my data')} hint={L('Tripulantes, sesiones y registros diarios en CSV.', 'Crew, sessions and daily entries as CSV.')}>
            <Link className="btn-d sm" href="/system/resources">{L('Ir a exportar', 'Go to export')}</Link>
          </Row>
          <p className="note">{L('Sin cuentas: cualquiera con acceso a este equipo ve sus datos. Para uso real, protege el servidor con un token y el equipo con su contraseña.', 'No accounts: anyone with access to this device sees its data. For real use, protect the server with a token and the device with its password.')}</p>
        </Card>

        <Card title={L('Acerca de', 'About')}>
          <Row label="ASTRA Health" hint={L('Monitoreo de salud de la tripulación con datos reales de la NASA.', 'Crew health monitoring with real NASA data.')}>
            <span className="mono">{s.appVersion ? `v${s.appVersion}` : L('versión web', 'web version')}</span>
          </Row>
          {s.update ? (
            <Row label={L(`Nueva versión ${s.update.version}`, `New version ${s.update.version}`)} hint={s.update.notes}>
              {s.update.url && <button type="button" className="btn-d sm primary" onClick={() => void desktop()?.openExternal(s.update!.url!)}>{L('Descargar', 'Download')}</button>}
            </Row>
          ) : isDesktop() && <Row label={L('Actualizaciones', 'Updates')}><Badge tone="ok">{L('AL DÍA', 'UP TO DATE')}</Badge></Row>}
          {!isDesktop() && (
            <Row label={L('App de escritorio', 'Desktop app')} hint={L('Monitoreo sin internet en Windows.', 'Offline monitoring on Windows.')}>
              <a className="btn-d sm" href="/downloads/ASTRA-Health-Setup.exe" download>{L('Descargar', 'Download')}</a>
            </Row>
          )}
        </Card>

        <Card title={L('Salir', 'Exit')} className="exit-card">
          <p className="dcard-lead">{isDesktop()
            ? L('Cierra la aplicación. Tus datos quedan guardados en este equipo y se sincronizan al volver a abrirla con conexión.', 'Closes the app. Your data stays on this device and syncs when you open it again with a connection.')
            : L('Vuelve a la portada de ASTRA Health. Tus datos quedan guardados en este navegador.', 'Returns to the ASTRA Health home page. Your data stays in this browser.')}</p>
          <div className="row-btns"><button type="button" className="btn-d danger" onClick={exitSystem}>{isDesktop() ? L('Cerrar ASTRA', 'Close ASTRA') : L('Salir del sistema', 'Exit the system')}</button></div>
        </Card>
      </div>
    </div>
  );
}
