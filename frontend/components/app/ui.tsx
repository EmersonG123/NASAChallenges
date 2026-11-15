// Dashboard primitives. Colours always come from design tokens (see dashboard.css):
// components pass a semantic tone, never a hex value.
import type { ReactNode } from 'react';
import type { LevelKey } from '@/lib/bay/model';

export type Tone = LevelKey | 'none' | 'real' | 'derived' | 'sim' | 'info';
export const toneOf = (l: LevelKey | null | undefined): Tone => l ?? 'none';

interface CardProps {
  id?: string;
  title?: ReactNode;
  /** badges or meta shown at the right of the header */
  aside?: ReactNode;
  lead?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function Card({ id, title, aside, lead, className = '', children }: CardProps) {
  return (
    <section id={id} className={`dcard ${className}`}>
      {(title || aside) && (
        <header className="dcard-h">
          {title && <h2>{title}</h2>}
          {aside && <div className="dcard-aside">{aside}</div>}
        </header>
      )}
      {lead && <p className="dcard-lead">{lead}</p>}
      {children}
    </section>
  );
}

export function Badge({ tone = 'info', children, title }: { tone?: Tone; children: ReactNode; title?: string }) {
  return <span className={`badge t-${tone}`} title={title}>{children}</span>;
}

export function Dot({ tone, dashed }: { tone: Tone; dashed?: boolean }) {
  return <span className={`dot t-${tone}${dashed ? ' dashed' : ''}`} aria-hidden="true" />;
}

/** horizontal meter 0–100 */
export function Meter({ value, tone, big }: { value: number | null; tone: Tone; big?: boolean }) {
  return (
    <span className={`meter t-${tone}${big ? ' big' : ''}`} aria-hidden="true">
      <i style={{ width: `${Math.max(0, Math.min(100, value ?? 0))}%` }} />
    </span>
  );
}
