'use client';
// Settings > Account (online system only): change your own username and/or password.
// Needs the current password; the server keeps the change in its users file (not available on Vercel).
import { useEffect, useState, type FormEvent } from 'react';
import { Badge, Card } from '@/components/app/ui';
import { usePrefs } from '@/lib/prefs';

type Err = 'current' | 'taken' | 'invalid' | 'readonly' | 'io' | 'net' | 'match' | 'nothing';

export default function Account() {
  const { L } = usePrefs();
  const [info, setInfo] = useState<{ user: string; role: string; writable: boolean } | null>(null);
  const [username, setUsername] = useState('');
  const [current, setCurrent] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<Err | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_ASTRA_TARGET === 'desktop') return;
    let live = true;
    fetch('/auth/credentials').then((r) => (r.ok ? r.json() : null)).then((j) => {
      if (live && j?.user) { setInfo(j); setUsername(j.user); }
    }).catch(() => {});
    return () => { live = false; };
  }, []);
  if (!info) return null; // desktop app or not signed in

  const nameChanged = username.trim() !== info.user;
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setErr(null); setDone(false);
    if (!nameChanged && !pw) { setErr('nothing'); return; }
    if (pw && pw !== pw2) { setErr('match'); return; }
    setBusy(true);
    try {
      const r = await fetch('/auth/credentials', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current, ...(nameChanged ? { username: username.trim() } : {}), ...(pw ? { password: pw } : {}) }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setErr((j.error as Err) ?? 'io'); setBusy(false); return; }
      setInfo((i) => (i ? { ...i, user: j.user } : i)); setUsername(j.user);
      setCurrent(''); setPw(''); setPw2(''); setDone(true);
      // the sidebar reads the user once: refresh it so the new name shows everywhere
      window.dispatchEvent(new Event('astra-auth-change'));
    } catch { setErr('net'); }
    setBusy(false);
  };

  const MSG: Record<Err, string> = {
    current: L('La contraseña actual no es correcta.', 'The current password is not correct.'),
    taken: L('Ese nombre de usuario ya existe.', 'That username already exists.'),
    invalid: L('Usuario de 3 a 32 caracteres (letras, números, punto, guion) y contraseña de al menos 6.', 'Username of 3 to 32 characters (letters, numbers, dot, dash) and a password of at least 6.'),
    readonly: L('Este servidor no puede guardar cambios de credenciales.', 'This server cannot save credential changes.'),
    io: L('No se pudo guardar el cambio en el servidor.', 'The change could not be saved on the server.'),
    net: L('No se pudo conectar con el servidor.', 'Could not reach the server.'),
    match: L('Las dos contraseñas nuevas no coinciden.', 'The two new passwords do not match.'),
    nothing: L('Cambia el usuario o escribe una contraseña nueva.', 'Change the username or type a new password.'),
  };
  const ROLE: Record<string, [string, string]> = { admin: ['Administrador', 'Administrator'], operador: ['Operador', 'Operator'], lector: ['Lector', 'Viewer'] };

  return (
    <Card title={L('Cuenta', 'Account')} aside={<Badge tone="info">{ROLE[info.role] ? L(...ROLE[info.role]) : info.role}</Badge>}
      lead={L('Cambia tu usuario o tu contraseña. Para confirmar que eres tú, se pide la contraseña actual.', 'Change your username or password. Your current password is required to confirm it is you.')}>
      {!info.writable ? (
        <p className="inline-msg t-watch">{L('Para cambiar credenciales desde aquí, el servidor necesita dónde guardarlas: en Vercel, conecta una base Redis (Storage → Upstash Redis) y vuelve a desplegar.', 'To change credentials here the server needs somewhere to keep them: on Vercel, connect a Redis database (Storage → Upstash Redis) and redeploy.')}</p>
      ) : (
        <form className="acct-form" onSubmit={submit} noValidate>
          <label className="field">{L('Usuario', 'Username')}
            <input type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} maxLength={32}
              value={username} onChange={(e) => { setUsername(e.target.value); setErr(null); setDone(false); }} />
          </label>
          <div className="acct-two">
            <label className="field">{L('Contraseña nueva', 'New password')}
              <input type={show ? 'text' : 'password'} autoComplete="new-password" maxLength={128} placeholder={L('Déjala vacía para no cambiarla', 'Leave empty to keep it')}
                value={pw} onChange={(e) => { setPw(e.target.value); setErr(null); setDone(false); }} />
            </label>
            <label className="field">{L('Repetir contraseña nueva', 'Repeat new password')}
              <input type={show ? 'text' : 'password'} autoComplete="new-password" maxLength={128} disabled={!pw}
                value={pw2} onChange={(e) => { setPw2(e.target.value); setErr(null); }} />
            </label>
          </div>
          {pw && pw.length < 6 && <span className="note">{L('Mínimo 6 caracteres.', 'At least 6 characters.')}</span>}
          <label className="acct-show"><input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> {L('Mostrar contraseñas', 'Show passwords')}</label>
          <label className="field">{L('Contraseña actual', 'Current password')}
            <input type="password" autoComplete="current-password" maxLength={128} required
              value={current} onChange={(e) => { setCurrent(e.target.value); setErr(null); }} />
          </label>
          {err && <p className="inline-msg t-crit" role="alert">{MSG[err]}</p>}
          {done && <p className="inline-msg t-ok" role="status">{L('Credenciales actualizadas. Úsalas la próxima vez que inicies sesión.', 'Credentials updated. Use them next time you sign in.')}</p>}
          <div className="acct-actions">
            <button type="submit" className="btn-d primary" disabled={busy || !current || (!nameChanged && !pw)}>{busy ? L('Guardando…', 'Saving…') : L('Guardar cambios', 'Save changes')}</button>
          </div>
        </form>
      )}
    </Card>
  );
}
