'use client';

import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';

type Invitation = { id: string; groupName?: string; groupId?: string };

export default function InvitationsModal({
  invites,
  loading,
  onClose,
  onOpenGroup,
  onAccept,
  onDecline,
}: {
  invites: Invitation[];
  loading: boolean;
  onClose: () => void;
  onOpenGroup: (groupId: string) => void;
  onAccept: (id: string) => Promise<void> | void;
  onDecline: (id: string) => Promise<void> | void;
}) {
  const { theme } = useTheme();

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md"
      style={{
        backgroundColor: theme === 'dark' ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.3)',
      }}
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-xl"
        style={{
          backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Pending Invitations</h2>
          <button
            onClick={onClose}
            aria-label="Close invitations"
            className="p-2 rounded-lg bg-transparent text-gray-500 hover:text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {loading ? (
          <div className="text-sm text-gray-500 dark:text-gray-400">Loading...</div>
        ) : invites.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400 text-sm">No invitations at the moment.</p>
        ) : (
          <div className="space-y-3">
            {invites.map((inv) => (
              <div key={inv.id} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <button
                    className="text-blue-600 dark:text-blue-400 font-medium hover:underline"
                    onClick={() => inv.groupId && onOpenGroup(inv.groupId)}
                  >
                    {inv.groupName || 'Group'}
                  </button>
                  <div className="flex gap-2">
                    <button
                      className="px-3 py-1 rounded-md bg-green-600 hover:bg-green-700 text-white text-sm"
                      onClick={() => onAccept(inv.id)}
                    >
                      Accept
                    </button>
                    <button
                      className="px-3 py-1 rounded-md bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-900 dark:text-white text-sm"
                      onClick={() => onDecline(inv.id)}
                    >
                      Decline
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


