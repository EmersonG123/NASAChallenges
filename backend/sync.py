"""ASTRA online sync: the server side of the offline-first desktop app.

Storage is a single SQLite file (no database server). Each record carries `updated_at`
(milliseconds, set by the device that changed it) and a soft-delete flag; the newest
write wins. Devices push their pending changes and pull everything changed since their
last sync in the same request.

Endpoints
  GET  /api/sync/status          -> server time and record counts (connectivity check)
  POST /api/sync                 -> push changes, receive changes since `since`
  GET  /api/app/version          -> latest desktop app version (update check)
"""
from __future__ import annotations

import json
import os
import sqlite3
import threading
import time
from pathlib import Path
from typing import Any, Literal

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

DB_PATH = Path(os.getenv("ASTRA_DB", Path(__file__).parent / "data" / "astra.db"))
VERSION_FILE = Path(__file__).parent / "app_version.json"
MAX_ROWS = 2000  # per table per request
SYNC_TOKEN = os.getenv("ASTRA_SYNC_TOKEN", "")  # when set, devices must send it in X-Astra-Token

SCHEMA = """
CREATE TABLE IF NOT EXISTS crew (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, sex TEXT NOT NULL, source TEXT NOT NULL,
  values_json TEXT NOT NULL, profile_json TEXT, updated_at INTEGER NOT NULL, deleted INTEGER NOT NULL DEFAULT 0,
  origin TEXT, server_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY, crew_id TEXT NOT NULL, mode TEXT NOT NULL, started_at INTEGER NOT NULL,
  ended_at INTEGER NOT NULL, fatigue INTEGER, stress INTEGER, attention INTEGER,
  peak_fatigue INTEGER, peak_stress INTEGER, updated_at INTEGER NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0, origin TEXT, server_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS daily (
  id TEXT PRIMARY KEY, crew_id TEXT NOT NULL, day TEXT NOT NULL, source TEXT NOT NULL,
  metrics_json TEXT NOT NULL, updated_at INTEGER NOT NULL, deleted INTEGER NOT NULL DEFAULT 0,
  origin TEXT, server_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS daily_server_at ON daily(server_at);
CREATE INDEX IF NOT EXISTS crew_server_at ON crew(server_at);
CREATE INDEX IF NOT EXISTS sessions_server_at ON sessions(server_at);
"""

COLUMNS = {
    "crew": ["id", "name", "sex", "source", "values_json", "profile_json", "updated_at", "deleted"],
    "sessions": ["id", "crew_id", "mode", "started_at", "ended_at", "fatigue", "stress", "attention",
                 "peak_fatigue", "peak_stress", "updated_at", "deleted"],
    "daily": ["id", "crew_id", "day", "source", "metrics_json", "updated_at", "deleted"],
}

_lock = threading.Lock()
_conn: sqlite3.Connection | None = None


def db() -> sqlite3.Connection:
    global _conn
    if _conn is None:
        DB_PATH.parent.mkdir(parents=True, exist_ok=True)
        _conn = sqlite3.connect(DB_PATH, check_same_thread=False)
        _conn.row_factory = sqlite3.Row
        _conn.execute("PRAGMA journal_mode=WAL")
        _conn.executescript(SCHEMA)
        cols = [r[1] for r in _conn.execute("PRAGMA table_info(crew)")]
        if "profile_json" not in cols:  # databases created by earlier versions
            _conn.execute("ALTER TABLE crew ADD COLUMN profile_json TEXT")
    return _conn


class CrewRow(BaseModel):
    id: str = Field(min_length=1, max_length=64)
    name: str = Field(max_length=80)
    sex: Literal["F", "M"]
    source: Literal["upload", "example", "manual"]
    values_json: str = Field(max_length=200_000)
    profile_json: str | None = Field(default=None, max_length=4_000)
    updated_at: int
    deleted: int = 0


