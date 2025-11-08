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
  logout: () => Promise<void>;
  register: (username: string, password: string, email: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  requestPasswordResetOTP: (email: string) => Promise<{ success: boolean; message: string }>;
  verifyOTP: (email: string, otp: string) => Promise<{ success: boolean; token: string; message: string }>;
  resetPasswordWithOTP: (email: string, otp: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  updateProfile: (username: string, email: string) => Promise<void>;
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
      return false;
    }
    
    // Try to reach the backend
    const apiUrl = API_CONFIG.BASE_URL;
    
    // Try with a short timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // Increased to 2 seconds for better connection
    
    try {
      const response = await fetch(`${apiUrl}/health`, { 
        method: "GET", 
        cache: "no-cache",
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (fetchError) {
      clearTimeout(timeoutId);
      return false;
    }
  } catch (error) {
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
    // Prevent multiple initializations - use ref to track if already started
    let isInitializing = false;
    
    // Only run once on client side
    if (typeof window !== 'undefined' && !isInitialized) {
      isInitializing = true;
      
      const initializeAuth = async () => {
        try {
          // Load stored user data immediately without waiting for online check
          const storedToken = localStorage.getItem('lifeline:token');
          const storedUser = localStorage.getItem('lifeline:user');
          
          if (storedToken && storedUser) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
          }
          
          // Check online status in the background (don't wait for it, don't log errors)
          isOnlineClient().then((online) => {
            setOnlineStatus(online);
          }).catch(() => {
            // Silently fail
            setOnlineStatus(false);
          });
          
        } catch (error) {
          console.error('❌ Auth initialization error:', error);
        } finally {
          setIsLoading(false);
          setIsInitialized(true);
        }
      };

      initializeAuth();

      // Check online status periodically (with longer interval to avoid spam)
      const interval = setInterval(async () => {
        try {
          const online = await isOnlineClient();
          setOnlineStatus(online);
        } catch (error) {
          // Silently fail for periodic checks - no logging
        }
      }, 60000); // Check every 60 seconds to reduce spam

      return () => clearInterval(interval);
    }
  }, []); // Empty dependency array - only run once on mount

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

  const requestPasswordResetOTP = async (email: string): Promise<{ success: boolean; message: string }> => {
    const online = await isOnlineClient();
    if (!online) throw new Error('You are offline. Connect to the internet to reset password.');
    const response = await fetch(`${API_CONFIG.BASE_URL}/auth/forgot-password-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!response.ok) {
      let message = 'Failed to send OTP';
      try { const data = await response.json(); message = data.message || message; } catch {}
      throw new Error(message);
    }
    const data = await response.json();
    return data;
  };

  const verifyOTP = async (email: string, otp: string): Promise<{ success: boolean; token: string; message: string }> => {
    const online = await isOnlineClient();
    if (!online) throw new Error('You are offline. Connect to the internet to verify OTP.');
    const response = await fetch(`${API_CONFIG.BASE_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp }),
    });
    if (!response.ok) {
      let message = 'Invalid or expired OTP';
      try { const data = await response.json(); message = data.message || message; } catch {}
      throw new Error(message);
    }
    const data = await response.json();
    return data;
  };

  const resetPasswordWithOTP = async (email: string, otp: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
    const online = await isOnlineClient();
    if (!online) throw new Error('You are offline. Connect to the internet to reset password.');
    const response = await fetch(`${API_CONFIG.BASE_URL}/auth/reset-password-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, newPassword }),
    });
    if (!response.ok) {
      let message = 'Failed to reset password';
      try { const data = await response.json(); message = data.message || message; } catch {}
      throw new Error(message);
    }
    const data = await response.json();
    return data;
  };

  const updateProfile = async (username: string, email: string) => {
    const online = await isOnlineClient();
    if (!online) throw new Error('You are offline. Connect to the internet to update profile.');
    
    if (!token) throw new Error('Not authenticated');
    
    const response = await fetch(`${API_CONFIG.BASE_URL}/auth/profile`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ username, email }),
    });
    
    if (!response.ok) {
      let message = 'Failed to update profile';
      try { 
        const data = await response.json(); 
        message = data.message || message; 
      } catch {}
      throw new Error(message);
    }
    
    const data = await response.json();
    if (data.success && data.user) {
      setUser(data.user);
    }
  };

  const logout = async () => {
    try {
      // Clear all user data
      setToken(null);
      setUser(null);
      
      // Clear localStorage
      localStorage.removeItem('lifeline:token');
      localStorage.removeItem('lifeline:user');
      
      // Clear IndexedDB for the current user
      if (typeof window !== 'undefined' && user?.id) {
        try {
          const dbName = `lifeline-local-${user.id}`;
          const db = await import('idb').then(m => m.openDB(dbName));
          await db.close();
          
          // Delete the IndexedDB database
          const deleteRequest = indexedDB.deleteDatabase(dbName);
          deleteRequest.onsuccess = () => {
            console.log('IndexedDB cleared');
          };
          
          // Also delete alerts database
          const alertsDbName = `lifeline-alerts`;
          const alertsDeleteRequest = indexedDB.deleteDatabase(alertsDbName);
          alertsDeleteRequest.onsuccess = () => {
            console.log('Alerts IndexedDB cleared');
          };
        } catch (error: any) {
          // Silently handle IndexedDB errors during logout
          if (error.name !== 'QuotaExceededError' && 
              error.name !== 'indexed_db_went_bad' &&
              !error.message?.includes('indexed_db_went_bad') &&
              !error.message?.includes('QuotaExceededError')) {
            console.error('Error clearing IndexedDB:', error);
          }
        }
      }
      
      // Clear all PouchDB databases
      try {
        const { default: PouchDB } = await import('pouchdb-browser');
        
        // Close and destroy all PouchDB instances
        const allDatabases = ['lifeline-local', `lifeline-local-${user?.id}`];
        
        for (const dbName of allDatabases) {
          try {
            const db = new PouchDB(dbName);
            await db.close();
            await db.destroy();
          } catch (error) {
            // Database might not exist, ignore errors
          }
        }
      } catch (error: any) {
        // Silently handle IndexedDB/PouchDB errors during logout
        if (error.name !== 'QuotaExceededError' && 
            error.name !== 'indexed_db_went_bad' &&
            !error.message?.includes('indexed_db_went_bad') &&
            !error.message?.includes('QuotaExceededError')) {
          console.error('Error clearing PouchDB:', error);
        }
      }
      
      // Clear localStorage completely to ensure clean state
      localStorage.clear();
      
      // Navigate to auth page
      router.push('/auth');
    } catch (error) {
      console.error('Error during logout:', error);
      // Still redirect even if cleanup fails
      router.push('/auth');
    }
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
    <AuthContext.Provider value={{ user, token, login, logout, register, forgotPassword, requestPasswordResetOTP, verifyOTP, resetPasswordWithOTP, updateProfile, isAuthenticated, isLoading, isOnline: onlineStatus, refreshOnlineStatus }}>
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
