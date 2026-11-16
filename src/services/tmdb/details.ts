import { makeRequest } from './client';
import {
  toMediaType,
  type CastMember,
  type ContentDetails,
  type ContentItem,
  type ContentType,
  type RawDiscoverItem,
  type RawItemDetails,
  type TmdbResponse,
  type WatchProviders,
} from './types';

// Detailed info for a content item, including credits (cast/crew), watch
// providers by region and external ids (IMDb).
export const getContentDetails = (
  contentType: ContentType,
  id: number,
  signal?: AbortSignal
): Promise<ContentDetails> =>
  // 'language' is already appended by makeRequest; do not repeat it here
  // (duplicate query params cause TMDb to respond with a 400 error).
  makeRequest<ContentDetails>(
    `/${toMediaType(contentType)}/${id}`,
    {
      append_to_response: 'credits,watch/providers,external_ids,videos',
      include_video_language: 'pt,en,null',
    },
    signal
  );

// Guess a sensible default region (ISO 3166-1 country code) from the
// browser's locale, falling back to the US when it can't be determined.
export const getDefaultRegion = (): string => {
  const locale = typeof navigator !== 'undefined' ? navigator.language : 'pt-PT';
  const region = locale.split('-')[1];
  return region ? region.toUpperCase() : 'US';
};

// Top-billed cast members from a content details response.
export const getCast = (details: ContentDetails | null | undefined, limit: number = 5): CastMember[] => {
  const cast = details?.credits?.cast;
  if (!Array.isArray(cast)) {
    return [];
  }

  return cast.slice(0, limit).map((member) => ({
    id: member.id,
    name: member.name,
    character: member.character,
    profile_path: member.profile_path ?? null,
  }));
};

// Watch providers (streaming/rent/buy) for a region. Falls back to the US
// region, then to null when no providers are available at all.
export const getWatchProviders = (
  details: ContentDetails | null | undefined,
  region?: string
): WatchProviders | null => {
  const resultsByRegion = details?.['watch/providers']?.results;
  if (!resultsByRegion) {
    return null;
  }

  const targetRegion = region || getDefaultRegion();
  return resultsByRegion[targetRegion] || resultsByRegion.US || null;
};

// YouTube key of the best trailer: official trailers first, then any trailer/teaser.
export const getTrailerKey = (details: ContentDetails | null | undefined): string | null => {
  const videos = (details?.videos?.results ?? []).filter((video) => video.site === 'YouTube');
  const best =
    videos.find((video) => video.type === 'Trailer' && video.official) ??
    videos.find((video) => video.type === 'Trailer') ??
    videos.find((video) => video.type === 'Teaser');
  return best?.key ?? null;
};

// Loads a single title (used to open shared links).
export const getItemById = async (
  contentType: ContentType,
  id: number,
  signal?: AbortSignal
): Promise<ContentItem> => {
  const raw = await makeRequest<RawItemDetails>(`/${toMediaType(contentType)}/${id}`, {}, signal);
  const { genres, title, name, ...rest } = raw;
  return { ...rest, title: title || name || '', genre_ids: (genres ?? []).map((genre) => genre.id) };
};

export const getRecommendations = async (
  contentType: ContentType,
  id: number,
  signal?: AbortSignal
): Promise<ContentItem[]> => {
  const response = await makeRequest<TmdbResponse<RawDiscoverItem>>(
    `/${toMediaType(contentType)}/${id}/recommendations`,
    {},
    signal
  );
  return response.results
    .filter((item) => item.poster_path)
    .map((item) => ({ ...item, title: item.title || item.name || '' }));
};
