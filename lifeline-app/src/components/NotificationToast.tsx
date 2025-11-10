'use client';

import React, { useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

interface NotificationToastProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
  type?: 'success' | 'warning' | 'error' | 'info';
  duration?: number;
}

export default function NotificationToast({
  isOpen,
  onClose,
  message,
  type = 'success',
  duration = 4000
}: NotificationToastProps) {
  const { theme } = useTheme();

  useEffect(() => {
    if (isOpen && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isOpen, duration, onClose]);

  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          icon: '✅',
          bgColor: 'bg-green-600',
          borderColor: 'border-green-500',
          iconBg: 'bg-green-100 dark:bg-green-900/20'
        };
      case 'warning':
        return {
          icon: '⚠️',
          bgColor: 'bg-yellow-600',
          borderColor: 'border-yellow-500',
          iconBg: 'bg-yellow-100 dark:bg-yellow-900/20'
        };
      case 'error':
        return {
          icon: '❌',
          bgColor: 'bg-red-600',
          borderColor: 'border-red-500',
          iconBg: 'bg-red-100 dark:bg-red-900/20'
        };
      case 'info':
        return {
          icon: 'ℹ️',
          bgColor: 'bg-blue-600',
          borderColor: 'border-blue-500',
          iconBg: 'bg-blue-100 dark:bg-blue-900/20'
        };
      default:
        return {
          icon: '✅',
          bgColor: 'bg-green-600',
          borderColor: 'border-green-500',
          iconBg: 'bg-green-100 dark:bg-green-900/20'
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 backdrop-blur-md"
      style={{
        backgroundColor: theme === 'dark' ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.3)',
      }}
      onClick={onClose}
    >
      {/* Notification Toast */}
      <div 
        className={`
          relative flex items-center gap-3 p-6 rounded-lg shadow-xl border max-w-md w-full mx-auto
          transform transition-all duration-300 ease-out
          ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}
        `}
        style={{
          backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
          borderColor: theme === 'dark' ? '#374151' : '#e5e7eb',
          color: theme === 'dark' ? '#ffffff' : '#111827',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div className={`
          w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0
          ${styles.iconBg}
        `}>
          {styles.icon}
        </div>

        {/* Message */}
        <div className="flex-1 text-base font-medium">
          {message}
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className={`
            w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
            hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors
            ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}
          `}
        >
          ×
        </button>
      </div>
    </div>
  );
}
