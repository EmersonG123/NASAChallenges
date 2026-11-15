// One local data model for both the desktop app (SQLite file) and the web (browser storage).
// Every row carries updated_at (ms) and a soft-delete flag so devices can sync: newest write wins.

export type Table = 'crew' | 'sessions' | 'daily';

export interface CrewRecord {
  id: string; name: string; sex: 'F' | 'M'; source: 'upload' | 'example' | 'manual';
  /** JSON: marker code -> values per checkpoint */
  values_json: string;
  /** JSON: { age, role, mission, notes } (optional) */
  profile_json?: string | null;
  updated_at: number; deleted: number;
}
export interface SessionRecord {
  id: string; crew_id: string; mode: 'camera' | 'file' | 'demo';
  started_at: number; ended_at: number;
  fatigue: number | null; stress: number | null; attention: number | null;
  peak_fatigue: number | null; peak_stress: number | null;
  updated_at: number; deleted: number;
}
/** one wellbeing entry: a daily check-in or a day of wearable data */
export interface DailyRecord {
  id: string; crew_id: string;
  /** YYYY-MM-DD */
  day: string;
  source: 'checkin' | 'wearable';
  /** JSON with the metrics of that entry */
  metrics_json: string;
  updated_at: number; deleted: number;
}
export interface Rows { crew: CrewRecord; sessions: SessionRecord; daily: DailyRecord }
/** local rows also know whether they still have to be uploaded */
export type Local<T> = T & { dirty: number };

/** the low-level operations; implemented by SQLite in the desktop app and by browser storage on the web */
export interface StoreBridge {
  /** non-deleted rows, newest first */
  list<T extends Table>(table: T): Promise<Local<Rows[T]>[]>;
  /** insert or replace a row changed on this device (marked dirty) */
  put<T extends Table>(table: T, row: Rows[T]): Promise<void>;
  /** rows waiting to be uploaded (including soft-deleted ones) */
  pending(): Promise<{ crew: CrewRecord[]; sessions: SessionRecord[]; daily: DailyRecord[] }>;
  /** apply rows coming from the server when they are newer than the local copy; returns how many changed */
  applyRemote<T extends Table>(table: T, rows: Rows[T][]): Promise<number>;
  /** clear the dirty flag of uploaded rows, unless they changed again meanwhile */
  markClean(table: Table, rows: { id: string; updated_at: number }[]): Promise<void>;
  getMeta(key: string): Promise<string | null>;
  setMeta(key: string, value: string): Promise<void>;
}

export interface Store extends StoreBridge {
  kind: 'sqlite' | 'browser';
  /** where the data lives, for the settings panel */
  location: string;
}
