// TMDb API Service
// Note: API key needs to be provided by the user

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_API_KEY = '9fd38d064c1422abdae6485d2d64ec0f'; // Default API key

export const setTmdbApiKey = (apiKey: string) => {
  // In a real app, you would store this more securely
  (window as any).TMDB_API_KEY = apiKey;
};

export const getTmdbApiKey = (): string => {
  return (window as any).TMDB_API_KEY || TMDB_API_KEY;
};

export const isApiKeySet = (): boolean => {
  return Boolean(getTmdbApiKey());
};

interface TmdbResponse<T> {
  results: T[];
  total_pages: number;
  total_results: number;
}

interface Movie {
  id: number;
  title: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  vote_average: number;
  vote_count: number;
  release_date: string;
  genre_ids: number[];
  original_language: string;
  popularity: number;
}

interface TvShow {
  id: number;
  name: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  vote_average: number;
  vote_count: number;
  first_air_date: string;
  genre_ids: number[];
  original_language: string;
  popularity: number;
}

interface Genre {
  id: number;
  name: string;
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
}

export interface WatchProviderOption {
  provider_id: number;
  provider_name: string;
  logo_path: string;
}

export interface WatchProviders {
  flatrate?: WatchProviderOption[];
  rent?: WatchProviderOption[];
  buy?: WatchProviderOption[];
}

export interface ContentItem {
  id: number;
  title: string;
  original_title?: string;
  original_name?: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  vote_average: number;
  vote_count: number;
  release_date?: string;
  first_air_date?: string;
  genre_ids: number[];
  original_language: string;
  popularity: number;
}

export interface Filters {
  contentType: 'movie' | 'tv' | 'miniseries';
  genres: number[];
  yearFrom: string;
  yearTo: string;
  language: string;
  minRating: number;
}

const makeRequest = async (
  endpoint: string,
  params: Record<string, any> = {},
  signal?: AbortSignal
) => {
  const apiKey = getTmdbApiKey();
  if (!apiKey) {
    throw new Error('API key is required');
  }

  const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
  url.searchParams.append('api_key', apiKey);
  url.searchParams.append('language', 'pt-PT');

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.append(key, value.toString());
    }
  });

  const response = await fetch(url.toString(), { signal });

  if (!response.ok) {
    throw new Error(`TMDb API error: ${response.status}`);
  }

  return response.json();
};

export const getGenres = async (
  contentType: 'movie' | 'tv',
  signal?: AbortSignal
): Promise<Genre[]> => {
  // Note: 'language' is already appended by makeRequest; adding it again here
  // duplicated the query param and caused TMDb to respond with a 400 error.
  const response = await makeRequest(`/genre/${contentType}/list`, {}, signal);
  return response.genres;
};

// NEW: Get genres for specific content type
export const getGenresForContentType = async (
  contentType: 'movie' | 'tv' | 'miniseries',
  signal?: AbortSignal
): Promise<Genre[]> => {
  // For miniseries, use TV genres since they are a subset of TV shows
  const searchType = contentType === 'miniseries' ? 'tv' : contentType;
  return getGenres(searchType, signal);
};

const SORT_OPTIONS = [
  'popularity.desc',
  'popularity.asc',
  'release_date.desc',
  'release_date.asc',
  'vote_average.desc',
  'vote_average.asc',
  'vote_count.desc',
  'vote_count.asc'
] as const;

// Picks a random TMDb 'sort_by' option. Exposed so a single value can be
// picked once per suggestion-pool build and reused across every page
// request in that build (see buildSuggestionPool) instead of being
// re-randomized per page, which previously caused inconsistent pagination.
export const getRandomSortOption = (): string =>
  SORT_OPTIONS[Math.floor(Math.random() * SORT_OPTIONS.length)];

export const discoverContent = async (
  filters: Filters,
  page: number = 1,
  sortBy: string = getRandomSortOption(),
  signal?: AbortSignal
): Promise<TmdbResponse<ContentItem>> => {
  const { contentType, genres, yearFrom, yearTo, language, minRating } = filters;

  // For miniseries, we search TV shows and filter by series characteristics
  const searchType = contentType === 'miniseries' ? 'tv' : contentType;

  const params: Record<string, any> = {
    page,
    'vote_average.gte': minRating,
    'vote_count.gte': 10,
    sort_by: sortBy,
  };

  if (genres.length > 0) {
    params.with_genres = genres.join(',');
  }

  if (yearFrom) {
    if (searchType === 'movie') {
      params['primary_release_date.gte'] = `${yearFrom}-01-01`;
    } else {
      params['first_air_date.gte'] = `${yearFrom}-01-01`;
    }
  }

  if (yearTo) {
    if (searchType === 'movie') {
      params['primary_release_date.lte'] = `${yearTo}-12-31`;
    } else {
      params['first_air_date.lte'] = `${yearTo}-12-31`;
    }
  }

  if (language && language !== 'all') {
    params.with_original_language = language;
  }

  const response = await makeRequest(`/discover/${searchType}`, params, signal);

  // Normalize the response to have consistent field names
  const normalizedResults = response.results.map((item: Movie | TvShow) => ({
    ...item,
    title: (item as Movie).title || (item as TvShow).name,
    original_title: (item as any).original_title,
    original_name: (item as any).original_name,
    release_date: (item as Movie).release_date,
    first_air_date: (item as TvShow).first_air_date,
  }));

  return {
    ...response,
    results: normalizedResults,
  };
};

