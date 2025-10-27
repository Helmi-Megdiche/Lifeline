'use client';

import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger'
}: ConfirmationModalProps) {
  const { theme } = useTheme();

  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          icon: '⚠️',
          confirmButton: 'bg-white dark:bg-gray-800 border-2 border-red-600 dark:border-red-500 hover:bg-red-50 dark:hover:bg-gray-700 text-red-600 dark:text-red-500',
          iconBg: 'bg-red-100 dark:bg-red-900/20'
        };
      case 'warning':
        return {
          icon: '⚠️',
          confirmButton: 'bg-yellow-600 hover:bg-yellow-700 text-white',
          iconBg: 'bg-yellow-100 dark:bg-yellow-900/20'
        };
      case 'info':
        return {
          icon: 'ℹ️',
          confirmButton: 'bg-blue-600 hover:bg-blue-700 text-white',
          iconBg: 'bg-blue-100 dark:bg-blue-900/20'
        };
      default:
        return {
          icon: '⚠️',
          confirmButton: 'bg-red-600 hover:bg-red-700 text-white',
          iconBg: 'bg-red-100 dark:bg-red-900/20'
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={`
        relative w-full max-w-md mx-4 p-6 rounded-xl shadow-2xl
        ${theme === 'dark' 
          ? 'bg-gray-800 border border-gray-700' 
          : 'bg-white border border-gray-200'
        }
        transform transition-all duration-300 ease-out
        ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}
      `}>
        {/* Icon */}
        <div className={`
          w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center text-2xl
          ${styles.iconBg}
        `}>
          {styles.icon}
        </div>

        {/* Title */}
        <h3 className={`
          text-xl font-semibold text-center mb-3
          ${theme === 'dark' ? 'text-white' : 'text-gray-900'}
        `}>
          {title}
        </h3>

        {/* Message */}
        <div className={`
          text-center mb-6 whitespace-pre-line
          ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}
        `}>
          {message}
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className={`
              flex-1 px-4 py-2 rounded-lg font-medium transition-colors
              ${theme === 'dark' 
                ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' 
                : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
              }
            `}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`
              flex-1 px-4 py-2 rounded-lg font-medium transition-colors
              ${styles.confirmButton}
              ${confirmText === 'Delete' ? 'confirm-button-delete' : ''}
            `}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
