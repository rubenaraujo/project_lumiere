import { makeRequest } from './client';
import {
  toMediaType,
  type ContentItem,
  type ContentType,
  type Filters,
  type Genre,
  type RawDiscoverItem,
  type TmdbMediaType,
  type TmdbResponse,
} from './types';

export const getGenres = async (
  mediaType: TmdbMediaType,
  signal?: AbortSignal
): Promise<Genre[]> => {
  // 'language' is already appended by makeRequest; adding it again here
  // duplicates the query param and makes TMDb respond with a 400 error.
  const response = await makeRequest<{ genres: Genre[] }>(`/genre/${mediaType}/list`, {}, signal);
  return response.genres;
};

// Miniseries use the TV genres since they are a subset of TV shows.
export const getGenresForContentType = async (
  contentType: ContentType,
  signal?: AbortSignal
): Promise<Genre[]> => getGenres(toMediaType(contentType), signal);

const SORT_OPTIONS = [
  'popularity.desc',
  'popularity.asc',
  'release_date.desc',
  'release_date.asc',
  'vote_average.desc',
  'vote_average.asc',
  'vote_count.desc',
  'vote_count.asc',
] as const;

// Picks a random TMDb 'sort_by' option. Exposed so a single value can be
// picked once per suggestion-pool build and reused across every page
// request in that build instead of being re-randomized per page, which
// previously caused inconsistent pagination.
export const getRandomSortOption = (): string =>
  SORT_OPTIONS[Math.floor(Math.random() * SORT_OPTIONS.length)];

export const discoverContent = async (
  filters: Filters,
  page: number = 1,
  sortBy: string = getRandomSortOption(),
  signal?: AbortSignal
): Promise<TmdbResponse<ContentItem>> => {
  const { contentType, genres, yearFrom, yearTo, language, minRating } = filters;
  const mediaType = toMediaType(contentType);
  const dateField = mediaType === 'movie' ? 'primary_release_date' : 'first_air_date';

  const params: Record<string, string | number> = {
    page,
    'vote_average.gte': minRating,
    'vote_count.gte': 10,
    sort_by: sortBy,
  };

  if (genres.length > 0) {
    params.with_genres = genres.join(',');
  }
  if (yearFrom) {
    params[`${dateField}.gte`] = `${yearFrom}-01-01`;
  }
  if (yearTo) {
    params[`${dateField}.lte`] = `${yearTo}-12-31`;
  }
  if (language && language !== 'all') {
    params.with_original_language = language;
  }

  const response = await makeRequest<TmdbResponse<RawDiscoverItem>>(
    `/discover/${mediaType}`,
    params,
    signal
  );

  // Normalize: movies expose `title`, TV shows expose `name`.
  return {
    ...response,
    results: response.results.map((item) => ({
      ...item,
      title: item.title || item.name || '',
    })),
  };
};

// Weekly trending titles: used to illustrate the landing state.
export const getTrending = async (
  contentType: ContentType,
  page: number = 1,
  signal?: AbortSignal
): Promise<ContentItem[]> => {
  const mediaType = toMediaType(contentType);
  const response = await makeRequest<TmdbResponse<RawDiscoverItem>>(
    `/trending/${mediaType}/week`,
    { page },
    signal
  );
  return response.results
    .filter((item) => item.poster_path)
    .map((item) => ({ ...item, title: item.title || item.name || '' }));
};
