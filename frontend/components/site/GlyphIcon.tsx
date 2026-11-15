// Maps the icon keys used in the copy to SVG line icons (no emoji as icons: consistent rendering on every OS).
const PATHS: Record<string, string> = {
  '👥': 'M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM16 11a3 3 0 1 0 0-6M2 20a6 6 0 0 1 12 0M14 14a6 6 0 0 1 8 6',
  '💬': 'M4 5h16v11H8l-4 4z M8 10h8 M8 13h5',
  '🧍': 'M12 3a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM8 10h8l-1 6h-2v5h-2v-5H9z',
  '🧠': 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6z',
  '🚨': 'M12 3l9 16H3zM12 10v4M12 17v.5',
  '🟣': 'M4 20V10M10 20V4M16 20v-7M22 20H2',
};

export default function GlyphIcon({ k, size = 22 }: { k: string; size?: number }) {
  const d = PATHS[k];
  if (!d) return <span aria-hidden="true">{k}</span>;
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}
