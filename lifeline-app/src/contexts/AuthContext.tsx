"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { getApiUrl, API_CONFIG } from '@/lib/config';
import { saveLocalUser, getLocalUser, clearLocalUser, isOnline } from '@/lib/pouchdb';

interface User {
  id: string;
  username: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  isOnline: boolean;
  refreshOnlineStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [onlineStatus, setOnlineStatus] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Check online status
        const online = await isOnline();
        setOnlineStatus(online);

        // Check for local user data
        const localUser = await getLocalUser();
        if (localUser) {
          setUser({ id: localUser.id, username: localUser.username });
          setToken(localUser.token);
          
          // If online, validate token with backend
          if (online) {
            try {
              const response = await fetch('http://10.133.250.197:4004/auth/test', {
                headers: {
                  'Authorization': `Bearer ${localUser.token}`,
                },
              });
              
              if (!response.ok) {
                // Token invalid, clear local data
                await clearLocalUser();
                setUser(null);
                setToken(null);
              }
            } catch (error) {
              console.warn('Token validation failed:', error);
              // Keep local user for offline use
            }
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

        // Check online status periodically
        const interval = setInterval(async () => {
          const online = await isOnline();
          setOnlineStatus(online);
        }, 5000); // Check every 5 seconds instead of 30

    return () => clearInterval(interval);
  }, []);

  const login = async (username: string, password: string) => {
    const online = await isOnline();
    
    if (online) {
      // Online login - validate with backend
        const response = await fetch('http://10.133.250.197:4004/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed');
      }

      const data = await response.json();
      const userData = { id: data.user.id, username: data.user.username };
      
      setToken(data.accessToken);
      setUser(userData);
      
      // Save to local storage
      await saveLocalUser({
        id: data.user.id,
        username: data.user.username,
        token: data.accessToken,
        password: password, // Store for offline validation
      });
      
      localStorage.setItem('lifeline:token', data.accessToken);
      localStorage.setItem('lifeline:user', JSON.stringify(userData));
      
      router.push('/');
    } else {
      // Offline login - check local credentials
      const localUser = await getLocalUser();
      if (!localUser) {
        throw new Error('No local credentials found. Please connect to internet to login.');
      }
      
      if (localUser.username !== username) {
        throw new Error('Invalid username');
      }
      
      // For offline, we can't validate password against hash
      // In a real app, you'd store a hashed version locally
      setUser({ id: localUser.id, username: localUser.username });
      setToken(localUser.token);
      
      router.push('/');
    }
  };

  const register = async (username: string, password: string) => {
    const online = await isOnline();
    
    if (!online) {
      throw new Error('Registration requires internet connection');
    }

        const response = await fetch('http://10.133.250.197:4004/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Registration failed');
    }

    const data = await response.json();
    const userData = { id: data.user.id, username: data.user.username };
    
    // For registration, we need to login to get the token
    await login(username, password);
  };

  const logout = async () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('lifeline:token');
    localStorage.removeItem('lifeline:user');
    await clearLocalUser();
    router.push('/auth');
  };

  const isAuthenticated = !!user && !!token;

  const refreshOnlineStatus = async () => {
    const online = await isOnline();
    setOnlineStatus(online);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      login, 
      register, 
      logout, 
      isAuthenticated, 
      isLoading, 
      isOnline: onlineStatus,
      refreshOnlineStatus
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