// Global suggestion pool cache. The pool is built progressively: the first
// page of results is fetched, filtered and shuffled, then returned
// immediately so the caller isn't blocked waiting for every page. Remaining
// pages continue loading in the background and get merged into the pool as
// they arrive, so later suggestions benefit from a larger pool without
// delaying the first one.
let suggestionPool: ContentItem[] = [];
let currentFiltersKey = '';
// Bumped whenever the filters change (or clearSuggestionPool is called) so
// any in-flight background page-fetching for a now-stale pool can detect
// it's obsolete and stop mutating the shared pool.
let poolGeneration = 0;
let firstPagePromise: Promise<void> | null = null;

const getFiltersKey = (filters: Filters): string => {
  return JSON.stringify(filters);
};

export const clearSuggestionPool = () => {
  suggestionPool = [];
  currentFiltersKey = '';
  poolGeneration += 1;
  firstPagePromise = null;
};

const dedupeById = (items: ContentItem[]): ContentItem[] =>
  items.filter((item, index, self) => index === self.findIndex(i => i.id === item.id));

// Fisher-Yates shuffle algorithm (returns a new array).
const shuffle = (items: ContentItem[]): ContentItem[] => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

const isAbortError = (error: unknown): boolean => (error as Error)?.name === 'AbortError';

// For miniseries, fetch detailed info for each candidate (in batches, with a
// short delay between batches to avoid rate limiting) and keep only the
// ones that look like a miniseries.
const filterMiniseries = async (items: ContentItem[], signal?: AbortSignal): Promise<ContentItem[]> => {
  const detailedResults: ContentItem[] = [];

  for (let i = 0; i < items.length; i += 10) {
    const batch = items.slice(i, i + 10);
    const detailPromises = batch.map(async (item) => {
      try {
        const details = await makeRequest(`/tv/${item.id}`, {}, signal);
        const isMiniseries =
          details.type === 'Miniseries' ||
          (details.status === 'Ended' && details.number_of_seasons === 1 && details.number_of_episodes <= 12) ||
          (details.status === 'Returning Series' && details.number_of_seasons === 1 && details.number_of_episodes <= 12);

        return isMiniseries ? { ...item, ...details } : null;
      } catch (error) {
        if (isAbortError(error)) {
          throw error;
        }
        console.error(`Error getting details for ${item.title}:`, error);
        return null;
      }
    });

    const batchResults = await Promise.all(detailPromises);
    detailedResults.push(...batchResults.filter((result): result is ContentItem => Boolean(result)));

    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return detailedResults;
};

// Continues fetching the remaining pages of a suggestion-pool build in the
// background, merging new unique items into the shared pool as they arrive.
// Does not block the caller of buildSuggestionPool. Bails out as soon as the
// pool becomes stale (filters changed / cleared) or a request is aborted.
const continueBuildingPool = async (
  filters: Filters,
  sortBy: string,
  totalPagesAvailable: number,
  generation: number,
  signal?: AbortSignal
): Promise<void> => {
  const totalPages = Math.min(totalPagesAvailable, 50); // Limit to 50 pages for performance
  if (totalPages <= 1) {
    return;
  }

  const allExtra: ContentItem[] = [];
  const batchSize = 5;

  for (let i = 2; i <= totalPages; i += batchSize) {
    if (generation !== poolGeneration) {
      return; // Pool was invalidated while we were fetching; abandon.
    }

    const batchEnd = Math.min(i + batchSize - 1, totalPages);
    const batchPromises = [];
    for (let page = i; page <= batchEnd; page++) {
      batchPromises.push(discoverContent(filters, page, sortBy, signal));
    }

    try {
      const batchResponses = await Promise.all(batchPromises);
      batchResponses.forEach(response => allExtra.push(...response.results));
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }
      console.error(`Error fetching batch ${i}-${batchEnd}:`, error);
      break; // Continue with what we have so far.
    }
  }

  if (generation !== poolGeneration || allExtra.length === 0) {
    return;
  }

  let extraUnique = dedupeById(allExtra).filter(
    item => !suggestionPool.some(existing => existing.id === item.id)
  );

  if (extraUnique.length === 0) {
    return;
  }

  if (filters.contentType === 'miniseries') {
    try {
      extraUnique = await filterMiniseries(extraUnique, signal);
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }
      console.error('Error filtering miniseries:', error);
      return;
    }
  }

  if (generation !== poolGeneration || extraUnique.length === 0) {
    return;
  }

  suggestionPool = shuffle([...suggestionPool, ...extraUnique]);
};

