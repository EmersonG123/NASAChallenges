'use client';
// Small per-device preferences (text size, daily check-in reminder). Kept in localStorage and broadcast
// with an event so every mounted component updates at once.
import { useSyncExternalStore } from 'react';

export const SETTINGS_EVENT = 'astra-settings';
export type TextSize = 'normal' | 'large';
const KEYS = { text: 'astra-text', remind: 'astra-remind' } as const;

const read = (k: string, d: string) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } };
const subscribe = (cb: () => void) => {
  window.addEventListener(SETTINGS_EVENT, cb); window.addEventListener('storage', cb);
  return () => { window.removeEventListener(SETTINGS_EVENT, cb); window.removeEventListener('storage', cb); };
};
function set(k: string, v: string) {
  try { localStorage.setItem(k, v); } catch { /* private mode */ }
  window.dispatchEvent(new Event(SETTINGS_EVENT));
}

export const useTextSize = () => useSyncExternalStore(subscribe, () => read(KEYS.text, 'normal') as TextSize, () => 'normal' as TextSize);
export const setTextSize = (v: TextSize) => set(KEYS.text, v);
/** daily check-in reminder in the wellbeing module (on by default) */
export const useRemind = () => useSyncExternalStore(subscribe, () => read(KEYS.remind, 'on') === 'on', () => true);
export const setRemind = (on: boolean) => set(KEYS.remind, on ? 'on' : 'off');
