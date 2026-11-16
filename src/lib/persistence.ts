import { DEFAULT_FILTERS, type ContentType, type Filters } from "@/services/tmdb";

const FILTERS_KEY = "lumiere.filters.v1";
const SHOWN_KEY = "lumiere.shown.v1";
const MAX_SHOWN_PER_FILTERS = 200;
const MAX_FILTER_SETS = 20;

const CONTENT_TYPES: ContentType[] = ["movie", "tv", "miniseries"];
const YEAR_PATTERN = /^\d{4}$/;
const LANGUAGE_PATTERN = /^([a-z]{2,3}|all)$/;

// Reads a (possibly partial / untrusted) filters object, keeping only valid
// fields. Returns null when nothing usable was found.
const sanitizeFilters = (raw: Partial<Record<keyof Filters, unknown>>): Partial<Filters> | null => {
  const result: Partial<Filters> = {};

  if (CONTENT_TYPES.includes(raw.contentType as ContentType)) {
    result.contentType = raw.contentType as ContentType;
  }
  if (Array.isArray(raw.genres)) {
    result.genres = raw.genres.map(Number).filter((id) => Number.isInteger(id) && id > 0);
  }
  if (typeof raw.yearFrom === "string" && (raw.yearFrom === "" || YEAR_PATTERN.test(raw.yearFrom))) {
    result.yearFrom = raw.yearFrom;
  }
  if (typeof raw.yearTo === "string" && (raw.yearTo === "" || YEAR_PATTERN.test(raw.yearTo))) {
    result.yearTo = raw.yearTo;
  }
  if (typeof raw.language === "string" && LANGUAGE_PATTERN.test(raw.language)) {
    result.language = raw.language;
  }
  const rating = Number(raw.minRating);
  if (raw.minRating !== undefined && raw.minRating !== "" && rating >= 0 && rating <= 10) {
    result.minRating = rating;
  }

  return Object.keys(result).length > 0 ? result : null;
};

export const parseFiltersFromSearch = (search: string): Partial<Filters> | null => {
  const params = new URLSearchParams(search);
  return sanitizeFilters({
    contentType: params.get("type") ?? undefined,
    genres: params.has("genres") ? params.get("genres")!.split(",").filter(Boolean) : undefined,
    yearFrom: params.get("from") ?? undefined,
    yearTo: params.get("to") ?? undefined,
    language: params.get("lang") ?? undefined,
    minRating: params.get("rating") ?? undefined,
  });
};

// Only non-default values are written, so the default state has a clean URL.
export const filtersToSearch = (filters: Filters): string => {
  const params = new URLSearchParams();
  if (filters.contentType !== DEFAULT_FILTERS.contentType) params.set("type", filters.contentType);
  if (filters.genres.length > 0) params.set("genres", filters.genres.join(","));
  if (filters.yearFrom) params.set("from", filters.yearFrom);
  if (filters.yearTo) params.set("to", filters.yearTo);
  if (filters.language !== DEFAULT_FILTERS.language) params.set("lang", filters.language);
  if (filters.minRating !== DEFAULT_FILTERS.minRating) params.set("rating", String(filters.minRating));
  const search = params.toString();
  return search ? `?${search}` : "";
};

// Shared link: `?id=123&t=movie` opens that title directly.
export const parseSharedItem = (search: string): { id: number; contentType: ContentType } | null => {
  const params = new URLSearchParams(search);
  const id = Number(params.get("id"));
  const contentType = params.get("t") as ContentType;
  return Number.isInteger(id) && id > 0 && CONTENT_TYPES.includes(contentType) ? { id, contentType } : null;
};

export const buildShareUrl = (id: number, contentType: ContentType): string =>
  `${window.location.origin}${import.meta.env.BASE_URL}?id=${id}&t=${contentType}`;

const readJson = (key: string): unknown => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

const writeJson = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable: persistence is best-effort.
  }
};

// A shared link (URL params) wins over the filters saved in localStorage.
export const loadInitialFilters = (): Filters => {
  const fromUrl = parseFiltersFromSearch(window.location.search);
  if (fromUrl) {
    return { ...DEFAULT_FILTERS, ...fromUrl };
  }

  const stored = readJson(FILTERS_KEY);
  const fromStorage = stored && typeof stored === "object" ? sanitizeFilters(stored) : null;
  return { ...DEFAULT_FILTERS, ...fromStorage };
};

export const saveFilters = (filters: Filters) => {
  writeJson(FILTERS_KEY, filters);

  const search = filtersToSearch(filters);
  if (search !== window.location.search) {
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${search}${window.location.hash}`);
  }
};

type ShownByFilters = Record<string, number[]>;

const readShown = (): ShownByFilters => {
  const stored = readJson(SHOWN_KEY);
  return stored && typeof stored === "object" && !Array.isArray(stored) ? (stored as ShownByFilters) : {};
};

export const loadShownIds = (filtersKey: string): number[] => {
  const ids = readShown()[filtersKey];
  return Array.isArray(ids) ? ids.filter((id) => Number.isInteger(id)) : [];
};

export const saveShownIds = (filtersKey: string, ids: number[]) => {
  const all = readShown();
  // Re-insert so the most recently used filter set is last, then drop the oldest.
  delete all[filtersKey];
  all[filtersKey] = ids.slice(-MAX_SHOWN_PER_FILTERS);
  const keys = Object.keys(all);
  keys.slice(0, Math.max(0, keys.length - MAX_FILTER_SETS)).forEach((key) => delete all[key]);
  writeJson(SHOWN_KEY, all);
};
