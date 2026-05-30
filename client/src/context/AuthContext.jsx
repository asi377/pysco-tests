import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  const checkAuth = useCallback(async () => {
    localStorage.getItem('token');
    const guestToken = localStorage.getItem('guestToken');
    const userData = localStorage.getItem('user');

    if (userData) {
      setUser(JSON.parse(userData));
      setIsGuest(false);
    } else if (guestToken) {
      setIsGuest(true);
      setUser({ isGuest: true });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email, password) => {
    const response = await api.auth.login({ email, password });
    const userData = response.data || response;
    localStorage.setItem('token', userData.token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    setIsGuest(false);
    return userData;
  };

  const register = async (data) => {
    const guestToken = localStorage.getItem('guestToken') || undefined;
    const response = await api.auth.register({ ...data, guestToken });
    const userData = response.data || response;
    
    localStorage.removeItem('guestToken');
    localStorage.setItem('token', userData.token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    setIsGuest(false);
    return userData;
  };

  const guestLogin = async () => {
    const response = await api.auth.guest();
    localStorage.setItem('guestToken', response.guestToken);
    localStorage.setItem('token', response.token);
    setIsGuest(true);
    setUser({ isGuest: true, ...response });
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('guestToken');
    localStorage.removeItem('user');
    setUser(null);
    setIsGuest(false);
  };

  return (
    <AuthContext.Provider value={{ user, loading, isGuest, login, register, guestLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
