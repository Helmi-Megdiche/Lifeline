"use client";
import { useState } from 'react';
import { useAuth } from '@/contexts/ClientAuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import Link from 'next/link';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const { login, register, isAuthenticated, logout, isLoading, isOnline, user, refreshOnlineStatus } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      if (isLogin) {
        await login(username, password);
        setMessage('Logged in successfully!');
      } else {
        if (password !== confirmPassword) {
          setError('Passwords do not match.');
          return;
        }
        await register(username, password);
        setMessage('Registration successful! You are now logged in.');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-md mx-auto bg-white/70 dark:bg-dark-surface-primary/80 backdrop-blur-sm rounded-2xl p-8 border border-gray-200/60 dark:border-dark-border-primary/60 shadow-lg text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 dark:border-emergency-blue-400 border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
        <p className="mt-4 text-gray-600 dark:text-dark-text-tertiary">Loading...</p>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="max-w-md mx-auto bg-white/70 dark:bg-dark-surface-primary/80 backdrop-blur-sm rounded-2xl p-8 border border-gray-200/60 dark:border-dark-border-primary/60 shadow-lg">
        <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-dark-text-primary mb-6">Profile</h1>
        
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 dark:from-emergency-green-500 dark:to-emergency-green-600 rounded-full mb-4">
            <span className="text-white font-bold text-xl">👤</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary mb-2">Welcome back!</h2>
          <p className="text-gray-600 dark:text-dark-text-secondary">Logged in as: <span className="font-medium text-blue-600 dark:text-emergency-blue-400">{user?.username}</span></p>
        </div>

        <div className="space-y-4 mb-8">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-surface-secondary rounded-lg">
            <span className="text-gray-700 dark:text-dark-text-secondary">Account Status</span>
            <span className="px-3 py-1 bg-green-100 dark:bg-emergency-green-900 text-green-800 dark:text-emergency-green-100 rounded-full text-sm font-medium">Active</span>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-surface-secondary rounded-lg">
            <span className="text-gray-700 dark:text-dark-text-secondary">Connection</span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              isOnline 
                ? 'bg-green-100 dark:bg-emergency-green-900 text-green-800 dark:text-emergency-green-100' 
                : 'bg-amber-100 dark:bg-yellow-900 text-amber-800 dark:text-yellow-100'
            }`}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-surface-secondary rounded-lg">
            <span className="text-gray-700 dark:text-dark-text-secondary">Theme</span>
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-emergency-blue-900 text-blue-800 dark:text-emergency-blue-100 rounded-full text-sm font-medium hover:bg-blue-200 dark:hover:bg-emergency-blue-800 transition-colors"
            >
              {theme === 'light' ? (
                <>
                  <span>☀️</span>
                  <span>Light</span>
                </>
              ) : (
                <>
                  <span>🌙</span>
                  <span>Dark</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <Link 
            href="/"
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            Go to Dashboard
          </Link>
          
          <button
            onClick={logout}
            className="w-full flex justify-center py-3 px-4 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white/70 dark:bg-dark-surface-primary/80 backdrop-blur-sm rounded-2xl p-8 border border-gray-200/60 dark:border-dark-border-primary/60 shadow-lg">
      {/* Theme Toggle */}
      <div className="mb-6 flex justify-end">
        <button
          onClick={toggleTheme}
          className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-dark-surface-secondary hover:bg-gray-200 dark:hover:bg-dark-surface-primary text-gray-700 dark:text-dark-text-secondary rounded-lg text-sm font-medium transition-colors"
        >
          {theme === 'light' ? (
            <>
              <span>🌙</span>
              <span>Dark</span>
            </>
          ) : (
            <>
              <span>☀️</span>
              <span>Light</span>
            </>
          )}
        </button>
      </div>

      {/* Online/Offline Status */}
      <div className={`mb-6 text-center px-4 py-2 rounded-lg text-sm font-medium ${
        isOnline 
          ? 'bg-green-100 dark:bg-emergency-green-900 text-green-800 dark:text-emergency-green-100 border border-green-200 dark:border-emergency-green-700' 
          : 'bg-amber-100 dark:bg-emergency-yellow-900 text-amber-800 dark:text-emergency-yellow-100 border border-amber-200 dark:border-emergency-yellow-700'
      }`}>
        <div className="flex items-center justify-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-amber-500'}`}></div>
          {isOnline ? 'Online' : 'Offline'}
          {!isOnline && (
            <button
              onClick={refreshOnlineStatus}
              className="ml-2 text-xs underline hover:no-underline"
            >
              Refresh
            </button>
          )}
        </div>
        {!isOnline && !isLogin && (
          <p className="mt-2 text-xs text-gray-600 dark:text-dark-text-secondary">
            Registration requires internet connection. Please connect to register.
          </p>
        )}
        <div className="mt-2 text-xs text-gray-500 dark:text-dark-text-tertiary">
          <button
            onClick={async () => {
              console.log('Testing backend connection...');
              try {
                const response = await fetch('http://10.133.250.197:4004/health');
                console.log('Backend test response:', response.status, await response.text());
                // Force refresh online status
                await refreshOnlineStatus();
              } catch (error) {
                console.log('Backend test error:', error);
              }
            }}
            className="underline hover:no-underline"
          >
            Test Backend & Refresh
          </button>
        </div>
      </div>

      <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-dark-text-primary mb-6">
        {isLogin ? 'Login' : 'Register'}
      </h1>
      
      {error && (
        <div className="bg-red-100 dark:bg-emergency-red-900 border border-red-400 dark:border-emergency-red-700 text-red-700 dark:text-emergency-red-100 px-4 py-3 rounded relative mb-4" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      {message && (
        <div className="bg-green-100 dark:bg-emergency-green-900 border border-green-400 dark:border-emergency-green-700 text-green-700 dark:text-emergency-green-100 px-4 py-3 rounded relative mb-4" role="alert">
          <span className="block sm:inline">{message}</span>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-900 dark:text-dark-text-primary mb-1">
            Username
          </label>
          <input
            type="text"
            id="username"
            className="mt-1 block w-full px-4 py-2 border border-gray-300 dark:border-dark-border-primary rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 dark:text-dark-text-primary bg-white dark:bg-dark-surface-secondary"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-900 dark:text-dark-text-primary mb-1">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              className="mt-1 block w-full pr-12 px-4 py-2 border border-gray-300 dark:border-dark-border-primary rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 dark:text-dark-text-primary bg-white dark:bg-dark-surface-secondary"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute inset-y-0 right-0 mr-2 mt-1 flex items-center px-2 py-1 text-gray-600 dark:text-dark-text-tertiary hover:text-gray-800 dark:hover:text-dark-text-secondary rounded"
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>
        </div>
        {!isLogin && (
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-900 dark:text-dark-text-primary mb-1">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                className="mt-1 block w-full pr-12 px-4 py-2 border border-gray-300 dark:border-dark-border-primary rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 dark:text-dark-text-primary bg-white dark:bg-dark-surface-secondary"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                className="absolute inset-y-0 right-0 mr-2 mt-1 flex items-center px-2 py-1 text-gray-600 dark:text-dark-text-tertiary hover:text-gray-800 dark:hover:text-dark-text-secondary rounded"
              >
                {showConfirmPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {confirmPassword && confirmPassword !== password && (
              <p className="mt-1 text-xs text-red-600 dark:text-emergency-red-300">Passwords do not match.</p>
            )}
          </div>
        )}
        <button
          type="submit"
          disabled={(!isOnline && !isLogin) || (!isLogin && (!!confirmPassword && confirmPassword !== password))}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-emergency-blue-500 dark:hover:bg-emergency-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLogin ? 'Login' : 'Register'}
        </button>
      </form>
      
      <div className="mt-6 text-center">
        <button
          onClick={() => setIsLogin(!isLogin)}
          disabled={!isOnline && isLogin} // Disable only when offline AND on login page (trying to go to register)
          className="text-sm text-blue-600 dark:text-emergency-blue-400 hover:text-blue-700 dark:hover:text-emergency-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLogin ? 'Need an account? Register' : 'Already have an account? Login'}
        </button>
      </div>
      
      {!isOnline && (
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500 dark:text-dark-text-tertiary">
            Offline mode: Only login is available. Connect to internet for registration.
          </p>
        </div>
      )}
    </div>
  );
}