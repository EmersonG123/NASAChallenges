'use client';
// Dashboard shell shared by the system modules: left sidebar (modules, sections of the current page, settings)
// and a slim top bar. On small screens the sidebar becomes a drawer.
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import Logo from '@/components/site/Logo';
import ThemeIcon from '@/components/site/ThemeIcon';
import { usePrefs } from '@/lib/prefs';
import { useHash } from '@/lib/useHash';
import { useTextSize } from '@/lib/settings';
import { exitSystem } from '@/components/settings/Settings';
import { SyncProvider } from '@/components/app/SyncContext';
import SyncStatus from '@/components/app/SyncStatus';
import './dashboard.css';

type Item = [href: string, es: string, en: string, icon: string];

const MODULES: Item[] = [
  ['/system', 'Salud de la tripulación', 'Crew health', 'M4 21V8l8-5 8 5v13M9 21v-6h6v6'],
  ['/system/fatigue', 'Fatiga y estrés', 'Fatigue & stress', 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6z'],
  ['/system/wellbeing', 'Sueño y bienestar', 'Sleep & wellbeing', 'M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z'],
  ['/system/monitor', 'Radiación y signos vitales', 'Radiation & vitals', 'M3 12h4l3-8 4 16 3-8h4'],
  ['/system/resources', 'Datos NASA', 'NASA data', 'M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zM4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3'],
];
/** views of a module (selected by hash) or anchors inside a long page */
const SECTIONS: Record<string, { label: [string, string]; views: boolean; items: Item[] }> = {
  '/system': { label: ['Vistas', 'Views'], views: true, items: [
    ['#resumen', 'Resumen', 'Overview', 'M12 3a3 3 0 1 1 0 6 3 3 0 0 1 0-6zM6 21v-5a6 6 0 0 1 12 0v5'],
    ['#alertas', 'Alertas y asistente', 'Alerts & assistant', 'M12 3l9 16H3zM12 10v4M12 17v.5'],
    ['#tripulacion', 'Comparar tripulación', 'Compare crew', 'M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM16 11a3 3 0 1 0 0-6M2 20a6 6 0 0 1 12 0M14 14a6 6 0 0 1 8 6'],
    ['#simulador', 'Simulador', 'Simulator', 'M4 20V10M10 20V4M16 20v-7M22 20H2'],
  ] },
  '/system/fatigue': { label: ['En esta página', 'On this page'], views: false, items: [
    ['#vision', 'Monitor de cámara', 'Camera monitor', 'M3 7h3l2-3h8l2 3h3v13H3zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'],
    ['#historial', 'Historial de sesiones', 'Session history', 'M12 8v4l3 2M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5'],
  ] },
  '/system/wellbeing': { label: ['Vistas', 'Views'], views: true, items: [
    ['#hoy', 'Registro de hoy', "Today's check-in", 'M5 5h14v15H5zM8 3v4M16 3v4M5 10h14M9 14l2 2 4-4'],
    ['#tendencias', 'Tendencias', 'Trends', 'M3 17l6-6 4 4 8-8M15 7h6v6'],
    ['#wearable', 'Importar wearable', 'Import wearable', 'M8 4h8l1 4v8l-1 4H8l-1-4V8zM12 9v3l2 1'],
  ] },
  '/system/monitor': { label: ['En esta página', 'On this page'], views: false, items: [
    ['#weather', 'Clima espacial', 'Space weather', 'M12 4v2M12 18v2M4 12h2M18 12h2M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8z'],
    ['#radiation', 'Radiación', 'Radiation', 'M12 12m-2 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0M12 2a10 10 0 0 1 8.7 5L14 10.5M3.3 7A10 10 0 0 1 12 2M12 22a10 10 0 0 1-8.7-5L10 13.5'],
    ['#vitals', 'Signos vitales', 'Vitals', 'M3 12h4l3-8 4 16 3-8h4'],
    ['#analog', 'Análogo de microgravedad', 'Microgravity analog', 'M12 3v18M5 8l7-5 7 5'],
    ['#m-alerts', 'Alertas', 'Alerts', 'M12 3l9 16H3zM12 10v4M12 17v.5'],
    ['#evidence', 'Evidencia NASA', 'NASA evidence', 'M5 4h11l3 3v13H5zM9 12h6M9 16h6'],
    ['#context', 'Contexto orbital', 'Orbital context', 'M12 12m-9 0a9 9 0 1 0 18 0 9 9 0 1 0-18 0M3 12h18'],
  ] },
};

const Icon = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
);

