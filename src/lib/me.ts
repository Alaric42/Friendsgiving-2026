import { useSyncExternalStore } from "react";

const KEY = "friendsgiving:me";

export type Me = { id: string; name: string };

const listeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cachedMe: Me | null = null;

function read(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function getMe(): Me | null {
  const raw = read();
  if (raw === cachedRaw) return cachedMe;
  cachedRaw = raw;
  try {
    const v = raw ? JSON.parse(raw) : null;
    cachedMe = v && typeof v.id === "string" && typeof v.name === "string" ? v : null;
  } catch {
    cachedMe = null;
  }
  return cachedMe;
}

export function setMe(me: Me) {
  try {
    localStorage.setItem(KEY, JSON.stringify(me));
  } catch {}
  listeners.forEach((l) => l());
}

export function clearMe() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

/** undefined = not yet read (server render / first paint), null = nobody picked. */
export function useMe(): Me | null | undefined {
  return useSyncExternalStore<Me | null | undefined>(subscribe, getMe, () => undefined);
}
