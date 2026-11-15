'use client';
// Sign-in for the online system. Posts to /auth/login (sets an httpOnly cookie) and goes back to where the user was.
import { useState, type FormEvent } from 'react';
import Logo from '@/components/site/Logo';
import ThemeIcon from '@/components/site/ThemeIcon';
import { usePrefs } from '@/lib/prefs';
import '@/components/app/dashboard.css';

export default function LoginForm() {
  const { L, lang, theme, toggleLang, toggleTheme } = usePrefs();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<'bad' | 'net' | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault(); if (busy) return;
    setBusy(true); setError(null);
    try {
      const r = await fetch('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
      if (!r.ok) { setError(r.status === 401 ? 'bad' : 'net'); setBusy(false); return; }
      // only same-site paths are accepted as the return address
      const next = new URLSearchParams(location.search).get('next') ?? '';
      location.assign(next.startsWith('/') && !next.startsWith('//') ? next : '/system');
    } catch { setError('net'); setBusy(false); }
  };

  return (
    <div className="dash auth-page">
      <div className="auth-top">
        <button type="button" className="icon-d" onClick={toggleLang} title={lang === 'en' ? 'Cambiar a español' : 'Switch to English'}>{lang === 'en' ? 'ES' : 'EN'}</button>
        <button type="button" className="icon-d" onClick={toggleTheme} aria-label={theme === 'dark' ? L('Modo claro', 'Light mode') : L('Modo oscuro', 'Dark mode')}><ThemeIcon theme={theme} /></button>
      </div>
      <main className="auth-card">
        <div className="auth-brand"><Logo href="/" size={34} /></div>
        <h1>{L('Iniciar sesión', 'Sign in')}</h1>
        <p className="auth-lead">{L('Acceso al sistema de salud de la tripulación.', 'Access to the crew health system.')}</p>
        <form onSubmit={submit} className="auth-form" noValidate>
          <label className="field">{L('Usuario', 'Username')}
            <input type="text" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required autoFocus
              value={username} onChange={(e) => { setUsername(e.target.value); setError(null); }} />
          </label>
          <label className="field">{L('Contraseña', 'Password')}
            <span className="auth-pass">
              <input type={show ? 'text' : 'password'} name="password" autoComplete="current-password" required
                value={password} onChange={(e) => { setPassword(e.target.value); setError(null); }} />
              <button type="button" className="auth-eye" onClick={() => setShow((s) => !s)} aria-label={show ? L('Ocultar contraseña', 'Hide password') : L('Mostrar contraseña', 'Show password')} aria-pressed={show}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={show ? 'M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.1A9.8 9.8 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3.2 3.9M6.6 6.6C3.9 8.4 2 12 2 12s4 7 10 7a9.6 9.6 0 0 0 5.4-1.6' : 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6z'} />
                </svg>
              </button>
            </span>
          </label>
          {error && (
            <p className="inline-msg t-crit" role="alert">
              {error === 'bad' ? L('Usuario o contraseña incorrectos.', 'Wrong username or password.') : L('No se pudo conectar con el servidor. Inténtalo de nuevo.', 'Could not reach the server. Try again.')}
            </p>
          )}
          <button type="submit" className="btn-d primary auth-submit" disabled={busy || !username || !password}>{busy ? L('Entrando…', 'Signing in…') : L('Entrar', 'Sign in')}</button>
        </form>
        <p className="note auth-foot">{L('La aplicación de escritorio funciona sin conexión y no pide inicio de sesión.', 'The desktop app works offline and does not ask you to sign in.')}</p>
      </main>
    </div>
  );
}