export default function AppShell({ children }: { children: ReactNode }) {
  const { lang, theme, toggleLang, toggleTheme, L } = usePrefs();
  // the desktop build uses trailing slashes (/system/); compare routes without them
  const path = usePathname().replace(/(.)\/$/, '$1');
  const [open, setOpen] = useState(false);
  const SETTINGS: Item = ['/system/settings', 'Ajustes', 'Settings', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z'];
  const current = [...MODULES, SETTINGS].find(([h]) => h === path) ?? MODULES[0];
  const textSize = useTextSize();
  const section = SECTIONS[path];
  const hash = useHash();
  // online system: who is signed in (the desktop app has no login)
  const [me, setMe] = useState<{ user: string; role: string } | null>(null);
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_ASTRA_TARGET === 'desktop') return;
    let live = true;
    const load = () => fetch('/auth/me').then((r) => (r.ok ? r.json() : null)).then((j) => { if (live && j?.user) setMe({ user: j.user, role: j.role }); }).catch(() => {});
    void load();
    window.addEventListener('astra-auth-change', load); // the account card changed the username
    return () => { live = false; window.removeEventListener('astra-auth-change', load); };
  }, []);
  const logout = async () => {
    try { await fetch('/auth/logout', { method: 'POST' }); } catch { /* offline: the cookie expires on its own */ }
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign('/login');
  };
  const ROLE: Record<string, [string, string]> = { admin: ['Administrador', 'Administrator'], operador: ['Operador', 'Operator'], lector: ['Lector', 'Viewer'] };

  // the drawer closes on navigation; Escape closes it too
  // eslint-disable-next-line react-hooks/set-state-in-effect -- reset UI state on route change
  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', esc); return () => document.removeEventListener('keydown', esc);
  }, []);

  return (
    <SyncProvider>
    <div className={`dash${open ? ' side-open' : ''}`} data-text={textSize}>
      <aside className="side" aria-label={L('Navegación del panel', 'Dashboard navigation')}>
        <div className="side-brand"><Logo href="/" size={28} /></div>
        <nav>
          <span className="side-label">{L('Módulos', 'Modules')}</span>
          {MODULES.map(([href, es, en, d]) => (
            <Link key={href} href={href} className={`side-link${href === path ? ' on' : ''}`} aria-current={href === path ? 'page' : undefined}>
              <Icon d={d} />{L(es, en)}
            </Link>
          ))}
          {section && <span className="side-label">{L(...section.label)}</span>}
          {section?.items.map(([href, es, en, d], i) => {
            const named = section.items.some(([h]) => h.slice(1) === hash);
            const on = section.views && (named ? hash === href.slice(1) : i === 0);
            return (
              <a key={href} href={href} className={`side-link sub${on ? ' on' : ''}`} aria-current={on ? 'page' : undefined} onClick={() => setOpen(false)}>
                <Icon d={d} />{L(es, en)}
              </a>
            );
          })}
        </nav>
        <div className="side-foot">
          {me && (
            <div className="side-user">
              <span className="avatar" aria-hidden="true">{me.user.slice(0, 2)}</span>
              <div><b>{me.user}</b><small>{ROLE[me.role] ? L(...ROLE[me.role]) : me.role}</small></div>
            </div>
          )}
          <Link href={SETTINGS[0]} className={`side-link${path === SETTINGS[0] ? ' on' : ''}`} aria-current={path === SETTINGS[0] ? 'page' : undefined}>
            <Icon d={SETTINGS[3]} />{L(SETTINGS[1], SETTINGS[2])}
          </Link>
          {me ? (
            <button type="button" className="side-link exit" onClick={() => void logout()}>
              <Icon d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h11" />{L('Cerrar sesión', 'Sign out')}
            </button>
          ) : (
            <button type="button" className="side-link exit" onClick={exitSystem}>
              <Icon d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h11" />{L('Salir', 'Exit')}
            </button>
          )}
        </div>
      </aside>
      <button type="button" className="side-scrim" aria-label={L('Cerrar menú', 'Close menu')} onClick={() => setOpen(false)} tabIndex={open ? 0 : -1} />

      <div className="dash-main">
        <header className="dash-top">
          <button type="button" className="icon-d burger-d" aria-label={L('Abrir menú', 'Open menu')} aria-expanded={open} onClick={() => setOpen(true)}>
            <Icon d="M4 7h16M4 12h16M4 17h16" />
          </button>
          <div className="crumbs"><Link href="/" className="crumb-home">ASTRA Health</Link><b>{L(current[1], current[2])}</b></div>
          <div className="top-actions">
            <SyncStatus />
            <button type="button" className="icon-d" onClick={toggleLang} title={lang === 'en' ? 'Cambiar a español' : 'Switch to English'}>{lang === 'en' ? 'ES' : 'EN'}</button>
            <button type="button" className="icon-d" onClick={toggleTheme} aria-label={theme === 'dark' ? L('Modo claro', 'Light mode') : L('Modo oscuro', 'Dark mode')}><ThemeIcon theme={theme} /></button>
          </div>
        </header>
        <main className="dash-body">{children}</main>
      </div>
    </div>
    </SyncProvider>
  );
}
