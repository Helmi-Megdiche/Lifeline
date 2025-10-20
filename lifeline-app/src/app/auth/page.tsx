"use client";
import { useState } from 'react';
import { useAuth } from '@/contexts/ClientAuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import Link from 'next/link';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const { login, register, forgotPassword, isAuthenticated, logout, isLoading, isOnline, user, refreshOnlineStatus } = useAuth();
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
        await register(username, password, email);
        setMessage('Registration successful! You are now logged in.');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-md mx-auto bg-white dark:bg-dark-surface-primary backdrop-blur-sm rounded-2xl p-8 border border-gray-200 dark:border-dark-border shadow-xl text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 dark:border-emergency-blue-400 border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
        <p className="mt-4 text-gray-600 dark:text-dark-text-tertiary">Loading...</p>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="max-w-md mx-auto bg-white dark:bg-dark-surface-primary backdrop-blur-sm rounded-2xl p-8 border border-gray-200 dark:border-dark-border shadow-xl">
        <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-dark-text-primary mb-6">Profile</h1>
        
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 dark:from-emergency-green-500 dark:to-emergency-green-600 rounded-full mb-4">
            <span className="text-white font-bold text-xl">👤</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary mb-2">Welcome back!</h2>
          <p className="text-gray-600 dark:text-dark-text-secondary">Logged in as: <span className="font-medium text-blue-600 dark:text-emergency-blue-400">{user?.username}</span></p>
        </div>

        <div className="space-y-4 mb-8">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-surface-secondary rounded-lg border border-gray-200 dark:border-dark-border">
            <span className="font-bold text-base profile-label" style={{ color: '#000000' }}>Account Status</span>
            <span className="px-3 py-1 bg-green-500 text-white dark:bg-green-600 dark:text-white rounded-full text-sm font-semibold shadow-sm">Active</span>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-surface-secondary rounded-lg border border-gray-200 dark:border-dark-border">
            <span className="font-bold text-base profile-label" style={{ color: '#000000' }}>Connection</span>
            <span className={`px-3 py-1 rounded-full text-sm font-semibold shadow-sm ${
              isOnline 
                ? 'bg-green-500 text-white dark:bg-green-600 dark:text-white' 
                : 'bg-orange-500 text-white dark:bg-orange-600 dark:text-white'
            }`}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-surface-secondary rounded-lg border border-gray-200 dark:border-dark-border">
            <span className="font-bold text-base profile-label" style={{ color: '#000000' }}>Theme</span>
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 px-3 py-1 bg-blue-500 text-white dark:bg-blue-600 dark:text-white rounded-full text-sm font-semibold hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors shadow-sm"
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
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            Go to Dashboard
          </Link>
          <button
            onClick={async () => {
              if (!isOnline) return;
              try {
                const targetEmail = user?.email || '';
                if (!targetEmail) {
                  alert('No email found on your account. Please re-register with an email.');
                  return;
                }
                await forgotPassword(targetEmail);
                alert('Password reset email sent. Please check your inbox.');
              } catch (e: any) {
                alert(e?.message || 'Failed to send reset email');
              }
            }}
            disabled={!isOnline}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-yellow-500 hover:bg-yellow-600 dark:bg-yellow-500 dark:hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:hover:bg-gray-400 transition-colors"
          >
            Forgot password (email)
          </button>
          
          <button
            onClick={logout}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-red-500 hover:bg-red-600 dark:bg-red-500 dark:hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white dark:bg-dark-surface-primary backdrop-blur-sm rounded-2xl p-8 border border-gray-200 dark:border-dark-border shadow-xl">
      {/* Theme Toggle */}
      <div className="mb-6 flex justify-end">
        <button
          onClick={toggleTheme}
          className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-dark-surface-secondary hover:bg-gray-200 dark:hover:bg-dark-surface-primary text-gray-800 dark:text-dark-text-primary rounded-lg text-sm font-medium transition-colors border border-gray-200 dark:border-dark-border"
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
      <div className={`mb-6 text-center px-4 py-3 rounded-lg text-sm font-semibold ${
        isOnline 
          ? 'bg-green-500 text-white dark:bg-green-600 dark:text-white border border-green-600 dark:border-green-700' 
          : 'bg-orange-500 text-white dark:bg-orange-600 dark:text-white border border-orange-600 dark:border-orange-700'
      }`}>
        <div className="flex items-center justify-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-white' : 'bg-white'}`}></div>
          {isOnline ? 'Online' : 'Offline'}
          {!isOnline && (
            <button
              onClick={refreshOnlineStatus}
              className="ml-2 text-xs underline hover:no-underline text-white"
            >
              Refresh
            </button>
          )}
        </div>
        {!isOnline && !isLogin && (
          <p className="mt-2 text-xs text-white/90">
            Registration requires internet connection. Please connect to register.
          </p>
        )}
        <div className="mt-2 text-xs text-white/80">
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
            className="underline hover:no-underline text-white"
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
        {!isLogin && (
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-900 dark:text-dark-text-primary mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              className="mt-1 block w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 dark:text-dark-text-primary bg-white dark:bg-dark-surface-secondary font-medium"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        )}
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-900 dark:text-dark-text-primary mb-1">
            Username
          </label>
          <input
            type="text"
            id="username"
            className="mt-1 block w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 dark:text-dark-text-primary bg-white dark:bg-dark-surface-secondary font-medium"
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
              className="mt-1 block w-full pr-12 px-4 py-3 border border-gray-300 dark:border-dark-border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 dark:text-dark-text-primary bg-white dark:bg-dark-surface-secondary font-medium"
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
                className="mt-1 block w-full pr-12 px-4 py-3 border border-gray-300 dark:border-dark-border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 dark:text-dark-text-primary bg-white dark:bg-dark-surface-secondary font-medium"
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
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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