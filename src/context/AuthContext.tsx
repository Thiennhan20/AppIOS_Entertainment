import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from '../api/authApi';
import { Alert } from 'react-native';

export const AuthContext = createContext<any>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkToken();
  }, []);

  const checkToken = async () => {
    try {
      const token = await AsyncStorage.getItem('@auth_token');
      if (token) {
        // Có token, đi fetch data user thật
        const data = await authApi.getProfile();
        setUser(data.user);
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
      setUser(data.user);
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

  const googleLogin = async (idToken: string) => {
    try {
      const data = await authApi.googleLogin(idToken);
      await AsyncStorage.setItem('@auth_token', data.token);
      setUser(data.user);
      return { success: true };
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Google login error with server';
      return { success: false, error: msg };
    }
  };

  const logout = async () => {
    await authApi.logout();
    await AsyncStorage.removeItem('@auth_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, googleLogin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
