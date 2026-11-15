# ASTRA Health · desktop app

Windows installer that runs ASTRA fully offline (static web build + local SQLite) and syncs with the online system when connected. See `../docs/OFFLINE_ONLINE.md` for the full design.

```bash
bun install
node node_modules/electron/install.js   # downloads the Electron binary (bun skips postinstall scripts)
bun run start                           # run from source (needs ../frontend/out: bun run web)
bun run release                         # web export -> installer (dist/) -> frontend/public/downloads + backend/app_version.json
```

| File | Role |
|---|---|
| `main.cjs` | window, private `app://astra` origin, camera permission, IPC, smoke test (`ASTRA_SMOKE=<folder>`) |
| `preload.cjs` | the only bridge exposed to the UI (`window.astraDesktop`) |
| `db.cjs` | SQLite via Node's built-in `node:sqlite` (`%APPDATA%\ASTRA Health\astra.db`) |
| `scripts/prepare.cjs` | copies `../frontend/out` into `app/` |
| `scripts/publish.cjs` | publishes the installer and bumps the advertised version |
