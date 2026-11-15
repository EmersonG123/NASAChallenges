'use client';
// Landing sections. Each one reads the copy for the current language from the shared prefs context.
import Image from 'next/image';
import Link from 'next/link';
import GlyphIcon from '@/components/site/GlyphIcon';
import Phases from '@/components/site/Phases';
import Twin from '@/components/twin/Twin';
import { Mark } from '@/components/site/Logo';
import { usePrefs, type Lang } from '@/lib/prefs';
import { SRC, T } from '@/lib/i18n';

export const SYSTEM = '/system';
type Copy = (typeof T)[Lang];

const STRIP_IMG = ['/img/c-osd569.jpg', '/img/c-osd575.jpg', '/img/c-donki.jpg', '/img/c-vision.jpg'];
const STRIP_HREF = [SRC.osd569, SRC.osd575, SRC.donki, '#vision'];
const ext = (href: string) => (href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {});

function useCopy(): [Copy, Lang] {
  const { lang } = usePrefs();
  return [T[lang], lang];
}

function Stat({ v, t, s, href, label }: { v: string; t: string; s: string; href: string; label: string }) {
  return (
    <div className="stat">
      <b>{v}</b>
      <span>{t}</span>
      <a href={href} target="_blank" rel="noopener noreferrer">{label}: {s} ↗</a>
    </div>
  );
}

function SecHead({ eyebrow, title, lede, style }: { eyebrow: string; title: string; lede?: string; style?: React.CSSProperties }) {
  return (
    <div className="sec-head" style={style}>
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      {lede && <p>{lede}</p>}
    </div>
  );
}

export function Hero() {
  const [t] = useCopy();
  return (
    <header className="hero hero-split">
      <div className="hero-bg" aria-hidden="true" />
      <div className="wrap hero-grid">
        <div className="hero-copy">
          <h1>{t.hero.title.split(' ').map((w, i, a) => (i >= a.length - 2 ? <em key={i}>{w} </em> : w + ' '))}</h1>
          <p className="lede">{t.hero.lede}</p>
          <div className="ctas">
            <Link className="btn primary lg" href={SYSTEM}>{t.hero.cta1}</Link>
            <a className="btn ghost lg" href="#problema">{t.hero.cta2}</a>
          </div>
          <div className="hero-proof">
            {t.hero.proof.map(([v, s]) => <div key={v}><b>{v}</b><span>{s}</span></div>)}
          </div>
        </div>
        <div className="hero-visual">
          <div className="hud" aria-hidden="true"><i /><i /><i /></div>
          <Twin t={t.twin} labels={false} uid="hero" />
          {t.hero.cards.map(([k, v, s], i) => (
            <div className={`fcard f${i + 1}`} key={k}>
              <span>{k}</span><b>{v}</b><small>{s}</small>
            </div>
          ))}
        </div>
      </div>
    </header>
  );
}

