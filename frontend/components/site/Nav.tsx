'use client';
// Full navigation: brand, four dropdown groups with descriptions, language, theme and CTA.
// Transparent over the hero, solid after scrolling. On small screens it becomes a slide-down panel.
import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import Logo from '@/components/site/Logo';
import ThemeIcon from '@/components/site/ThemeIcon';
import { usePrefs } from '@/lib/prefs';
import { T } from '@/lib/i18n';

const Chevron = () => (
  <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true"><path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
const isExternal = (href: string) => href.startsWith('http');

function useScrolled(px = 40) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > px);
    on(); window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, [px]);
  return scrolled;
}

export default function Nav({ href }: { href: string }) {
  const { lang, theme, toggleLang, toggleTheme } = usePrefs();
  const t = T[lang];
  const scrolled = useScrolled();
  const [open, setOpen] = useState(-1);      // desktop dropdown index
  const [mobile, setMobile] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const close = (e: PointerEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(-1); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(-1); setMobile(false); } };
    document.addEventListener('pointerdown', close); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', esc); };
  }, []);
  useEffect(() => { document.body.style.overflow = mobile ? 'hidden' : ''; }, [mobile]);

  const done = () => { setOpen(-1); setMobile(false); };
  const link = (href: string, children: ReactNode, role?: string) => {
    if (isExternal(href)) return <a href={href} target="_blank" rel="noopener noreferrer" onClick={done} role={role}>{children}</a>;
    if (href.startsWith('#')) return <a href={href} onClick={done} role={role}>{children}</a>;
    return <Link href={href} onClick={done} role={role}>{children}</Link>;
  };
  const item = (href: string, title: string, desc: string) => <><b>{title}{isExternal(href) ? ' ↗' : ''}</b><small>{desc}</small></>;
  const themeLabel = theme === 'dark' ? t.nav.light : t.nav.dark;

  return (
    <nav ref={ref} className={`nav${scrolled || mobile ? ' scrolled' : ''}${mobile ? ' is-open' : ''}`} aria-label="Main">
      <div className="wrap">
        <Logo onClick={() => setMobile(false)} />

        <ul className="menu">
          {t.menu.map((g, i) => (
            <li key={g.label} className={`menu-item${open === i ? ' open' : ''}`} onMouseEnter={() => setOpen(i)} onMouseLeave={() => setOpen(-1)}>
              <button type="button" className="menu-btn" aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)}>
                {g.label} <Chevron />
              </button>
              <div className="dropdown" role="menu">
                {g.items.map(([href, title, desc]) => <span key={title} role="none">{link(href, item(href, title, desc), 'menuitem')}</span>)}
              </div>
            </li>
          ))}
        </ul>

        <div className="nav-actions">
          <button type="button" className="btn sm langbtn" onClick={toggleLang} title={t.nav.langTitle} aria-label={t.nav.langTitle}>{t.nav.lang}</button>
          <button type="button" className="btn iconbtn" onClick={toggleTheme} aria-label={themeLabel} title={themeLabel}><ThemeIcon theme={theme} /></button>
          <Link className="btn primary sm nav-cta" href={href}>{t.nav.demo}</Link>
          <button type="button" className="btn iconbtn burger" aria-expanded={mobile} aria-label={mobile ? t.menuClose : t.menuOpen} onClick={() => setMobile(!mobile)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">{mobile ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}</svg>
          </button>
        </div>
      </div>

      {mobile && (
        <div className="mobile-panel">
          {t.menu.map((g) => (
            <div key={g.label} className="mobile-group">
              <span className="eyebrow">{g.label}</span>
              {g.items.map(([href, title, desc]) => <span key={title}>{link(href, item(href, title, desc))}</span>)}
            </div>
          ))}
          <Link className="btn primary" href={href} onClick={done}>{t.nav.demo}</Link>
        </div>
      )}
    </nav>
  );
}
