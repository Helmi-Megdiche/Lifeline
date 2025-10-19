"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { getApiUrl, API_CONFIG } from '@/lib/config';
import { isOnline } from '@/lib/pouchdb';

interface User {
  id: string;
  username: string;
  name?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  register: (username: string, password: string) => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
  isOnline: boolean;
  refreshOnlineStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const ClientAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [onlineStatus, setOnlineStatus] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Only run on client side
    if (typeof window !== 'undefined') {
      const initializeAuth = async () => {
        try {
          // Check online status
          const online = await isOnline();
          setOnlineStatus(online);

          // Load stored user data
          const storedToken = localStorage.getItem('lifeline:token');
          const storedUser = localStorage.getItem('lifeline:user');
          if (storedToken && storedUser) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
          }
        } catch (error) {
          console.error('Auth initialization error:', error);
        } finally {
          setIsLoading(false);
          setIsInitialized(true);
        }
      };

      initializeAuth();

      // Check online status periodically
      const interval = setInterval(async () => {
        const online = await isOnline();
        setOnlineStatus(online);
      }, 5000); // Check every 5 seconds

      return () => clearInterval(interval);
    }
  }, []);

  const login = async (username: string, password: string) => {
    const response = await fetch(`${API_CONFIG.BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Login failed');
    }

    const data = await response.json();
    setToken(data.accessToken);
    setUser(data.user);
    localStorage.setItem('lifeline:token', data.accessToken);
    localStorage.setItem('lifeline:user', JSON.stringify(data.user));
    router.push('/');
  };

  const register = async (username: string, password: string) => {
    const response = await fetch(`${API_CONFIG.BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Registration failed');
    }
    router.push('/auth');
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('lifeline:token');
    localStorage.removeItem('lifeline:user');
    router.push('/auth');
  };

  const refreshOnlineStatus = async () => {
    const online = await isOnline();
    setOnlineStatus(online);
  };

  const isAuthenticated = !!token;

  // Don't render until initialized to prevent hydration mismatch
  if (!isInitialized) {
    return <div>Loading...</div>;
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, register, isAuthenticated, isLoading, isOnline: onlineStatus, refreshOnlineStatus }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within a ClientAuthProvider');
  }
  return context;
};
