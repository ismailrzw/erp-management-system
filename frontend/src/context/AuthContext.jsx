import { useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/authApi';
import { AuthContext } from './AuthContextObject';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('pbl_user') || sessionStorage.getItem('pbl_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [token, setToken] = useState(() => {
    return localStorage.getItem('pbl_token') || sessionStorage.getItem('pbl_token') || null;
  });
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem('pbl_token');
    localStorage.removeItem('pbl_user');
    sessionStorage.removeItem('pbl_token');
    sessionStorage.removeItem('pbl_user');
    setUser(null);
    setToken(null);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const verifySession = async () => {
      const storedToken = localStorage.getItem('pbl_token') || sessionStorage.getItem('pbl_token');
      if (storedToken) {
        try {
          const res = await authApi.getMe();
          if (isMounted && res.success && res.data) {
            setUser(res.data);
            const isLocal = !!localStorage.getItem('pbl_token');
            const storage = isLocal ? localStorage : sessionStorage;
            storage.setItem('pbl_user', JSON.stringify(res.data));
          }
        } catch {
          if (isMounted) {
            logout();
          }
        }
      }
      if (isMounted) {
        setIsLoading(false);
      }
    };

    verifySession();

    return () => {
      isMounted = false;
    };
  }, [logout]);

  const login = async (email, password, rememberMe = false) => {
    const res = await authApi.login(email, password);
    if (res.success && res.data) {
      const { token: authToken, user: userData } = res.data;
      setToken(authToken);
      setUser(userData);

      const storage = rememberMe ? localStorage : sessionStorage;
      localStorage.removeItem('pbl_token');
      localStorage.removeItem('pbl_user');
      sessionStorage.removeItem('pbl_token');
      sessionStorage.removeItem('pbl_user');

      storage.setItem('pbl_token', authToken);
      storage.setItem('pbl_user', JSON.stringify(userData));
      return userData;
    }
    throw new Error(res.message || 'Login failed');
  };

  const updateUser = (updatedData) => {
    setUser((prev) => {
      const merged = { ...prev, ...updatedData };
      if (localStorage.getItem('pbl_token')) {
        localStorage.setItem('pbl_user', JSON.stringify(merged));
      } else if (sessionStorage.getItem('pbl_token')) {
        sessionStorage.setItem('pbl_user', JSON.stringify(merged));
      }
      return merged;
    });
  };

  const value = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    isLoading,
    login,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
