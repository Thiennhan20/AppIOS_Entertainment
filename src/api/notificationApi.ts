import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG } from '../constants/config';

export type NotificationType =
  | 'comment_liked'
  | 'comment_replied'
  | 'version_updated'
  | 'friend_request'
  | 'friend_accept';

export interface NotificationActor {
  _id: string;
  name?: string;
  avatar?: string;
}

export interface NotificationMetadata {
  movieId?: number;
  contentType?: 'movie' | 'tvshow';
  commentId?: string;
  parentCommentId?: string;
  commentPreview?: string;
  versionHash?: string;
  versionMessage?: string;
}

export interface AppNotification {
  _id: string;
  type: NotificationType;
  read: boolean;
  readAt?: string | null;
  actor?: NotificationActor | null;
  metadata?: NotificationMetadata;
  createdAt: string;
}

export interface NotificationTarget {
  movieId: number;
  contentType: 'movie' | 'tvshow';
  commentId?: string;
  parentCommentId?: string;
}

interface NotificationsResponse {
  data: AppNotification[];
  unreadCount: number;
  total: number;
}

const notificationClient = axios.create({
  baseURL: `${CONFIG.API_BASE_URL}/api`,
  timeout: 20000,
});

notificationClient.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('@auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const notificationApi = {
  getNotifications: async (): Promise<NotificationsResponse> => {
    const response = await notificationClient.get('/notifications', {
      params: { page: 1, limit: 20 },
    });
    return response.data;
  },

  getUnreadCount: async (): Promise<number> => {
    const response = await notificationClient.get('/notifications/unread-count');
    return response.data.unreadCount || 0;
  },

  getTarget: async (id: string): Promise<NotificationTarget> => {
    const response = await notificationClient.get(`/notifications/${id}/target`);
    return response.data.data;
  },

  markAsRead: async (id: string) => {
    const response = await notificationClient.patch(`/notifications/${id}/read`);
    return response.data.data as AppNotification;
  },

  markAllAsRead: async () => {
    const response = await notificationClient.patch('/notifications/read-all');
    return response.data;
  },
};

export function getNotificationSocketUrl() {
  return `${CONFIG.API_BASE_URL.replace(/\/$/, '')}/notifications`;
}
