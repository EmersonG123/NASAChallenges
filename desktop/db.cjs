// Local SQLite database for the desktop app (Node's built-in node:sqlite: no native build step).
// Same tables as the online system plus a `dirty` flag for rows that still have to be uploaded.
'use strict';
const { DatabaseSync } = require('node:sqlite');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS crew (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, sex TEXT NOT NULL, source TEXT NOT NULL,
  values_json TEXT NOT NULL, profile_json TEXT, updated_at INTEGER NOT NULL, deleted INTEGER NOT NULL DEFAULT 0,
  dirty INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY, crew_id TEXT NOT NULL, mode TEXT NOT NULL, started_at INTEGER NOT NULL,
  ended_at INTEGER NOT NULL, fatigue INTEGER, stress INTEGER, attention INTEGER,
  peak_fatigue INTEGER, peak_stress INTEGER, updated_at INTEGER NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0, dirty INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS sessions_crew ON sessions(crew_id, started_at);
CREATE TABLE IF NOT EXISTS daily (
  id TEXT PRIMARY KEY, crew_id TEXT NOT NULL, day TEXT NOT NULL, source TEXT NOT NULL,
  metrics_json TEXT NOT NULL, updated_at INTEGER NOT NULL, deleted INTEGER NOT NULL DEFAULT 0,
  dirty INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS daily_crew ON daily(crew_id, day);
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
`;

const COLUMNS = {
  crew: ['id', 'name', 'sex', 'source', 'values_json', 'profile_json', 'updated_at', 'deleted'],
  sessions: ['id', 'crew_id', 'mode', 'started_at', 'ended_at', 'fatigue', 'stress', 'attention', 'peak_fatigue', 'peak_stress', 'updated_at', 'deleted'],
  daily: ['id', 'crew_id', 'day', 'source', 'metrics_json', 'updated_at', 'deleted'],
};

function open(file) {
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA);
  // migrations for databases created by earlier versions
  const crewCols = db.prepare('PRAGMA table_info(crew)').all().map((c) => c.name);
  if (!crewCols.includes('profile_json')) db.exec('ALTER TABLE crew ADD COLUMN profile_json TEXT');

  const cols = (t) => {
    if (!COLUMNS[t]) throw new Error(`unknown table ${t}`); // table names never come from the renderer unchecked
    return COLUMNS[t];
  };
  const tbl = (t) => { cols(t); return t; };
  const pick = (t, row) => cols(t).map((c) => (row[c] === undefined ? null : row[c]));
  const insert = (t, dirty) => db.prepare(
    `INSERT OR REPLACE INTO ${t} (${cols(t).join(', ')}, dirty) VALUES (${cols(t).map(() => '?').join(', ')}, ${dirty ? 1 : 0})`,
  );
  const tx = (fn) => { db.exec('BEGIN'); try { const r = fn(); db.exec('COMMIT'); return r; } catch (e) { db.exec('ROLLBACK'); throw e; } };

  return {
    list(t) {
      return db.prepare(`SELECT ${cols(t).join(', ')}, dirty FROM ${t} WHERE deleted = 0 ORDER BY updated_at DESC`).all();
    },
    put(t, row) {
      insert(t, true).run(...pick(t, row));
    },
    pending() {
      return {
        crew: db.prepare(`SELECT ${cols('crew').join(', ')} FROM crew WHERE dirty = 1`).all(),
        sessions: db.prepare(`SELECT ${cols('sessions').join(', ')} FROM sessions WHERE dirty = 1`).all(),
        daily: db.prepare(`SELECT ${cols('daily').join(', ')} FROM daily WHERE dirty = 1`).all(),
      };
    },
    applyRemote(t, rows) {
      const cur = db.prepare(`SELECT updated_at FROM ${tbl(t)} WHERE id = ?`);
      const ins = insert(t, false);
      return tx(() => {
        let n = 0;
        for (const r of rows) {
          const have = cur.get(r.id);
          if (!have || have.updated_at < r.updated_at) { ins.run(...pick(t, r)); n++; }
        }
        return n;
      });
    },
    markClean(t, rows) {
      const st = db.prepare(`UPDATE ${tbl(t)} SET dirty = 0 WHERE id = ? AND updated_at = ?`);
      tx(() => { for (const r of rows) st.run(r.id, r.updated_at); });
    },
    getMeta(key) {
      const r = db.prepare('SELECT value FROM meta WHERE key = ?').get(String(key));
      return r ? r.value : null;
    },
    setMeta(key, value) {
      db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)').run(String(key), String(value));
    },
    close() { db.close(); },
  };
}

module.exports = { open, COLUMNS };
