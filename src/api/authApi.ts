import axios from 'axios';
import { CONFIG } from '../constants/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';

const apiClient = axios.create({
  baseURL: `${CONFIG.API_BASE_URL}/api`,
  timeout: 10000,
});

apiClient.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('@auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authApi = {
  login: async (email: string, password: string) => {
    const response = await apiClient.post('/auth/login', { email, password });
    return response.data;
  },
  
  register: async (name: string, email: string, password: string) => {
    const response = await apiClient.post('/auth/register', { name, email, password });
    return response.data;
  },
  
  googleLogin: async (credential: string) => {
    const response = await apiClient.post('/auth/google-login', { credential });
    return response.data;
  },
  
  logout: async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (e) {
      // Ignore network errors on logout
    }
  },

  forgotPassword: async (email: string) => {
    const response = await apiClient.post('/auth/forgot-password', { email });
    return response.data;
  },

  getWatchlist: async () => {
    const response = await apiClient.get('/auth/watchlist');
    return response.data;
  },

  addToWatchlist: async (id: string, title: string, poster_path: string, type: 'movie' | 'tv') => {
    const response = await apiClient.post('/auth/watchlist', { id: id.toString(), title, poster_path, type });
    return response.data;
  },

  removeFromWatchlist: async (id: string | number) => {
    const response = await apiClient.delete('/auth/watchlist', { data: { id: id.toString() } });
    return response.data;
  },

  getRecentlyWatched: async () => {
    const response = await apiClient.get('/recently-watched');
    return response.data;
  },

  getProfile: async () => {
    const response = await apiClient.get('/auth/profile');
    return response.data;
  }
};
