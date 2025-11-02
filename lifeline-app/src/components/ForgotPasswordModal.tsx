"use client";
import { useState } from 'react';
import { useAuth } from '@/contexts/ClientAuthContext';
import { useTheme } from '@/contexts/ThemeContext';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ForgotPasswordModal({ isOpen, onClose }: ForgotPasswordModalProps) {
  const [step, setStep] = useState<'email' | 'otp' | 'password' | 'success'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { requestPasswordResetOTP, verifyOTP, resetPasswordWithOTP, isOnline } = useAuth();
  const { theme } = useTheme();

  if (!isOpen) return null;

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setIsLoading(true);

    try {
      const result = await requestPasswordResetOTP(email);
      setMessage(result.message);
      setStep('otp');
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setIsLoading(true);

    try {
      const result = await verifyOTP(email, otp);
      setMessage(result.message);
      setStep('password');
    } catch (err: any) {
      setError(err.message || 'Invalid OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      const result = await resetPasswordWithOTP(email, otp, newPassword);
      setMessage(result.message);
      setStep('success');
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setStep('email');
    setEmail('');
    setOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
    setMessage(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-white dark:bg-dark-surface-primary rounded-2xl shadow-2xl border border-gray-200 dark:border-dark-border-primary p-6 md:p-8">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-500 dark:text-dark-text-tertiary hover:text-gray-700 dark:hover:text-dark-text-primary transition-colors"
          aria-label="Close"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary">
            {step === 'email' && 'Forgot Password'}
            {step === 'otp' && 'Enter OTP Code'}
            {step === 'password' && 'Set New Password'}
            {step === 'success' && 'Password Reset Successful'}
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-dark-text-secondary">
            {step === 'email' && 'Enter your email address and we\'ll send you an OTP code'}
            {step === 'otp' && 'Check your email for the 6-digit OTP code'}
            {step === 'password' && 'Create a new secure password for your account'}
            {step === 'success' && 'Your password has been reset successfully. You can now login with your new password.'}
          </p>
        </div>

        {/* Error and Success Messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 dark:border-red-700 rounded-lg text-red-700 dark:text-red-400 text-sm">
            <div className="flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          </div>
        )}
        {message && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 dark:border-green-700 rounded-lg text-green-700 dark:text-green-400 text-sm">
            <div className="flex items-center gap-2">
              <span>✓</span>
              <span>{message}</span>
            </div>
          </div>
        )}

        {/* Step 1: Email Input */}
        {step === 'email' && (
          <form onSubmit={handleRequestOTP} className="space-y-4">
            <div>
              <label htmlFor="reset-email" className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  id="reset-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-white/80 dark:bg-dark-surface-primary backdrop-blur-sm border-2 border-gray-200 dark:border-dark-border-primary rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-all duration-200 text-gray-900 dark:text-dark-text-primary font-medium placeholder:text-gray-400 dark:placeholder:text-dark-text-tertiary"
                  placeholder="Enter your email"
                  required
                  disabled={!isOnline || isLoading}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-dark-text-tertiary pointer-events-none">📧</span>
              </div>
            </div>
            <button
              type="submit"
              disabled={!isOnline || isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 dark:from-blue-600 dark:to-blue-700 dark:hover:from-blue-700 dark:hover:to-blue-800 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <span>📬</span>
                  <span>Send OTP</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Step 2: OTP Input */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <div>
              <label htmlFor="reset-otp" className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2">
                OTP Code
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="reset-otp"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full px-4 py-3 bg-white/80 dark:bg-dark-surface-primary backdrop-blur-sm border-2 border-gray-200 dark:border-dark-border-primary rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-all duration-200 text-gray-900 dark:text-dark-text-primary font-medium text-center text-2xl tracking-widest placeholder:text-gray-400 dark:placeholder:text-dark-text-tertiary"
                  placeholder="000000"
                  maxLength={6}
                  required
                  disabled={!isOnline || isLoading}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-dark-text-tertiary pointer-events-none">🔐</span>
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-dark-text-tertiary">
                Enter the 6-digit code sent to {email}
              </p>
            </div>
            <button
              type="submit"
              disabled={!isOnline || isLoading || otp.length !== 6}
              className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 dark:from-blue-600 dark:to-blue-700 dark:hover:from-blue-700 dark:hover:to-blue-800 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <span>✓</span>
                  <span>Verify OTP</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setStep('email')}
              className="w-full text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
            >
              Resend OTP
            </button>
          </form>
        )}

        {/* Step 3: New Password */}
        {step === 'password' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label htmlFor="new-password" className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 bg-white/80 dark:bg-dark-surface-primary backdrop-blur-sm border-2 border-gray-200 dark:border-dark-border-primary rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-all duration-200 text-gray-900 dark:text-dark-text-primary font-medium placeholder:text-gray-400 dark:placeholder:text-dark-text-tertiary"
                  placeholder="Enter new password"
                  required
                  disabled={!isOnline || isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 mr-3 flex items-center justify-center w-10 text-gray-500 dark:text-dark-text-tertiary hover:text-gray-700 dark:hover:text-dark-text-secondary transition-colors !bg-transparent !hover:bg-transparent"
                  style={{ backgroundColor: 'transparent' }}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="confirm-new-password" className="block text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirm-new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 bg-white/80 dark:bg-dark-surface-primary backdrop-blur-sm border-2 border-gray-200 dark:border-dark-border-primary rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-all duration-200 text-gray-900 dark:text-dark-text-primary font-medium placeholder:text-gray-400 dark:placeholder:text-dark-text-tertiary"
                  placeholder="Confirm new password"
                  required
                  disabled={!isOnline || isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 mr-3 flex items-center justify-center w-10 text-gray-500 dark:text-dark-text-tertiary hover:text-gray-700 dark:hover:text-dark-text-secondary transition-colors !bg-transparent !hover:bg-transparent"
                  style={{ backgroundColor: 'transparent' }}
                >
                  {showConfirmPassword ? '🙈' : '👁️'}
                </button>
              </div>
              {confirmPassword && confirmPassword !== newPassword && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400 font-medium flex items-center gap-1">
                  <span>⚠️</span> Passwords do not match
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={!isOnline || isLoading || newPassword !== confirmPassword || newPassword.length < 6}
              className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 dark:from-green-600 dark:to-green-700 dark:hover:from-green-700 dark:hover:to-green-800 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Resetting...</span>
                </>
              ) : (
                <>
                  <span>🔒</span>
                  <span>Reset Password</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Step 4: Success */}
        {step === 'success' && (
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 dark:from-green-600 dark:to-green-700 rounded-full mb-4">
              <span className="text-white text-3xl">✓</span>
            </div>
            <p className="text-gray-700 dark:text-dark-text-primary font-medium">
              Your password has been reset successfully!
            </p>
            <button
              onClick={handleClose}
              className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 dark:from-blue-600 dark:to-blue-700 dark:hover:from-blue-700 dark:hover:to-blue-800 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <span>Close</span>
            </button>
          </div>
        )}

        {!isOnline && (
          <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg text-orange-700 dark:text-orange-400 text-sm text-center">
            ⚠️ You are offline. Connect to the internet to reset your password.
          </div>
        )}
      </div>
    </div>
  );
}

