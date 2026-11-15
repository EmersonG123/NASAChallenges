'use client';
// Language and theme, shared by every page through one context. The choice is kept in localStorage,
// so moving between the landing and the system modules never resets it.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Lang = 'en' | 'es';
export type Theme = 'dark' | 'light';

interface Prefs {
  lang: Lang;
  theme: Theme;
  toggleLang: () => void;
  toggleTheme: () => void;
  /** pick the string for the current language */
  L: (es: string, en: string) => string;
  locale: string;
}

const Ctx = createContext<Prefs | null>(null);

const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } };

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('en');
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    // restore the visitor's choice after hydration (the layout script already set data-theme to avoid a flash)
    const l = read('astra-lang');
    const q = new URLSearchParams(location.search).get('theme');
    const t = q || read('astra-theme');
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync from browser storage
    if (l === 'es' || l === 'en') setLang(l);
    if (t === 'light' || t === 'dark') setTheme(t);
  }, []);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);

  const toggleLang = useCallback(() => setLang((p) => { const n = p === 'en' ? 'es' : 'en'; write('astra-lang', n); return n; }), []);
  const toggleTheme = useCallback(() => setTheme((p) => { const n = p === 'dark' ? 'light' : 'dark'; write('astra-theme', n); return n; }), []);

  const value = useMemo<Prefs>(() => ({
    lang, theme, toggleLang, toggleTheme,
    L: (es, en) => (lang === 'en' ? en : es),
    locale: lang === 'en' ? 'en-US' : 'es-ES',
  }), [lang, theme, toggleLang, toggleTheme]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePrefs(): Prefs {
  const v = useContext(Ctx);
  if (!v) throw new Error('usePrefs must be used inside <PrefsProvider>');
  return v;
}
