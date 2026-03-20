import axios from 'axios';
import { CONFIG } from '../constants/config';

const localClient = axios.create({
  baseURL: `${CONFIG.API_BASE_URL}/api/tmdb`,
  timeout: 8000, // Increased slightly for public requests
});

localClient.interceptors.response.use(
  (response) => response.data,
  (error) => Promise.reject(error)
);

const publicClient = axios.create({
  baseURL: 'https://api.themoviedb.org/3',
  timeout: 8000,
  params: {
    api_key: CONFIG.TMDB_PUBLIC_API_KEY,
    language: 'vi-VN'
  }
});

publicClient.interceptors.response.use(
  (response) => response.data,
  (error) => Promise.reject(error)
);

// Fallback executor wrapper
async function fetchWithFallback(endpoint: string, params: any = {}) {
  try {
    return await localClient.get('', { params: { endpoint, ...params } });
  } catch (error) {
    console.warn(`Local TMDB failed for ${endpoint}. Switching to public API.`);
    try {
      return await publicClient.get(endpoint, { params });
    } catch (fallbackError) {
      console.error(`Public TMDB fallback also failed for ${endpoint}`);
      throw fallbackError;
    }
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
  discoverMovies: (page: number = 1) => fetchWithFallback('/discover/movie', { sort_by: 'popularity.desc', page }),
  discoverTV: (page: number = 1) => fetchWithFallback('/discover/tv', { sort_by: 'popularity.desc', page }),
};
