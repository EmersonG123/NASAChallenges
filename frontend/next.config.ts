import type { NextConfig } from 'next';

// Two targets from one codebase:
// - web (default): Next server, /api/* proxied to the backend (ASTRA_API_URL).
// - desktop (ASTRA_TARGET=desktop): static export in out/, packaged by the desktop app and served offline.
const DESKTOP = process.env.ASTRA_TARGET === 'desktop';
const API = process.env.ASTRA_API_URL || 'http://localhost:8000';

const web: NextConfig = {
  // *.web.ts(x) files (login, session routes, proxy) exist only in the online build;
  // the desktop static export ignores them, so it has no login and no server code
  pageExtensions: ['web.tsx', 'web.ts', 'tsx', 'ts', 'jsx', 'js'],
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${API}/api/:path*` }];
  },
  async redirects() {
    return [
      { source: '/demo', destination: '/system', permanent: true },
      { source: '/demo/:path*', destination: '/system/:path*', permanent: true },
    ];
  },
  async headers() {
    // the vision runtime and model never change between deploys: cache them hard
    const immutable = [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }];
    return [
      { source: '/mediapipe/:file*', headers: immutable },
      { source: '/models/:file*', headers: immutable },
    ];
  },
};

const desktop: NextConfig = {
  output: 'export',
  trailingSlash: true, // /demo/ -> out/demo/index.html, simple to serve from disk
};

const nextConfig: NextConfig = {
  experimental: {
    agentFeedback: true,
  },
  // partial prerendering is a server feature; the static desktop export renders everything up front
  cacheComponents: !DESKTOP,
  partialPrefetching: !DESKTOP,
  images: { formats: ['image/avif', 'image/webp'], unoptimized: DESKTOP },
  env: { NEXT_PUBLIC_ASTRA_TARGET: DESKTOP ? 'desktop' : 'web' },
  ...(DESKTOP ? desktop : web),
};

export default nextConfig;
