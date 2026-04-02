import axios from 'axios';
import { CONFIG } from '../constants/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const apiClient = axios.create({
  baseURL: `${CONFIG.API_BASE_URL}/api`,
  timeout: 60000,
});

apiClient.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('@auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface SearchHistoryEntry {
  query: string;
  searched_at: string;
}

export const searchHistoryApi = {
  /** GET /api/search-history — fetch all history from server */
  getHistory: async (): Promise<{ history: SearchHistoryEntry[] }> => {
    const response = await apiClient.get('/search-history');
    return response.data;
  },

  /** POST /api/search-history — sync full history array to server */
  syncHistory: async (history: SearchHistoryEntry[]): Promise<{ ok: boolean; count: number }> => {
    const response = await apiClient.post('/search-history', { history });
    return response.data;
  },

  /** DELETE /api/search-history — clear all history on server */
  clearHistory: async (): Promise<{ ok: boolean }> => {
    const response = await apiClient.delete('/search-history');
    return response.data;
  },
};
