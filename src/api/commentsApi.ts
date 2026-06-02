import axios from 'axios';
import { CONFIG } from '../constants/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiCache, { buildApiCacheKey, CACHE_TTL } from '../utils/apiCache';

const commentsClient = axios.create({
  baseURL: `${CONFIG.API_BASE_URL}/api`,
  timeout: 60000,
});

commentsClient.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('@auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const commentsApi = {
  getTopComments: async (limit: number = 10) => {
    const cacheKey = buildApiCacheKey('comments', 'top', { limit });
    return apiCache.getOrSet(cacheKey, async () => {
      const response = await commentsClient.get('/comments/top', { params: { limit } });
      return response.data.data;
    }, CACHE_TTL.TOP_COMMENTS);
  },
  getRecentComments: async (limit: number = 10) => {
    const cacheKey = buildApiCacheKey('comments', 'recent', { limit });
    return apiCache.getOrSet(cacheKey, async () => {
      const response = await commentsClient.get('/comments/recent', { params: { limit } });
      return response.data.data;
    }, CACHE_TTL.RECENT_COMMENTS);
  },
  getUserComments: async (page: number = 1, limit: number = 10, filter: string = 'comments') => {
    const response = await commentsClient.get('/comments/user/me', { params: { page, limit, filter } });
    return response.data;
  },
  getComments: async (movieId: string | number, type: string, sortBy: string, page: number, limit: number) => {
    const response = await commentsClient.get(`/comments/${movieId}/${type}?sortBy=${sortBy}&page=${page}&limit=${limit}`);
    return response.data;
  },
  postComment: async (data: { movieId: string | number; type: string; content: string; parentId?: string }) => {
    const response = await commentsClient.post('/comments', data);
    return response.data;
  },
  likeComment: async (commentId: string) => {
    const response = await commentsClient.put(`/comments/${commentId}/like`);
    return response.data;
  },
  updateComment: async (commentId: string, content: string) => {
    const response = await commentsClient.put(`/comments/${commentId}`, { content });
    return response.data;
  },
  deleteComment: async (commentId: string) => {
    const response = await commentsClient.delete(`/comments/${commentId}`);
    return response.data;
  },
  clearHomeCache: () => apiCache.clearByPrefix('comments:'),
};
