import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import api from '../utils/api';

interface User {
  id?: string;
  fullName?: string;
  email?: string;
  isGuest?: boolean;
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isGuest: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { fullName: string; email: string; password: string }) => Promise<void>;
  guestLogin: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
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

  const login = async (email: string, password: string): Promise<void> => {
    const response: any = await api.auth.login({ email, password });
    const userData = response.data || response;
    localStorage.setItem('token', userData.accessToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    setIsGuest(false);
  };

  const register = async (data: { fullName: string; email: string; password: string }): Promise<void> => {
    const guestToken = localStorage.getItem('guestToken') || undefined;
    const response: any = await api.auth.register({ ...data, guestToken });
    const userData = response.data || response;
    
    localStorage.removeItem('guestToken');
    localStorage.setItem('token', userData.accessToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    setIsGuest(false);
  };

  const guestLogin = async (): Promise<void> => {
    const response: any = await api.auth.guest();
    localStorage.setItem('guestToken', response.guestToken);
    localStorage.setItem('token', response.accessToken);
    setIsGuest(true);
    setUser({ isGuest: true, ...response });
  };

  const logout = (): void => {
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

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};