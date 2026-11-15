'use client';
// The X-ray twin used by the landing hero and the medical bay scanner.
// A real person by default; a lens follows the pointer and reveals the anatomy underneath.
// Both images share one 512 x 768 coordinate space, so overlays (hotspots) can be placed in image pixels.
import { useEffect, useRef, type PointerEvent, type ReactNode } from 'react';

export const IMG_W = 512;
export const IMG_H = 768;
const R = 100; // lens radius in image pixels

interface Props {
  uid: string;
  /** reveal the whole anatomy instead of the lens */
  all: boolean;
  /** extra horizontal room around the image, in image pixels */
  padX?: number;
  label: string;
  /** SVG drawn above the images (hotspots, labels) */
  children?: ReactNode;
}

export default function XrayFigure({ uid, all, padX = 0, label, children }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const lensRef = useRef<SVGCircleElement>(null);
  const hover = useRef(false);

  // idle animation: the lens sweeps over the torso until the visitor takes over
  useEffect(() => {
    if (all || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0; const t0 = performance.now();
    const tick = (now: number) => {
      const lens = lensRef.current;
      if (!hover.current && lens) {
        const s = (now - t0) / 1000;
        lens.setAttribute('cx', String(256 + Math.sin(s * 0.7) * 70));
        lens.setAttribute('cy', String(270 + Math.sin(s * 0.45) * 160));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [all]);

  const move = (e: PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current, lens = lensRef.current, ctm = svg?.getScreenCTM();
    if (!svg || !lens || !ctm) return;
    const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const p = pt.matrixTransform(ctm.inverse());
    hover.current = true;
    lens.setAttribute('cx', String(p.x));
    lens.setAttribute('cy', String(p.y));
  };

  const x0 = -padX, w = IMG_W + 2 * padX;
  return (
    <svg ref={svgRef} viewBox={`${x0} 0 ${w} ${IMG_H}`} role="img" aria-label={label}
      onPointerMove={move} onPointerLeave={() => { hover.current = false; }}>
      <defs>
        <linearGradient id={`${uid}-beam`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8FD3FF" stopOpacity="0" />
          <stop offset=".5" stopColor="#8FD3FF" stopOpacity=".45" />
          <stop offset="1" stopColor="#8FD3FF" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${uid}-lensfade`}>
          <stop offset=".72" stopColor="#fff" />
          <stop offset="1" stopColor="#000" />
        </radialGradient>
        <mask id={`${uid}-xray`} maskUnits="userSpaceOnUse" x="0" y="0" width={IMG_W} height={IMG_H}>
          <rect width={IMG_W} height={IMG_H} fill={all ? '#fff' : '#000'} />
          {!all && <circle ref={lensRef} cx="256" cy="270" r={R} fill={`url(#${uid}-lensfade)`} />}
        </mask>
        <pattern id={`${uid}-grid`} width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M24 0H0V24" fill="none" stroke="var(--cardb, var(--line))" strokeWidth=".7" />
        </pattern>
      </defs>
      <rect x={x0} width={w} height={IMG_H} fill={`url(#${uid}-grid)`} />
      <image href="/img/person.webp" x="0" y="0" width={IMG_W} height={IMG_H} className="twin-person" />
      <image href="/img/anatomy.webp" x="0" y="0" width={IMG_W} height={IMG_H} mask={`url(#${uid}-xray)`} className="twin-body" />
      <g className="twin-beam">
        <rect x={x0} y="-18" width={w} height="36" fill={`url(#${uid}-beam)`} />
        <rect x={x0} y="0" width={w} height="1.5" fill="#8FD3FF" opacity=".85" />
      </g>
      {children}
    </svg>
  );
}
