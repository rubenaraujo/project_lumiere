import { useCallback, useSyncExternalStore } from "react";
import type { ContentItem, ContentType } from "@/services/tmdb";

export interface WatchlistEntry {
  item: ContentItem;
  contentType: ContentType;
  addedAt: number;
}

const KEY = "lumiere.watchlist.v1";
const MAX_ENTRIES = 200;
const listeners = new Set<() => void>();

let lastRaw: string | null = null;
let lastParsed: WatchlistEntry[] = [];

// Reads are memoised by the raw string so useSyncExternalStore gets a stable snapshot.
const read = (): WatchlistEntry[] => {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return lastParsed;
  }
  if (raw === lastRaw) return lastParsed;
  lastRaw = raw;
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    lastParsed = Array.isArray(parsed)
      ? (parsed as WatchlistEntry[]).filter((entry) => entry?.item?.id && entry.contentType)
      : [];
  } catch {
    lastParsed = [];
  }
  return lastParsed;
};

const write = (entries: WatchlistEntry[]) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    // Storage full or unavailable: the watchlist is best-effort.
  }
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
};

const sameEntry = (entry: WatchlistEntry, id: number, contentType: ContentType) =>
  entry.item.id === id && entry.contentType === contentType;

export const useWatchlist = () => {
  const entries = useSyncExternalStore(subscribe, read, read);

  const has = useCallback(
    (id: number, contentType: ContentType) => entries.some((entry) => sameEntry(entry, id, contentType)),
    [entries]
  );

  const toggle = useCallback((item: ContentItem, contentType: ContentType) => {
    const current = read();
    write(
      current.some((entry) => sameEntry(entry, item.id, contentType))
        ? current.filter((entry) => !sameEntry(entry, item.id, contentType))
        : [{ item, contentType, addedAt: Date.now() }, ...current]
    );
  }, []);

  return { entries, has, toggle };
};
