"use client";
import React from 'react';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';

interface OfflineQueueBadgeProps {
  className?: string;
  showText?: boolean;
}

/**
 * Badge component showing number of pending offline alerts
 */
export default function OfflineQueueBadge({ className = '', showText = false }: OfflineQueueBadgeProps) {
  const { queueCount, isSyncing, isOnline } = useOfflineQueue();

  // Don't show badge if no queued alerts
  if (queueCount === 0) {
    return null;
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
        isSyncing
          ? 'bg-blue-500 text-white animate-pulse'
          : isOnline
          ? 'bg-yellow-500 text-white'
          : 'bg-red-500 text-white'
      } ${className}`}
      title={
        isSyncing
          ? `Syncing ${queueCount} alert(s)...`
          : isOnline
          ? `${queueCount} alert(s) pending sync`
          : `${queueCount} alert(s) queued (offline)`
      }
    >
      {isSyncing ? (
        <>
          <svg
            className="animate-spin h-3 w-3"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          {showText && <span>Syncing...</span>}
        </>
      ) : (
        <>
          <svg
            className="h-3 w-3"
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          {showText ? (
            <span>{queueCount} pending</span>
          ) : (
            <span>{queueCount}</span>
          )}
        </>
      )}
    </div>
  );
}

