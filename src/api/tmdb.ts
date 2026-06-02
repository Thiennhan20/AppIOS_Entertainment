import axios from 'axios';
import { CONFIG } from '../constants/config';
import apiCache, { buildApiCacheKey, CACHE_TTL } from '../utils/apiCache';

const localClient = axios.create({
  baseURL: `${CONFIG.API_BASE_URL}/api/tmdb`,
  timeout: 60000,
});

localClient.interceptors.response.use(
  (response) => response.data,
  (error) => Promise.reject(error)
);

function getTmdbMemoryTTL(path = '', params: any = {}) {
  const endpoint = params?.endpoint || path;
  if (!endpoint) return CACHE_TTL.HOME_FRAME;

  if (/\/search\//.test(endpoint)) return 0;
  if (/\/discover\//.test(endpoint) && Number(params?.page || '1') > 1) return 0;
  if (/\/(credits|videos|images|similar|recommendations)$/.test(endpoint)) return CACHE_TTL.DETAILS;
  if (/^\/(movie|tv)\/\d+$/.test(endpoint)) return CACHE_TTL.DETAILS;

  return CACHE_TTL.HOME_FRAME;
}

async function requestTmdbGatewayUncached(path = '', params: any = {}) {
  const requestConfig: any = { params };

  try {
    return await localClient.get(path, requestConfig);
  } catch (error) {
    const firstError = error as any;

    if (!firstError.response) {
      const currentBaseUrl = CONFIG.API_BASE_URL;

      for (const candidate of CONFIG.API_BASE_URL_CANDIDATES) {
        if (candidate === currentBaseUrl) continue;

        try {
          const response = await axios.get(`${candidate}/api/tmdb${path}`, {
            ...requestConfig,
            timeout: 60000,
          });
          return response.data;
        } catch (retryError: any) {
          if (retryError.response) {
            throw retryError;
          }
        }
      }
    }

    throw error;
  }
}

async function requestTmdbGateway(path = '', params: any = {}) {
  const ttl = getTmdbMemoryTTL(path, params);
  if (ttl <= 0) return requestTmdbGatewayUncached(path, params);

  const cacheKey = buildApiCacheKey('tmdb', path || '/', params);
  return apiCache.getOrSet(cacheKey, () => requestTmdbGatewayUncached(path, params), ttl);
}

async function fetchWithFallback(endpoint: string, params: any = {}) {
  try {
    return await requestTmdbGateway('', { endpoint, ...params });
  } catch (error) {
    throw error;
  }
}

function withMediaType(items: any[] = [], mediaType: 'movie' | 'tv', limit = mediaType === 'movie' ? 8 : 7) {
  return items.slice(0, limit).map((item) => ({ ...item, media_type: mediaType }));
}

function interleaveContent(movies: any[] = [], tvShows: any[] = []) {
  const mixed: any[] = [];
  const max = Math.max(movies.length, tvShows.length);

  for (let index = 0; index < max && mixed.length < 15; index += 1) {
    if (movies[index]) mixed.push(movies[index]);
    if (tvShows[index] && mixed.length < 15) mixed.push(tvShows[index]);
  }

  return mixed;
}

async function fetchMixedDiscover(movieParams: any, tvParams: any) {
  const [movieData, tvData] = await Promise.all([
    fetchWithFallback('/discover/movie', movieParams),
    fetchWithFallback('/discover/tv', tvParams),
  ]);

  return interleaveContent(
    withMediaType((movieData as any)?.results || [], 'movie'),
    withMediaType((tvData as any)?.results || [], 'tv'),
  );
}

async function fetchUpcomingContent() {
  const today = new Date();
  const startDate = today.toISOString().split('T')[0];
  const endDate = new Date(today);
  endDate.setDate(today.getDate() + 90);
  const endDateStr = endDate.toISOString().split('T')[0];

  const data = await fetchWithFallback('/discover/movie', {
    'release_date.gte': startDate,
    'release_date.lte': endDateStr,
    with_release_type: '3|6',
    region: 'VN',
    sort_by: 'release_date.asc',
  });

  const results = ((data as any)?.results || []).filter((movie: any) => {
    if (!movie.release_date) return false;
    return new Date(movie.release_date) >= new Date(startDate);
  });

  return withMediaType(results, 'movie', 20);
}

async function fetchActorsFromContent(items: any[] = []) {
  const cacheKey = buildApiCacheKey(
    'tmdb',
    'home-actors-frame',
    items.slice(0, 5).map((item) => `${item?.media_type || (item?.name && !item?.title ? 'tv' : 'movie')}:${item?.id}`),
  );

  return apiCache.getOrSet(cacheKey, async () => {
    const sources = items
      .filter((item) => item?.id)
      .slice(0, 5);

    const creditResults = await Promise.all(
      sources.map(async (item) => {
        const isTV = item.media_type === 'tv' || item.isTV || (!!item.name && !item.title);
        try {
          const data = await fetchWithFallback(isTV ? `/tv/${item.id}/credits` : `/movie/${item.id}/credits`);
          return { item, cast: (data as any)?.cast || [] };
        } catch {
          return { item, cast: [] };
        }
      }),
    );

    const seen = new Set<number | string>();
    const actors: any[] = [];

    creditResults.forEach(({ item, cast }) => {
      cast.forEach((actor: any) => {
        if (!actor?.id || seen.has(actor.id) || !actor.profile_path) return;
        seen.add(actor.id);
        actors.push({
          ...actor,
          media_type: 'person',
          known_for: [item],
        });
      });
    });

    return actors.slice(0, 12);
  }, CACHE_TTL.HOME_FRAME);
}

export const tmdbApi = {
  getHomeBundle: () => requestTmdbGateway('/home'),
  getTrendingMovies: () => fetchWithFallback('/trending/movie/week'),
  getTrendingTV: () => fetchWithFallback('/trending/tv/week'),
  getFeaturedActorsFromContent: fetchActorsFromContent,
  getTopRatedMovies: () => fetchWithFallback('/movie/top_rated'),
  getMovieDetail: (id: string | number) => fetchWithFallback(`/movie/${id}`),
  getTVDetail: (id: string | number) => fetchWithFallback(`/tv/${id}`),
  getSimilarMovies: (id: string | number) => fetchWithFallback(`/movie/${id}/similar`),
  getSimilarTV: (id: string | number) => fetchWithFallback(`/tv/${id}/similar`),
  
  // New endpoints
  searchMovies: (query: string, page: number = 1) => fetchWithFallback('/search/movie', { query, page }),
  searchTV: (query: string, page: number = 1) => fetchWithFallback('/search/tv', { query, page }),
  getMovieCredits: (id: string | number) => fetchWithFallback(`/movie/${id}/credits`),
  getTVCredits: (id: string | number) => fetchWithFallback(`/tv/${id}/credits`),
  getMovieVideos: (id: string | number) => fetchWithFallback(`/movie/${id}/videos`),
  getTVVideos: (id: string | number) => fetchWithFallback(`/tv/${id}/videos`),
  discoverMovies: (page: number = 1, filters?: {genreId?: number, year?: number, country?: string}) => {
    const params: any = { sort_by: 'popularity.desc', page };
    if (filters?.genreId) params.with_genres = filters.genreId;
    if (filters?.year) params.primary_release_year = filters.year;
    if (filters?.country) params.with_origin_country = filters.country;
    return fetchWithFallback('/discover/movie', params);
  },
  discoverTV: (page: number = 1, filters?: {genreId?: number, year?: number, country?: string}) => {
    const params: any = { sort_by: 'popularity.desc', page };
    if (filters?.genreId) params.with_genres = filters.genreId;
    if (filters?.year) params.first_air_date_year = filters.year;
    if (filters?.country) params.with_origin_country = filters.country;
    return fetchWithFallback('/discover/tv', params);
  },
  getUpcomingMovies: () => {
    const today = new Date();
    const startDate = today.toISOString().split('T')[0];
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 90);
    const endDateStr = endDate.toISOString().split('T')[0];

    return fetchWithFallback('/discover/movie', {
      'release_date.gte': startDate,
      'release_date.lte': endDateStr,
      with_release_type: '3|6',
      region: 'VN',
      sort_by: 'release_date.asc',
    });
  },
  getUpcomingContent: fetchUpcomingContent,
  getKoreanContent: () => fetchMixedDiscover(
    { with_original_language: 'ko', sort_by: 'popularity.desc' },
    { with_original_language: 'ko', sort_by: 'popularity.desc' },
  ),
  getUSUKContent: () => fetchMixedDiscover(
    { with_original_language: 'en', region: 'US', sort_by: 'popularity.desc' },
    { with_original_language: 'en', with_origin_country: 'US|GB', sort_by: 'popularity.desc' },
  ),
  getChinaContent: () => fetchMixedDiscover(
    { with_original_language: 'zh', sort_by: 'popularity.desc' },
    { with_original_language: 'zh', sort_by: 'popularity.desc' },
  ),
  getAnimeContent: () => fetchMixedDiscover(
    { with_genres: 16, with_original_language: 'ja', sort_by: 'popularity.desc' },
    { with_genres: 16, with_original_language: 'ja', sort_by: 'popularity.desc' },
  ),
  getActionContent: () => fetchMixedDiscover(
    { with_genres: 28, sort_by: 'popularity.desc' },
    { with_genres: 10759, sort_by: 'popularity.desc' },
  ),
  getHorrorContent: () => fetchMixedDiscover(
    { with_genres: 27, sort_by: 'popularity.desc' },
    { with_genres: 9648, sort_by: 'popularity.desc' },
  ),
  getRomanceContent: () => fetchMixedDiscover(
    { with_genres: 10749, sort_by: 'popularity.desc' },
    { with_genres: 10749, sort_by: 'popularity.desc' },
  ),
  getActionMovies: () => fetchWithFallback('/discover/movie', { with_genres: 28 }),
  getAnime: () => fetchWithFallback('/discover/tv', { with_genres: 16 }),
  getHorrorMovies: () => fetchWithFallback('/discover/movie', { with_genres: 27 }),
  getRomanceMovies: () => fetchWithFallback('/discover/movie', { with_genres: 10749 }),
  clearCache: () => apiCache.clearByPrefix('tmdb:'),
};