export function MissionBar() {
  const [t] = useCopy();
  return (
    <>
      <div className="missionbar">
        <div className="wrap">
          {t.hero.mission.map(([v, s]) => <div key={s}><b>{v}</b><span>{s}</span></div>)}
        </div>
      </div>
      <div className="strip">
        <div className="wrap">
          <span className="strip-label">{t.strip.label}</span>
          <div className="strip-grid">
            {t.strip.items.map(([title, desc], i) => (
              <a className="strip-item" key={title} href={STRIP_HREF[i]} {...ext(STRIP_HREF[i])}>
                <Image src={STRIP_IMG[i]} alt="" width={96} height={96} sizes="96px" />
                <span><b>{title}</b><span>{desc}</span></span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

export function Problem() {
  const [t] = useCopy();
  const p = t.problem;
  const card = (tag: string, title: string, text: React.ReactNode, stats: string[][]) => (
    <article className="card">
      <span className="eyebrow">{tag}</span>
      <h3 style={{ marginTop: 8 }}>{title}</h3>
      <p>{text}</p>
      <div className="stats">{stats.map(([v, d, s, k]) => <Stat key={d} v={v} t={d} s={s} href={SRC[k]} label={p.source} />)}</div>
    </article>
  );
  return (
    <section id="problema">
      <div className="wrap">
        <SecHead eyebrow={p.eyebrow} title={p.title} />
        <div className="cols2">
          {card(p.gTag, p.gTitle, p.gText, p.gStats)}
          {card(p.sTag, p.sTitle, p.sText, p.sStats)}
        </div>
      </div>
    </section>
  );
}

export function TwinSection() {
  const [t, lang] = useCopy();
  return (
    <section id="twin" className="twin-band">
      <div className="wrap twin">
        <div>
          <SecHead eyebrow={t.twin.eyebrow} title={t.twin.title} lede={t.twin.lede} />
          <div className="stats">
            {t.twin.points.map(([v, d]) => <div className="stat" key={d}><b>{v}</b><span>{d}</span></div>)}
          </div>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 16 }}>{t.twin.legend}</p>
          <Link className="btn primary" href={SYSTEM} style={{ marginTop: 24 }}>{t.hero.cta1}</Link>
        </div>
        <div className="readout">
          <div className="readout-head"><span className="rec" />{t.twin.readTitle}</div>
          <ul>
            {t.twin.rows.map(([name, sys, v, n]) => {
              const num = Number(v), up = num > 0;
              return (
                <li key={String(name)}>
                  <span className="r-name"><b>{name}</b><small>{sys}</small></span>
                  <span className="r-bar"><i className={up ? 'up' : 'down'} style={{ width: `${Math.min(100, Math.abs(num) / 50 * 100)}%` }} /></span>
                  <span className={`r-val ${up ? 'up' : 'down'}`}>{up ? '+' : '−'}{Math.abs(num).toLocaleString(lang === 'en' ? 'en-US' : 'es-ES')}%</span>
                  <span className="r-n">{n}</span>
                </li>
              );
            })}
          </ul>
          <p>{t.twin.rowsNote}</p>
        </div>
      </div>
    </section>
  );
}

export function Solution() {
  const [t, lang] = useCopy();
  const s = t.solution;
  return (
    <section id="solucion" style={{ background: 'linear-gradient(180deg, transparent, var(--hull) 40%, transparent)' }}>
      <div className="wrap">
        <SecHead eyebrow={s.eyebrow} title={s.title} lede={s.lede} />
        <Phases key={lang} phases={s.phases} />
        <div className="scroll-x">
          <table className="matrix">
            <thead><tr><th>{s.th[0]}</th>{s.th.slice(1).map((h) => <th key={h} className="c">{h}</th>)}</tr></thead>
            <tbody>
              {s.matrix.map(([m, ...cells]) => (
                <tr key={String(m)}><td>{m}</td>{cells.map((x, k) => <td key={k} className={`c ${x ? 'yes' : 'no'}`}>{x ? '●' : '—'}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 12 }}>{s.note}</p>
      </div>
    </section>
  );
}

export function Modules() {
  const [t] = useCopy();
  const m = t.modules;
  return (
    <section id="modulos">
      <div className="wrap">
        <SecHead eyebrow={m.eyebrow} title={m.title} />
        <div className="grid3">
          {m.items.map(([ic, h, p, cls, tag]) => (
            <article className="mod" key={h}>
              <span className="ic" aria-hidden="true"><GlyphIcon k={ic} size={26} /></span>
              <h3>{h}</h3>
              <p>{p}</p>
              <span><span className={`tag ${cls}`}>{tag}</span></span>
            </article>
          ))}
        </div>
        <SecHead eyebrow={m.dEyebrow} title={m.dTitle} style={{ marginTop: 72 }} />
        <div className="scroll-x">
          <table className="compare">
            <thead><tr><th style={{ color: 'var(--muted)' }}>{m.today}</th><th style={{ color: 'var(--ice)' }}>ASTRA</th></tr></thead>
            <tbody>{m.compare.map(([a, b]) => <tr key={a}><td>{a}</td><td><b>{b}</b></td></tr>)}</tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export function Vision() {
  const [t] = useCopy();
  return (
    <section id="vision" className="vision-band">
      <div className="wrap">
        <SecHead eyebrow={t.vision.eyebrow} title={t.vision.title} lede={t.vision.lede} />
        <div className="vision vision-solo">
          <div className="metrics">
            {t.vision.metrics.map(([b, s]) => <div className="metric" key={b}><b>{b}</b><span>{s}</span></div>)}
          </div>
        </div>
      </div>
    </section>
  );
}

export function Impact() {
  const [t] = useCopy();
  const im = t.impact;
  return (
    <section id="impacto" className="impact-band">
      <div className="wrap">
        <SecHead eyebrow={im.eyebrow} title={im.title} />
        <div className="impact">
          <div>
            <p>{im.p1}</p>
            <p>{im.p2}</p>
            <div className="stats">{im.stats.map(([v, d, s, k]) => <Stat key={d} v={v} t={d} s={s} href={SRC[k]} label={t.problem.source} />)}</div>
          </div>
          <div>
            <div className="scroll-x">
              <table className="compare">
                <thead><tr><th style={{ color: 'var(--muted)' }}>{im.thSpace}</th><th style={{ color: 'var(--ok)' }}>{im.thMine}</th></tr></thead>
                <tbody>{im.equiv.map(([a, b]) => <tr key={a}><td>{a}</td><td><b style={{ color: 'var(--ok)' }}>{b}</b></td></tr>)}</tbody>
              </table>
            </div>
            <div className="chips">{im.chips.map((c) => <span className="chip" key={c}>{c}</span>)}</div>
          </div>
        </div>
        <p className="quote">{im.quote}</p>
      </div>
    </section>
  );
}

export function DataSources() {
  const [t] = useCopy();
  const d = t.data;
  return (
    <section id="datos">
      <div className="wrap">
        <SecHead eyebrow={d.eyebrow} title={d.title} lede={d.lede} />
        <div className="sources">
          {d.sources.map(([id, b, s, k]) => (
            <a className="source" key={id} href={SRC[k]} target="_blank" rel="noopener noreferrer">
              <span className="tag real" style={{ alignSelf: 'flex-start' }}>REAL</span><b>{b}</b><span>{s}</span>
            </a>
          ))}
        </div>
        <div className="limits">
          <h3>{d.limitsTitle}</h3>
          <ul>{d.limits.map((l) => <li key={l}>{l}</li>)}</ul>
        </div>
      </div>
    </section>
  );
}

export function CallToAction() {
  const [t] = useCopy();
  return (
    <section className="cta">
      <div className="wrap">
        <h2>{t.cta.title}</h2>
        <p>{t.cta.text}</p>
        <div className="ctas">
          <Link className="btn primary" href={SYSTEM}>{t.cta.btn}</Link>
          <a className="btn ghost" id="descargar" href="/downloads/ASTRA-Health-Setup.exe" download>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></svg>
            {t.cta.download}
          </a>
        </div>
        <p className="cta-note">{t.cta.downloadNote}</p>
      </div>
    </section>
  );
}

export function Footer() {
  const [t] = useCopy();
  return (
    <footer className="site-footer">
      <div className="wrap">
        <span className="foot-brand"><Mark size={26} /><b>ASTRA Health</b> · {t.footer[0]}</span>
        <span>{t.footer[1]}</span>
      </div>
    </footer>
  );
}
