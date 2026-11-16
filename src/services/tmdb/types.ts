export type ContentType = 'movie' | 'tv' | 'miniseries';

// TMDb has no "miniseries" endpoint: they're TV shows filtered client-side.
export type TmdbMediaType = 'movie' | 'tv';

export const toMediaType = (contentType: ContentType): TmdbMediaType =>
  contentType === 'miniseries' ? 'tv' : contentType;

export interface TmdbResponse<T> {
  results: T[];
  total_pages: number;
  total_results: number;
}

export interface Genre {
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
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  vote_count: number;
  release_date?: string;
  first_air_date?: string;
  genre_ids: number[];
  original_language: string;
  popularity: number;
}

// Raw item returned by /discover: movies have `title`, TV shows have `name`.
export type RawDiscoverItem = Omit<ContentItem, 'title'> & {
  title?: string;
  name?: string;
};

export interface RawCastMember {
  id: number;
  name: string;
  character: string;
  profile_path?: string | null;
}

export interface TmdbVideo {
  key: string;
  site: string;
  type: string;
  official?: boolean;
}

export interface ContentDetails {
  id?: number;
  imdb_id?: string | null;
  external_ids?: { imdb_id?: string | null };
  runtime?: number | null;
  episode_run_time?: number[];
  created_by?: { id: number; name: string }[];
  credits?: {
    cast?: RawCastMember[];
    crew?: { id: number; job: string; name: string }[];
  };
  'watch/providers'?: { results?: Record<string, WatchProviders> };
  videos?: { results?: TmdbVideo[] };
  // TV-only fields used to detect miniseries.
  type?: string;
  status?: string;
  number_of_seasons?: number;
  number_of_episodes?: number;
}

export interface Filters {
  contentType: ContentType;
  genres: number[];
  yearFrom: string;
  yearTo: string;
  language: string;
  minRating: number;
}

export const DEFAULT_FILTERS: Filters = {
  contentType: 'movie',
  genres: [],
  yearFrom: '',
  yearTo: '',
  language: 'en',
  minRating: 8,
};

// Shape of /movie/{id} and /tv/{id} (genres instead of genre_ids, title or name).
export interface RawItemDetails extends Omit<ContentItem, 'title' | 'genre_ids'> {
  title?: string;
  name?: string;
  genres?: Genre[];
}
