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
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const { login, register, forgotPassword, updateProfile, isAuthenticated, logout, isLoading, isOnline, user, refreshOnlineStatus } = useAuth();
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

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      await updateProfile(editUsername, editEmail);
      setMessage('Profile updated successfully!');
      setIsEditingProfile(false);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile.');
    }
  };

  const startEditing = () => {
    setEditUsername(user?.username || '');
    setEditEmail(user?.email || '');
    setIsEditingProfile(true);
    setError(null);
    setMessage(null);
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

        {/* Profile Update Form */}
        {isEditingProfile ? (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-4">Update Profile</h3>
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div>
                <label htmlFor="editUsername" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
                  Username
                </label>
                <input
                  type="text"
                  id="editUsername"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-emergency-blue-400 focus:border-transparent bg-white dark:bg-dark-surface-secondary text-gray-900 dark:text-dark-text-primary"
                  required
                />
              </div>
              <div>
                <label htmlFor="editEmail" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
                  Email
                </label>
                <input
                  type="email"
                  id="editEmail"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-emergency-blue-400 focus:border-transparent bg-white dark:bg-dark-surface-secondary text-gray-900 dark:text-dark-text-primary"
                  required
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={!isOnline}
                  className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="flex-1 py-2 px-4 bg-gray-500 hover:bg-gray-600 dark:bg-gray-500 dark:hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="mb-8">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-surface-secondary rounded-lg border border-gray-200 dark:border-dark-border profile-info-section">
              <div>
                <span className="font-bold text-base profile-label" style={{ color: '#000000' }}>Profile Info</span>
                <div className="mt-2 text-sm text-black dark:text-black" style={{ color: '#000000' }}>
                  <div>Username: <span className="font-medium text-black dark:text-black" style={{ color: '#000000' }}>{user?.username}</span></div>
                  <div>Email: <span className="font-medium text-black dark:text-black" style={{ color: '#000000' }}>{user?.email || 'Not set'}</span></div>
                </div>
              </div>
              <button
                onClick={startEditing}
                disabled={!isOnline}
                className="px-3 py-1 bg-blue-500 text-white dark:bg-blue-600 dark:text-white rounded-full text-sm font-semibold hover:bg-blue-600 dark:hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                Edit
              </button>
            </div>
          </div>
        )}

        {/* Error and Success Messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg text-red-700 dark:text-red-400 text-sm">
            {error}
          </div>
        )}
        {message && (
          <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-lg text-green-700 dark:text-green-400 text-sm">
            {message}
          </div>
        )}
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
    <div className="max-w-md mx-auto bg-white/90 dark:bg-dark-surface-primary/95 backdrop-blur-md rounded-3xl p-8 md:p-10 border border-gray-200/60 dark:border-dark-border-primary/50 shadow-2xl dark:shadow-[0_20px_25px_-5px_rgba(0,0,0,0.5),0_10px_10px_-5px_rgba(0,0,0,0.3)]">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-white text-lg font-bold">L</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h1>
        </div>
        <button
          onClick={toggleTheme}
          className="flex items-center gap-2 px-3 py-2 bg-gray-100/80 dark:bg-dark-surface-secondary/90 hover:bg-gray-200 dark:hover:bg-dark-surface-tertiary backdrop-blur-sm text-gray-900 dark:text-dark-text-primary rounded-xl text-sm font-medium transition-all duration-200 border border-gray-200/50 dark:border-dark-border-primary/50 shadow-sm hover:shadow-md"
        >
          {theme === 'light' ? (
            <>
              <span>🌙</span>
              <span className="hidden sm:inline">Dark</span>
            </>
          ) : (
            <>
              <span>☀️</span>
              <span className="hidden sm:inline">Light</span>
            </>
          )}
        </button>
      </div>

      {/* Online/Offline Status */}
      <div className={`mb-8 relative overflow-hidden rounded-xl px-5 py-4 ${
        isOnline 
          ? 'bg-gradient-to-r from-green-500 to-green-600 dark:from-green-600 dark:to-green-700 shadow-lg shadow-green-500/30' 
          : 'bg-gradient-to-r from-orange-500 to-orange-600 dark:from-orange-600 dark:to-orange-700 shadow-lg shadow-orange-500/30'
      }`}>
        <div className="flex items-center justify-center gap-3">
          <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-white animate-pulse' : 'bg-white'}`}></div>
          <span className="text-white font-semibold text-sm tracking-wide">
            {isOnline ? 'Connected' : 'Offline Mode'}
          </span>
          {!isOnline && (
            <button
              onClick={refreshOnlineStatus}
              className="ml-2 px-3 py-1.5 bg-white/90 dark:bg-white/20 hover:bg-white dark:hover:bg-white/30 text-gray-900 dark:text-white text-xs font-semibold rounded-lg transition-all duration-200 backdrop-blur-sm shadow-sm hover:shadow-md"
            >
              Refresh
            </button>
          )}
        </div>
        {!isOnline && !isLogin && (
          <p className="mt-3 text-center text-xs text-white/90 leading-relaxed">
            Registration requires internet connection. Please connect to register.
          </p>
        )}
      </div>
      
      {/* Error and Success Messages */}
      {error && (
        <div className="mb-6 p-4 bg-red-50/80 dark:bg-red-900/20 backdrop-blur-sm border-l-4 border-red-500 dark:border-red-700 rounded-xl text-red-700 dark:text-red-400 text-sm shadow-sm" role="alert">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span className="font-medium">{error}</span>
          </div>
        </div>
      )}
      {message && (
        <div className="mb-6 p-4 bg-green-50/80 dark:bg-green-900/20 backdrop-blur-sm border-l-4 border-green-500 dark:border-green-700 rounded-xl text-green-700 dark:text-green-400 text-sm shadow-sm" role="alert">
          <div className="flex items-center gap-2">
            <span>✓</span>
            <span className="font-medium">{message}</span>
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-5">
        {!isLogin && (
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary">
              Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                id="email"
                className="w-full px-4 py-3.5 bg-white/80 dark:bg-dark-surface-primary backdrop-blur-sm border-2 border-gray-200 dark:border-dark-border-primary rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-all duration-200 text-gray-900 dark:text-dark-text-primary font-medium placeholder:text-gray-400 dark:placeholder:text-dark-text-tertiary"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-dark-text-tertiary pointer-events-none">📧</span>
            </div>
          </div>
        )}
        <div className="space-y-2">
          <label htmlFor="username" className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary">
            Username
          </label>
          <div className="relative">
            <input
              type="text"
              id="username"
              className="w-full px-4 py-3.5 bg-white/80 dark:bg-dark-surface-primary backdrop-blur-sm border-2 border-gray-200 dark:border-dark-border-primary rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-all duration-200 text-gray-900 dark:text-dark-text-primary font-medium placeholder:text-gray-400 dark:placeholder:text-dark-text-tertiary"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-dark-text-tertiary pointer-events-none">👤</span>
          </div>
        </div>
        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              className="w-full px-4 py-3.5 pr-12 bg-white/80 dark:bg-dark-surface-primary backdrop-blur-sm border-2 border-gray-200 dark:border-dark-border-primary rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-all duration-200 text-gray-900 dark:text-dark-text-primary font-medium placeholder:text-gray-400 dark:placeholder:text-dark-text-tertiary"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute inset-y-0 right-0 mr-3 flex items-center justify-center w-10 text-gray-500 dark:text-dark-text-tertiary hover:text-gray-700 dark:hover:text-dark-text-secondary transition-colors !bg-transparent !hover:bg-transparent z-10"
              style={{ backgroundColor: 'transparent' }}
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>
        </div>
        {!isLogin && (
          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                className="w-full px-4 py-3.5 pr-12 bg-white/80 dark:bg-dark-surface-primary backdrop-blur-sm border-2 border-gray-200 dark:border-dark-border-primary rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-all duration-200 text-gray-900 dark:text-dark-text-primary font-medium placeholder:text-gray-400 dark:placeholder:text-dark-text-tertiary"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                className="absolute inset-y-0 right-0 mr-3 flex items-center justify-center w-10 text-gray-500 dark:text-dark-text-tertiary hover:text-gray-700 dark:hover:text-dark-text-secondary transition-colors !bg-transparent !hover:bg-transparent z-10"
                style={{ backgroundColor: 'transparent' }}
              >
                {showConfirmPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {confirmPassword && confirmPassword !== password && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400 font-medium flex items-center gap-1">
                <span>⚠️</span> Passwords do not match
              </p>
            )}
          </div>
        )}
        <button
          type="submit"
          disabled={(!isOnline && !isLogin) || (!isLogin && (!!confirmPassword && confirmPassword !== password))}
          className="group w-full flex items-center justify-center gap-2 py-4 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 dark:from-blue-600 dark:to-blue-700 dark:hover:from-blue-700 dark:hover:to-blue-800 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-500/50 transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-sm"
        >
          <span className="text-lg">{isLogin ? '🔐' : '✨'}</span>
          <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
          <span className="group-hover:translate-x-0.5 transition-transform opacity-0 group-hover:opacity-100">→</span>
        </button>
      </form>
      
      <div className="mt-8 pt-6 border-t border-gray-200/60 dark:border-dark-border-primary/50">
        <div className="text-center space-y-1">
          <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-2">
            {isLogin ? "Don't have an account?" : "Already have an account?"}
          </p>
          <button
            onClick={() => setIsLogin(!isLogin)}
            disabled={!isOnline && isLogin}
            className="group inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-900 dark:text-dark-text-primary hover:text-black dark:hover:text-dark-text-primary bg-white dark:bg-blue-950/30 hover:bg-gray-50 dark:hover:bg-blue-950/50 border border-gray-300 dark:border-blue-800/50 hover:border-gray-400 dark:hover:border-blue-700/50 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-blue-950/30 shadow-sm hover:shadow-md"
          >
            <span className="text-base">{isLogin ? '✨' : '🔐'}</span>
            <span>{isLogin ? 'Create an account' : 'Sign in to your account'}</span>
            <span className="group-hover:translate-x-0.5 transition-transform text-gray-900 dark:text-dark-text-primary">→</span>
          </button>
        </div>  
        {!isOnline && (
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500 dark:text-dark-text-tertiary bg-gray-50/50 dark:bg-dark-surface-secondary/50 px-3 py-2 rounded-lg">
              ⚠️ Offline mode: Only login is available. Connect to internet for registration.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}