const buildSuggestionPool = async (filters: Filters, signal?: AbortSignal): Promise<ContentItem[]> => {
  const filtersKey = getFiltersKey(filters);

  // If filters changed, clear the pool and invalidate any background work
  // still building the previous one.
  if (currentFiltersKey !== filtersKey) {
    suggestionPool = [];
    currentFiltersKey = filtersKey;
    poolGeneration += 1;
    firstPagePromise = null;
  }

  const generation = poolGeneration;

  // If the pool already has its first page, return it immediately.
  if (suggestionPool.length > 0) {
    return suggestionPool;
  }

  if (!firstPagePromise) {
    const sortBy = getRandomSortOption();

    firstPagePromise = (async () => {
      const initialResponse = await discoverContent(filters, 1, sortBy, signal);

      if (generation !== poolGeneration) {
        return; // Stale by the time the first page arrived.
      }

      if (initialResponse.results.length === 0) {
        suggestionPool = [];
        return;
      }

      let firstPageResults = dedupeById(initialResponse.results);
      if (filters.contentType === 'miniseries') {
        firstPageResults = await filterMiniseries(firstPageResults, signal);
      }

      if (generation !== poolGeneration) {
        return;
      }

      suggestionPool = shuffle(firstPageResults);

      // Keep loading the remaining pages in the background without making
      // the caller wait for them.
      continueBuildingPool(filters, sortBy, initialResponse.total_pages, generation, signal).catch(error => {
        if (!isAbortError(error)) {
          console.error('Error continuing suggestion pool build:', error);
        }
      });
    })();
  }

  await firstPagePromise;
  return suggestionPool;
};

export const getRandomSuggestion = async (
  filters: Filters,
  excludeIds: number[] = [],
  signal?: AbortSignal
): Promise<ContentItem | null> => {
  try {
    const pool = await buildSuggestionPool(filters, signal);

    if (pool.length === 0) {
      return null;
    }

    // Find first item that hasn't been shown yet, otherwise reset (pool
    // exhausted) and return the first item.
    const availableItem = pool.find(item => !excludeIds.includes(item.id));
    return availableItem || pool[0];
  } catch (error) {
    if (isAbortError(error)) {
      // Superseded by a newer request; let the caller decide how to react.
      throw error;
    }
    console.error('❌ Error getting random suggestion:', error);
    return null;
  }
};

// Get detailed information about a specific content item, including the
// credits (cast/crew) and the watch providers by region.
export const getContentDetails = async (
  contentType: string,
  id: number,
  signal?: AbortSignal
): Promise<any> => {
  const searchType = contentType === 'miniseries' ? 'tv' : contentType;
  // Note: 'language' is already appended by makeRequest; do not repeat it here
  // (duplicate query params cause TMDb to respond with a 400 error).
  const response = await makeRequest(`/${searchType}/${id}`, {
    append_to_response: 'credits,watch/providers'
  }, signal);
  return response;
};

// Guess a sensible default region (ISO 3166-1 country code) from the
// browser's locale, falling back to the US when it can't be determined.
export const getDefaultRegion = (): string => {
  const locale = typeof navigator !== 'undefined' ? navigator.language : 'pt-PT';
  const region = locale.split('-')[1];
  return region ? region.toUpperCase() : 'US';
};

// Extract the top-billed cast members from a content details response.
export const getCast = (details: any, limit: number = 5): CastMember[] => {
  const cast = details?.credits?.cast;
  if (!Array.isArray(cast)) {
    return [];
  }

  return cast.slice(0, limit).map((member: any) => ({
    id: member.id,
    name: member.name,
    character: member.character,
    profile_path: member.profile_path ?? null,
  }));
};

// Extract the watch providers (streaming/rent/buy) for a given region from
// a content details response. Falls back to the US region, then to null
// when no providers are available at all.
export const getWatchProviders = (details: any, region?: string): WatchProviders | null => {
  const resultsByRegion = details?.['watch/providers']?.results;
  if (!resultsByRegion) {
    return null;
  }

  const targetRegion = region || getDefaultRegion();
  return resultsByRegion[targetRegion] || resultsByRegion.US || null;
};