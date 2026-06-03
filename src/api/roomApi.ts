import axios from 'axios';
import { CONFIG } from '../constants/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiCache, { CACHE_TTL } from '../utils/apiCache';

const apiClient = axios.create({
  baseURL: `${CONFIG.API_BASE_URL}/api/rooms`,
  timeout: 30000,
});

apiClient.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('@auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const roomApi = {
  createRoom: async (title: string, stream_url: string, movie_id?: string, audio?: string) => {
    const response = await apiClient.post('/', { title, stream_url, movie_id, audio });
    return response.data;
  },
  
  getActiveRooms: async () => {
    const response = await apiClient.get('/');
    return response.data;
  },

  getPublicRooms: async () => {
    return apiCache.getOrSet('rooms:public', async () => {
      const response = await apiClient.get('/public');
      return response.data;
    }, CACHE_TTL.PUBLIC_ROOMS);
  },
  
  getRoom: async (id: string) => {
    const response = await apiClient.get(`/${id}`);
    return response.data;
  },
  
  closeRoom: async (id: string) => {
    const response = await apiClient.delete(`/${id}`);
    return response.data;
  },
  
  updateStream: async (id: string, stream_url: string, title: string) => {
    const response = await apiClient.patch(`/${id}/stream`, { stream_url, title });
    return response.data;
  },

  clearPublicRoomsCache: () => apiCache.delete('rooms:public'),
};
