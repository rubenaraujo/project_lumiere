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

const makeRequest = async (endpoint: string, params: Record<string, any> = {}) => {
  const apiKey = getTmdbApiKey();
  if (!apiKey) {
    throw new Error('API key is required');
  }

  const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
  url.searchParams.append('api_key', apiKey);
  url.searchParams.append('language', 'pt-BR');
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.append(key, value.toString());
    }
  });

  const response = await fetch(url.toString());
  
  if (!response.ok) {
    throw new Error(`TMDb API error: ${response.status}`);
  }
  
  return response.json();
};

export const getGenres = async (contentType: 'movie' | 'tv'): Promise<Genre[]> => {
  const response = await makeRequest(`/genre/${contentType}/list`);
  return response.genres;
};

export const discoverContent = async (
  filters: Filters,
  page: number = 1
): Promise<TmdbResponse<ContentItem>> => {
  const { contentType, genres, yearFrom, yearTo, language, minRating } = filters;
  
  // For miniseries, we search TV shows and filter by series characteristics
  const searchType = contentType === 'miniseries' ? 'tv' : contentType;
  
  const params: Record<string, any> = {
    page,
    'vote_average.gte': minRating,
    'vote_count.gte': 10,
    sort_by: [
      'popularity.desc', 
      'popularity.asc', 
      'release_date.desc', 
      'release_date.asc',
      'vote_average.desc', 
      'vote_average.asc',
      'vote_count.desc',
      'vote_count.asc'
    ][Math.floor(Math.random() * 8)],
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
  
  const response = await makeRequest(`/discover/${searchType}`, params);
  
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

// Global suggestion pool cache
let suggestionPool: ContentItem[] = [];
let currentFiltersKey = '';

const getFiltersKey = (filters: Filters): string => {
  return JSON.stringify(filters);
};

export const clearSuggestionPool = () => {
  suggestionPool = [];
  currentFiltersKey = '';
};


const buildSuggestionPool = async (filters: Filters): Promise<ContentItem[]> => {
  const filtersKey = getFiltersKey(filters);
  
  // If filters changed, clear the pool
  if (currentFiltersKey !== filtersKey) {
    suggestionPool = [];
    currentFiltersKey = filtersKey;
  }
  
  // If pool is already built, return it
  if (suggestionPool.length > 0) {
    return suggestionPool;
  }
  
  console.log('Building complete suggestion pool...');
  
  // Get first page to know total pages
  const initialResponse = await discoverContent(filters, 1);
  
  if (initialResponse.results.length === 0) {
    return [];
  }
  
  const allResults: ContentItem[] = [...initialResponse.results];
  const totalPages = Math.min(initialResponse.total_pages, 50); // Limit to 50 pages for performance
  
  console.log(`Total pages available: ${initialResponse.total_pages}, Fetching: ${totalPages}`);
  
  // Fetch remaining pages in parallel (in batches to avoid overwhelming the API)
  const batchSize = 5;
  for (let i = 2; i <= totalPages; i += batchSize) {
    const batchPromises = [];
    const batchEnd = Math.min(i + batchSize - 1, totalPages);
    
    for (let page = i; page <= batchEnd; page++) {
      batchPromises.push(discoverContent(filters, page));
    }
    
    try {
      const batchResponses = await Promise.all(batchPromises);
      batchResponses.forEach(response => {
        allResults.push(...response.results);
      });
      
      console.log(`Fetched pages ${i}-${batchEnd}, Total items so far: ${allResults.length}`);
    } catch (error) {
      console.error(`Error fetching batch ${i}-${batchEnd}:`, error);
      // Continue with what we have
      break;
    }
  }
  
  // Remove duplicates
  const uniqueResults = allResults.filter((item, index, self) => 
    index === self.findIndex(i => i.id === item.id)
  );
  
  // If searching for miniseries, get detailed info and filter more intelligently
  let filteredResults = uniqueResults;
  if (filters.contentType === 'miniseries') {
    console.log('🎬 Filtering for miniseries characteristics...');
    const detailedResults = [];
    
    // Process in batches to avoid overwhelming the API
    for (let i = 0; i < uniqueResults.length; i += 10) {
      const batch = uniqueResults.slice(i, i + 10);
      const detailPromises = batch.map(async (item) => {
        try {
          const details = await makeRequest(`/tv/${item.id}`);
          // Check if it's a miniseries-like show
          const isMiniseries = 
            details.type === 'Miniseries' || 
            details.status === 'Ended' && details.number_of_seasons === 1 && details.number_of_episodes <= 12 ||
            details.status === 'Returning Series' && details.number_of_seasons === 1 && details.number_of_episodes <= 12;
          
          if (isMiniseries) {
            console.log(`✅ ${details.name} qualifies as miniseries: type=${details.type}, seasons=${details.number_of_seasons}, episodes=${details.number_of_episodes}, status=${details.status}`);
            return { ...item, ...details };
          } else {
            console.log(`❌ ${details.name} doesn't qualify: type=${details.type}, seasons=${details.number_of_seasons}, episodes=${details.number_of_episodes}, status=${details.status}`);
            return null;
          }
        } catch (error) {
          console.error(`Error getting details for ${item.title}:`, error);
          return null;
        }
      });
      
      const batchResults = await Promise.all(detailPromises);
      detailedResults.push(...batchResults.filter(Boolean));
      
      console.log(`Processed ${i + batch.length}/${uniqueResults.length} items, found ${detailedResults.length} miniseries so far`);
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    filteredResults = detailedResults;
    console.log(`After miniseries filtering: ${filteredResults.length} items`);
  }
  
  // Fisher-Yates shuffle algorithm
  for (let i = filteredResults.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [filteredResults[i], filteredResults[j]] = [filteredResults[j], filteredResults[i]];
  }
  
  suggestionPool = filteredResults;
  console.log(`Built suggestion pool with ${suggestionPool.length} unique items (shuffled)`);
  
  // Debug: Check if "Presumed Innocent" is in the pool
  const presumedInnocent = suggestionPool.find(item => 
    (item.title || item.original_title || item.original_name)?.toLowerCase().includes('presumed innocent') || 
    item.id === 156933
  );
  if (presumedInnocent) {
    console.log('🎯 Presumed Innocent found in suggestion pool:', presumedInnocent);
  }
  
  const blackBird = suggestionPool.find(item => 
    (item.title || item.original_title || item.original_name)?.toLowerCase().includes('black bird') || 
    item.id === 155537
  );
  if (blackBird) {
    console.log('🎯 Black Bird found in suggestion pool:', blackBird);
  }
  
  return suggestionPool;
};

export const getRandomSuggestion = async (filters: Filters, excludeIds: number[] = []): Promise<ContentItem | null> => {
  try {
    const pool = await buildSuggestionPool(filters);
    
    console.log(`🎯 SUGGESTION STATUS: Pool has ${pool.length} total items`);
    console.log(`🎯 SUGGESTION STATUS: ${excludeIds.length} already shown`);
    console.log(`🎯 SUGGESTION STATUS: ${pool.length - excludeIds.length} available to show`);
    console.log(`🎯 EXCLUDED IDs: [${excludeIds.join(', ')}]`);
    
    if (pool.length === 0) {
      console.log('❌ No items in suggestion pool');
      return null;
    }
    
    // Show all available items in pool for debugging
    console.log('📚 COMPLETE POOL CONTENTS:');
    pool.forEach((item, index) => {
      const isShown = excludeIds.includes(item.id);
      console.log(`  ${index + 1}. [ID: ${item.id}] ${item.title} ${isShown ? '(ALREADY SHOWN)' : '(AVAILABLE)'}`);
    });
    
    // Find first item that hasn't been shown yet
    const availableItem = pool.find(item => !excludeIds.includes(item.id));
    
    if (!availableItem) {
      console.log('⚠️ All suggestions have been shown. Pool exhausted. Resetting...');
      // Reset the shown IDs when pool is exhausted and return first item
      const firstItem = pool[0];
      console.log(`🔄 Restarting with: ${firstItem.title}`);
      return firstItem;
    }
    
    console.log(`✅ SELECTED SUGGESTION: [ID: ${availableItem.id}] ${availableItem.title}`);
    console.log(`✅ This is suggestion ${excludeIds.length + 1} of ${pool.length} total`);
    return availableItem;
  } catch (error) {
    console.error('❌ Error getting random suggestion:', error);
    return null;
  }
};

// Get detailed information about a specific content item
export const getContentDetails = async (
  contentType: string, 
  id: number
): Promise<any> => {
  const searchType = contentType === 'miniseries' ? 'tv' : contentType;
  const response = await makeRequest(`/${searchType}/${id}`, {
    append_to_response: 'credits'
  });
  return response;
};