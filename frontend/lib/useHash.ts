'use client';
// Current URL hash as state (#overview, #alerts…): deep-linkable views without extra routes,
// which also works in the static desktop build.
import { useSyncExternalStore } from 'react';

const subscribe = (cb: () => void) => { window.addEventListener('hashchange', cb); return () => window.removeEventListener('hashchange', cb); };

export function useHash(): string {
  return useSyncExternalStore(subscribe, () => location.hash.slice(1), () => '');
}

/** the active view: the hash when it names one of `views`, else the first view */
export function useView<T extends string>(views: readonly T[]): T {
  const h = useHash();
  return (views as readonly string[]).includes(h) ? (h as T) : views[0];
}
