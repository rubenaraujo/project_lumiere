const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Credentials come from Vite env vars (see .env.example). A v4 read access
// token (sent as a Bearer header) is preferred over the v3 API key.
const getReadToken = (): string => import.meta.env.VITE_TMDB_READ_TOKEN ?? '';
const getApiKey = (): string => import.meta.env.VITE_TMDB_API_KEY ?? '';

export const isTmdbConfigured = (): boolean => Boolean(getReadToken() || getApiKey());

let apiLanguage = 'pt-PT';

// Language TMDb should use for titles, synopses, genre names, etc.
export const setApiLanguage = (language: string) => {
  apiLanguage = language;
};

export const getApiLanguage = (): string => apiLanguage;

export const isAbortError = (error: unknown): boolean =>
  (error as Error | undefined)?.name === 'AbortError';

export const makeRequest = async <T>(
  endpoint: string,
  params: Record<string, string | number | undefined | null> = {},
  signal?: AbortSignal
): Promise<T> => {
  const token = getReadToken();
  const apiKey = getApiKey();
  if (!token && !apiKey) {
    throw new Error('TMDb credentials are missing: set VITE_TMDB_READ_TOKEN or VITE_TMDB_API_KEY');
  }

  const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
  if (!token) {
    url.searchParams.append('api_key', apiKey);
  }
  url.searchParams.append('language', apiLanguage);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.append(key, value.toString());
    }
  });

  const response = await fetch(url.toString(), {
    signal,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (!response.ok) {
    throw new Error(`TMDb API error: ${response.status}`);
  }

  return response.json() as Promise<T>;
};
