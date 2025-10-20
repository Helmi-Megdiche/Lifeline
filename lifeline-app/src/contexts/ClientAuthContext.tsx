"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { getApiUrl, API_CONFIG } from '@/lib/config';

interface User {
  id: string;
  username: string;
  name?: string;
  email?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  register: (username: string, password: string, email: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
  isOnline: boolean;
  refreshOnlineStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Client-side only online check function
const isOnlineClient = async (): Promise<boolean> => {
  try {
    // First check navigator.onLine
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      console.log('Navigator reports offline');
      return false;
    }
    
    // Try to reach the backend
    const apiUrl = 'http://10.133.250.197:4004';
    console.log('Checking online status with URL:', apiUrl);
    
    // Try with a very short timeout first
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 500);
    
    try {
      const response = await fetch(`${apiUrl}/health`, { 
        method: "GET", 
        cache: "no-cache",
        signal: controller.signal,
        mode: 'cors',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      clearTimeout(timeoutId);
      const isOnline = response.ok;
      console.log('Online check result:', isOnline, 'Status:', response.status);
      return isOnline;
    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.log('First fetch attempt failed:', fetchError);
      
      // Try a second time with a different approach
      try {
        const response2 = await fetch(`${apiUrl}/health`, { 
          method: "GET", 
          cache: "no-cache",
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        const isOnline = response2.ok;
        console.log('Second online check result:', isOnline, 'Status:', response2.status);
        return isOnline;
      } catch (secondError) {
        console.log('Second fetch attempt also failed:', secondError);
        return false;
      }
    }
  } catch (error) {
    console.log('Online check failed:', error);
    return false;
  }
};

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
          const online = await isOnlineClient();
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
        const online = await isOnlineClient();
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

  const register = async (username: string, password: string, email: string) => {
    const response = await fetch(`${API_CONFIG.BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, email }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Registration failed');
    }
    router.push('/auth');
  };

  const forgotPassword = async (email: string) => {
    const online = await isOnlineClient();
    if (!online) throw new Error('You are offline. Connect to the internet to reset password.');
    const response = await fetch(`${API_CONFIG.BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!response.ok) {
      let message = 'Failed to send reset email';
      try { const data = await response.json(); message = data.message || message; } catch {}
      throw new Error(message);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('lifeline:token');
    localStorage.removeItem('lifeline:user');
    router.push('/auth');
  };

  const refreshOnlineStatus = async () => {
    const online = await isOnlineClient();
    setOnlineStatus(online);
  };

  const isAuthenticated = !!token;

  // Don't render until initialized to prevent hydration mismatch
  if (!isInitialized) {
    return <div>Loading...</div>;
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, register, forgotPassword, isAuthenticated, isLoading, isOnline: onlineStatus, refreshOnlineStatus }}>
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
