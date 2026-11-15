# ASTRA Health · frontend

Next.js 16 (App Router, TypeScript) run with Bun. Everything — landing, medical bay and the physiology & radiation module — is React components; nothing is served as a static HTML iframe anymore.

```bash
bun install
bun run dev        # http://localhost:3000
bun run build && bun run start
```

## Routes

| Route | What it is |
|---|---|
| `/` | Landing (hero with the X-ray twin, problem, solution, impact, data) |
| `/demo` | Medical bay: scanner, risk, markers, alerts, Copilot, crew heatmap, space weather, ASTRA Vision, simulator |
| `/demo/monitor` | Physiology & radiation: DONKI, Curiosity RAD, synthetic vitals, OSD-681, NTRS, EPIC |

## Structure

```
app/                 routes, root layout (fonts self-hosted with next/font), globals.css (landing)
components/site      landing: Nav, Sections, Phases, Logo
components/twin      XrayFigure (shared lens figure) + landing Twin
components/app       dashboard shell (sidebar), ui primitives (Card, Badge, Dot, Meter), dashboard.css
components/bay       medical bay panels, BayContext (crew / timepoint / system selection)
components/monitor   physiology & radiation module
components/charts    TimeChart (one-axis SVG chart with tooltip)
lib/prefs.tsx        language + theme context (persisted in localStorage)
lib/bay/             data model and risk score (pure TS), copilot rules, localized formatting
lib/vision/engine.ts fatigue/stress engine (MediaPipe Face Landmarker, lazy-loaded)
data/                bay.json (OSDR + DONKI), monitor.json (pipeline export)
public/mediapipe     vision WASM runtime · public/models: face_landmarker.task (binary, cached immutable)
```

## Design tokens

The dashboard look lives in `components/app/dashboard.css`: every colour is a token on `.dash` (light and dark).
Components never set colours; they pass a semantic tone (`t-ok`, `t-watch`, `t-warn`, `t-crit`, `t-real`, `t-derived`, `t-sim`).

## Backend

`/api/*` is proxied to `ASTRA_API_URL` (default `http://localhost:8000`). Without the backend, ASTRA Vision still works with facial analysis only.

## Refreshing the monitor data

Run `python backend/pipeline/export_frontend.py` and copy its output to `data/monitor.json`.
