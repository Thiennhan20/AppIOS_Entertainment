import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from '../api/authApi';
import { clearWatchlistCache } from '../mobile/components/WatchlistButton';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Linking } from 'react-native';
import { CONFIG } from '../constants/config';
import {
  registerForPushNotificationsAsync,
  registerTokenWithServer,
  deregisterTokenFromServer,
} from '../services/pushNotifications';

WebBrowser.maybeCompleteAuthSession();

export const AuthContext = createContext<any>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [entryTransitionId, setEntryTransitionId] = useState(0);
  const lastTransitionToken = useRef<string | null>(null);
  const pushTokenRef = useRef<string | null>(null);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl && await completeGoogleCallback(initialUrl)) {
          setLoading(false);
          return;
        }
      } catch {
        // Fall through and restore any session already saved on the device.
      }
      await checkToken();
    };

    restoreSession();

    const subscription = Linking.addEventListener('url', ({ url }) => {
      completeGoogleCallback(url);
    });

    return () => subscription.remove();
  }, []);

  const checkToken = async () => {
    try {
      const token = await AsyncStorage.getItem('@auth_token');
      if (token) {
        // Có token, đi fetch data user thật
        const data = await authApi.getProfile();
        setUser(data.user);
        // Register push token silently in the background
        registerForPushNotificationsAsync().then((expoPushToken) => {
          if (expoPushToken) {
            pushTokenRef.current = expoPushToken;
            registerTokenWithServer(expoPushToken).catch(() => {});
          }
        }).catch(() => {});
      }
    } catch (err) {
      // Token hết hạn or sai
      await AsyncStorage.removeItem('@auth_token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const data = await authApi.login(email, password);
      await AsyncStorage.setItem('@auth_token', data.token);
      clearWatchlistCache();
      setUser(data.user);
      requestEntryTransition(data.token);
      return { success: true };
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Network error or server unavailable';
      return { success: false, error: msg };
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      const data = await authApi.register(name, email, password);
      return { success: true, message: data.message };
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Registration error';
      return { success: false, error: msg };
    }
  };

  const requestEntryTransition = (token: string) => {
    if (lastTransitionToken.current === token) return;
    lastTransitionToken.current = token;
    setEntryTransitionId((current) => current + 1);
  };

  const setupPushNotifications = async () => {
    try {
      const expoPushToken = await registerForPushNotificationsAsync();
      if (expoPushToken) {
        pushTokenRef.current = expoPushToken;
        await registerTokenWithServer(expoPushToken);
      }
    } catch {
      // Best-effort push registration
    }
  };

  const saveAuthenticatedSession = async (token: string, animateEntry = false) => {
    await AsyncStorage.setItem('@auth_token', token);
    const data = await authApi.getProfile();
    clearWatchlistCache();
    setUser(data.user);
    if (animateEntry) requestEntryTransition(token);
    setupPushNotifications();
  };

  const completeGoogleCallback = async (url: string) => {
    try {
      const callbackUrl = new URL(url);
      const isNativeAuthCallback = callbackUrl.protocol === 'ntnmovie:' &&
        (callbackUrl.hostname === 'auth' || callbackUrl.pathname === '/auth');
      const isAuthCallback = isNativeAuthCallback ||
        (callbackUrl.protocol === 'exp:' && callbackUrl.pathname.endsWith('/--/auth'));
      const token = callbackUrl.searchParams.get('token');

      if (!isAuthCallback || !token) return false;

      await saveAuthenticatedSession(token, true);
      return true;
    } catch {
      return false;
    }
  };

  const googleLogin = async () => {
    try {
      const redirectUri = AuthSession.makeRedirectUri({
        scheme: 'ntnmovie',
        path: 'auth',
      });
      const authUrl = `${CONFIG.API_BASE_URL}/api/auth/google/mobile?return_uri=${encodeURIComponent(redirectUri)}`;
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

      if (result.type !== 'success' || !result.url) {
        return { success: false, cancelled: true };
      }

      const callbackUrl = new URL(result.url);
      const error = callbackUrl.searchParams.get('error');
      if (error) {
        return { success: false, error: `Google login failed: ${error}` };
      }

      const token = callbackUrl.searchParams.get('token');
      if (!token) {
        return { success: false, error: 'No login token was returned by the server' };
      }

      await saveAuthenticatedSession(token, true);
      return { success: true };
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Google login error with server';
      return { success: false, error: msg };
    }
  };

  // Callback for flushing search history before logout
  let _searchHistoryFlush: (() => void) | null = null;

  const registerSearchHistoryFlush = (flush: () => void) => {
    _searchHistoryFlush = flush;
  };

  const logout = async () => {
    // Flush pending search history sync before logout
    if (_searchHistoryFlush) {
      try {
        _searchHistoryFlush();
      } catch {
        // Best effort
      }
    }
    // Deregister push token before clearing auth session
    if (pushTokenRef.current) {
      try {
        await deregisterTokenFromServer(pushTokenRef.current);
      } catch {
        // Best effort
      }
      pushTokenRef.current = null;
    }
    await authApi.logout();
    await AsyncStorage.removeItem('@auth_token');
    clearWatchlistCache();
    setUser(null);
    lastTransitionToken.current = null;
  };

  const updateProfileContext = async (data: any) => {
    try {
      const response = await authApi.updateProfile(data);
      if (response.user) {
        setUser(response.user);
      }
      return { success: true };
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Update profile error';
      return { success: false, error: msg };
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, entryTransitionId, login, register, logout, googleLogin, registerSearchHistoryFlush, updateProfile: updateProfileContext }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
