import axios from 'axios';
import { CONFIG } from '../constants/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';

const commentsClient = axios.create({
  baseURL: `${CONFIG.API_BASE_URL}/api/comments`,
  timeout: 10000,
});

commentsClient.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('userToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const commentsApi = {
  getTopComments: async (limit: number = 10) => {
    const response = await commentsClient.get('/top', { params: { limit } });
    return response.data.data;
  },
  getRecentComments: async (limit: number = 10) => {
    const response = await commentsClient.get('/recent', { params: { limit } });
    return response.data.data;
  }
};
