import Link from 'next/link';

// ASTRA Health brand: the mission mark (orbit + heartbeat) with the wordmark.
export function Mark({ size = 30 }: { size?: number }) {
  return (
    <svg className="mark" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="mark-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1F6BFF" /><stop offset="1" stopColor="#0B3D91" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="31" fill="#fff" />
      <circle cx="32" cy="32" r="28" fill="url(#mark-g)" />
      <ellipse cx="32" cy="32" rx="25" ry="9.5" fill="none" stroke="#FC3D21" strokeWidth="3.2" transform="rotate(-28 32 32)" />
      <polyline className="mark-pulse" points="10,34 21,34 25,25 30,43 35,20 39,34 54,34" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="49" cy="18" r="3" fill="#fff" />
    </svg>
  );
}

interface LogoProps { href?: string; onClick?: () => void; size?: number }

export default function Logo({ href = '#top', onClick, size = 30 }: LogoProps) {
  const inner = <><Mark size={size} /><span className="wordmark"><b>ASTRA</b><i>Health</i></span></>;
  // in-page anchors stay plain links; routes use client-side navigation
  return href.startsWith('#')
    ? <a className="logo" href={href} onClick={onClick} aria-label="ASTRA Health">{inner}</a>
    : <Link className="logo" href={href} onClick={onClick} aria-label="ASTRA Health">{inner}</Link>;
}