class SessionRow(BaseModel):
    id: str = Field(min_length=1, max_length=64)
    crew_id: str = Field(max_length=64)
    mode: Literal["camera", "file", "demo"]
    started_at: int
    ended_at: int
    fatigue: int | None = None
    stress: int | None = None
    attention: int | None = None
    peak_fatigue: int | None = None
    peak_stress: int | None = None
    updated_at: int
    deleted: int = 0


class DailyRow(BaseModel):
    id: str = Field(min_length=1, max_length=64)
    crew_id: str = Field(max_length=64)
    day: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    source: Literal["checkin", "wearable"]
    metrics_json: str = Field(max_length=8_000)
    updated_at: int
    deleted: int = 0


class Changes(BaseModel):
    crew: list[CrewRow] = []
    sessions: list[SessionRow] = []
    daily: list[DailyRow] = []


class SyncRequest(BaseModel):
    client_id: str = Field(min_length=4, max_length=64)
    since: int = 0  # server_at cursor returned by the previous sync
    changes: Changes = Changes()


router = APIRouter(prefix="/api", tags=["sync"])


def _auth(token: str | None) -> None:
    if SYNC_TOKEN and token != SYNC_TOKEN:
        raise HTTPException(401, "Token de sincronización inválido.")


def _upsert(conn: sqlite3.Connection, table: str, rows: list[BaseModel], origin: str, now: int) -> int:
    cols = COLUMNS[table]
    applied = 0
    for r in rows:
        d = r.model_dump()
        blob = {"crew": "values_json", "daily": "metrics_json"}.get(table)
        if blob:
            try:
                json.loads(d[blob])
            except ValueError:
                continue
        cur = conn.execute(f"SELECT updated_at FROM {table} WHERE id = ?", (d["id"],)).fetchone()
        if cur and cur["updated_at"] >= d["updated_at"]:
            continue  # the server already has a newer (or the same) version
        placeholders = ", ".join("?" for _ in cols)
        conn.execute(
            f"INSERT OR REPLACE INTO {table} ({', '.join(cols)}, origin, server_at) VALUES ({placeholders}, ?, ?)",
            [d[c] for c in cols] + [origin, now],
        )
        applied += 1
    return applied


@router.get("/sync/status")
def sync_status() -> dict[str, Any]:
    conn = db()
    return {
        "ok": True,
        "server_time": int(time.time() * 1000),
        "crew": conn.execute("SELECT COUNT(*) FROM crew WHERE deleted = 0").fetchone()[0],
        "sessions": conn.execute("SELECT COUNT(*) FROM sessions WHERE deleted = 0").fetchone()[0],
    }


@router.post("/sync")
def sync(req: SyncRequest, x_astra_token: str | None = Header(default=None)) -> dict[str, Any]:
    _auth(x_astra_token)
    if any(len(getattr(req.changes, t)) > MAX_ROWS for t in COLUMNS):
        raise HTTPException(413, "Demasiados cambios en una sola petición.")
    with _lock:
        conn = db()
        now = int(time.time() * 1000)
        applied = {t: _upsert(conn, t, getattr(req.changes, t), req.client_id, now) for t in COLUMNS}
        conn.commit()
        out: dict[str, list[dict[str, Any]]] = {}
        for t, cols in COLUMNS.items():
            rows = conn.execute(
                f"SELECT {', '.join(cols)} FROM {t} WHERE server_at > ? AND (origin IS NULL OR origin != ? OR server_at < ?) "
                f"ORDER BY server_at LIMIT ?",
                (req.since, req.client_id, now, MAX_ROWS),
            ).fetchall()
            out[t] = [dict(r) for r in rows]
    return {"cursor": now, "applied": applied, "changes": out}


@router.get("/app/version")
def app_version() -> dict[str, Any]:
    if VERSION_FILE.exists():
        return json.loads(VERSION_FILE.read_text(encoding="utf-8"))
    return {"version": "1.0.0", "url": None, "notes": ""}
