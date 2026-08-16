'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, ApiClientError } from '../lib/api';

const AuthContext = createContext({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  logout: () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    try {
      localStorage.removeItem('elite_token');
      localStorage.removeItem('elite_user');
    } catch {
      // ignore
    }
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const storedToken = localStorage.getItem('elite_token');
      if (!storedToken) {
        setIsLoading(false);
        return null;
      }
      const currentUser = await api.get('/auth/me', { token: storedToken });
      setUser(currentUser);
      localStorage.setItem('elite_user', JSON.stringify(currentUser));
      return currentUser;
    } catch (err) {
      if (err instanceof ApiClientError && err.statusCode === 401) {
        logout();
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = localStorage.getItem('elite_token');
        const storedUser = localStorage.getItem('elite_user');

        if (storedToken) {
          setToken(storedToken);
          if (storedUser) {
            try {
              setUser(JSON.parse(storedUser));
            } catch {
              // fallback
            }
          }
          await refreshUser();
        } else {
          setIsLoading(false);
        }
      } catch {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, [refreshUser]);

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    const { accessToken, user: authenticatedUser } = response;

    try {
      localStorage.setItem('elite_token', accessToken);
      localStorage.setItem('elite_user', JSON.stringify(authenticatedUser));
    } catch {
      // ignore storage failures in private windows
    }

    setToken(accessToken);
    setUser(authenticatedUser);
    return authenticatedUser;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
