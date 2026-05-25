import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG } from '../constants/config';

export interface FriendUser {
  _id: string;
  name: string;
  avatar?: string;
  originalAvatar?: string;
  createdAt?: string;
}

export interface FriendsData {
  friends: FriendUser[];
  friendRequests: FriendUser[];
  sentFriendRequests: FriendUser[];
}

export interface PublicRecentlyWatchedItem {
  contentId: number;
  isTVShow: boolean;
  title: string;
  poster?: string;
}

export interface PublicProfileResponse {
  user: FriendUser;
  recentlyWatched: PublicRecentlyWatchedItem[];
}

const friendClient = axios.create({
  baseURL: `${CONFIG.API_BASE_URL}/api`,
  timeout: 30000,
});

friendClient.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('@auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const friendsApi = {
  getFriends: async (): Promise<FriendsData> => {
    const response = await friendClient.get('/friends');
    return {
      friends: response.data.friends || [],
      friendRequests: response.data.friendRequests || [],
      sentFriendRequests: response.data.sentFriendRequests || [],
    };
  },

  getPublicProfile: async (userId: string): Promise<PublicProfileResponse> => {
    const response = await friendClient.get(`/auth/profile/${userId}`);
    return {
      user: response.data.user,
      recentlyWatched: response.data.recentlyWatched || [],
    };
  },

  sendRequest: async (userId: string) => {
    const response = await friendClient.post(`/friends/request/${userId}`);
    return response.data;
  },

  acceptRequest: async (userId: string) => {
    const response = await friendClient.post(`/friends/accept/${userId}`);
    return response.data;
  },

  rejectRequest: async (userId: string) => {
    const response = await friendClient.post(`/friends/reject/${userId}`);
    return response.data;
  },

  cancelRequest: async (userId: string) => {
    const response = await friendClient.post(`/friends/cancel/${userId}`);
    return response.data;
  },

  removeFriend: async (userId: string) => {
    const response = await friendClient.delete(`/friends/${userId}`);
    return response.data;
  },
};
