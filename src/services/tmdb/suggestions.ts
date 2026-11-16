import { getApiLanguage, isAbortError, makeRequest } from './client';
import { discoverContent, getRandomSortOption } from './discover';
import type { ContentDetails, ContentItem, Filters } from './types';

// Global suggestion pool cache. The pool is built progressively: the first
// page of results is fetched, filtered and shuffled, then returned
// immediately so the caller isn't blocked waiting for every page. Remaining
// pages continue loading in the background and get merged into the pool as
// they arrive, so later suggestions benefit from a larger pool without
// delaying the first one.
let suggestionPool: ContentItem[] = [];
let currentPoolKey = '';
// Bumped whenever the filters change (or clearSuggestionPool is called) so
// any in-flight background page-fetching for a now-stale pool can detect
// it's obsolete and stop mutating the shared pool.
let poolGeneration = 0;
let firstPagePromise: Promise<void> | null = null;

// Titles and synopses are localized, so the API language is part of the key.
export const getPoolKey = (filters: Filters): string =>
  `${getApiLanguage()}|${JSON.stringify(filters)}`;

const resetPool = (key: string) => {
  suggestionPool = [];
  currentPoolKey = key;
  poolGeneration += 1;
  firstPagePromise = null;
};

export const clearSuggestionPool = () => resetPool('');

const dedupeById = (items: ContentItem[]): ContentItem[] => {
  const seen = new Set<number>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
};

// Fisher-Yates shuffle algorithm (returns a new array).
const shuffle = (items: ContentItem[]): ContentItem[] => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

const looksLikeMiniseries = (details: ContentDetails): boolean =>
  details.type === 'Miniseries' ||
  ((details.status === 'Ended' || details.status === 'Returning Series') &&
    details.number_of_seasons === 1 &&
    (details.number_of_episodes ?? Infinity) <= 12);

// For miniseries, fetch detailed info for each candidate (in batches, with a
// short delay between batches to avoid rate limiting) and keep only the
// ones that look like a miniseries.
const filterMiniseries = async (items: ContentItem[], signal?: AbortSignal): Promise<ContentItem[]> => {
  const detailedResults: ContentItem[] = [];

  for (let i = 0; i < items.length; i += 10) {
    const batch = items.slice(i, i + 10);
    const batchResults = await Promise.all(
      batch.map(async (item): Promise<ContentItem | null> => {
        try {
          const details = await makeRequest<ContentDetails>(`/tv/${item.id}`, {}, signal);
          return looksLikeMiniseries(details) ? { ...item, ...details } : null;
        } catch (error) {
          if (isAbortError(error)) {
            throw error;
          }
          console.error(`Error getting details for ${item.title}:`, error);
          return null;
        }
      })
    );

    detailedResults.push(...batchResults.filter((result): result is ContentItem => result !== null));

    await new Promise((resolve) => setTimeout(resolve, 100));
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
      return;
    }

    const batchEnd = Math.min(i + batchSize - 1, totalPages);
    const batchPromises = [];
    for (let page = i; page <= batchEnd; page++) {
      batchPromises.push(discoverContent(filters, page, sortBy, signal));
    }

    try {
      const batchResponses = await Promise.all(batchPromises);
      batchResponses.forEach((response) => allExtra.push(...response.results));
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

  const existingIds = new Set(suggestionPool.map((item) => item.id));
  let extraUnique = dedupeById(allExtra).filter((item) => !existingIds.has(item.id));

  if (extraUnique.length === 0) {
    return;
  }

  if (filters.contentType === 'miniseries') {
    try {
      extraUnique = await filterMiniseries(extraUnique, signal);
    } catch (error) {
      if (!isAbortError(error)) {
        console.error('Error filtering miniseries:', error);
      }
      return;
    }
  }

  if (generation !== poolGeneration || extraUnique.length === 0) {
    return;
  }

  suggestionPool = shuffle([...suggestionPool, ...extraUnique]);
};

const buildSuggestionPool = async (
  filters: Filters,
  signal?: AbortSignal,
  canRetry = true
): Promise<ContentItem[]> => {
  const key = getPoolKey(filters);

  // Filters (or language) changed: drop the pool and invalidate any
  // background work still building the previous one.
  if (currentPoolKey !== key) {
    resetPool(key);
  }

  const generation = poolGeneration;

  if (suggestionPool.length > 0) {
    return suggestionPool;
  }

  if (!firstPagePromise) {
    const sortBy = getRandomSortOption();

    const promise = (async () => {
      const initialResponse = await discoverContent(filters, 1, sortBy, signal);

      if (generation !== poolGeneration || initialResponse.results.length === 0) {
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
      continueBuildingPool(filters, sortBy, initialResponse.total_pages, generation, signal).catch((error) => {
        if (!isAbortError(error)) {
          console.error('Error continuing suggestion pool build:', error);
        }
      });
    })();

    firstPagePromise = promise;
    // A failed (or aborted) first page must not poison later attempts, so
    // "Try again" can rebuild the pool.
    promise.catch(() => {
      if (firstPagePromise === promise) {
        firstPagePromise = null;
      }
    });
  }

  try {
    await firstPagePromise;
  } catch (error) {
    // The shared build was started with a superseded request's signal; this
    // caller is still live, so rebuild with its own signal.
    if (canRetry && isAbortError(error) && !signal?.aborted) {
      return buildSuggestionPool(filters, signal, false);
    }
    throw error;
  }
  return suggestionPool;
};

// Resolves to null when nothing matches the filters. Request failures are
// thrown (AbortError included) so callers can tell "no results" from "error".
export const getRandomSuggestion = async (
  filters: Filters,
  excludeIds: number[] = [],
  signal?: AbortSignal
): Promise<ContentItem | null> => {
  const pool = await buildSuggestionPool(filters, signal);

  if (pool.length === 0) {
    return null;
  }

  // First item not shown yet; otherwise the pool is exhausted, so restart.
  const excluded = new Set(excludeIds);
  return pool.find((item) => !excluded.has(item.id)) ?? pool[0];
};
