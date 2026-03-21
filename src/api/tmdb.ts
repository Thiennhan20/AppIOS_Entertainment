import axios from 'axios';
import { CONFIG } from '../constants/config';
import { useTranslation } from 'react-i18next';

const localClient = axios.create({
  baseURL: `${CONFIG.API_BASE_URL}/api/tmdb`,
  timeout: 60000,
});

localClient.interceptors.response.use(
  (response) => response.data,
  (error) => Promise.reject(error)
);

// Fallback executor wrapper (now simply an API gateway driver)
async function fetchWithFallback(endpoint: string, params: any = {}) {
  try {
    return await localClient.get('', { params: { endpoint, ...params } });
  } catch (error) {
    console.error(`TMDB Gateway failed for ${endpoint}`);
    throw error;
  }
}

export const tmdbApi = {
  getTrendingMovies: () => fetchWithFallback('/trending/movie/week'),
  getTrendingTV: () => fetchWithFallback('/trending/tv/week'),
  getTopRatedMovies: () => fetchWithFallback('/movie/top_rated'),
  getMovieDetail: (id: string | number) => fetchWithFallback(`/movie/${id}`),
  getTVDetail: (id: string | number) => fetchWithFallback(`/tv/${id}`),
  getSimilarMovies: (id: string | number) => fetchWithFallback(`/movie/${id}/similar`),
  getSimilarTV: (id: string | number) => fetchWithFallback(`/tv/${id}/similar`),
  
  // New endpoints
  searchMovies: (query: string) => fetchWithFallback('/search/movie', { query }),
  searchTV: (query: string) => fetchWithFallback('/search/tv', { query }),
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
      sort_by: 'release_date.asc'
    });
  },
  getActionMovies: () => fetchWithFallback('/discover/movie', { with_genres: 28 }),
  getAnime: () => fetchWithFallback('/discover/tv', { with_genres: 16 }),
  getHorrorMovies: () => fetchWithFallback('/discover/movie', { with_genres: 27 }),
  getRomanceMovies: () => fetchWithFallback('/discover/movie', { with_genres: 10749 }),
};
