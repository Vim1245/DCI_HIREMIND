/**
 * DCI HireMind - Authentication & Session Context
 * Manages Supabase Auth session tokens, user profile, and RBAC permissions.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '../types';
import { authAPI } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    full_name?: string;
    role?: string;
    phone_number?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  setUserDirect: (user: User | null, token: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('hiremind_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize and verify session against backend on load
  useEffect(() => {
    const initSession = async () => {
      const storedToken = localStorage.getItem('hiremind_token');
      const storedRefreshToken = localStorage.getItem('hiremind_refresh_token');

      if (storedToken) {
        try {
          // Verify token against backend /api/auth/me
          const res = await authAPI.getMe();
          if (res.user) {
            setUser(res.user);
            setToken(storedToken);
            localStorage.setItem('hiremind_user', JSON.stringify(res.user));
          } else {
            throw new Error('User not returned');
          }
        } catch (err) {
          // Attempt refresh if refresh token is available
          if (storedRefreshToken) {
            try {
              const refreshRes = await authAPI.refreshToken(storedRefreshToken);
              const newToken = refreshRes.access_token;
              localStorage.setItem('hiremind_token', newToken);
              if (refreshRes.refresh_token) {
                localStorage.setItem('hiremind_refresh_token', refreshRes.refresh_token);
              }
              setToken(newToken);
              const meRes = await authAPI.getMe();
              setUser(meRes.user);
              localStorage.setItem('hiremind_user', JSON.stringify(meRes.user));
            } catch {
              localStorage.removeItem('hiremind_token');
              localStorage.removeItem('hiremind_refresh_token');
              localStorage.removeItem('hiremind_user');
              setToken(null);
              setUser(null);
            }
          } else {
            // Token is expired or invalid -> purge storage
            console.warn('Authentication token expired or invalid:', err);
            localStorage.removeItem('hiremind_token');
            localStorage.removeItem('hiremind_refresh_token');
            localStorage.removeItem('hiremind_user');
            setToken(null);
            setUser(null);
          }
        }
      } else {
        // No stored token -> ensure state is clean
        localStorage.removeItem('hiremind_token');
        localStorage.removeItem('hiremind_refresh_token');
        localStorage.removeItem('hiremind_user');
        setToken(null);
        setUser(null);
      }
      setIsLoading(false);
    };

    initSession();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await authAPI.login({ email, password });
      if (!res.access_token) {
        throw new Error('Authentication succeeded but access token was not returned.');
      }
      setToken(res.access_token);
      setUser(res.user);
      localStorage.setItem('hiremind_token', res.access_token);
      if (res.refresh_token) {
        localStorage.setItem('hiremind_refresh_token', res.refresh_token);
      }
      localStorage.setItem('hiremind_user', JSON.stringify(res.user));
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: {
    email: string;
    password: string;
    full_name?: string;
    role?: string;
    phone_number?: string;
  }) => {
    setIsLoading(true);
    try {
      const res = await authAPI.register(data);
      if (res.access_token) {
        setToken(res.access_token);
        localStorage.setItem('hiremind_token', res.access_token);
      }
      if ((res as { refresh_token?: string }).refresh_token) {
        localStorage.setItem('hiremind_refresh_token', (res as { refresh_token?: string }).refresh_token!);
      }
      if (res.user) {
        setUser(res.user);
        localStorage.setItem('hiremind_user', JSON.stringify(res.user));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('hiremind_token');
      localStorage.removeItem('hiremind_refresh_token');
      localStorage.removeItem('hiremind_user');
      setToken(null);
      setUser(null);
    }
  };

  const setUserDirect = (newUser: User | null, newToken: string | null) => {
    setUser(newUser);
    setToken(newToken);
    if (newToken) {
      localStorage.setItem('hiremind_token', newToken);
    } else {
      localStorage.removeItem('hiremind_token');
      localStorage.removeItem('hiremind_refresh_token');
    }
    if (newUser) {
      localStorage.setItem('hiremind_user', JSON.stringify(newUser));
    } else {
      localStorage.removeItem('hiremind_user');
    }
  };

  const isAuthenticated = Boolean(token && user);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isLoading,
        login,
        register,
        logout,
        setUserDirect,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
