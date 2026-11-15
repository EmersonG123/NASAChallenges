'use client';
// One-axis time chart (line / dots / bars) with optional min-max band, event lines, shaded windows,
// a reference line and a hover crosshair + tooltip. Text uses theme tokens; marks carry the color.
import { useMemo, useRef, useState, type PointerEvent, type ReactNode } from 'react';

type Mark = { color?: string; flag?: boolean };
const mk = (d: object) => d as Mark;

interface Props<D extends object> {
  data: D[];
  x: (d: D) => number;
  y: (d: D) => number | null | undefined;
  type?: 'line' | 'dots' | 'bars';
  color?: string;
  band?: (d: D) => [number, number];
  events?: { x: number; label?: string }[];
  windows?: { from: number; to: number; color?: string }[];
  refLine?: { y: number; label: string };
  yDomain?: [number, number];
  xDomain?: [number, number];
  xTicks?: number[];
  fmtX?: (v: number, long?: boolean) => string;
  fmtY?: (v: number) => string;
  unit?: string;
  height?: number;
  width?: number;
  label?: string;
  tipExtra?: (d: D) => ReactNode;
  eventColor?: string;
  barWidth?: number;
}

export default function TimeChart<D extends object>({
  data, x, y, type = 'line', color = 'var(--nasa-blue-2)', band, events = [], windows = [], refLine, yDomain, xDomain, xTicks,
  fmtX = (v) => String(v), fmtY = (v) => String(v), unit = '', height = 200, width = 640, label, tipExtra,
  eventColor = 'var(--nasa-red)', barWidth,
}: Props<D>) {
  const W = width, H = height, L = 44, R = 12, T = 12, B = 26;
  const ref = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<D | null>(null);

  const val = (d: D) => y(d) ?? null;
  const xs = data.map(x), ys = data.map(val).filter((v): v is number => v != null);
  const bandVals = band ? data.flatMap((d) => band(d)) : [];
  const [xMin, xMax] = xDomain || [Math.min(...xs, ...events.map((e) => e.x)), Math.max(...xs, ...events.map((e) => e.x))];
  let [yMin, yMax] = yDomain || [Math.min(...ys, ...bandVals, refLine?.y ?? Infinity), Math.max(...ys, ...bandVals, refLine?.y ?? -Infinity)];
  if (!yDomain) { const pad = (yMax - yMin) * 0.12 || 1; yMin = type === 'bars' ? Math.min(0, yMin) : yMin - pad; yMax += pad; }
  const sx = (v: number) => L + ((v - xMin) / (xMax - xMin || 1)) * (W - L - R);
  const sy = (v: number) => H - B - ((v - yMin) / (yMax - yMin || 1)) * (H - B - T);

  const yTicks = useMemo(() => {
    const n = 4, step = (yMax - yMin) / n;
    return Array.from({ length: n + 1 }, (_, i) => yMin + step * i);
  }, [yMin, yMax]);
  const ticksX = (xTicks || Array.from({ length: 6 }, (_, i) => xMin + ((xMax - xMin) / 5) * i)).filter((v) => v >= xMin && v <= xMax);
  const pts = data.filter((d) => val(d) != null && x(d) >= xMin && x(d) <= xMax);
  const Y = (d: D) => sy(val(d) as number);
  const path = pts.map((d, i) => `${i ? 'L' : 'M'}${sx(x(d)).toFixed(1)},${Y(d).toFixed(1)}`).join('');
  const bandPath = band ? pts.map((d, i) => `${i ? 'L' : 'M'}${sx(x(d)).toFixed(1)},${sy(band(d)[1]).toFixed(1)}`).join('')
    + [...pts].reverse().map((d) => `L${sx(x(d)).toFixed(1)},${sy(band(d)[0]).toFixed(1)}`).join('') + 'Z' : '';
  const bw = barWidth || Math.max(3, Math.min(18, ((W - L - R) / Math.max(pts.length, 1)) * 0.6));

  const move = (e: PointerEvent<SVGSVGElement>) => {
    const svg = ref.current, ctm = svg?.getScreenCTM(); if (!svg || !ctm) return;
    const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const p = pt.matrixTransform(ctm.inverse());
    let best: D | null = null, bd = Infinity;
    pts.forEach((d) => { const dx = Math.abs(sx(x(d)) - p.x); if (dx < bd) { bd = dx; best = d; } });
    setHover(best && bd < 40 ? best : null);
  };

  return (
    <figure className="tchart">
      {label && <figcaption>{label}</figcaption>}
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} onPointerMove={move} onPointerLeave={() => setHover(null)} role="img" aria-label={label}>
        {windows.map((w, i) => (
          <rect key={i} x={sx(w.from)} y={T} width={Math.max(2, sx(w.to) - sx(w.from))} height={H - B - T} fill={w.color || 'var(--nasa-red)'} opacity=".1" />
        ))}
        {yTicks.map((v, i) => (
          <g key={i}>
            <line x1={L} x2={W - R} y1={sy(v)} y2={sy(v)} stroke="var(--cardb)" strokeWidth="1" />
            <text x={L - 8} y={sy(v) + 4} textAnchor="end" className="tc-axis">{fmtY(v)}</text>
          </g>
        ))}
        {ticksX.map((v, i) => <text key={i} x={sx(v)} y={H - 8} textAnchor="middle" className="tc-axis">{fmtX(v)}</text>)}
        {band && <path d={bandPath} fill={color} opacity=".16" />}
        {refLine && (
          <g>
            <line x1={L} x2={W - R} y1={sy(refLine.y)} y2={sy(refLine.y)} stroke="var(--muted)" strokeDasharray="4 4" strokeWidth="1.2" />
            <text x={W - R} y={sy(refLine.y) - 5} textAnchor="end" className="tc-axis">{refLine.label}</text>
          </g>
        )}
        {events.map((e, i) => (
          <g key={i}>
            <line x1={sx(e.x)} x2={sx(e.x)} y1={T} y2={H - B} stroke={eventColor} strokeWidth="1.5" strokeDasharray="3 3" />
            {e.label && <text x={sx(e.x) + 4} y={T + 10} className="tc-axis" style={{ fill: eventColor }}>{e.label}</text>}
          </g>
        ))}
        {type === 'line' && <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}
        {type === 'bars' && pts.map((d, i) => {
          const y0 = sy(Math.max(yMin, 0)), y1 = Y(d);
          return <rect key={i} x={sx(x(d)) - bw / 2} y={Math.min(y0, y1)} width={bw} height={Math.max(1, Math.abs(y0 - y1))} rx="2" fill={mk(d).color || color} />;
        })}
        {type === 'dots' && pts.map((d, i) => <circle key={i} cx={sx(x(d))} cy={Y(d)} r="3.5" fill={mk(d).color || color} stroke="var(--hull)" strokeWidth="1" opacity=".85" />)}
        {type === 'line' && pts.length <= 40 && pts.map((d, i) => <circle key={i} cx={sx(x(d))} cy={Y(d)} r={mk(d).flag ? 4.5 : 2.5} fill={mk(d).flag ? 'var(--nasa-red)' : color} stroke="var(--hull)" strokeWidth="1" />)}
        {hover && (
          <g pointerEvents="none">
            <line x1={sx(x(hover))} x2={sx(x(hover))} y1={T} y2={H - B} stroke="var(--muted)" strokeWidth="1" />
            <circle cx={sx(x(hover))} cy={Y(hover)} r="5" fill={color} stroke="var(--hull)" strokeWidth="2" />
          </g>
        )}
      </svg>
      {hover && (
        <div className="tc-tip" style={{ left: `${(sx(x(hover)) / W) * 100}%` }}>
          <b>{fmtY(val(hover) as number)} {unit}</b><span>{fmtX(x(hover), true)}</span>{tipExtra && tipExtra(hover)}
        </div>
      )}
    </figure>
  );
}
